from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall
)
from datasets import Dataset
from langchain_openai import ChatOpenAI # Changed from ChatOllama
from app.services.embed_model import get_embed_model

# Config vLLM - Sesuaikan dengan IP Docker Anda
VLLM_URL = "http://192.168.2.99:8000/v1" 
MODEL_NAME = "Qwen/Qwen3-VL-8B-Instruct"

class CustomEmbeddingsWrapper:
    def __init__(self, embed_model):
        self.embed_model = embed_model
        
    def embed_documents(self, texts):
        embeddings = self.embed_model.encode(texts, return_dense=True)['dense_vecs']
        return embeddings.tolist()
        
    def embed_query(self, text):
        embeddings = self.embed_model.encode([text], return_dense=True)['dense_vecs']
        return embeddings[0].tolist()

def run_ragas_evaluation(results_dict):
    """Menjalankan evaluasi RAGAS menggunakan vLLM sebagai Judge."""
    
    # 1. Persiapkan Judge LLM via vLLM
    judge_llm = ChatOpenAI(
        base_url=VLLM_URL,
        api_key="EMPTY",
        model=MODEL_NAME,
        temperature=0.0 # Judge harus konsisten/deterministik
    )
    
    raw_embed_model = get_embed_model()
    judge_embeddings = CustomEmbeddingsWrapper(raw_embed_model)

    # 2. Konversi ke HuggingFace Dataset
    hf_dataset = Dataset.from_dict(results_dict)
    
    # 3. Metrik
    metrics = [
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall
    ]
    
    print(f"🚀 [vLLM] Menghitung skor RAGAS menggunakan {MODEL_NAME}...")
    
    result = evaluate(
        dataset=hf_dataset,
        metrics=metrics,
        llm=judge_llm,
        embeddings=judge_embeddings
    )
    
    return result.to_pandas()