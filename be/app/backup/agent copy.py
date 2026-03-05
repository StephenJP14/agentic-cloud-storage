import os
import json
from typing import TypedDict, Literal, Annotated
from dotenv import load_dotenv

from langgraph.checkpoint.redis import RedisSaver
from langchain_ollama import ChatOllama
from qdrant_client import QdrantClient
from qdrant_client.http import models

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document

from pydantic import BaseModel, Field
from .embed_model import get_embed_model

from langchain_community.document_compressors.flashrank_rerank import FlashrankRerank

load_dotenv()
WINDOWS_IP = os.getenv("WINDOWS_IP", "127.0.0.1")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", f"http://{WINDOWS_IP}:11434")
QDRANT_URL = os.getenv("QDRANT_URL", f"http://{WINDOWS_IP}:6333")
REDIS_URL = os.getenv("REDIS_URL", f"redis://{WINDOWS_IP}:6379")

client = QdrantClient(url=QDRANT_URL)
collection_name = "user_docs"

# print("Memuat BGE-M3 Model...")

compressor = FlashrankRerank(model="ms-marco-MiniLM-L-12-v2", top_n=5)

llm = ChatOllama(base_url=OLLAMA_URL, model="qwen3-vl:8b-instruct", temperature=0.1, num_ctx=8192)

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

def search_node(state: AgentState):
    embed_model = get_embed_model() # Muat di sini

    messages = state["messages"]
    original_query = messages[-1].content
    history_text = get_history_text(messages[:-1]) 
    
    print(f"\n🔍 [QUERY] User bertanya: '{original_query}'")

    hyde_prompt = f"""Sebagai asisten akademik, buatlah 1 paragraf penjelasan/tebakan akademis untuk pertanyaan berikut.
    Pertanyaan User: '{original_query}'
    Konteks Chat: {history_text}
    ATURAN KRUSIAL: ... Tulis langsung tanpa pengantar."""
    
    hyde_query = llm.invoke(hyde_prompt).content
    print(f"🧠 [HyDE] Hipotesis Akademik: '{hyde_query}'")

    search_query = f"{original_query} {hyde_query}"

    query_embeddings = embed_model.encode(search_query, return_dense=True, return_sparse=True)
    dense_vec = query_embeddings['dense_vecs'].tolist()
    lexical_weights = query_embeddings['lexical_weights']
    
    tokens = list(lexical_weights.keys())
    weights = list(lexical_weights.values())
    token_ids = embed_model.tokenizer.convert_tokens_to_ids(tokens)
    
    # --- FIX: DEDUPLIKASI TOKEN DI SEARCH NODE ---
    dedup_sparse = {}
    for idx, w in zip(token_ids, weights):
        if idx not in dedup_sparse or w > dedup_sparse[idx]:
            dedup_sparse[idx] = w
    
    final_indices = list(dedup_sparse.keys())
    final_values = list(dedup_sparse.values())
    # ---------------------------------------------

    sparse_vector = models.SparseVector(
        indices=final_indices,
        values=final_values
    )

    print(f"📡 [RETRIEVAL] Menjalankan Hybrid Search (RRF) di Qdrant...")
    raw_results = client.query_points(
        collection_name=collection_name,
        prefetch=[
            models.Prefetch(query=dense_vec, using="", limit=10),
            models.Prefetch(query=sparse_vector, using="sparse", limit=10),
        ],
        query=models.FusionQuery(fusion=models.Fusion.RRF),
        limit=10,
        with_payload=True
    ).points

    retrieved_docs = [
        Document(page_content=point.payload["text"], metadata=point.payload)
        for point in raw_results
    ]

    reranked_docs = compressor.compress_documents(documents=retrieved_docs, query=search_query)

    if not reranked_docs:
        print("⚠️ [RESULT] Tidak ditemukan dokumen relevan.")
        return {"messages": [SystemMessage(content="No relevant academic docs found.")], "file_url": ""}

    print(f"✨ [RESULT] Menemukan {len(raw_results)} chunk relevan.")
    # print("Contoh chunk:\n", reranked_docs[0].page_content)
    
    # [MODIFIED] Format dokumen agar LLM tahu Nama File, Halaman, dan JENIS SUMBER
    formatted_docs = []
    for doc in reranked_docs:
        text = doc.page_content
        print(f"\n📄 [RAW CHUNK] {text[:100]}...")  # Debug: Tampilkan potongan awal teks
        filename = doc.metadata.get("filename", "Unknown File")
        page_num = doc.metadata.get("page_number", "?")
        source_type = doc.metadata.get("source_type", "text_paragraph")
        
        # Mapping tipe sumber ke label yang lebih mudah dipahami LLM
        type_label = "GAMBAR/DIAGRAM" if source_type == "image_ocr" else "TEKS"

        formatted_docs.append(f"[NAMA FILE: {filename}] [HALAMAN: {page_num}] [SUMBER: {type_label}]\n{text}")

    content = "\n\n====================\n\n".join(formatted_docs)
    source_url = reranked_docs[0].metadata.get("file_url", "Unknown Link") 

    return {
        "messages": [SystemMessage(content=f"DOCUMENT CONTEXT:\n{content}")],
        "file_url": source_url 
    }

