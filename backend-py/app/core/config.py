# app/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

WINDOWS_IP = os.getenv("WINDOWS_IP", "127.0.0.1")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", f"http://{WINDOWS_IP}:11434")
QDRANT_URL = os.getenv("QDRANT_URL", f"http://{WINDOWS_IP}:6333")
REDIS_URL = os.getenv("REDIS_URL", f"redis://{WINDOWS_IP}:6379")

COLLECTION_NAME = "user_docs"
COLLECTION_SUMM = "docs_summ"