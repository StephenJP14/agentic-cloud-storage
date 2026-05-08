# experiments/03_generate_golden_dataset_copy_2.py

import os
import json
import base64
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.document import InputFormat
from langchain_openai import ChatOpenAI

from app.core.config import OLLAMA_URL

load_dotenv()

# We increase num_ctx because full page descriptions + markdown get long
# llm = ChatOllama(
#     base_url=OLLAMA_URL,
#     model="qwen3.5:9b",
#     num_ctx=4096,
    
#     # Qwen's official recommended parameters for Instruct (non-thinking) mode
#     temperature=0.7,
#     top_p=0.8,
#     top_k=20,
#     presence_penalty=1.5, 
    
#     # Ollama's parameter to disable reasoning
#     think=False 
# )

# 2. VLLM CONFIGURATION
# Point this to your vLLM Docker container port
VLLM_URL = "http://192.168.2.99:8000/v1" 
MODEL_NAME = "Qwen/Qwen3-VL-8B-Instruct" # Must match your Docker command exactly

# Initialize the vLLM client
llm = ChatOpenAI(
    base_url=VLLM_URL,
    api_key="EMPTY", # vLLM doesn't need a real API key
    model=MODEL_NAME,
    temperature=0.7,
    max_tokens=2048,
    
    # 3. DISABLE THINKING (The Qwen3.5 method you asked about originally)
    # vLLM accepts the OpenAI "extra_body" kwargs via model_kwargs in LangChain
    # model_kwargs={
    #     "top_k": 20,
    #     "presence_penalty": 1.5,
    #     "chat_template_kwargs": {"enable_thinking": False}
    # }
)

def describe_page_layout(pil_image: Image.Image, page_num: int, filename: str) -> str:
    """Analyzes a full page screenshot to understand spatial relationships."""
    
    debug_dir = "app/evals/debug_pages"
    os.makedirs(debug_dir, exist_ok=True)
    pil_image.save(f"{debug_dir}/{filename}_page_{page_num}.png")

    try:
        buffered = BytesIO()
        if pil_image.width > 1500:
            pil_image.thumbnail((1500, 1500))
            
        pil_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        prompt = f"""Kamu adalah asisten teknis. Ini adalah screenshot HALAMAN {page_num} dari manual {filename}.
        Tugasmu: Jelaskan hubungan antara teks dan elemen visual.
        1. Jika ada diagram perangkat, sebutkan letak komponen berdasarkan nomor/label yang terlihat.
        2. Contoh: 'Nomor 1 adalah Tombol Daya yang terletak di pojok kanan atas keyboard'.
        3. Jelaskan tata letak secara spasial (kiri, kanan, atas, bawah)."""
        
        # 4. CRITICAL FIX: OpenAI Vision Format
        # LangChain ChatOpenAI format for images is slightly different than ChatOllama. 
        # image_url must be a dictionary with a "url" key.
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {
                    "type": "image_url", 
                    "image_url": {"url": f"data:image/png;base64,{img_str}"}
                }
            ]
        )
        
        print(f"👁️ [VISION - vLLM] Menganalisis Layout Halaman {page_num}...")
        response = llm.invoke([message])
        return f"--- LAYOUT VISUAL HALAMAN {page_num} ---\n{response.content.strip()}\n"
    except Exception as e:
        print(f"⚠️ Vision Error on Page {page_num}: {e}")
        return ""
    
def extract_reference_content(file_path):
    filename = os.path.basename(file_path)
    print(f"📄 [PROCESS] Full-Page Reference Extraction: {filename}...")
    
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = True
    pipeline_options.do_table_structure = True
    pipeline_options.generate_page_images = True 
    pipeline_options.generate_picture_images = False 
    
    converter = DocumentConverter(
        allowed_formats=[InputFormat.PDF],
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )
    
    conv_result = converter.convert(file_path)
    doc = conv_result.document
    base_markdown = doc.export_to_markdown()
    
    all_visual_context = "\n\n=== ANALISIS SPASIAL PER HALAMAN ===\n"
    
    # --- HANDLING THE LIMIT ---
    # Jika ingin semua halaman, ganti '8' menjadi len(doc.pages)
    # Tapi hati-hati: VLM per halaman memakan waktu lama.
    num_to_process = len(doc.pages) 
    print(f"📸 Memproses {num_to_process} halaman pertama untuk analisis visual...")
    
    for page_no in range(1, num_to_process + 1):
        page_obj = doc.pages.get(page_no)
        # [FIX]: docling menyimpan gambar dalam atribut .image yang bertipe ImageRef
        # Kita butuh .pil_image untuk mendapatkan objek PIL yang bisa di-.save()
        if page_obj and page_obj.image:
            pil_img = page_obj.image.pil_image 
            page_desc = describe_page_layout(pil_img, page_no, filename)
            all_visual_context += page_desc
            
    return base_markdown + all_visual_context

