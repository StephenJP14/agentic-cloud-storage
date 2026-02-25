import os
import json
from typing import TypedDict, Literal, Annotated
from dotenv import load_dotenv

from langgraph.checkpoint.redis import RedisSaver
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

load_dotenv()
WINDOWS_IP = os.getenv("WINDOWS_IP")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", f"http://{WINDOWS_IP}:11434")
QDRANT_URL = os.getenv("QDRANT_URL", f"http://{WINDOWS_IP}:6333")
REDIS_URL = os.getenv("REDIS_URL", f"redis://{WINDOWS_IP}:6379")

# Setup Vector DB
client = QdrantClient(url=QDRANT_URL)
embeddings = OllamaEmbeddings(base_url=OLLAMA_URL, model="bge-m3")
collection_name = "user_docs"

try:
    client.get_collection(collection_name=collection_name)
except Exception:
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

# Gunakan model Qwen baru untuk Reasoning Chatbot
llm = ChatOllama(base_url=OLLAMA_URL, model="qwen3-vl:8b-instruct", temperature=0.1)

# ROUTER
class RouteQuery(BaseModel):
    datasource: Literal["vectorstore", "chitchat"] = Field(..., description="Route target")

router_prompt = ChatPromptTemplate.from_messages([
    ("system", "Berdasarkan pertanyaan user, tentukan routing. Jika butuh baca file/materi kuliah, pilih 'vectorstore'. Jika sapaan biasa, 'chitchat'."),
    ("human", "{question}"),
])
router_chain = router_prompt | llm.with_structured_output(RouteQuery)

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    context: str
    file_url: str

def get_history_text(messages):
    return "\n".join([f"{'User' if isinstance(m, HumanMessage) else 'AI'}: {m.content}" for m in messages[-4:]])

def router_node(state: AgentState):
    last_message = state["messages"][-1].content
    try:
        decision = router_chain.invoke({"question": last_message}).datasource
    except:
        decision = "chitchat"
    return {"context": decision}

# 🚀 NEW RETRIEVAL STRATEGY: HyDE (Hypothetical Document Embeddings)
def search_node(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1].content
    history_text = get_history_text(messages[:-1]) 
    
    # Langsung suruh Qwen3 untuk menjelaskan materinya sebelum mencari
    hyde_prompt = f"""Sebagai asisten akademik, user bertanya: '{last_message}'.
    Konteks riwayat: {history_text}
    
    Tuliskan penjelasan singkat (1 paragraf) tentang konsep akademik yang dicari. 
    Jika user menggunakan analogi umum, ubah menjadi istilah akademis/teknis yang benar (contoh: 'pill' dalam OOP berarti 'Encapsulation').
    Tulis langsung tebakannya secara akademis tanpa kata pengantar."""
    
    hypothetical_doc = llm.invoke(hyde_prompt).content
    print(f"   [HyDE] 🧠 Hipotesis Akademik: '{hypothetical_doc}'")
    
    # Mencari berdasarkan hipotesis, BUKAN berdasarkan pertanyaan mentah user
    results = vector_store.similarity_search_with_score(hypothetical_doc, k=4)
    
    # Filtering threshold untuk membuang dokumen yang melenceng
    valid_results = [doc for doc, score in results if score >= 0.35]
    
    if not valid_results:
        return {"messages": [SystemMessage(content="No relevant academic docs found.")], "file_url": ""}

    content = "\n\n---\n\n".join([doc.page_content for doc in valid_results])
    source_url = valid_results[0].metadata.get("file_url", "Unknown Link") 

    return {
        "messages": [SystemMessage(content=f"DOCUMENT CONTEXT:\n{content}")],
        "file_url": source_url 
    }

def answer_node(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    file_url = state.get("file_url", "")

    if isinstance(last_message, SystemMessage) and "DOCUMENT CONTEXT" in last_message.content:
        user_question = messages[-2].content if len(messages) > 1 else "Jelaskan."
        
        rag_prompt = f"""Anda adalah dosen AI. Jawab pertanyaan mahasiswa berdasarkan dokumen di bawah ini.
        Jika dokumen tidak memuat jawaban yang relevan, katakan Anda tidak tahu.
        
        PERTANYAAN: "{user_question}"
        
        DOKUMEN:
        {last_message.content}
        """
        
        response = llm.invoke([HumanMessage(content=rag_prompt)])
        final_json = {"answer": response.content, "file_url": file_url}
        return {"messages": [AIMessage(content=json.dumps(final_json))]}

    response = llm.invoke(messages)
    return {"messages": [response]}

workflow = StateGraph(AgentState)
workflow.add_node("router", router_node)
workflow.add_node("search", search_node)
workflow.add_node("generate", answer_node)
workflow.set_entry_point("router")

def route_logic(state):
    return "search" if state["context"] == "vectorstore" else "generate"

workflow.add_conditional_edges("router", route_logic, {"search": "search", "generate": "generate"})
workflow.add_edge("search", "generate")
workflow.add_edge("generate", END)

def get_graph_workflow():
    return workflow