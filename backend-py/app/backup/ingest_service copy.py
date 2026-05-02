import os
import base64
import uuid # [NEW] Import UUID untuk ID unik
import fitz  # PyMuPDF
from dotenv import load_dotenv
from qdrant_client import QdrantClient, models
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage
from urllib.parse import quote
from .embed_model import get_embed_model

load_dotenv()
WINDOWS_IP = os.getenv("WINDOWS_IP", "127.0.0.1")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", f"http://{WINDOWS_IP}:11434")
QDRANT_URL = os.getenv("QDRANT_URL", f"http://{WINDOWS_IP}:6333")

vision_llm = ChatOllama(base_url=OLLAMA_URL, model="qwen3-vl:8b-instruct", temperature=0.0)

# print("Memuat BGE-M3 Model...")

qdrant = QdrantClient(url=QDRANT_URL)
collection_name = "user_docs"

if not qdrant.collection_exists(collection_name):
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
        sparse_vectors_config={
            "sparse": models.SparseVectorParams(index=models.SparseIndexParams(on_disk=False))
        }
    )

def image_to_base64(image_bytes):
    return base64.b64encode(image_bytes).decode("utf-8")

# [MODIFIED] Sekarang mengembalikan list of dict berisi konten & metadata source_type
def extract_content_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    pages_data = [] 
    
    for page_num, page in enumerate(doc):
        text = page.get_text()
        print(f"   📄 Memproses Halaman {page_num + 1}...")

        # [NEW] Pisahkan teks sebagai metadata text_paragraph
        if text.strip():
            pages_data.append({
                "page_number": page_num + 1,
                "content": text,
                "source_type": "text_paragraph"
            })

        image_list = page.get_images(full=True)
        
        if image_list:
            print(f"      📸 Menemukan {len(image_list)} gambar, menjalankan Vision AI...")
            for img_index, img in enumerate(image_list):
                try:
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    b64_img = image_to_base64(image_bytes)
                    msg = HumanMessage(
                        content=[
                            {"type": "text", "text": "Extract all text, diagrams, and tables from this image precisely. Explain any flowcharts."},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                        ]
                    )
                    response = vision_llm.invoke([msg])
                    
                    # [NEW] Pisahkan hasil vision sebagai metadata image_ocr
                    pages_data.append({
                        "page_number": page_num + 1,
                        "content": f"[IMAGE CONTEXT: {response.content}]",
                        "source_type": "image_ocr"
                    })
                except Exception as e:
                    print(f"      ⚠️ Vision Error on image {img_index + 1} of page {page_num + 1}: {e}")
                    # print(f"Vision Error on page {page_num+1}: {e}")
    
    return pages_data

def ingest_file(file_path, user_id="u_default"):
    embed_model = get_embed_model()

    filename = os.path.basename(file_path)
    safe_filename = quote(filename)
    
    print(f"🔄 [PROCESS] Memulai ekstraksi PDF: {filename}...")
    pages_data = extract_content_from_pdf(file_path)
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,  
        chunk_overlap=200, 
        separators=["\n\n", "\n", ".", " ", ""]
    )

    points = []
    global_chunk_idx = 0

    for page in pages_data:
        chunks = splitter.split_text(page["content"])
        
        if not chunks: continue # Skip halaman kosong
        
        embeddings = embed_model.encode(chunks, return_dense=True, return_sparse=True)
        dense_vecs = embeddings['dense_vecs']
        lexical_weights = embeddings['lexical_weights']

        for chunk, dense_vec, sparse_dict in zip(chunks, dense_vecs, lexical_weights):
            tokens = list(sparse_dict.keys())
            weights = list(sparse_dict.values())
            token_ids = embed_model.tokenizer.convert_tokens_to_ids(tokens)
            
            # --- FIX: DEDUPLIKASI TOKEN ---
            dedup_sparse = {}
            for idx, w in zip(token_ids, weights):
                if idx not in dedup_sparse or w > dedup_sparse[idx]:
                    dedup_sparse[idx] = w
            
            final_indices = list(dedup_sparse.keys())
            final_values = list(dedup_sparse.values())
            # ------------------------------

            sparse_vector = models.SparseVector(
                indices=final_indices,
                values=final_values
            )

            unique_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_id}_{filename}_{global_chunk_idx}"))

            points.append(
                models.PointStruct(
                    id=unique_id, 
                    vector={"": dense_vec.tolist(), "sparse": sparse_vector},
                    payload={
                        "text": chunk,
                        "filename": filename,
                        "page_number": page["page_number"],
                        "source_type": page["source_type"], # [NEW] METADATA SOURCE TYPE
                        "user_id": user_id,
                        "file_url": f'http://{WINDOWS_IP}:9000/browser/uploads/{safe_filename}',
                        "chunk_id": global_chunk_idx
                    }
                )
            )
            global_chunk_idx += 1
    print(f"📤 [QDRANT] Mengunggah {len(points)} points ke koleksi '{collection_name}'...")
    try:
        qdrant.upload_points(collection_name=collection_name, points=points, batch_size=100)
        print(f"✅ Ingested {filename} with Hybrid Vectors (Total Chunks: {global_chunk_idx})")
    except Exception as e:
        print(f"❌ [ERROR] Ingestion Error: {e}")