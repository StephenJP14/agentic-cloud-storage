import os
import base64
import fitz  # PyMuPDF
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_core.messages import HumanMessage
from urllib.parse import quote
from langchain_qdrant import QdrantVectorStore

load_dotenv()
WINDOWS_IP = os.getenv("WINDOWS_IP")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", f"http://{WINDOWS_IP}:11434")
QDRANT_URL = os.getenv("QDRANT_URL", f"http://{WINDOWS_IP}:6333")

# Gunakan model Qwen baru untuk Vision
vision_llm = ChatOllama(
    base_url=OLLAMA_URL,
    model="qwen3-vl:8b-instruct", 
    temperature=0.0, # Sangat faktual untuk membaca teks di gambar
)

# BGE-M3 tetap yang terbaik untuk Multilingual Embedding
embed_model = OllamaEmbeddings(
    base_url=OLLAMA_URL,
    model="bge-m3",
)

qdrant = QdrantClient(url=QDRANT_URL)

def image_to_base64(image_bytes):
    return base64.b64encode(image_bytes).decode("utf-8")

def extract_content_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    full_content = []
    
    for page_num, page in enumerate(doc):
        text = page.get_text()
        image_descriptions = []
        image_list = page.get_images(full=True)
        
        if image_list:
            for img_index, img in enumerate(image_list):
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
                
                try:
                    response = vision_llm.invoke([msg])
                    description = f"[IMAGE CONTEXT: {response.content}]"
                    image_descriptions.append(description)
                except Exception as e:
                    print(f"Vision Error: {e}")

        page_content = f"--- PAGE {page_num + 1} ---\n{text}\n" + "\n".join(image_descriptions)
        full_content.append(page_content)
    
    return "\n\n".join(full_content)

def ingest_file(file_path, user_id="u_default"):
    filename = os.path.basename(file_path)
    collection_name = "user_docs"
    
    raw_text = extract_content_from_pdf(file_path)
    
    # NEW CHUNKING STRATEGY FOR LECTURES
    # Lebih besar ukurannya agar definisi dan contoh kasus tidak terpisah
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,  
        chunk_overlap=300, 
        separators=["\n\n", "\n", ".", " ", ""]
    )
    chunks = splitter.split_text(raw_text)
    
    safe_filename = quote(filename)
    metadatas = [
        {
            "filename": filename,
            "user_id": user_id,
            "file_url": f'http://{WINDOWS_IP}:9000/browser/uploads/{safe_filename}',
            "chunk_id": i
        } 
        for i in range(len(chunks))
    ]

    try:
        QdrantVectorStore.from_texts(
            texts=chunks,
            embedding=embed_model,
            url=QDRANT_URL,
            collection_name=collection_name,
            metadatas=metadatas,
            content_payload_key="text",
        )
        print(f"✅ Ingested {filename}")
    except Exception as e:
        print(f"❌ Ingestion Error: {e}")