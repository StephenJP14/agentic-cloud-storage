from qdrant_client import QdrantClient
import os
from dotenv import load_dotenv 

load_dotenv()

QDRANT_HOST = os.getenv("WINDOWS_IP", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))

qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

# Example: Initialize a collection
# qdrant_client.recreate_collection(collection_name="documents", ...)