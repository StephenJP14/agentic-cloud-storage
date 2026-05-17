# services/ingest_service.py

import os
import base64
import uuid
import json
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv
from qdrant_client import QdrantClient, models
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from urllib.parse import quote

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.chunking import HybridChunker

from app.services.embed_model import get_embed_model
from app.core.config import OLLAMA_URL, QDRANT_URL, COLLECTION_NAME, COLLECTION_SUMM

load_dotenv()
WINDOWS_IP = "36.94.111.114"
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", f"http://{WINDOWS_IP}:11434")
# QDRANT_URL = os.getenv("QDRANT_URL", f"http://{WINDOWS_IP}:6333")

# We use Qwen3-VL for both Vision extraction AND Contextual Enrichment
local_llm = ChatOllama(base_url=OLLAMA_URL, model="qwen3-vl:8b-instruct", temperature=0.0)
qdrant = QdrantClient(url=QDRANT_URL)
collection_name = "user_docs"
collection_summ = "docs_summ" # NEW: Dedicated summary collection

if not qdrant.collection_exists(collection_name):
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
        sparse_vectors_config={
            "sparse": models.SparseVectorParams(index=models.SparseIndexParams(on_disk=False))
        }
    )

# NEW: Initialize the summary collection (with Hybrid Search support)
if not qdrant.collection_exists(collection_summ):
    qdrant.create_collection(
        collection_name=collection_summ,
        vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
        sparse_vectors_config={
            "sparse": models.SparseVectorParams(index=models.SparseIndexParams(on_disk=False))
        }
    )


def describe_image_with_qwen(pil_image: Image.Image) -> str:
    """Passes an extracted image to Qwen3-VL to get a textual description."""
    try:
        # Convert PIL Image to Base64
        buffered = BytesIO()
        pil_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        prompt = """Kamu adalah asisten teknis. Jelaskan diagram, tabel, atau gambar dari buku manual ini secara detail. 
        Sebutkan semua teks yang ada di dalam gambar, lokasi tombol/port jika ada, dan fungsi yang dijelaskan."""
        
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": f"data:image/png;base64,{img_str}"}
            ]
        )
        
        print("👁️ [VISION] Menganalisis gambar dengan Qwen3-VL...")
        response = local_llm.invoke([message])
        return f"\n\n[DESKRIPSI GAMBAR/DIAGRAM]: {response.content.strip()}"
    except Exception as e:
        print(f"⚠️ Vision Error: {e}")
        return ""

# ==========================================
# NEW: Dedicated Map-Reduce Summarization Function
# ==========================================
def generate_map_reduce_summary(docling_doc, filename: str, embed_model) -> str:
    """
    Executes a sequential Map-Reduce summarization using Context-Aware Chunking.
    """
    print(f"🗺️ [MAP] Memulai Map-Reduce summarization untuk {filename}...")
    
    # ---------------------------------------------------------
    # THE ARCHITECT FIX: Use Docling's HybridChunker instead of character slicing.
    # We set max_tokens much higher (e.g., 3000) for the Map phase so the LLM 
    # processes entire sections at once, minimizing total loops.
    # ---------------------------------------------------------
    chunker = HybridChunker(tokenizer=embed_model.tokenizer, max_tokens=3000, merge_peers=True)
    chunk_iter = list(chunker.chunk(dl_doc=docling_doc)) 
    
    chunk_summaries = []
    
    # MAP PHASE
    for i, chunk in enumerate(chunk_iter):
        # We can use Docling's contextualize to ensure the header path is included
        try:
            text_to_summarize = chunker.contextualize(chunk)
        except AttributeError:
            text_to_summarize = chunk.text
            
        if not text_to_summarize.strip(): 
            continue
            
        map_prompt = f"""Summarize the following section of a document in 2-3 bullet points.
        Section: {text_to_summarize}"""
        
        try:
            summary = local_llm.invoke([HumanMessage(content=map_prompt)]).content
            chunk_summaries.append(summary)
            print(f"  - Map phase: Chunk {i+1}/{len(chunk_iter)} summarized.")
        except Exception as e:
            print(f"⚠️ Map Error on chunk {i+1}: {e}")
            
    # REDUCE PHASE
    print("🧠 [REDUCE] Menggabungkan summary dari semua chunk...")
    combined_summaries = "\n".join(chunk_summaries)
    
    reduce_prompt = f"""Berdasarkan ringkasan dari berbagai bagian dokumen berikut, buatlah satu Executive Summary yang komprehensif, terstruktur, dan mudah dibaca tentang keseluruhan isi dokumen.
    
    RINGKASAN BAGIAN:
    {combined_summaries}
    
    Tuliskan ringkasan akhir dalam bahasa Indonesia:"""
    
    final_summary = local_llm.invoke([HumanMessage(content=reduce_prompt)]).content
    print("✅ [REDUCE] Ringkasan akhir selesai dibuat.")
    
    return final_summary


