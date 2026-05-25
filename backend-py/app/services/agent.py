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
    ("system", """Anda adalah AI Parser data teks yang sangat cerdas dan teliti untuk Service Center Zyrex.
Tugas utama Anda adalah mengekstrak data dari pesan user ke dalam skema atribut JSON yang disediakan.

ATURAN EKSTRAKSI STRICT:
1. Cari baris yang mengandung kata kunci di bawah ini (tidak masalah besar/kecil hurufnya):
   - "Nama" atau "Nama Pelanggan" -> ekstrak ke 'name'
   - "Phone" atau "Nomor Telepon" atau "No HP" atau "HP" -> ekstrak ke 'phone_number' (hanya ambil angka)
   - "Email" -> ekstrak ke 'email'
   - "Address" atau "Alamat" -> ekstrak ke 'address'
   - "Product Type" atau "Tipe Produk" -> ekstrak ke 'product_type'
   - "Product SN" atau "Nomor Seri" -> ekstrak ke 'product_sn'
   - "Complaints" atau "Keluhan" -> ekstrak ke 'complaints'

2. PERINGATAN: Di dalam pesan user mungkin terdapat teks template tambahan seperti 'Catatan Internal', 'Status Awal', dll. ABAIKAN teks template tambahan tersebut! Fokus HANYA pada data diri pelanggan yang diisi di baris-baris awal.
3. Jika sebuah data tidak ditemukan sama sekali atau isinya masih berupa template kosong seperti '[Isi Nama]', biarkan string kosong (""). Jangan mengarang data."""),
    ("human", "{question}")
])
capture_chain = capture_prompt | llm.with_structured_output(PartialFormExtractor)


# ==========================================
# NEW: GUARDRAIL TOPIK (Filter Topik Luar Zyrex)
# ==========================================
class TopicCheck(BaseModel):
    is_allowed: bool = Field(..., description="True jika berkaitan dengan produk Zyrex, masalah laptop/PC, sapaan/chitchat CS, atau booking service. False jika bertanya hal umum lain seperti resep masakan, pemrograman/coding, matematika, tugas sekolah, dll.")
    reason: str = Field(..., description="Alasan singkat penentuan kategori.")

guardrail_prompt = ChatPromptTemplate.from_messages([
    ("system", """Anda adalah sistem keamanan (Guardrail) untuk Chatbot Customer Service Zyrex.
Tugas Anda adalah menganalisis apakah input user relevan dengan ruang lingkup Customer Service Zyrex atau tidak.

RUANG LINGKUP YANG DIIZINKAN:
- Pertanyaan teknis/troubleshooting laptop, PC, All-In-One, komputer (misal: bluescreen, mati total, lemot).
- Pembahasan mengenai produk, spesifikasi, garansi, atau buku manual Zyrex.
- Sapaan ramah pembuka/penutup chitchat CS (misal: halo, selamat pagi, terima kasih, bye).
- Proses booking service atau pengisian data perbaikan.

RUANG LINGKUP YANG DILARANG (Berikan False):
- Meminta resep masakan, tips diet, kesehatan.
- Meminta menulis/debug kode pemrograman (coding), kalkulasi matematika rumit.
- Pertanyaan umum/akademik yang tidak ada hubungannya dengan komputer/Zyrex (misal: "siapa presiden pertama RI", "buatkan esai sejarah").

Analisis pesan user secara objektif."""),
    ("human", "{question}")
])
guardrail_chain = guardrail_prompt | llm.with_structured_output(TopicCheck)


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
    awaiting_booking_confirmation: bool
    context: str
    file_url: str
    search_queries: list[str]
    retrieved_docs: list[Document]
    filtered_docs: list[Document]
    loop_count: int
    is_booking_mode: bool
    extracted_form_data: dict
    is_topic_allowed: bool  # NEW: Menyimpan status validasi topik


# ==========================================
# NEW NODE: Guardrail Node
# ==========================================
def guardrail_node(state: AgentState):
    last_message = state["messages"][-1].content
    print(f"🛡️ [GUARDRAIL] Memeriksa konten: '{last_message}'")
    
    # Bypass guardrail jika sedang dalam mode booking aktif (untuk mencegah form data ter-block salah sasaran)
    if state.get("is_booking_mode", False):
        return {"is_topic_allowed": True}
        
    try:
        check = guardrail_chain.invoke({"question": last_message})
        print(f"🛡️ [GUARDRAIL RESULT] Allowed: {check.is_allowed} | Reason: {check.reason}")
        return {"is_topic_allowed": check.is_allowed}
    except Exception as e:
        print(f"❌ [GUARDRAIL ERROR] Gagal cek topik, fallback ke True: {e}")
        return {"is_topic_allowed": True}

