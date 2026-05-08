import os
import json
import base64
import re
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.document import InputFormat

load_dotenv()
from app.core.config import OLLAMA_URL

# Context 15k is usually enough for 3-5 pages and much faster than 20k
llm = ChatOllama(base_url=OLLAMA_URL, model="qwen3-vl:8b-instruct", temperature=0.2, num_ctx=15000)

def describe_page_layout(pil_image: Image.Image, page_num: int, filename: str) -> str:
    debug_dir = "app/evals/debug_pages"
    os.makedirs(debug_dir, exist_ok=True)
    
    # Resize to 1024px for faster VLM encoding without losing much detail
    if max(pil_image.size) > 1024:
        pil_image.thumbnail((1024, 1024))
    
    pil_image.save(f"{debug_dir}/{filename}_page_{page_num}.png")

    try:
        buffered = BytesIO()
        pil_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        prompt = f"""Analisis HALAMAN {page_num} dari {filename}.
        Sebutkan lokasi komponen fisik (tombol/port) berdasarkan label/nomor yang ada di diagram.
        Gunakan instruksi spasial (misal: 'di sebelah kiri', 'di atas keyboard')."""
        
        message = HumanMessage(content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": f"data:image/png;base64,{img_str}"}
        ])
        
        response = llm.invoke([message])
        return f"\n[VISUAL HALAMAN {page_num}]: {response.content.strip()}\n"
    except Exception as e:
        print(f"⚠️ Vision Error Page {page_num}: {e}")
        return ""

def extract_reference_content(file_path):
    filename = os.path.basename(file_path)
    print(f"📄 [1/3] Memulai Docling OCR & Layout: {filename}...")
    
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = True
    pipeline_options.generate_page_images = True 
    
    converter = DocumentConverter(
        allowed_formats=[InputFormat.PDF],
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)}
    )
    
    # Docling stage - This is usually where the "hang" starts
    conv_result = converter.convert(file_path)
    doc = conv_result.document
    base_markdown = doc.export_to_markdown()
    
    print(f"📸 [2/3] Menganalisis Visual (Total {len(doc.pages)} hal)...")
    all_visual_context = "\n=== ANALISIS VISUAL ===\n"
    
    # STRATEGY: Ambil halaman 1, 2, 3 (biasanya layout) dan halaman tengah/akhir (troubleshooting)
    pages_to_scan = sorted(list(set([1, 2, 3, len(doc.pages)//2, len(doc.pages)])))
    pages_to_scan = [p for p in pages_to_scan if p <= len(doc.pages)]

    for page_no in pages_to_scan:
        page_obj = doc.pages.get(page_no)
        if page_obj and page_obj.image:
            desc = describe_page_layout(page_obj.image.pil_image, page_no, filename)
            all_visual_context += desc
            
    return base_markdown + all_visual_context

def generate_qa_from_context(full_context, filename):
    print(f"🧠 [3/3] LLM sedang merangkai soal untuk {filename}...")
    prompt = f"""Kamu QA Engineer. Buat 5 soal (1 per tipe: Procedural, Troubleshooting, Factual, Image-referencing, Negative).
    Gunakan Bahasa Indonesia KASUAL. Jangan gunakan double quotes di dalam value (gunakan single quote saja).
    
    DOKUMEN:
    {full_context[:12000]}
    
    Format JSON Array:
    [
        {{"type": "Procedural", "question": "Gimana cara...", "ground_truth": "..."}}
    ]"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)]).content
        match = re.search(r'\[\s*\{.*\}\s*\]', response, re.DOTALL)
        clean_json = match.group(0) if match else response.strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"⚠️ JSON Fail: {e}")
        return []

def main():
    docs_folder = "docs"
    dataset = []
    pdf_files = [f for f in os.listdir(docs_folder) if f.lower().endswith('.pdf')]
    
    for filename in pdf_files:
        file_path = os.path.join(docs_folder, filename)
        full_ref = extract_reference_content(file_path)
        qa_pairs = generate_qa_from_context(full_ref, filename)
        
        for qa in qa_pairs:
            dataset.append({
                "source_file": filename,
                "question_type": qa.get("type"),
                "question": qa.get("question"),
                "ground_truth": qa.get("ground_truth")
            })

    output_path = "app/evals/datasets/golden_dataset.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=4, ensure_ascii=False)
    print(f"\n✅ Dataset selesai! Lokasi: {output_path}")

if __name__ == "__main__":
    main()