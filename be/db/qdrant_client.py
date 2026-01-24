from qdrant_client import QdrantClient

qdrant_client = QdrantClient(host="localhost", port=6333)

# Example: Initialize a collection
# qdrant_client.recreate_collection(collection_name="documents", ...)