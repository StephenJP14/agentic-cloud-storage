import os
from typing import Annotated, Literal, TypedDict
from dotenv import load_dotenv

# LangChain / LangGraph Imports
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage, BaseMessage
from langchain_core.tools import tool

# 1. Load Config
load_dotenv()
WINDOWS_IP = os.getenv("WINDOWS_IP")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL")
QDRANT_URL = os.getenv("QDRANT_URL")

# 2. Setup Qdrant Retrieval
client = QdrantClient(url=QDRANT_URL)
embeddings = OllamaEmbeddings(base_url=OLLAMA_URL, model="bge-m3")

vector_store = QdrantVectorStore(
    client=client,
    collection_name="user_docs",
    embedding=embeddings,
)

# ---------------------------------------------------------
# DEFINE TOOLS (PERBAIKAN DOCSTRING)
# ---------------------------------------------------------
# Kita persingkat dan pertajam deskripsinya agar model tidak bingung.

@tool
def search_documents(query: str):
    """
    Call this tool ONLY when the user asks a question about their personal files, documents, identity (KTP/SIM), invoices, or specific data stored in the database.
    DO NOT call this tool for general greetings (hi, hello), general knowledge (who is president?), or math.
    """
    print(f"🕵️‍♀️ Agent is searching Qdrant for: '{query}'")
    results = vector_store.similarity_search(query, k=3)
    context = "\n\n".join([doc.page_content for doc in results])
    if not context:
        return "No relevant documents found."
    return context

@tool
def send_email(recipient: str, subject: str, body: str):
    """
    Call this tool ONLY when the user explicitly gives a command to send an email.
    """
    print(f"📧 Sending email to {recipient}...")
    return f"Email successfully sent to {recipient}."

tools = [search_documents, send_email]

# ---------------------------------------------------------
# SETUP THE BRAIN
# ---------------------------------------------------------
llm = ChatOllama(
    base_url=OLLAMA_URL,
    model="llama3.1:8b", 
    temperature=0  # TURUNKAN KE 0 agar model lebih patuh instruksi (kurangi kreatifitas liar)
).bind_tools(tools)

# ---------------------------------------------------------
# LANGGRAPH LOGIC
# ---------------------------------------------------------

class AgentState(TypedDict):
    messages: list[BaseMessage]

def agent_node(state: AgentState):
    return {"messages": [llm.invoke(state["messages"])]}

def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return "__end__"

workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", ToolNode(tools))
workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("tools", "agent")
app = workflow.compile()

# ---------------------------------------------------------
# INTERACTIVE CHAT LOOP
# ---------------------------------------------------------
if __name__ == "__main__":
    print("🤖 AI Assistant Online. Type 'quit' to exit.")

    # --- THE FIXED SYSTEM PROMPT ---
    # Perubahan: 
    # 1. Hapus contoh spesifik yang membingungkan (seperti "2+2").
    # 2. Gunakan format "Decision Logic" agar AI berpikir dulu.
    
    SYSTEM_PROMPT = """You are a sophisticated personal assistant named 'Jarvis'.
    
    YOUR DECISION LOGIC:
    1. Check if the user's message is a greeting (e.g., "hi", "hello", "thanks") or small talk.
       -> If YES: Reply naturally and politely. DO NOT call any tools.
       
    2. Check if the user is asking about general knowledge (e.g., "Who is Einstein?", "Capital of France?").
       -> If YES: Answer from your own knowledge. DO NOT call 'search_documents'.
       
    3. Check if the user is asking about PERSONAL data (e.g., "My KTP", "My Invoice", "Summary of uploaded file").
       -> If YES: You MUST call the 'search_documents' tool.
       
    4. Check if the user wants to perform an action (e.g., "Email Budi").
       -> If YES: Call the 'send_email' tool.

    IMPORTANT: Never call a tool unless necessary. If you just want to talk, just talk.
    """

    # Inisialisasi history
    history = [SystemMessage(content=SYSTEM_PROMPT)]

    while True:
        try:
            user_input = input("\nYou: ")
            if user_input.lower() in ["quit", "exit"]:
                break
            
            history.append(HumanMessage(content=user_input))
            
            final_state = app.invoke({"messages": history}, config={"recursion_limit": 10})
            
            # Ambil pesan terakhir
            ai_msg = final_state["messages"][-1]
            print(f"AI: {ai_msg.content}")

            # Update history dengan benar
            new_messages = final_state["messages"][len(history):]
            history.extend(new_messages)

        except Exception as e:
            print(f"❌ Error: {e}")