# ==========================================
# [MODIFIED] ANSWER NODE DENGAN STRUCTURED JSON OUTPUT
# ==========================================
class Citation(BaseModel):
    exact_quote: str = Field(description="Kutipan persis dari dokumen yang mendukung kalimat Anda.")
    page_number: str = Field(description="Nomor halaman dari referensi. Ambil dari tag [HALAMAN: X].")
    filename: str = Field(description="Nama file dokumen sumber referensi. Ambil dari tag [NAMA FILE: X].")
    source_type: str = Field(description="Jenis sumber informasi. Ambil dari tag [SUMBER: X].") # [NEW] Metadata untuk Verifikator

class AnswerWithSources(BaseModel):
    answer: str = Field(description="Jawaban utama Anda. Gunakan penanda seperti [1] jika merujuk ke citation di bawah.")
    citations: list[Citation] = Field(description="Daftar referensi yang Anda ekstrak dari dokumen.")

def answer_node(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]

    if isinstance(last_message, SystemMessage) and "DOCUMENT CONTEXT" in last_message.content:
        user_question = messages[-2].content if len(messages) > 1 else "Jelaskan."
        
        structured_llm = llm.with_structured_output(AnswerWithSources)
        
        # [MODIFIED] Meminta LLM melihat tag [SUMBER: ...]
        rag_prompt = f"""Anda asisten akademik. Jawab pertanyaan berdasarkan DOKUMEN di bawah.
        1. Jawab pertanyaan dengan baik. Akhiri kalimat yang merujuk pada dokumen dengan angka referensi, misal [1].
        2. Ekstrak kutipan kalimat ASLI secara persis dari teks sebagai 'exact_quote'.
        3. Bandingkan konteks dari [SUMBER: TEKS] dan [SUMBER: GAMBAR/DIAGRAM] bila keduanya tersedia.
        4. Lihat penanda [NAMA FILE: ...], [HALAMAN: ...], dan [SUMBER: ...] untuk melengkapi datanya.
        
        PERTANYAAN: "{user_question}"
        
        DOKUMEN:
        {last_message.content}
        """
        
        try:
            response_obj = structured_llm.invoke([HumanMessage(content=rag_prompt)])
            json_result = response_obj.model_dump_json()
            return {"messages": [AIMessage(content=json_result)]}
        except Exception as e:
            print("Structured output error:", e)
            return {"messages": [AIMessage(content=f'{{"answer": "Maaf, terjadi kesalahan saat memformat jawaban.", "citations": []}}')]}

    response = llm.invoke(messages)
    chitchat_json = json.dumps({"answer": response.content, "citations": []})
    return {"messages": [AIMessage(content=chitchat_json)]}

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