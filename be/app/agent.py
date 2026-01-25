import os
import json
from typing import TypedDict, Literal, Annotated
from dotenv import load_dotenv

# ---------------------------------------------------------
# IMPORTS
# ---------------------------------------------------------
from langgraph.checkpoint.redis import RedisSaver
from redis import Redis

from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models # Import for check

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

OLLAMA_URL = f"http://{WINDOWS_IP}:{OLLAMA_PORT}"
QDRANT_URL = f"http://{WINDOWS_IP}:{QDRANT_PORT}"
REDIS_URL = f"redis://{WINDOWS_IP}:{REDIS_PORT}"

print(f"🔌 Connecting to Backend at {WINDOWS_IP}...")

# 2. Setup Vector DB (Auto-Create Collection if missing)
client = QdrantClient(url=QDRANT_URL)
embeddings = OllamaEmbeddings(base_url=OLLAMA_URL, model="bge-m3")

collection_name = "user_docs"
try:
    client.get_collection(collection_name=collection_name)
except Exception:
    print(f"⚠️ Collection '{collection_name}' missing! Creating it now...")
    client.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE)
    )

vector_store = QdrantVectorStore(
    client=client,
    collection_name=collection_name,
    embedding=embeddings,
    content_payload_key="text"
)

# ---------------------------------------------------------
# TOOLS
# ---------------------------------------------------------
# @tool
# def search_documents(query: str):
#     """Search documents."""
#     # This dummy function is required for the graph, but we call vector_store manually in the node
#     pass

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
# ROUTER (FIXED FOR INDONESIAN)
# ---------------------------------------------------------
class RouteQuery(BaseModel):
    datasource: Literal["vectorstore", "email_tool", "chitchat"] = Field(
        ...,
        description="Route user input based on conversation context."
    )

# 🚀 MAJOR FIX: Explicit Indonesian keywords in the prompt
router_system = """You are an intent classifier.
Analyze the user's latest message AND the chat history.

ROUTING RULES:
1. 'vectorstore': 
   - Questions about files, PDFs, documents, CVs, Reports.
   - Keywords: "summarize", "analisa", "rangkum", "baca", "cari", "lihat", "file", "upload".
   - IF the user asks to "summarize" or "analyze" something, ALWAYS choose 'vectorstore'.

2. 'email_tool': Explicit commands to send email.

3. 'chitchat': Greetings only.

CRITICAL: If ambiguous, lean towards 'vectorstore'.
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
    file_url: str

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

# Add this to your Pydantic models (Near RouteQuery)
class SearchQuery(BaseModel):
    search_keywords: str = Field(
        ...,
        description="The final search keywords in the target document's language. NO explanations."
    )
    explanation: str = Field(
        description="Your internal reasoning (this will be discarded)."
    )

# ---------------------------------------------------------
# FIXED SEARCH NODE
# ---------------------------------------------------------
def search_node(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1].content
    
    # 1. Get History
    history_text = get_history_text(messages[:-1]) 
    
    # 2. Strict Prompt
    analyze_prompt = f"""You are a Search Optimizer.
    
    CONTEXT HISTORY:
    {history_text}
    
    CURRENT INPUT: 
    "{last_message}"
    
    TASK:
    1. Determine what document the user is looking for (e.g., "CV", "Laporan Kerja Sosial").
    2. If the user refers to a previous topic (like "Analyze it"), use the History to find the noun.
    3. Output ONLY the keywords.
    """
    
    # 3. 🚀 FORCE STRUCTURED OUTPUT (This stops the yapping)
    # We ask for a JSON object. We will only use 'search_keywords'.
    structured_llm = llm.with_structured_output(SearchQuery)
    
    try:
        result = structured_llm.invoke(analyze_prompt)
        # Extract ONLY the keywords, ignore the reasoning
        optimized_query = result.search_keywords
    except Exception as e:
        # Fallback if JSON fails
        print(f"⚠️ JSON Parse failed: {e}")
        optimized_query = last_message

    print(f"   [OPTIMIZER] 🔄 Original: '{last_message}'")
    print(f"   [OPTIMIZER] ✅ Cleaned: '{optimized_query}'") # <--- This will now be short!
    
    # 4. Search
    print(f"   [SEARCH] 🔍 Searching Vector Store with: '{optimized_query}'")
    results = vector_store.similarity_search(optimized_query, k=5)
    
    if not results:
        return {"messages": [SystemMessage(content="No docs found.")], "file_url": ""}

    content = "\n\n---\n\n".join([doc.page_content for doc in results])
    source_url = results[0].metadata.get("file_url", "Unknown Link") 

    return {
        "messages": [SystemMessage(content=f"DOCUMENT CONTEXT:\n{content}")],
        "file_url": source_url 
    }

def email_node(state: AgentState):
    last_message = state["messages"][-1].content
    res = send_email.invoke(
        {"recipient": "admin@test.com", "subject": "Action", "body": last_message})
    return {
        "messages": [SystemMessage(content=f"TOOL OUTPUT: {res}")]
    }

def answer_node(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    file_url = state.get("file_url", "")

    # CHECK: Is this a RAG response?
    if isinstance(last_message, SystemMessage) and "DOCUMENT CONTEXT" in last_message.content:

        # Find User Question
        user_question = "Summary"
        for msg in reversed(messages):
            if isinstance(msg, HumanMessage):
                user_question = msg.content
                break

        context_data = last_message.content
        print(f"   [GENERATE] 📝 Analyzing Context for question: '{user_question}'")

        # 🚀 FIX 3: Prompt ignores "how to call tools"
        rag_prompt = f"""You are an intelligent document analyst.
        
        USER REQUEST: "{user_question}"
        
        DOCUMENT CONTENT:
        --------------------------------------------------
        {context_data}
        --------------------------------------------------

        INSTRUCTIONS:
        1. The user might be asking you to "find", "read", or "analyze" this file.
        2. DO NOT interpret their request as a question about "how to use tools".
        3. Ignore phrases like "call tools" or "use vectorstore". 
        4. Fulfill the INTENT (e.g., if they ask for CV, summarize the skills in the text).
        
        Output the analysis now:
        """

        # Invoke LLM (Only once!)
        response = llm.invoke([HumanMessage(content=rag_prompt)])
        ai_text = response.content

        final_json = {
            "answer": ai_text,
            "file_url": file_url
        }

        return {"messages": [AIMessage(content=json.dumps(final_json))]}

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
# EXPORT
# ---------------------------------------------------------
def get_graph_workflow():
    return workflow

# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------
if __name__ == "__main__":
    print(f"⚡ Connecting to Redis at {REDIS_URL}...")

    with RedisSaver.from_conn_string(REDIS_URL) as checkpointer:
        print("🔧 Setting up Redis Indices...")
        checkpointer.setup()

        app = workflow.compile(checkpointer=checkpointer)
        print("🤖 Agent V6 (Fixes: Indo Router + Search Cleaner) Online.")

        config = {"configurable": {"thread_id": "stephen_session_1"}}

        while True:
            try:
                user_input = input("\nYou: ")
                if user_input.lower() in ["quit", "exit"]: break

                for event in app.stream({"messages": [HumanMessage(content=user_input)]}, config=config):
                    if "generate" in event:
                        ai_reply = event['generate']['messages'][-1].content
                        print(f"AI: {ai_reply}")
            except Exception as e:
                print(f"❌ Error: {e}")
                break