def out_of_topic_node(state: AgentState):
    response = (
        "Mohon maaf, saya adalah Tech Support Assistant resmi Zyrex. "
        "Saya hanya dapat membantu Anda terkait pertanyaan produk Zyrex, kendala teknis perangkat, "
        "informasi garansi, dan pendaftaran booking service center. "
        "Silakan ajukan pertanyaan yang berkaitan dengan layanan Zyrex ya! 😊"
    )
    return {"messages": [AIMessage(content=response)]}


# ==========================================
# DETERMINISTIC ROUTER NODE (BYPASS LLM)
# ==========================================
# ==========================================
# REVISI DETERMINISTIC ROUTER NODE
# ==========================================
def router_node(state: AgentState):
    last_message = state["messages"][-1].content.strip().lower()
    print(f"🕵️ [ROUTER DEBUG] Pesan Terakhir User: '{last_message}'")
    
    # KONDISI KHUSUS 1: Jika sudah benar-benar dalam mode booking aktif, kunci terus di service_capture
    if state.get("is_booking_mode", False):
        print("🧭 [ROUTER] State Lock: User sedang dalam proses booking aktif.")
        return {"context": "service_capture"}
        
    # KONDISI KHUSUS 2: Cek apakah bot di pesan sebelumnya menawarkan booking
    ai_offered = False
    for msg in reversed(state["messages"][:-1]):
        if msg.type == "ai":
            ai_content = msg.content.lower()
            if "booking service" in ai_content or "booking servis" in ai_content or "jadwal (booking)" in ai_content:
                ai_offered = True
                print(f"🎯 [ROUTER DEBUG] Terdeteksi AI menawarkan booking sebelumnya.")
                break
                
    # Kata-kata persetujuan dari user
    positive_answers = ["boleh", "mau", "iya", "ya", "silakan", "silahkan", "oke", "ok", "bisa", "lanjut"]
    is_positive_respond = any(tgt == last_message or last_message.startswith(tgt) for tgt in positive_answers)
    
    is_direct_booking_intent = any(kw in last_message for kw in ["bantu booking", "booking service", "booking servis", "buatkan jadwal"])
    is_submitting_form = any(field in last_message for field in ["nama:", "phone:", "address:", "product sn:"])
    
    # PERBAIKAN DI SINI: Masuk ke service_capture JIKA (AI menawarkan DAN direspon positif), 
    # ATAU memang user minta booking langsung, ATAU user langsung kirim data form.
    if (
    state.get("is_booking_mode", False)
    or is_submitting_form
    or is_direct_booking_intent
    or (
        state.get("awaiting_booking_confirmation", False)
        and is_positive_respond
    )
):
        print("🧭 [ROUTER] HARD LOCK TRIGGERED: Masuk ke node service_capture.")
        return {"context": "service_capture"}
        
    # Jika AI menawarkan booking, tapi user malah nanya hal lain (tidak merespon positif seperti 'ya/mau'),
    # maka jalur dikembalikan secara normal ke LLM Router agar bisa masuk ke Vectorstore/RAG!
    try:
        decision = router_chain.invoke({"question": state["messages"][-1].content}).datasource
    except Exception as e:
        print(f"❌ [ROUTER ERROR] Fallback ke chitchat: {e}")
        decision = "chitchat"
        
    print(f"🧭 [ROUTER] Keputusan Akhir: {decision}")
    return {"context": decision}

# ==========================================
# Chitchat (Kunci Karakter CS Zyrex)
# ==========================================
chitchat_prompt = ChatPromptTemplate.from_messages([
    ("system", """Anda adalah Tech Support & Customer Service Assistant resmi dari Zyrex.
Tugas Anda HANYA merespon sapaan, ucapan terima kasih, atau obrolan ringan (chitchat) dari pelanggan dengan ramah, sopan, dan singkat.

PANDUAN KETAT:
1. JANGAN PERNAH menawarkan bantuan di luar produk Zyrex (seperti menawarkan bantuan tugas sekolah, proyek, coding, matematika, dll).
2. Selalu posisikan diri Anda sebagai representatif Zyrex yang siap membantu terkait kendala laptop/PC atau informasi layanan service center Zyrex.
3. Jawab dengan singkat, ramah, dan arahkan user secara halus jika mereka ingin menanyakan kendala perangkat mereka.

Contoh Respon yang Benar:
- "Halo! Selamat datang di Tech Support Zyrex. Ada yang bisa saya bantu terkait perangkat Zyrex Anda hari ini?"
- "Sama-sama! Terima kasih telah menghubungi Service Center Zyrex. Semoga hari Anda menyenangkan!"
"""),
    ("human", "{last_message}")
])

