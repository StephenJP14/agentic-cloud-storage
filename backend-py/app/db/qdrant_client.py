from qdrant_client import QdrantClient
import os
from dotenv import load_dotenv
from qdrant_client.http import models

load_dotenv()

QDRANT_HOST = os.getenv("WINDOWS_IP", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))

qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

# Example: Initialize a collection
# qdrant_client.recreate_collection(collection_name="documents", ...)

collection_name = "user_docs"
if not qdrant_client.collection_exists(collection_name):
    qdrant_client.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(
            size=1024,  # BGE-M3 standard size
            distance=models.Distance.COSINE
        )
    )