import re # Add this to your imports at the top

import re

def generate_qa_from_context(full_context, filename):
    print(f"🧠 [LLM] Menghasilkan 5 tipe soal untuk {filename}...")
    
    prompt = f"""Kamu adalah Ahli Pembuat Dataset (Dataset Engineer). Tugasmu adalah membuat pasangan Pertanyaan dan Jawaban berdasarkan Dokumen Referensi.

ATURAN PERTANYAAN (QUESTION):
1. Sudut pandang: User/pelanggan awam yang sedang bingung.
2. JANGAN PERNAH memasukkan petunjuk, solusi, atau jawaban ke dalam pertanyaan. (DILARANG KERAS mengatakan "Gampang, tinggal tekan...").
3. Harus murni bertanya. Gunakan bahasa kasual (Gimana, Kenapa, Sebelah mana, Bisa nggak).

ATURAN JAWABAN (GROUND TRUTH):
1. Sudut pandang: Buku manual resmi / Customer Service ahli.
2. Harus akurat dan langsung ke intinya berdasarkan Dokumen Referensi.
3. KHUSUS 'Image-referencing': Jawaban HARUS merujuk pada letak fisik (Kanan, Kiri, Atas, Bawah) berdasarkan bagian 'ANALISIS SPASIAL PER HALAMAN'.

=== CONTOH BENAR ===
{{
    "type": "Procedural",
    "question": "Gimana cara reset laptop ini ke pengaturan pabrik?",
    "ground_truth": "Masuk ke menu Settings, pilih System, lalu klik Reset this PC."
}},
{{
    "type": "Image-referencing",
    "question": "Tombol power-nya sebelah mana ya?",
    "ground_truth": "Tombol power terletak di pojok kanan atas, terpisah dari susunan keyboard utama."
}}

=== CONTOH SALAH (DILARANG KERAS) ===
{{
    "type": "Procedural",
    "question": "Gimana cara reset? Gampang kok, tinggal masuk ke setting aja.", 
    "ground_truth": "Masuk ke setting."
}} 
// PENJELASAN SALAH: Pertanyaan menjawab dirinya sendiri.

DOKUMEN REFERENSI:
{full_context[:15000]}

Berdasarkan referensi di atas, hasilkan 5 soal (Procedural, Troubleshooting, Factual/Specs, Image-referencing, Negative) dalam format JSON Array persis seperti Contoh Benar. HANYA OUTPUT JSON:
"""

    try:
        # We just reuse the exact same 'llm' object. 
        # vLLM will automatically treat this as a standard text-only request because there is no image block.
        response = llm.invoke([HumanMessage(content=prompt)]).content
        
        match = re.search(r'\[\s*\{.*\}\s*\]', response, re.DOTALL)
        if match:
            clean_json = match.group(0)
        else:
            clean_json = response.replace("```json", "").replace("```", "").strip()

        return json.loads(clean_json)
    except Exception as e:
        print(f"⚠️ Error parsing JSON untuk {filename}: {e}")
        return []

def main():
    docs_folder = "docs"
    dataset = []
    pdf_files = [f for f in os.listdir(docs_folder) if f.lower().endswith('.pdf')]
    
    for filename in pdf_files:
        file_path = os.path.join(docs_folder, filename)
        
        # 1. Get combined Markdown + Page Descriptions
        full_reference = extract_reference_content(file_path)
        
        # 2. Generate QA
        qa_pairs = generate_qa_from_context(full_reference, filename)
        
        for qa in qa_pairs:
            dataset.append({
                "source_file": filename,
                "question_type": qa.get("type"),
                "question": qa.get("question"),
                "ground_truth": qa.get("ground_truth")
            })

    # Save final Golden Dataset
    output_path = "app/evals/datasets/golden_dataset_copy_2.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=4, ensure_ascii=False)
    print(f"\n✅ Selesai! Dataset tersimpan di {output_path}.")

if __name__ == "__main__":
    main()