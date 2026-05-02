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
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from langchain_community.document_compressors.flashrank_rerank import FlashrankRerank

from pydantic import BaseModel, Field

from app.services.embed_model import get_embed_model
from app.core.config import OLLAMA_URL, QDRANT_URL, COLLECTION_NAME, COLLECTION_SUMM


load_dotenv()

client = QdrantClient(url=QDRANT_URL)
collection_name = COLLECTION_NAME
collection_summ = COLLECTION_SUMM # NEW: Reference the summary collection

compressor = FlashrankRerank(model="ms-marco-MiniLM-L-12-v2", top_n=15)

llm = ChatOllama(base_url=OLLAMA_URL, model="qwen3-vl:8b-instruct", temperature=0.1, num_ctx=8192)


# ==========================================
# Update Router Logic
# ==========================================
class RouteQuery(BaseModel):
    datasource: Literal["vectorstore", "chitchat", "summarize"] = Field(..., description="Route target")
    query_intent: str = Field(default="", description="The specific topic or document name to summarize")

router_prompt = ChatPromptTemplate.from_messages([
    ("system", """Berdasarkan pertanyaan user, tentukan routing:
    - Jika butuh mencari fakta spesifik/menjawab pertanyaan teknis dari dokumen, pilih 'vectorstore'.
    - Jika meminta ringkasan, kesimpulan, atau summary SELURUH dokumen/topik, pilih 'summarize' dan ekstrak topik/nama filenya.
    - Jika sapaan biasa, pilih 'chitchat'."""),
    ("human", "{question}"),
])
router_chain = router_prompt | llm.with_structured_output(RouteQuery)


# ==========================================
# Agent State
# ==========================================
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    context: str
    file_url: str
    search_queries: list[str]
    retrieved_docs: list[Document]
    filtered_docs: list[Document]
    loop_count: int

def get_history_text(messages):
    return "\n".join([f"{'User' if isinstance(m, HumanMessage) else 'AI'}: {m.content}" for m in messages[-4:]])

def router_node(state: AgentState):
    last_message = state["messages"][-1].content
    try:
        decision = router_chain.invoke({"question": last_message}).datasource
    except:
        decision = "chitchat"
    print(f"🧭 [ROUTER] Keputusan: {decision}")
    return {"context": decision}

# ==========================================
# NEW: Summary Retrieval Node
# ==========================================
def fetch_summary_node(state: AgentState):
    """Bypasses standard RAG and fetches pre-computed summaries using Hybrid Search + Reranking."""
    question = state["messages"][-1].content
    embed_model = get_embed_model()
    
    print("📚 [SUMMARY] Mengambil pre-computed summary via Hybrid Search...")
    
    # Encode with both dense and sparse vectors for Hybrid Search
    query_embeddings = embed_model.encode(question, return_dense=True, return_sparse=True)
    dense_vec = query_embeddings['dense_vecs'].tolist()
    lexical_weights = query_embeddings['lexical_weights']
    
    # Token deduplication for sparse vector
    tokens = list(lexical_weights.keys())
    weights = list(lexical_weights.values())
    token_ids = embed_model.tokenizer.convert_tokens_to_ids(tokens)
    
    dedup_sparse = {}
    for idx, w in zip(token_ids, weights):
        if idx not in dedup_sparse or w > dedup_sparse[idx]:
            dedup_sparse[idx] = w
    
    sparse_vector = models.SparseVector(
        indices=list(dedup_sparse.keys()),
        values=list(dedup_sparse.values())
    )
    
    # Hybrid Search with RRF Fusion (same strategy as search_node)
    results = client.query_points(
        collection_name=collection_summ,
        prefetch=[
            models.Prefetch(query=dense_vec, using="", limit=5),
            models.Prefetch(query=sparse_vector, using="sparse", limit=5),
        ],
        query=models.FusionQuery(fusion=models.Fusion.RRF),
        limit=5,
        with_payload=True
    ).points
    
    if not results:
        return {"messages": [AIMessage(content="Maaf, saya tidak menemukan ringkasan dokumen yang relevan di sistem.")]}
    
    # Convert to Documents for reranking
    summary_docs = [
        Document(page_content=p.payload["text"], metadata=p.payload)
        for p in results
    ]
    
    # Rerank summaries for relevance
    reranked_summaries = compressor.compress_documents(documents=summary_docs, query=question)
    print(f"✨ [SUMMARY] {len(reranked_summaries)} ringkasan setelah reranking.")
    
    if not reranked_summaries:
        return {"messages": [AIMessage(content="Maaf, saya tidak menemukan ringkasan dokumen yang relevan di sistem.")]}
    
    # Build prompt from reranked results
    retrieved_summaries = "\n\n".join([
        f"Sumber: {d.metadata.get('filename')}\n{d.page_content}" 
        for d in reranked_summaries
    ])
    
    print("📊 [INSIGHT] Ringkasan yang diambil:")
    print(retrieved_summaries)

    print("📖 [PROMPT] Membangun prompt untuk generasi jawaban...")

    prompt = f"""Anda adalah asisten akademik. Tugas Anda ADALAH merangkum materi berdasarkan Data Ringkasan yang diberikan di bawah ini. 
    ATURAN KRUSIAL:
    1. JANGAN meminta pengguna untuk mengirimkan materi. Materinya sudah ada di Data Ringkasan.
    2. Gunakan HANYA informasi dari Data Ringkasan.
    
    Data Ringkasan:
    {retrieved_summaries}
    
    Pertanyaan User: {question}"""
    
    final_answer = llm.invoke(prompt).content
    print("✨ [SUMMARY] Ringkasan berhasil diberikan ke user.")
    
    # We inject it as a message, and set context to "done" to skip the rest of the graph
    return {"messages": [AIMessage(content=final_answer)]}

