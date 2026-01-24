import os
from typing import Annotated, Literal, TypedDict
from dotenv import load_dotenv

# LangChain / LangGraph Imports
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

# 1. Load Config
load_dotenv()
WINDOWS_IP = os.getenv("WINDOWS_IP")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL")
QDRANT_URL = os.getenv("QDRANT_URL")

# 2. Setup Qdrant Retrieval (The Memory)
client = QdrantClient(url=QDRANT_URL)
embeddings = OllamaEmbeddings(base_url=OLLAMA_URL, model="bge-m3")

vector_store = QdrantVectorStore(
    client=client,
    collection_name="user_docs",
    embedding=embeddings,
)

# ---------------------------------------------------------
# DEFINE TOOLS (The Abilities)
# ---------------------------------------------------------

@tool
def search_documents(query: str):
    """
    Use this tool to search for information inside the user's uploaded documents.
    Input should be a specific search query (e.g., 'date of birth in akta').
    """
    print(f"🕵️‍♀️ Agent is searching Qdrant for: '{query}'")
    
    # Search top 3 most relevant chunks
    results = vector_store.similarity_search(query, k=3)
    
    # Combine results into a string
    context = "\n\n".join([doc.page_content for doc in results])
    return context

@tool
def send_email(recipient: str, subject: str, body: str):
    """
    Sends an email. Use this when the user explicitly asks to email someone.
    """
    print(f"📧 Sending email to {recipient}...")
    # (Placeholder logic for now)
    return f"Email successfully sent to {recipient} with subject '{subject}'."

# List of tools available to the LLM
tools = [search_documents, send_email]

# ---------------------------------------------------------
# SETUP THE LLM (The Brain)
# ---------------------------------------------------------
# We use Qwen2.5-VL or Llama3 because they support native tool calling
llm = ChatOllama(
    base_url=OLLAMA_URL,
    model="qwen2.5vl:7b", 
    temperature=0
).bind_tools(tools)

# ---------------------------------------------------------
# LANGGRAPH STATE MACHINE
# ---------------------------------------------------------

class AgentState(TypedDict):
    messages: list

def agent_node(state: AgentState):
    # The agent thinks and decides what to do
    messages = state["messages"]
    response = llm.invoke(messages)
    return {"messages": [response]}

def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
    last_message = state["messages"][-1]
    
    # If the LLM wants to call a tool, go to "tools" node
    if last_message.tool_calls:
        return "tools"
    # Otherwise, stop
    return "__end__"

# Build the Graph
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("agent", agent_node)
workflow.add_node("tools", ToolNode(tools))

# Add Edges (Connections)
workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("tools", "agent") # Loop back to agent after tool execution

# Compile the Brain
app = workflow.compile()

# ---------------------------------------------------------
# INTERACTIVE CHAT LOOP (Run this to chat!)
# ---------------------------------------------------------
if __name__ == "__main__":
    print("🤖 AI Assistant Online. Type 'quit' to exit.")
    
    # Simulate a conversation history
    history = [
        SystemMessage(content="You are a helpful personal assistant. You have access to the user's documents. Always search documents before answering factual questions.")
    ]

    while True:
        user_input = input("\nYou: ")
        if user_input.lower() in ["quit", "exit"]:
            break
        
        # Add user message to history
        history.append(HumanMessage(content=user_input))
        
        # Run the Graph
        # We pass the entire history so the bot remembers context
        final_state = app.invoke({"messages": history})
        
        # Get the AI's final response
        ai_response = final_state["messages"][-1].content
        
        # Append AI response to history
        history.append(final_state["messages"][-1])
        
        print(f"AI: {ai_response}")