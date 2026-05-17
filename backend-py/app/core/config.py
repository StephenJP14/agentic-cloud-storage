# app/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

WINDOWS_IP = "36.94.111.114"
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", f"http://{WINDOWS_IP}:11434")
# QDRANT_URL = os.getenv("QDRANT_URL", f"http://{WINDOWS_IP}:6333")
QDRANT_URL = "http://36.94.111.114:6333"
# REDIS_URL = os.getenv("REDIS_URL", f"redis://{WINDOWS_IP}:6379")
REDIS_URL = "redis://36.94.111.114:6379"

COLLECTION_NAME = "user_docs"
COLLECTION_SUMM = "docs_summ"