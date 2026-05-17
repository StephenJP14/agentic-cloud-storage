import os
import json
import requests
import datetime
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
collection_summ = COLLECTION_SUMM

compressor = FlashrankRerank(model="ms-marco-MiniLM-L-12-v2", top_n=15)
llm = ChatOllama(base_url=OLLAMA_URL, model="qwen3-vl:8b-instruct", temperature=0.1, num_ctx=8192)

# ==========================================
# Schema Ekstraksi Data Sesuai Atribut Go
# ==========================================
class PartialFormExtractor(BaseModel):
    name: str = Field(default="", description="Nama lengkap user")
    email: str = Field(default="", description="Email aktif user")
    phone_number: str = Field(default="", description="Nomor WhatsApp/HP user (hanya angka)")
    address: str = Field(default="", description="Alamat lengkap user untuk kedatangan teknisi")
    product_type: str = Field(default="Laptop", description="Jenis produk (contoh: Laptop, PC, All-in-One)")
    product_sn: str = Field(default="", description="Serial Number (SN) perangkat laptop/PC jika ada")
    complaints: str = Field(default="", description="Keluhan kendala kerusakan laptop")

capture_prompt = ChatPromptTemplate.from_messages([
    ("system", """Anda adalah parser JSON ketat untuk Service Center Zyrex.
Tugas Anda adalah mengekstrak informasi dari pesan terakhir user ke dalam schema yang ditentukan.

Aturan Pemetaan:
- "Phone" atau "No HP" atau "WhatsApp" -> ekstrak ke 'phone_number' (hanya angka)
- "Product SN" atau "SN" -> ekstrak ke 'product_sn'
- "Address" -> ekstrak ke 'address'
- "Complaints" atau "Keluhan" -> ekstrak ke 'complaints'

PENTING: JANGAN memberikan salam, jangan membuat format laporan baru. Cukup ekstrak datanya saja ke bidang yang tepat. Jika tidak ada, biarkan kosong."""),
    ("human", "{question}")
])
capture_chain = capture_prompt | llm.with_structured_output(PartialFormExtractor)

# ==========================================
# Router Chain (Hanya dipakai jika kondisi aman)
# ==========================================
class RouteQuery(BaseModel):
    datasource: Literal["vectorstore", "chitchat", "summarize", "service_capture"] = Field(..., description="Route target")

