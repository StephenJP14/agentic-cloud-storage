import os
from typing import TypedDict, Literal, Annotated
from dotenv import load_dotenv

# ---------------------------------------------------------
# NEW IMPORTS FOR REDIS PERSISTENCE
# ---------------------------------------------------------
from langgraph.checkpoint.redis import RedisSaver
from redis import Redis

from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

# 1. Load Config & Construct URLs
load_dotenv()
WINDOWS_IP = os.getenv("WINDOWS_IP")
OLLAMA_PORT = os.getenv("OLLAMA_PORT", "11434")
QDRANT_PORT = os.getenv("QDRANT_PORT", "6333")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")

# Construct URLs dynamically so we don't depend on .env substitution
OLLAMA_URL = f"http://{WINDOWS_IP}:{OLLAMA_PORT}"
QDRANT_URL = f"http://{WINDOWS_IP}:{QDRANT_PORT}"
REDIS_URL = f"redis://{WINDOWS_IP}:{REDIS_PORT}"

print(f"🔌 Connecting to Backend at {WINDOWS_IP}...")

# 2. Setup Vector DB
client = QdrantClient(url=QDRANT_URL)
embeddings = OllamaEmbeddings(base_url=OLLAMA_URL, model="bge-m3")
vector_store = QdrantVectorStore(
    client=client, 
    collection_name="user_docs", 
    embedding=embeddings,
    content_payload_key="text"  # <--- CRITICAL FIX: Match your ingestion key!
)

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
llm = ChatOllama(base_url=OLLAMA_URL, model="llama3.1:8b", temperature=0)

# ---------------------------------------------------------
# ROUTER
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
"""

router_prompt = ChatPromptTemplate.from_messages([
    ("system", router_system),
    ("human", "CHAT HISTORY:\n{history}\n\nLATEST USER INPUT:\n{question}"),
])

router_chain = router_prompt | llm.with_structured_output(RouteQuery)

# ---------------------------------------------------------
# STATE
# ---------------------------------------------------------
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    context: str

def get_history_text(messages):
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
    history_text = get_history_text(messages[:-1]) 
    
    print(f"\n🧠 Router seeing: '{last_message}'")
    
    try:
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
    print("Search Results:", result)
    return {
        "messages": [
            SystemMessage(content=f"DOCUMENT CONTEXT FROM DATABASE:\n{result}")
        ]
    }

def email_node(state: AgentState):
    last_message = state["messages"][-1].content
    res = send_email.invoke({"recipient": "admin@test.com", "subject": "Action", "body": last_message})
    return {
        "messages": [
            SystemMessage(content=f"TOOL OUTPUT: {res}")
        ]
    }

def answer_node(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]

    # CHECK: Is this a RAG response (Document Context)?
    if isinstance(last_message, SystemMessage) and "DOCUMENT CONTEXT" in last_message.content:
        
        # 1. SAFELY Find the last User Question
        # Iterate backwards to find the first HumanMessage
        user_question = "Summary" # Default
        for msg in reversed(messages):
            if isinstance(msg, HumanMessage):
                user_question = msg.content
                break
        
        context_data = last_message.content
        
        print(f"   [GENERATE] 📝 Analyzing Context for question: '{user_question}'")
        
        # 2. BETTER PROMPT for Llama 3
        # We explicitly tell it how to read a document (CVs usually have names at the top).
        rag_prompt = f"""You are an intelligent document analyst.
        
        USER QUESTION: 
        "{user_question}"

        DOCUMENT CONTENT (Retrieved from Database):
        --------------------------------------------------
        {context_data}
        --------------------------------------------------

        INSTRUCTIONS:
        1. Analyze the Document Content above carefully.
        2. Answer the User Question using the information in the document.
        3. NOTE: If the document looks like a CV or Resume, the Name is usually at the very top, and Contact Info is near it.
        4. If the answer is truly missing, say "I couldn't find that information in the document."
        """
        
        # 3. Invoke LLM with this focused prompt
        response = llm.invoke([HumanMessage(content=rag_prompt)])
        return {"messages": [response]}

    # FALLBACK: Normal Chitchat
    response = llm.invoke(messages)
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


# ---------------------------------------------------------
# EXPORT FUNCTION
# ---------------------------------------------------------
# This function allows main.py to create the agent with a specific checkpointer
def get_graph_workflow():
    return workflow


# ---------------------------------------------------------
# MAIN LOOP (FIXED: ADDED SETUP())
# ---------------------------------------------------------
if __name__ == "__main__":
    print(f"⚡ Connecting to Redis at {REDIS_URL}...")

    # Open connection
    with RedisSaver.from_conn_string(REDIS_URL) as checkpointer:
        
        # 1. INITIALIZE INDICES (Crucial Step!)
        # This creates the 'checkpoint_write' and 'checkpoint_migrations' indices in Redis
        print("🔧 Setting up Redis Indices...")
        checkpointer.setup() 

        # 2. Compile graph with the ready checkpointer
        app = workflow.compile(checkpointer=checkpointer)
        
        print("🤖 Agent V5 (With Redis Memory) Online.")
        
        config = {"configurable": {"thread_id": "stephen_session_1"}}
        
        while True:
            try:
                user_input = input("\nYou: ")
                if user_input.lower() in ["quit", "exit"]:
                    break
                    
                for event in app.stream(
                    {"messages": [HumanMessage(content=user_input)]}, 
                    config=config
                ):
                    if "generate" in event:
                        ai_reply = event['generate']['messages'][-1].content
                        print(f"AI: {ai_reply}")
            except Exception as e:
                print(f"❌ Error: {e}")
                import traceback
                traceback.print_exc()
                break