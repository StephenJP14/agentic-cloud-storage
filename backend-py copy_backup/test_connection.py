import os
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from qdrant_client import QdrantClient
from minio import Minio

# 1. Load Config
load_dotenv()
windows_ip = os.getenv("WINDOWS_IP")
print(f"🔗 Connecting to Windows at: {windows_ip}...\n")

print(os.getenv("OLLAMA_BASE_URL"))

# 2. Test Ollama (GPU)
try:
    print("🤖 Testing Ollama (Vision Model)...")
    llm = ChatOllama(
        base_url=os.getenv("OLLAMA_BASE_URL"),
        model="qwen2.5vl:7b", # Or whatever model you pulled
        temperature=0
    )
    response = llm.invoke("Describe a cat in one sentence.")
    print(f"✅ Ollama Reply: {response.content}\n")
except Exception as e:
    print(f"❌ Ollama Failed: {e}\n")

# 3. Test Qdrant (Vector DB)
try:
    print("📚 Testing Qdrant Connection...")
    client = QdrantClient(url=os.getenv("QDRANT_URL"))
    collections = client.get_collections()
    print(f"✅ Qdrant Online. Collections: {collections}\n")
except Exception as e:
    print(f"❌ Qdrant Failed: {e}\n")

# 4. Test MinIO (Storage)
try:
    print("📦 Testing MinIO Connection...")
    minio_client = Minio(
        os.getenv("MINIO_ENDPOINT"),
        access_key=os.getenv("MINIO_ACCESS_KEY"),
        secret_key=os.getenv("MINIO_SECRET_KEY"),
        secure=False
    )
    buckets = minio_client.list_buckets()
    print(f"✅ MinIO Online. Buckets found: {len(buckets)}\n")
except Exception as e:
    print(f"❌ MinIO Failed: {e}\n")