def chitchat_node(state: AgentState):
    last_message = state["messages"][-1].content
    print(f"💬 [CHITCHAT] Memproses sapaan: '{last_message}'")
    
    # Menggunakan prompt template agar instruksi system tidak dilanggar oleh LLM
    prompt = chitchat_prompt.format_messages(last_message=last_message)
    response = llm.invoke(prompt).content
    offer_booking = (
    "Apakah Anda ingin saya bantu buatkan jadwal (booking) service"
    in response
)

    return {
        "messages": [AIMessage(content=response)],
        "awaiting_booking_confirmation": offer_booking
    }

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
3. ATURAN WAJIB: Di akhir jawaban Anda, jika masalah belum terselesaikan, Anda WAJIB menawarkan booking service kepada pengguna dengan kalimat konfirmasi singkat. Jangan berikan formulir pendaftaran terlebih dahulu.

Contoh kalimat di akhir:
"Apakah Anda ingin saya bantu buatkan jadwal (booking) service untuk kendala ini?"

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

    bypass_keywords = ["boleh", "mau", "iya", "ya", "silakan", "silahkan", "bantu booking", "oke", "ok", "bisa"]
    is_short_confirm = any(kw == question.strip().lower() for kw in bypass_keywords)

    if is_short_confirm and not state.get("is_booking_mode", False):
        bot_message = (
            "Baik, mohon lengkapi formulir pendaftaran service di bawah ini terlebih dahulu:\n\n"
            "```text\n"
            f"Nama: [Isi Nama Lengkap]\n"
            f"Phone: [Isi Nomor HP/WhatsApp]\n"
            f"Email: [Isi Alamat Email]\n"
            f"Address: [Isi Alamat Lengkap]\n"
            f"Product Type: Laptop\n"
            f"Product SN: [Isi Serial Number Perangkat]\n"
            f"Complaints: {form_data['complaints']}\n"
            "```\n"
            "*Catatan: Silakan salin pesan di atas, ganti teks di dalam tanda kurung kotak [ ], lalu kirimkan kembali.*"
        )
        return {
            "messages": [AIMessage(content=bot_message)],
            "is_booking_mode": True,
            "extracted_form_data": form_data
        }

    if not is_short_confirm:
        try:
            print("🧠 [CAPTURE] Mengirim ke LLM Extractor...")
            new_extract = capture_chain.invoke({"question": question})
            
            if new_extract.name and "[isi" not in new_extract.name.lower(): form_data["name"] = new_extract.name
            if new_extract.email and "[isi" not in new_extract.email.lower(): form_data["email"] = new_extract.email
            if new_extract.phone_number and "[isi" not in new_extract.phone_number.lower(): form_data["phone_number"] = new_extract.phone_number
            if new_extract.address and "[isi" not in new_extract.address.lower(): form_data["address"] = new_extract.address
            if new_extract.product_type and "[isi" not in new_extract.product_type.lower(): form_data["product_type"] = new_extract.product_type
            if new_extract.product_sn and "[isi" not in new_extract.product_sn.lower(): form_data["product_sn"] = new_extract.product_sn
            if new_extract.complaints and "[isi" not in new_extract.complaints.lower(): form_data["complaints"] = new_extract.complaints
        except Exception as e:
            print(f"❌ [EXTRACT ERROR] Gagal ekstraksi structured output: {str(e)}")

        import re
        def extract_via_regex(pattern, text):
            match = re.search(pattern, text, re.IGNORECASE)
            return match.group(1).strip() if match else ""

        if not form_data["name"]: form_data["name"] = extract_via_regex(r"(?:Nama Pelanggan|Nama)\s*:\s*([^\n]+)", question)
        if not form_data["email"]: form_data["email"] = extract_via_regex(r"Email\s*:\s*([^\n\s]+)", question)
        if not form_data["address"]: form_data["address"] = extract_via_regex(r"(?:Alamat|Address)\s*:\s*([^\n]+)", question)
        if not form_data["phone_number"]:
            phone_raw = extract_via_regex(r"(?:Nomor Telepon|Phone|No HP|Telp|HP|WA)\s*:\s*([^\n]+)", question)
            form_data["phone_number"] = re.sub(r"\D", "", phone_raw) if phone_raw else ""
        if not form_data["product_sn"]: form_data["product_sn"] = extract_via_regex(r"(?:Nomor Seri \(SN\)|Product SN|SN)\s*:\s*([^\n]+)", question)
            
    missing_fields = []
    if not form_data["name"]: missing_fields.append("Nama")
    if not form_data["phone_number"]: missing_fields.append("Phone")
    if not form_data["email"]: missing_fields.append("Email")
    if not form_data["address"]: missing_fields.append("Address")
    if not form_data["product_sn"]: missing_fields.append("Product SN")

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
            f"Silakan lengkapi kembali format data di bawah ini:\n\n"
            f"```text\n"
            f"Nama: {tpl_name}\n"
            f"Phone: {tpl_phone}\n"
            f"Email: {tpl_email}\n"
            f"Address: {tpl_address}\n"
            f"Product Type: {tpl_prod_type}\n"
            f"Product SN: {tpl_prod_sn}\n"
            f"Complaints: {tpl_complaints}\n"
            f"```\n"
            f"*Catatan: Pastikan semua data di dalam tanda kurung kotak [ ] sudah diisi dengan benar.*"
        )
        return {
            "messages": [AIMessage(content=bot_message)],
            "is_booking_mode": True,
            "extracted_form_data": form_data
        }

    print("🚀 [API SERVICE] Data lengkap! Mengirim payload ke Backend Go...")
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
                f"### Laporan Keluhan Pelanggan\n"
                f"**Nama Pelanggan:** {form_data['name']}\n"
                f"**Nomor Telepon:** {form_data['phone_number']}\n"
                f"**Email:** {form_data['email']}\n"
                f"**Alamat:** {form_data['address']}\n"
                f"**Tipe Produk:** {form_data['product_type']}\n"
                f"**Nomor Seri (SN):** {form_data['product_sn']}\n"
                f"**Keluhan:** {form_data['complaints']}\n\n"
                f"**Status Laporan:**\n"
                f"✅ Diterima dan sedang diproses oleh tim teknis. (ID Tiket: `{ticket_id}`)\n\n"
                f"Anda bisa mengecek status laporan anda disini:\n"
                f"https://zyrex.com/service\n\n"
                f"Silahkan hubungi CS untuk informasi lainnya:\n"
                f"* **WA:** 123\n"
                f"* **Email:** cs@zyrex.com"
            )
        elif response.status_code == 400:
            error_data = response.json()
            feedback = f"Gagal mendaftarkan servis: **{error_data.get('message', 'Format input salah')}**. Periksa nomor WhatsApp/email Anda."
        else:
            feedback = "Gagal memproses pendaftaran formulir ke database utama Go."
    except Exception as e:
        feedback = "Terjadi kesalahan jaringan saat mengirim data servis Anda."

    return {
        "messages": [AIMessage(content=bot_message)],
        "is_booking_mode": True,
        "awaiting_booking_confirmation": False,
        "extracted_form_data": form_data
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

# NEW: Jalur Logika Guardrail di Titik Masuk Pertama
def check_guardrail_logic(state: AgentState):
    if state.get("is_topic_allowed", True):
        return "router"
    return "out_of_topic"

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
# Graph Architecture Setup (MODIFIED)
# ==========================================
workflow = StateGraph(AgentState)

# Daftarkan node guardrail baru
workflow.add_node("guardrail", guardrail_node)
workflow.add_node("out_of_topic", out_of_topic_node)

workflow.add_node("router", router_node)
workflow.add_node("chitchat", chitchat_node)
workflow.add_node("expand_query", expand_query_node)
workflow.add_node("search", search_node)
workflow.add_node("grade", grade_context_node)
workflow.add_node("generate_answer", generate_answer_node)
workflow.add_node("fetch_summary", fetch_summary_node)
workflow.add_node("service_capture", service_capture_node)

# UBAH ENTRY POINT: Masuk ke Guardrail terlebih dahulu
workflow.set_entry_point("guardrail")

# Tambahkan percabangan bersyarat dari Guardrail
workflow.add_conditional_edges("guardrail", check_guardrail_logic, {
    "router": "router",
    "out_of_topic": "out_of_topic"
})

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
workflow.add_edge("out_of_topic", END) # Jika di luar topik, alur langsung selesai di sini.


from langgraph.checkpoint.memory import MemorySaver

memory = MemorySaver()
agent_app = workflow.compile(checkpointer=memory)