router_prompt = ChatPromptTemplate.from_messages([
    ("system", """Berdasarkan pertanyaan terakhir user, tentukan routing:
    - Jika menanyakan masalah teknis laptop (bluescreen, lambat, error, port rusak), pilih 'vectorstore'.
    - Jika meminta ringkasan produk/buku manual, pilih 'summarize'.
    - Jika sapaan biasa (halo, hai), pilih 'chitchat'.
    - Jika menyetujui booking atau memberikan data diri, pilih 'service_capture'."""),
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
    is_booking_mode: bool
    extracted_form_data: dict

# ==========================================
# DETERMINISTIC ROUTER NODE (BYPASS LLM)
# ==========================================
def router_node(state: AgentState):
    # .strip() membuang spasi hantu di awal/akhir, .lower() menyamakan huruf kecil
    last_message = state["messages"][-1].content.strip().lower()
    print(f"🕵️ [ROUTER DEBUG] Pesan Terakhir User: '{last_message}'")
    
    # KONDISI KHUSUS 1: Jika sudah dalam mode booking, kunci terus di service_capture
    if state.get("is_booking_mode", False):
        print("🧭 [ROUTER] State Lock: User sedang mengisi form booking.")
        return {"context": "service_capture"}
        
    # KONDISI KHUSUS 2: Cek riwayat apakah bot di pesan sebelumnya menawarkan booking
    ai_offered = False
    for msg in reversed(state["messages"][:-1]):
        if msg.type == "ai":
            ai_content = msg.content.lower()
            if "booking service" in ai_content or "booking servis" in ai_content:
                ai_offered = True
                print(f"🎯 [ROUTER DEBUG] Terdeteksi AI menawarkan booking sebelumnya: '{msg.content[:30]}...'")
                break
                
    # KONDISI MUTLAK (Bypass LLM secara agresif):
    # Daftar kata persetujuan pendek dari user
    positive_answers = ["boleh", "mau", "iya", "ya", "silakan", "silahkan", "oke", "ok", "bisa"]
    
    # Pengecekan A: Jika AI menawarkan booking DAN user merespon dengan kata persetujuan pendek
    is_positive_respond = any(tgt == last_message or last_message.startswith(tgt) for tgt in positive_answers)
    
    # Pengecekan B: Jika user langsung mengetik kalimat booking secara mandiri
    is_direct_booking_intent = any(kw in last_message for kw in ["bantu booking", "booking service", "booking servis", "buatkan jadwal", "mau service", "mau servis"])
    
    # Pengecekan C: BARU - Jika user langsung mengisi/mengirimkan potongan form (copy-paste form)
    is_submitting_form = any(field in last_message for field in ["nama:", "phone:", "address:", "product sn:"])
    
    if (ai_offered and is_positive_respond) or is_direct_booking_intent or is_submitting_form:
        print("🧭 [ROUTER] HARD LOCK TRIGGERED: Memaksa masuk ke node service_capture.")
        return {"context": "service_capture"}
        
    # Jalur normal via LLM untuk kueri pencarian dokumen teknis jika tidak ada trigger booking
    try:
        decision = router_chain.invoke({"question": state["messages"][-1].content}).datasource
    except Exception as e:
        print(f"❌ [ROUTER ERROR] Fallback ke chitchat: {e}")
        decision = "chitchat"
        
    print(f"🧭 [ROUTER] Keputusan Akhir: {decision}")
    return {"context": decision}

# ==========================================
# NODE: Chitchat
# ==========================================
def chitchat_node(state: AgentState):
    last_message = state["messages"][-1].content
    prompt = f"Anda adalah Tech Support Assistant Laptop Zyrex. Jawab sapaan ramah ini secara singkat: {last_message}"
    response = llm.invoke(prompt).content
    return {"messages": [AIMessage(content=response)]}

# ==========================================
# Prompt Builder & Generator untuk RAG
# ==========================================
def build_rag_prompt(docs: list[Document], user_question: str) -> str:
    formatted_docs = "\n\n".join([
        f"[PERANGKAT: {d.metadata.get('product_category', 'Umum')}] [NAMA FILE: {d.metadata.get('filename', 'Manual')}]\n{d.page_content}" 
        for d in docs
    ])
    return f"""Anda adalah Tech Support Assistant Resmi Zyrex. Jawab pertanyaan pengguna berdasarkan BUKU MANUAL di bawah ini.
ATURAN KRUSIAL:
1. Pandu pengguna langkah demi langkah jika mereka bertanya tentang troubleshooting.
2. Jangan menebak spesifikasi. Gunakan HANYA informasi dari dokumen.
3. ATURAN WAJIB: Di akhir jawaban Anda, Anda WAJIB menawarkan booking service kepada pengguna dengan format kalimat tepat seperti di bawah ini:
"Jika setelah mencoba langkah-langkah di atas masalah tetap berlanjut, kemungkinan ada masalah perangkat lunak atau perangkat keras yang memerlukan penanganan lebih lanjut.
Apakah Anda ingin saya bantu booking service untuk kendala ini?

Jika iya, silahkan lengkapi form ini:
Nama: [Isi Nama Lengkap]
Phone: [Isi Nomor HP/WhatsApp]
Email: [Isi Alamat Email]
Address: [Isi Alamat Lengkap]
Product Type: Laptop
Product SN: [Isi Serial Number Perangkat]
Complaints: [Detail Keluhan]"

PERTANYAAN: "{user_question}"

DOKUMEN MANUAL:
{formatted_docs}
"""

def generate_answer_node(state: AgentState):
    print("✍️ [GENERATION] Membangun jawaban RAG...")
    question = state["messages"][-1].content
    docs = state.get("filtered_docs", [])
    prompt = build_rag_prompt(docs, question)
    response = llm.invoke(prompt).content
    return {"messages": [AIMessage(content=response)]}

# ==========================================
# NODE INTERAKTIF: Service Capture (DIKUNCI KETAT)
# ==========================================
def service_capture_node(state: AgentState):
    question = state["messages"][-1].content
    print("📋 [CAPTURE] Memproses penangkapan data formulir...")
    
    form_data = state.get("extracted_form_data")
    if not form_data:
        form_data = {
            "name": "", 
            "email": "", 
            "phone_number": "", 
            "address": "",
            "product_type": "Laptop",
            "product_sn": "",
            "complaints": ""
        }
        
    if not form_data["complaints"]:
        for msg in reversed(state["messages"][:-1]):
            if msg.type == "human" and any(kwd in msg.content.lower() for kwd in ["bluescreen", "rusak", "mati", "error", "blank", "kendala", "masalah"]):
                form_data["complaints"] = msg.content
                break
        if not form_data["complaints"]:
            form_data["complaints"] = "Perbaikan kendala sistem perangkat laptop"

    # Cek apakah ini kata konfirmasi pendek, jika BUKAN, maka jalankan ekstraksi LLM
    bypass_keywords = ["boleh", "mau", "iya", "ya", "silakan", "silahkan", "bantu booking"]
    is_short_confirm = any(kw == question.strip().lower() for kw in bypass_keywords)

    if not is_short_confirm:
        try:
            print("🧠 [CAPTURE] Mengirim ke LLM Extractor...")
            new_extract = capture_chain.invoke({"question": question})
            print(f"🔍 [CAPTURE DEBUG] Hasil LLM Extractor: {new_extract}")
            
            if new_extract.name and "[isi" not in new_extract.name.lower(): form_data["name"] = new_extract.name
            if new_extract.email and "[isi" not in new_extract.email.lower(): form_data["email"] = new_extract.email
            if new_extract.phone_number and "[isi" not in new_extract.phone_number.lower(): form_data["phone_number"] = new_extract.phone_number
            if new_extract.address and "[isi" not in new_extract.address.lower(): form_data["address"] = new_extract.address
            if new_extract.product_type and "[isi" not in new_extract.product_type.lower(): form_data["product_type"] = new_extract.product_type
            if new_extract.product_sn and "[isi" not in new_extract.product_sn.lower(): form_data["product_sn"] = new_extract.product_sn
            if new_extract.complaints and "[isi" not in new_extract.complaints.lower(): form_data["complaints"] = new_extract.complaints
        except Exception as e:
            print(f"❌ [EXTRACT ERROR] Gagal ekstraksi structured output: {str(e)}")

    # Validasi field yang kosong
    missing_fields = []
    if not form_data["name"]: missing_fields.append("Nama")
    if not form_data["phone_number"]: missing_fields.append("Phone")
    if not form_data["email"]: missing_fields.append("Email")
    if not form_data["address"]: missing_fields.append("Address")
    if not form_data["product_sn"]: missing_fields.append("Product SN")

    print(f"📊 [CAPTURE DEBUG] Current Form Data: {form_data}")
    print(f"❌ [CAPTURE DEBUG] Missing Fields: {missing_fields}")

    # JIKA DATA MASIH ADA YANG KOSONG -> RE-ASK TEMPLATE
    if missing_fields:
        tpl_name = form_data["name"] if form_data["name"] else "[Isi Nama Lengkap]"
        tpl_phone = form_data["phone_number"] if form_data["phone_number"] else "[Isi Nomor HP/WhatsApp]"
        tpl_email = form_data["email"] if form_data["email"] else "[Isi Alamat Email]"
        tpl_address = form_data["address"] if form_data["address"] else "[Isi Alamat Lengkap]"
        tpl_prod_type = form_data["product_type"] if form_data["product_type"] else "Laptop"
        tpl_prod_sn = form_data["product_sn"] if form_data["product_sn"] else "[Isi Serial Number Perangkat]"
        tpl_complaints = form_data["complaints"] if form_data["complaints"] else "[Detail Keluhan]"

        bot_message = (
            f"Mohon maaf, data pendaftaran Anda belum lengkap ({', '.join(missing_fields)}).\n"
            f"Silakan salin dan lengkapi kembali format data di bawah ini:\n\n"
            f"```text\n"
            f"Nama: {tpl_name}\n"
            f"Phone: {tpl_phone}\n"
            f"Email: {tpl_email}\n"
            f"Address: {tpl_address}\n"
            f"Product Type: {tpl_prod_type}\n"
            f"Product SN: {tpl_prod_sn}\n"
            f"Complaints: {tpl_complaints}\n"
            f"```\n"
            f"*Catatan: Pastikan semua tanda kurung kotak [ ] sudah diganti dengan data Anda.*"
        )
        
        return {
            "messages": [AIMessage(content=bot_message)],
            "is_booking_mode": True,
            "extracted_form_data": form_data
        }

    # JIKA DATA LENGKAP -> KIRIM KE API BACKEND GO
    print("🚀 [API SERVICE] Data 100% lengkap! Mengirim payload ke Backend Go...")
    go_backend_url = os.getenv("GO_BACKEND_URL", "http://backend-go:8080") 
    session = requests.Session()

    try:
        login_res = session.post(f"{go_backend_url}/api/auth/login", json={"username": "Administrator", "password": "123"}, timeout=5)
        if login_res.status_code != 200:
            return {"messages": [AIMessage(content="Gagal membuat tiket otomatis karena masalah autentikasi internal server Go.")], "is_booking_mode": False, "extracted_form_data": None}
    except Exception as e:
        return {"messages": [AIMessage(content="Gagal terhubung dengan server utama.")], "is_booking_mode": False, "extracted_form_data": None}

    ticket_id = f"ZMB/{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
    today_str = datetime.datetime.now().strftime("%Y-%m-%d")

    go_payload = {
        "ticket_id": ticket_id,
        "name": form_data["name"],
        "partner": None,
        "agent": None,
        "email": form_data["email"],
        "phone_number": form_data["phone_number"],
        "address": form_data["address"],          
        "branch_id": "1",
        "product_sn": form_data["product_sn"],    
        "product_type": form_data["product_type"],
        "complaints": form_data["complaints"],    
        "service_date": today_str,                
        "service_type": "On-Site",
        "technician_name": None
    }

    try:
        response = session.post(f"{go_backend_url}/api/cs/", json=go_payload, timeout=10)
        if response.status_code == 201:
            feedback = (
                f"### Booking Service Berhasil! 🎉\n\n"
                f"Tiket perbaikan Anda telah berhasil dibuat di sistem database kami:\n\n"
                f"* **Nomor Tiket:** `{ticket_id}`\n"
                f"* **Nama Pelapor:** {form_data['name']}\n"
                f"* **Nomor HP:** {form_data['phone_number']}\n"
                f"* **Alamat Lengkap:** {form_data['address']}\n"
                f"* **Perangkat:** {form_data['product_type']} ({form_data['product_sn']})\n"
                f"* **Keluhan:** *{form_data['complaints']}*\n\n"
                f"Tim teknisi kami akan segera menghubungi Anda untuk konfirmasi jadwal kedatangan. Terima kasih!"
            )
        elif response.status_code == 400:
            error_data = response.json()
            feedback = f"Gagal mendaftarkan servis: **{error_data.get('message', 'Format input salah')}**. Periksa nomor WhatsApp/email Anda."
        else:
            feedback = "Gagal memproses pendaftaran formulir ke database utama Go."
    except Exception as e:
        feedback = "Terjadi kesalahan jaringan saat mengirim data servis Anda."

    return {
        "messages": [AIMessage(content=feedback)],
        "is_booking_mode": False,
        "extracted_form_data": None
    }

# ==========================================
# Nodes Pendukung Lainnya (RAG, Multi-Query, Rerank)
# ==========================================
def fetch_summary_node(state: AgentState):
    question = state["messages"][-1].content
    embed_model = get_embed_model()
    query_embeddings = embed_model.encode(question, return_dense=True, return_sparse=True)
    dense_vec = query_embeddings['dense_vecs'].tolist()
    lexical_weights = query_embeddings['lexical_weights']
    
    tokens = list(lexical_weights.keys())
    weights = list(lexical_weights.values())
    token_ids = embed_model.tokenizer.convert_tokens_to_ids(tokens)
    
    dedup_sparse = {}
    for idx, w in zip(token_ids, weights):
        if idx not in dedup_sparse or w > dedup_sparse[idx]:
            dedup_sparse[idx] = w
    
    sparse_vector = models.SparseVector(indices=list(dedup_sparse.keys()), values=list(dedup_sparse.values()))
    results = client.query_points(
        collection_name=collection_summ,
        prefetch=[models.Prefetch(query=dense_vec, using="", limit=5), models.Prefetch(query=sparse_vector, using="sparse", limit=5)],
        query=models.FusionQuery(fusion=models.Fusion.RRF),
        limit=5,
        with_payload=True
    ).points
    
    if not results:
        return {"messages": [AIMessage(content="Maaf, saya tidak menemukan ringkasan dokumen yang relevan.")]}
    
    summary_docs = [Document(page_content=p.payload["text"], metadata=p.payload) for p in results]
    reranked_summaries = compressor.compress_documents(documents=summary_docs, query=question)
    if not reranked_summaries:
        return {"messages": [AIMessage(content="Maaf, saya tidak menemukan ringkasan dokumen yang relevan.")]}
    
    retrieved_summaries = "\n\n".join([f"Sumber: {d.metadata.get('filename')}\n{d.page_content}" for d in reranked_summaries])
    prompt = f"Anda adalah asisten akademik. Rangkum materi berdasarkan Data Ringkasan ini:\n{retrieved_summaries}\nPertanyaan User: {question}"
    final_answer = llm.invoke(prompt).content
    return {"messages": [AIMessage(content=final_answer)]}

def expand_query_node(state: AgentState):
    original_query = state["messages"][-1].content
    prompt = f"Kembangkan kueri pengguna berikut menjadi 3 kueri pencarian mandiri untuk sistem RAG:\nKueri asli: {original_query}\nOutput HANYA 3 baris teks tanpa angka."
    response = llm.invoke(prompt).content
    queries = [q.strip() for q in response.split('\n') if q.strip()]
    if original_query not in queries:
        queries.insert(0, original_query)
    return {"search_queries": queries[:4], "loop_count": state.get("loop_count", 0) + 1}

def search_node(state: AgentState):
    embed_model = get_embed_model() 
    queries = state["search_queries"]
    all_raw_results = []
    
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
        
        sparse_vector = models.SparseVector(indices=list(dedup_sparse.keys()), values=list(dedup_sparse.values()))
        raw_results = client.query_points(
            collection_name=collection_name,
            prefetch=[models.Prefetch(query=dense_vec, using="", limit=10), models.Prefetch(query=sparse_vector, using="sparse", limit=10)],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=10,
            with_payload=True
        ).points
        all_raw_results.extend(raw_results)
        
    unique_results = {res.payload['chunk_id']: res for res in all_raw_results}.values()
    retrieved_docs = [Document(page_content=p.payload["text"], metadata=p.payload) for p in unique_results]
    
    original_query = state["messages"][-1].content
    reranked_docs = compressor.compress_documents(documents=retrieved_docs, query=original_query)
    file_url = reranked_docs[0].metadata.get("file_url", "") if reranked_docs else ""
    return {"retrieved_docs": list(reranked_docs), "file_url": file_url}

def grade_context_node(state: AgentState):
    docs = state["retrieved_docs"]
    question = state["messages"][-1].content
    filtered = []
    
    for doc in docs:
        prompt = f"Does the following document contain ANY information that could be even slightly helpful in answering this question?\nQuestion: {question}\nDocument: {doc.page_content}\nAnswer ONLY 'yes' or 'no'."
        score = llm.invoke(prompt).content.strip().lower()
        if 'yes' in score:
            filtered.append(doc)
    return {"filtered_docs": filtered}

# ==========================================
# Graph Conditionals & Edges
# ==========================================
def check_hallucination_and_retry(state: AgentState):
    filtered_docs = state.get("filtered_docs", [])
    loop_count = state.get("loop_count", 0)
    if len(filtered_docs) == 0 and loop_count < 3: 
        return "expand_query"
    return "generate"

def route_logic(state: AgentState):
    ctx = state["context"]
    if ctx == "vectorstore":
        return "expand_query"
    elif ctx == "summarize":
        return "fetch_summary"
    elif ctx == "service_capture":
        return "service_capture"
    else:
        return "chitchat"

# ==========================================
# Graph Architecture Setup
# ==========================================
workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("chitchat", chitchat_node)
workflow.add_node("expand_query", expand_query_node)
workflow.add_node("search", search_node)
workflow.add_node("grade", grade_context_node)
workflow.add_node("generate_answer", generate_answer_node)
workflow.add_node("fetch_summary", fetch_summary_node)
workflow.add_node("service_capture", service_capture_node)

workflow.set_entry_point("router")

workflow.add_conditional_edges("router", route_logic, {
    "expand_query": "expand_query",
    "fetch_summary": "fetch_summary",
    "service_capture": "service_capture",
    "chitchat": "chitchat"
})

workflow.add_edge("expand_query", "search")
workflow.add_edge("search", "grade")

workflow.add_conditional_edges("grade", check_hallucination_and_retry, {
    "expand_query": "expand_query",
    "generate": "generate_answer"
})

workflow.add_edge("generate_answer", END)
workflow.add_edge("fetch_summary", END) 
workflow.add_edge("service_capture", END) 
workflow.add_edge("chitchat", END)


from langgraph.checkpoint.memory import MemorySaver

# Buat instansiasi in-memory checkpointer
memory = MemorySaver()

# Kompilasi workflow dengan checkpointer lokal (tanpa perlu setup database)
agent_app = workflow.compile(checkpointer=memory)