def generate_contextual_prefix(chunk_text: str, doc_summary: str, filename: str) -> str:
    """
    [ARCHITECT FIX] Strategy #4: Contextual Retrieval.
    Prevents context fragmentation by prepending document-level context to the chunk.
    """
    prompt = f"""You are an expert context analyzer. 
    Document Name: {filename}
    Document Summary: {doc_summary}
    
    Chunk: 
    {chunk_text}
    
    Write a 1-sentence context explaining how this chunk fits into the broader document. 
    Output ONLY the sentence."""
    
    try:
        response = local_llm.invoke([HumanMessage(content=prompt)])
        return f"{response.content.strip()}\n\n{chunk_text}"
    except Exception as e:
        print(f"⚠️ Enrichment Error: {e}")
        return chunk_text

def ingest_file(file_path, user_id="u_default"):
    embed_model = get_embed_model()
    filename = os.path.basename(file_path)
    safe_filename = quote(filename)
    
    # 1. Configure Docling to extract images
    pipeline_options = PdfPipelineOptions()
    pipeline_options.images_scale = 2.0
    pipeline_options.generate_page_images = False
    pipeline_options.generate_picture_images = True # CRITICAL: Enable picture extraction

    converter = DocumentConverter(
        format_options={"pdf": PdfFormatOption(pipeline_options=pipeline_options)}
    )
    
    print(f"🔄 [PROCESS] Memulai ekstraksi Semantic Object & Gambar: {filename}...")
    docling_doc = converter.convert(file_path).document
    

    # ---------------------------------------------------------
    # NEW: Generate and store the full document summary FIRST
    # ---------------------------------------------------------
    full_doc_summary = generate_map_reduce_summary(docling_doc, filename, embed_model)
    
    # Embed the summary with both Dense and Sparse vectors for Hybrid Search
    summary_embeddings = embed_model.encode([full_doc_summary], return_dense=True, return_sparse=True)
    summary_dense_vec = summary_embeddings['dense_vecs'][0]
    summary_sparse_dict = summary_embeddings['lexical_weights'][0]
    
    # Token deduplication for sparse vector (same as chunk ingestion)
    s_tokens = list(summary_sparse_dict.keys())
    s_weights = list(summary_sparse_dict.values())
    s_token_ids = embed_model.tokenizer.convert_tokens_to_ids(s_tokens)
    
    s_dedup_sparse = {}
    for idx, w in zip(s_token_ids, s_weights):
        if idx not in s_dedup_sparse or w > s_dedup_sparse[idx]:
            s_dedup_sparse[idx] = w
    
    summary_sparse_vector = models.SparseVector(
        indices=list(s_dedup_sparse.keys()),
        values=list(s_dedup_sparse.values())
    )
    
    # Upload summary to the new collection
    summ_point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_id}_{filename}_summary"))
    qdrant.upsert(
        collection_name=collection_summ,
        points=[
            models.PointStruct(
                id=summ_point_id,
                vector={"":  summary_dense_vec.tolist(), "sparse": summary_sparse_vector},
                payload={
                    "text": full_doc_summary,
                    "filename": filename,
                    "source_type": "full_document_summary",
                    "user_id": user_id,
                    "file_url": f'http://{WINDOWS_IP}:9000/browser/uploads/{safe_filename}'
                }
            )
        ]
    )
    print(f"📤 [QDRANT] Full summary untuk {filename} berhasil diunggah ke '{collection_summ}'.")
    

    # Generate a brief summary of the whole doc for enrichment
    full_text_preview = docling_doc.export_to_markdown()[:3000]
    doc_summary = local_llm.invoke([
        SystemMessage(content="Summarize this technical manual in 3 sentences."),
        HumanMessage(content=full_text_preview)
    ]).content

    chunker = HybridChunker(tokenizer=embed_model.tokenizer, max_tokens=800, merge_peers=True)
    chunk_iter = chunker.chunk(dl_doc=docling_doc)
    
    points = []
    global_chunk_idx = 0

    # Auto-tag product category based on filename for now (can be replaced by admin panel input later)
    category = "Unknown"
    if "TV" in filename.upper(): category = "TV"
    elif "LAPTOP" in filename.upper() or "D-TECH" in filename.upper(): category = "Laptop"

    for chunk in chunk_iter:
        raw_text = chunk.text
        if not raw_text.strip(): continue

        try:
            docling_context_text = chunker.contextualize(chunk)
        except AttributeError:
            docling_context_text = raw_text

        # 2. Check if this chunk contains any extracted images
        image_descriptions = ""
        if chunk.meta and hasattr(chunk.meta, 'doc_items'):
            for item in chunk.meta.doc_items:
                # If Docling captured a picture for this item
                if hasattr(item, 'image') and item.image is not None:
                    image_descriptions += describe_image_with_qwen(item.image)

        # 3. Combine Text + Image Description + Structural Context
        combined_chunk_text = docling_context_text + image_descriptions
        enriched_text = generate_contextual_prefix(combined_chunk_text, doc_summary, filename)
        
        # [Keep your existing BGE-M3 Dense/Sparse embedding logic here...]
        embeddings = embed_model.encode([enriched_text], return_dense=True, return_sparse=True)
        dense_vec = embeddings['dense_vecs'][0]
        sparse_dict = embeddings['lexical_weights'][0]
        
        # --- Token deduplication for sparse vector ---
        tokens = list(sparse_dict.keys())
        weights = list(sparse_dict.values())
        token_ids = embed_model.tokenizer.convert_tokens_to_ids(tokens)
        
        dedup_sparse = {}
        for idx, w in zip(token_ids, weights):
            if idx not in dedup_sparse or w > dedup_sparse[idx]:
                dedup_sparse[idx] = w
        
        final_indices = list(dedup_sparse.keys())
        final_values = list(dedup_sparse.values())
        
        sparse_vector = models.SparseVector(
            indices=final_indices,
            values=final_values
        )

        unique_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_id}_{filename}_{global_chunk_idx}"))

        points.append(
            models.PointStruct(
                id=unique_id, 
                vector={"": dense_vec.tolist(), "sparse": sparse_vector},
                payload={
                    "text": enriched_text, 
                    "raw_text": raw_text,
                    "filename": filename,
                    "product_category": category, # Injected metadata
                    "source_type": "semantic_object_with_vision", 
                    "user_id": user_id,
                    "file_url": f'http://{WINDOWS_IP}:9000/browser/uploads/{safe_filename}',
                    "chunk_id": global_chunk_idx
                }
            )
        )
        global_chunk_idx += 1
        
    print(f"📤 [QDRANT] Mengunggah {len(points)} Semantic Objects...")
    qdrant.upload_points(collection_name=collection_name, points=points, batch_size=100)
    print("✅ Ingestion Complete.")