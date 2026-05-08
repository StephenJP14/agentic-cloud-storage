import json
import os
import pandas as pd
from datetime import datetime
from app.evals.ragas_metric import run_ragas_evaluation
from app.services.agent import search_node, expand_query_node
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI # Changed from ChatOllama

# Config vLLM
VLLM_URL = "http://192.168.2.99:8000/v1" 
MODEL_NAME = "Qwen/Qwen3-VL-8B-Instruct"

# Initialize vLLM Reader
llm = ChatOpenAI(
    base_url=VLLM_URL,
    api_key="EMPTY",
    model=MODEL_NAME,
    temperature=0.1
)

def get_rag_response(question, config):
    """Simulasi pipeline RAG berdasarkan config tertentu."""
    state = {"messages": [HumanMessage(content=question)], "loop_count": 0}
    
    # 1. Multi-Query Step (Jika aktif)
    if config.get('multi_query'):
        # Memanggil fungsi expand_query_node yang sudah ada di agent.py
        state.update(expand_query_node(state))
    else:
        state["search_queries"] = [question]

    # 2. Retrieval Step (Memanggil search_node dari agent.py)
    search_results = search_node(state)
    retrieved_docs = search_results["retrieved_docs"]
    
    # 3. Context Construction
    context_text = "\n\n".join([d.page_content for d in retrieved_docs])
    
    # 4. Generation (vLLM Reader)
    prompt = f"""Gunakan Dokumen di bawah ini untuk menjawab pertanyaan.
    Jika tidak ada di dokumen, katakan tidak tahu.
    
    DOKUMEN:
    {context_text}
    
    PERTANYAAN: {question}"""
    
    answer = llm.invoke([HumanMessage(content=prompt)]).content
    
    return {
        "answer": answer,
        "contexts": [d.page_content for d in retrieved_docs]
    }

def main():
    # 1. Load Golden Dataset yang sudah dibuat di tahap 03
    dataset_path = "app/evals/datasets/golden_dataset_copy_2.json"
    if not os.path.exists(dataset_path):
        print(f"❌ Dataset tidak ditemukan di {dataset_path}. Jalankan script 03 dulu!")
        return

    with open(dataset_path, "r") as f:
        dataset = json.load(f)

    # 2. Tentukan Kombinasi yang ingin dites
    configs = [
        {"name": "Baseline (Single Query)", "multi_query": False},
        {"name": "Enhanced (Multi-Query RAG)", "multi_query": True},
    ]

    all_summaries = []

    for cfg in configs:
        print(f"\n🧪 [EXPERIMENT] Testing: {cfg['name']}")
        eval_data = {
            "question": [],
            "answer": [],
            "contexts": [],
            "ground_truth": []
        }

        # Jalankan test set (Misal: 15 soal pertama untuk benchmark awal)
        for item in dataset[:15]: 
            res = get_rag_response(item["question"], cfg)
            
            eval_data["question"].append(item["question"])
            eval_data["answer"].append(res["answer"])
            eval_data["contexts"].append(res["contexts"])
            eval_data["ground_truth"].append(item["ground_truth"])

        # 3. Run RAGAS via vLLM
        print(f"📊 Menghitung skor untuk {cfg['name']}...")
        df_results = run_ragas_evaluation(eval_data)
        
        # Ambil rata-rata skor
        summary = df_results.mean(numeric_only=True).to_dict()
        summary["Pipeline"] = cfg["name"]
        all_summaries.append(summary)

    # 4. Final Comparison Table
    final_df = pd.DataFrame(all_summaries)
    print("\n" + "="*60)
    print("             RAG EVALUATION SUMMARY (vLLM)")
    print("="*60)
    print(final_df.to_string(index=False))
    
    # Simpan hasil ke CSV
    output_csv = f"app/evals/benchmark_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    final_df.to_csv(output_csv, index=False)
    print(f"\n✅ Hasil lengkap disimpan ke: {output_csv}")

if __name__ == "__main__":
    main()