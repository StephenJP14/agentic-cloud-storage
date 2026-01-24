import os
import base64
import fitz  # PyMuPDF
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_core.messages import HumanMessage

# 1. Load Config (Points to your Windows PC)
load_dotenv()
WINDOWS_IP = os.getenv("WINDOWS_IP")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL")
QDRANT_URL = os.getenv("QDRANT_URL")

print(f"🔌 Connecting to Services at {WINDOWS_IP}...")

# 2. Initialize Models
# Vision Model (For "Seeing" images in PDF)
vision_llm = ChatOllama(
    base_url=OLLAMA_URL,
    model="qwen2.5vl:7b", # Matches your installed model
    temperature=0.1,      # Low temp = factual descriptions
)

# Embedding Model (For converting text to numbers)
embed_model = OllamaEmbeddings(
    base_url=OLLAMA_URL,
    model="bge-m3",
)

# Vector DB Client
qdrant = QdrantClient(url=QDRANT_URL)

# ---------------------------------------------------------
# HELPER: Convert Image to Base64 (for Ollama)
# ---------------------------------------------------------
def image_to_base64(image_bytes):
    return base64.b64encode(image_bytes).decode("utf-8")

# ---------------------------------------------------------
# STEP 1: The "Vision" Extractor
# ---------------------------------------------------------
def extract_content_from_pdf(pdf_path):
    """
    Reads a PDF. If it sees text, it keeps it.
    If it sees an image, it asks Qwen to describe it.
    """
    doc = fitz.open(pdf_path)
    full_content = []
    
    print(f"📄 Processing PDF: {pdf_path} ({len(doc)} pages)...")

    for page_num, page in enumerate(doc):
        # A. Extract Text (The easy part)
        text = page.get_text()
        
        # B. Extract Images (The AI part)
        image_descriptions = []
        image_list = page.get_images(full=True)
        
        if image_list:
            print(f"   found {len(image_list)} images on page {page_num + 1}...")
            
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                
                # Prepare prompt for Qwen2.5-VL
                b64_img = image_to_base64(image_bytes)
                msg = HumanMessage(
                    content=[
                        {"type": "text", "text": "Describe this image in detail for a search database. Capture any visible text, charts, or key objects."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
                    ]
                )
                
                # Ask Windows GPU to describe it
                try:
                    response = vision_llm.invoke([msg])
                    description = f"[IMAGE DESCRIPTION: {response.content}]"
                    image_descriptions.append(description)
                except Exception as e:
                    print(f"   ⚠️ Vision Error: {e}")

        # C. Combine Text + Image Descriptions
        page_content = f"--- PAGE {page_num + 1} ---\n{text}\n" + "\n".join(image_descriptions)
        full_content.append(page_content)
    
    return "\n".join(full_content)

# ---------------------------------------------------------
# STEP 2 & 3: Chunking & Embedding
# ---------------------------------------------------------
def ingest_file(file_path, user_id="u_default"):
    filename = os.path.basename(file_path)
    
    # 1. Extract (Text + Vision)
    raw_text = extract_content_from_pdf(file_path)
    
    # 2. Chunking (Split into pieces)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=100
    )
    chunks = splitter.split_text(raw_text)
    print(f"✂️ Split into {len(chunks)} chunks.")

    # 3. Create Collection (if not exists)
    collection_name = "user_docs"
    if not qdrant.collection_exists(collection_name):
        qdrant.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=1024, # BGE-M3 standard size
                distance=models.Distance.COSINE
            )
        )

    # 4. Embed & Upload to Qdrant
    print("🧠 Embedding and Indexing...")
    points = []
    
    # Batch embedding (More efficient)
    vectors = embed_model.embed_documents(chunks)
    
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        payload = {
            "filename": filename,
            "user_id": user_id,
            "text": chunk, # We store the text so we can retrieve it later!
            "chunk_id": i
        }
        
        points.append(models.PointStruct(
            id=i,  # Ideally use UUID here
            vector=vector,
            payload=payload
        ))

    # Push to Windows Qdrant
    qdrant.upsert(
        collection_name=collection_name,
        points=points
    )
    print(f"✅ Success! {filename} is now searchable.")

# # ---------------------------------------------------------
# # TEST RUN (Run this file directly)
# # ---------------------------------------------------------
# if __name__ == "__main__":
#     # Create a dummy PDF path or use a real one
#     # You can put a file named "test.pdf" in the same folder to test
#     target_pdf = "/Volumes/MacExternal/Dev/Skripsi/be/app/test.pdf" 
    
#     if os.path.exists(target_pdf):
#         ingest_file(target_pdf)
#     else:
#         print(f"❌ File {target_pdf} not found. Put a PDF here to test.")