def expand_query_node(state: AgentState):
    """
    Strategy #6: Multi-Query RAG. 
    Expands the user query into 3 distinct variations for better recall.
    """
    original_query = state["messages"][-1].content
    print(f"🧠 [MULTI-QUERY] Mengekspansi: '{original_query}'")
    
    prompt = f"""Sebagai AI Architect, kembangkan kueri pengguna berikut menjadi 3 kueri pencarian mandiri untuk sistem Retrieval-Augmented Generation (RAG). 
    Fokus pada penambahan kata kunci teknis, sinonim industri, dan variasi frasa agar sistem dapat menangkap dokumen yang relevan meskipun kosa katanya berbeda.
    
    Kueri asli: {original_query}
    
    Output HANYA 3 baris teks, tanpa penomoran, tanpa tanda kutip, dan tanpa pengantar."""
    
    response = llm.invoke(prompt).content
    queries = [q.strip() for q in response.split('\n') if q.strip()]
    if original_query not in queries:
        queries.insert(0, original_query)
        
    return {"search_queries": queries[:4], "loop_count": state.get("loop_count", 0) + 1}

def search_node(state: AgentState):
    embed_model = get_embed_model() 
    queries = state["search_queries"]
    all_raw_results = []
    
    print(f"📡 [RETRIEVAL] Menjalankan Hybrid Search untuk {len(queries)} variasi kueri...")
    
    for q in queries:
        query_embeddings = embed_model.encode(q, return_dense=True, return_sparse=True)
        dense_vec = query_embeddings['dense_vecs'].tolist()
        lexical_weights = query_embeddings['lexical_weights']
        
        tokens = list(lexical_weights.keys())
        weights = list(lexical_weights.values())
        token_ids = embed_model.tokenizer.convert_tokens_to_ids(tokens)
        
        dedup_sparse = {}
        for idx, w in zip(token_ids, weights):
            if idx not in dedup_sparse or w > dedup_sparse[idx]:
                dedup_sparse[idx] = w
        
        sparse_vector = models.SparseVector(
            indices=list(dedup_sparse.keys()),
            values=list(dedup_sparse.values())
        )

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
        
        all_raw_results.extend(raw_results)
        
    unique_results = {res.payload['chunk_id']: res for res in all_raw_results}.values()
    
    retrieved_docs = [
        Document(page_content=p.payload["text"], metadata=p.payload)
        for p in unique_results
    ]
    
    original_query = state["messages"][-1].content
    reranked_docs = compressor.compress_documents(documents=retrieved_docs, query=original_query)
    
    file_url = ""
    if reranked_docs:
        file_url = reranked_docs[0].metadata.get("file_url", "")
    
    print(f"✨ [RESULT] {len(reranked_docs)} dokumen setelah reranking.")
    return {"retrieved_docs": list(reranked_docs), "file_url": file_url}

