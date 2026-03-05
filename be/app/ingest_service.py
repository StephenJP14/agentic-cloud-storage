import os
import base64
import uuid
import json
from dotenv import load_dotenv
from qdrant_client import QdrantClient, models
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from urllib.parse import quote

# [ARCHITECT FIX] Replace naive chunking with Docling for Semantic Objects
from docling.document_converter import DocumentConverter
from docling.chunking import HybridChunker

from .embed_model import get_embed_model

load_dotenv()
WINDOWS_IP = os.getenv("WINDOWS_IP", "127.0.0.1")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", f"http://{WINDOWS_IP}:11434")
QDRANT_URL = os.getenv("QDRANT_URL", f"http://{WINDOWS_IP}:6333")

# We use Qwen3-VL for both Vision extraction AND Contextual Enrichment
local_llm = ChatOllama(base_url=OLLAMA_URL, model="qwen3-vl:8b-instruct", temperature=0.0)
qdrant = QdrantClient(url=QDRANT_URL)
collection_name = "user_docs"

if not qdrant.collection_exists(collection_name):
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
        sparse_vectors_config={
            "sparse": models.SparseVectorParams(index=models.SparseIndexParams(on_disk=False))
        }
    )

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
    
    print(f"🔄 [PROCESS] Memulai ekstraksi Semantic Object: {filename}...")
    
    # [ARCHITECT FIX] Strategy #7: Context-Aware Chunking via Docling
    converter = DocumentConverter()
    docling_doc = converter.convert(file_path).document
    
    # Generate a brief summary of the whole doc for enrichment
    full_text_preview = docling_doc.export_to_markdown()[:3000]
    doc_summary = local_llm.invoke([
        SystemMessage(content="Summarize this academic document in 3 sentences."),
        HumanMessage(content=full_text_preview)
    ]).content

    # Token-aware hybrid chunking respects document structure
    # Reuse the tokenizer from the already-loaded BGE-M3 model
    chunker = HybridChunker(tokenizer=embed_model.tokenizer, max_tokens=800, merge_peers=True)
    
    chunk_iter = chunker.chunk(dl_doc=docling_doc)
    
    points = []
    global_chunk_idx = 0

    for chunk in chunk_iter:
        raw_text = chunk.text
        if not raw_text.strip(): continue

        # [ARCHITECT FIX] Apply Contextual Enrichment
        # [FIX 1: Apply Docling's native contextualization]
        # This stitches the document headings back into the text
        try:
            docling_context_text = chunker.contextualize(chunk)
        except AttributeError:
            # Fallback if your specific Docling version uses a different method
            docling_context_text = raw_text

        # [FIX 2: Combine structural context with global LLM summary]
        enriched_text = generate_contextual_prefix(docling_context_text, doc_summary, filename)
        
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
                    "text": enriched_text, # Store the enriched context!
                    "raw_text": raw_text,
                    "filename": filename,
                    "source_type": "semantic_object", 
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