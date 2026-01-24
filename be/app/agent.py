import os
from typing import TypedDict, Literal, Annotated
from dotenv import load_dotenv

from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

# 1. Load Config
load_dotenv()
WINDOWS_IP = os.getenv("WINDOWS_IP")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL")
QDRANT_URL = os.getenv("QDRANT_URL")

# 2. Setup Vector DB
client = QdrantClient(url=QDRANT_URL)
embeddings = OllamaEmbeddings(base_url=OLLAMA_URL, model="bge-m3")
vector_store = QdrantVectorStore(client=client, collection_name="user_docs", embedding=embeddings)

# ---------------------------------------------------------
# TOOLS
# ---------------------------------------------------------
@tool
def search_documents(query: str):
    """Search documents."""
    print(f"   [TOOL] 🕵️‍♀️ Searching Qdrant for: '{query}'")
    results = vector_store.similarity_search(query, k=3)
    if not results:
        return "No documents found."
    return "\n".join([doc.page_content for doc in results])

@tool
def send_email(recipient: str, subject: str, body: str):
    """Send email."""
    print(f"   [TOOL] 📧 Sending email to {recipient}...")
    return f"Email sent to {recipient}."

# ---------------------------------------------------------
# MODELS
# ---------------------------------------------------------
# Gunakan Temperature 0 agar konsisten
llm = ChatOllama(base_url=OLLAMA_URL, model="llama3.1:8b", temperature=0)

# ---------------------------------------------------------
# ROUTER (Updated with Context)
# ---------------------------------------------------------
class RouteQuery(BaseModel):
    datasource: Literal["vectorstore", "email_tool", "chitchat"] = Field(
        ...,
        description="Route user input based on conversation context."
    )

router_system = """You are an intent classifier.
Analyze the user's latest message AND the chat history.

ROUTING RULES:
1. 'vectorstore': Questions about uploaded files, CV, specific identity data, or summarizing documents.
2. 'email_tool': Explicit commands to send email.
3. 'chitchat': Everything else (Greetings, General Knowledge, Follow-up questions about previous chitchat).

Example:
- History: "What is REST API?" -> User: "How does it work?" => 'chitchat' (Contextual follow-up)
- History: "Search for invoice" -> User: "Email it to boss" => 'email_tool' (Contextual action)
"""

router_prompt = ChatPromptTemplate.from_messages([
    ("system", router_system),
    ("human", "CHAT HISTORY:\n{history}\n\nLATEST USER INPUT:\n{question}"),
])

router_chain = router_prompt | llm.with_structured_output(RouteQuery)

# ---------------------------------------------------------
# STATE & HELPER
# ---------------------------------------------------------
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    context: str

def get_history_text(messages):
    # Ambil 5 pesan terakhir saja agar prompt tidak kepenuhan
    recent = messages[-5:] 
    text = ""
    for msg in recent:
        role = "User" if isinstance(msg, HumanMessage) else "AI"
        text += f"{role}: {msg.content}\n"
    return text

# ---------------------------------------------------------
# NODES
# ---------------------------------------------------------

def router_node(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1].content
    history_text = get_history_text(messages[:-1]) # History tanpa pesan terakhir
    
    print(f"\n🧠 Router seeing: '{last_message}' (with history context)")
    
    try:
        # Panggil router dengan History + Pesan Baru
        decision = router_chain.invoke({
            "history": history_text,
            "question": last_message
        })
        step = decision.datasource
    except:
        step = "chitchat"
        
    print(f"   👉 Decision: {step}")
    return {"context": step}

def search_node(state: AgentState):
    last_message = state["messages"][-1].content
    result = search_documents.invoke(last_message)
    # Gunakan SystemMessage untuk menyuntikkan konteks dokumen ke otak LLM
    return {
        "messages": [
            SystemMessage(content=f"DOCUMENT CONTEXT FROM DATABASE:\n{result}")
        ]
    }

def email_node(state: AgentState):
    # Simulasi: Ambil email dari history jika user bilang "kirim ke dia"
    last_message = state["messages"][-1].content
    res = send_email.invoke({"recipient": "admin@test.com", "subject": "Action", "body": last_message})
    return {
        "messages": [
            SystemMessage(content=f"TOOL OUTPUT: {res}")
        ]
    }

def answer_node(state: AgentState):
    # LLM akan melihat:
    # 1. History Chat
    # 2. Pesan User Terakhir
    # 3. Hasil Tool (jika ada, dimasukkan sebagai SystemMessage di node sebelumnya)
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

# ---------------------------------------------------------
# GRAPH SETUP
# ---------------------------------------------------------
workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("search", search_node)
workflow.add_node("email", email_node)
workflow.add_node("generate", answer_node)

workflow.set_entry_point("router")

def route_logic(state):
    decision = state["context"]
    if decision == "vectorstore": return "search"
    elif decision == "email_tool": return "email"
    else: return "generate"

workflow.add_conditional_edges("router", route_logic, 
    {"search": "search", "email": "email", "generate": "generate"})

workflow.add_edge("search", "generate")
workflow.add_edge("email", "generate")
workflow.add_edge("generate", END)

# MEMORY CHECKPOINTER (Agar state tersimpan antar input)
from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()

app = workflow.compile(checkpointer=memory)

# ---------------------------------------------------------
# MAIN LOOP
# ---------------------------------------------------------
if __name__ == "__main__":
    print("🤖 Agent V4 (Context Aware) Online.")
    
    # Thread ID unik untuk sesi ini
    config = {"configurable": {"thread_id": "session_1"}}
    
    while True:
        user_input = input("\nYou: ")
        if user_input.lower() in ["quit", "exit"]:
            break
            
        # Stream output
        for event in app.stream(
            {"messages": [HumanMessage(content=user_input)]}, 
            config=config
        ):
            if "generate" in event:
                ai_reply = event['generate']['messages'][-1].content
                print(f"AI: {ai_reply}")