def grade_context_node(state: AgentState):
    """Anti-Hallucination Gatekeeper — grades document relevance."""
    docs = state["retrieved_docs"]
    question = state["messages"][-1].content
    filtered = []
    
    print("⚖️ [GRADING] Memvalidasi relevansi dokumen...")
    for doc in docs:
        prompt = f"""Does the following document contain ANY information that could be even slightly helpful in answering this question? 
        Question: {question}
        Document: {doc.page_content}
        Answer ONLY 'yes' or 'no'."""
        
        score = llm.invoke(prompt).content.strip().lower()
        if 'yes' in score:
            filtered.append(doc)
            
    print(f"🛡️ [FILTER] Lolos filter: {len(filtered)} dari {len(docs)} dokumen.")
    return {"filtered_docs": filtered}

# ==========================================
# RAG Prompt Builder (used by main.py for both streaming & non-streaming)
# ==========================================
def build_rag_prompt(docs: list[Document], user_question: str) -> str:
    formatted_docs = "\n\n".join([
        f"[NAMA FILE: {d.metadata.get('filename')}] [SUMBER: {d.metadata.get('source_type')}]\n{d.page_content}" 
        for d in docs
    ])
    return f"""Anda adalah asisten akademik Agentic AI. Jawab pertanyaan berdasarkan DOKUMEN di bawah.
ATURAN KRUSIAL:
1. Jika terdapat kontradiksi antara sumber TEKS dan GAMBAR/DIAGRAM, sebutkan perbedaannya secara eksplisit.
2. Jangan menebak. Gunakan HANYA informasi dari dokumen.
3. Jawab dengan lengkap dan jelas dalam bahasa yang sesuai pertanyaan.

PERTANYAAN: "{user_question}"

DOKUMEN:
{formatted_docs}
"""

# ==========================================
# New Conditional Routing Logic
# ==========================================
def check_hallucination_and_retry(state: AgentState):
    """
    Decides whether to proceed to generation or loop back if all docs were irrelevant.
    """
    filtered_docs = state.get("filtered_docs", [])
    loop_count = state.get("loop_count", 0)
    
    if len(filtered_docs) == 0:
        if loop_count < 3: # Max 3 retries
            print(f"🔄 [RETRY] Dokumen tidak relevan. Mencoba lagi... (Attempt {loop_count}/3)")
            return "expand_query"
        else:
            print("🛑 [STOP] Batas loop tercapai. Melanjutkan dengan konteks kosong.")
            return "done"
    
    print("✅ [SUCCESS] Dokumen relevan ditemukan. Lanjut ke generasi jawaban.")
    return "done"


# ==========================================
# Graph Architecture (Updated with Cycles)
# ==========================================
workflow = StateGraph(AgentState)
workflow.add_node("router", router_node)
workflow.add_node("expand_query", expand_query_node)
workflow.add_node("search", search_node)
workflow.add_node("grade", grade_context_node)
workflow.add_node("fetch_summary", fetch_summary_node) # NEW NODE

workflow.set_entry_point("router")

def route_logic(state):
    if state["context"] == "vectorstore":
        return "expand_query"
    elif state["context"] == "summarize":
        return "fetch_summary"
    else:
        return "done"

workflow.add_conditional_edges("router", route_logic, {
    "expand_query": "expand_query",
    "fetch_summary": "fetch_summary", # NEW ROUTE
    "done": END
})

# Route summary node directly to END since it handles generation internally
workflow.add_edge("fetch_summary", END) 

workflow.add_edge("expand_query", "search")
workflow.add_edge("search", "grade")

# [FIX: Add the cyclic edge to enable Self-Reflective RAG]
workflow.add_conditional_edges("grade", check_hallucination_and_retry, {
    "expand_query": "expand_query", # Loop back to expand/rewrite
    "done": END
})