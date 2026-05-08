# services/embed_model.py
# Shared lazy loader for BGEM3FlagModel

from FlagEmbedding import BGEM3FlagModel

_model = None

def get_embed_model():
    global _model
    if _model is None:
        print("Memuat BGE-M3 Model...")
        print("🚀 [SHARED MODEL] Memuat BGE-M3 secara Lazy...")
        _model = BGEM3FlagModel('BAAI/bge-m3', use_fp16=True)
    return _model
