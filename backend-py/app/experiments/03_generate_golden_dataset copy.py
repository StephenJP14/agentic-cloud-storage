import os
import json
import random
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

from app.core.config import OLLAMA_URL, QDRANT_URL, COLLECTION_NAME

load_dotenv()

# Initialize connections
client = QdrantClient(url=QDRANT_URL)
llm = ChatOllama(base_url=OLLAMA_URL, model="qwen3-vl:8b-instruct", temperature=0.3)

def fetch_random_chunks(limit=30):
    """Ambil chunk acak dari Qdrant untuk dijadikan bahan pembuat soal."""
    print(f"Mengambil {limit} dokumen acak dari Qdrant...")
    records, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        limit=limit,
        with_payload=True,
        with_vectors=False
    )
    return [record.payload for record in records if "text" in record.payload]

def generate_qa_pair(chunk_text, filename):
    """Gunakan LLM untuk membuat pasangan Pertanyaan dan Jawaban (Ground Truth) dalam Bahasa Indonesia."""
    prompt = f"""Kamu adalah ahli pembuat soal ujian berdasarkan buku manual teknis.
    Berdasarkan teks berikut dari file '{filename}', buatlah 1 pertanyaan teknis yang spesifik dan jawaban yang tepat & menjawab pertanyaan (Ground Truth) dalam Bahasa Indonesia yang kasual/natural (seperti orang bertanya pada umumnya).
    
    Teks Referensi:
    {chunk_text}
    
    Output HARUS dalam format JSON persis seperti ini, tanpa markdown block atau teks lain:
    {{
        "question": "pertanyaan di sini",
        "ground_truth": "jawaban di sini"
    }}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)]).content

        # Bersihkan response jika ada markdown JSON tag
        clean_json = response.replace("```json", "").replace("```", "").strip()

        data = json.loads(clean_json)
        return data["question"], data["ground_truth"]

    except Exception as e:
        print(f"Error generating QA: {e}")
        return None, None

def main():
    chunks = fetch_random_chunks(limit=50)  # Set jumlah sampel soal yang ingin dibuat
    dataset = []

    print("Mulai membuat Golden Dataset...")

    for i, chunk in enumerate(chunks):
        text = chunk["text"]
        filename = chunk.get("filename", "Unknown")

        print(f"[{i+1}/{len(chunks)}] Membuat soal dari: {filename}...")

        question, ground_truth = generate_qa_pair(text, filename)

        if question and ground_truth:
            dataset.append({
                "question": question,
                "ground_truth": ground_truth,
                "reference_context": text  # Simpan untuk referensi manual jika butuh
            })

    # Simpan dataset
    output_path = "app/evals/datasets/golden_dataset.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=4, ensure_ascii=False)

    print(f"\n✅ Selesai! Golden Dataset tersimpan di {output_path} dengan {len(dataset)} pasang QA.")

if __name__ == "__main__":
    main()