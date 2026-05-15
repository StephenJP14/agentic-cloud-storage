import json
import math
from pathlib import Path
from typing import Any

import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http import models
from langchain_core.documents import Document
from langchain_community.document_compressors.flashrank_rerank import FlashrankRerank

from app.core.config import QDRANT_URL, COLLECTION_NAME
from app.services.embed_model import get_embed_model

BASE_DIR = Path(__file__).resolve().parent
GOLDEN_DATA_PATH = BASE_DIR / "golden_dataset.json"

client = QdrantClient(url=QDRANT_URL)
embed_model = get_embed_model()
reranker = FlashrankRerank(model="ms-marco-MiniLM-L-12-v2", top_n=15)


def load_golden_dataset(path: Path = GOLDEN_DATA_PATH) -> list[dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_sparse_vector(lexical_weights: dict[str, float]) -> models.SparseVector:
    tokens = list(lexical_weights.keys())
    weights = list(lexical_weights.values())

    try:
        ids = [int(token) for token in tokens]
    except ValueError:
        ids = embed_model.tokenizer.convert_tokens_to_ids(tokens)

    dedup_sparse: dict[int, float] = {}
    for idx, w in zip(ids, weights):
        if idx not in dedup_sparse or float(w) > dedup_sparse[idx]:
            dedup_sparse[idx] = float(w)

    return models.SparseVector(indices=list(dedup_sparse.keys()), values=list(dedup_sparse.values()))


def encode_query(query: str) -> tuple[list[float], models.SparseVector]:
    emb = embed_model.encode(query, return_dense=True, return_sparse=True)
    dense_vec = emb["dense_vecs"]
    if isinstance(dense_vec, np.ndarray):
        if dense_vec.ndim == 1:
            dense_vec = dense_vec.tolist()
        elif dense_vec.ndim == 2 and dense_vec.shape[0] == 1:
            dense_vec = dense_vec[0].tolist()
        else:
            raise ValueError(f"Unexpected dense embedding shape: {dense_vec.shape}")
    else:
        dense_vec = list(dense_vec)

    sparse_vec = build_sparse_vector(emb["lexical_weights"])
    return dense_vec, sparse_vec


def normalize_scores(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    scores = [item["score"] for item in items if item["score"] is not None]
    if not scores:
        return items
    min_score = min(scores)
    max_score = max(scores)
    span = max_score - min_score if max_score != min_score else 1.0
    for item in items:
        item["norm_score"] = (item["score"] - min_score) / span if item["score"] is not None else 0.0
    return items


def qdrant_point_to_dict(point: Any) -> dict[str, Any]:
    return {
        "id": str(point.id),
        "score": float(point.score) if point.score is not None else 0.0,
        "payload": dict(point.payload or {}),
    }


def retrieve_dense(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    dense_vec, _ = encode_query(query)
    result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=dense_vec,
        using="",
        limit=top_k,
        with_payload=True,
    )
    return [qdrant_point_to_dict(point) for point in result.points]


def retrieve_sparse(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    _, sparse_vec = encode_query(query)
    result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=sparse_vec,
        using="sparse",
        limit=top_k,
        with_payload=True,
    )
    return [qdrant_point_to_dict(point) for point in result.points]


def retrieve_hybrid_manual(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    dense_results = retrieve_dense(query, top_k=top_k * 3)
    sparse_results = retrieve_sparse(query, top_k=top_k * 3)

    normalize_scores(dense_results)
    normalize_scores(sparse_results)

    merged: dict[str, dict[str, Any]] = {}
    for item in dense_results:
        merged[item["id"]] = {
            "id": item["id"],
            "payload": item["payload"],
            "dense_score": item["norm_score"],
            "sparse_score": 0.0,
        }
    for item in sparse_results:
        merged.setdefault(item["id"], {
            "id": item["id"],
            "payload": item["payload"],
            "dense_score": 0.0,
            "sparse_score": 0.0,
        })
        merged[item["id"]]["sparse_score"] = item["norm_score"]

    combined = [
        {
            "id": record["id"],
            "payload": record["payload"],
            "score": 0.5 * record["dense_score"] + 0.5 * record["sparse_score"],
        }
        for record in merged.values()
    ]
    combined.sort(key=lambda item: item["score"], reverse=True)
    return combined[:top_k]


def retrieve_hybrid_rrf(query: str, top_k: int = 5, rrf_k: int = 60) -> list[dict[str, Any]]:
    dense_results = retrieve_dense(query, top_k=top_k * 5)
    sparse_results = retrieve_sparse(query, top_k=top_k * 5)

    aggregated: dict[str, dict[str, Any]] = {}
    for rank_list in (dense_results, sparse_results):
        for rank, item in enumerate(rank_list, start=1):
            score = 1.0 / (rrf_k + rank)
            if item["id"] not in aggregated:
                aggregated[item["id"]] = {
                    "id": item["id"],
                    "payload": item["payload"],
                    "score": 0.0,
                }
            aggregated[item["id"]]["score"] += score
    fused = sorted(aggregated.values(), key=lambda item: item["score"], reverse=True)
    return fused[:top_k]


def rerank_results(candidates: list[dict[str, Any]], query: str, top_k: int = 5) -> list[dict[str, Any]]:
    docs = [Document(page_content=item["payload"].get("text", ""), metadata=item["payload"]) for item in candidates]
    reranked = list(reranker.compress_documents(documents=docs, query=query))
    output: list[dict[str, Any]] = []
    for doc in reranked[:top_k]:
        output.append({
            "id": doc.metadata.get("chunk_id", ""),
            "payload": doc.metadata,
            "score": None,
        })
    return output


def retrieve_hybrid_with_reranker(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    candidates = retrieve_hybrid_manual(query, top_k=10)
    return rerank_results(candidates, query, top_k=top_k)


def retrieve_all_combined(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    candidates = retrieve_hybrid_rrf(query, top_k=10)
    return rerank_results(candidates, query, top_k=top_k)


def compute_metrics(retrieved: list[dict[str, Any]], source_file: str, top_k: int = 5) -> dict[str, float]:
    filenames = [item["payload"].get("filename", "") for item in retrieved[:top_k]]
    relevance = [1 if name == source_file else 0 for name in filenames]
    hit = 1.0 if any(relevance) else 0.0
    recall = min(sum(relevance), 1.0)
    mrr = 0.0
    for idx, rel in enumerate(relevance):
        if rel:
            mrr = 1.0 / (idx + 1)
            break
    dcg = sum(rel / math.log2(idx + 2) for idx, rel in enumerate(relevance))
    ndcg = dcg / 1.0 if dcg else 0.0
    return {
        "hit@5": hit,
        "recall@5": recall,
        "mrr@5": mrr,
        "ndcg@5": ndcg,
    }


RETRIEVAL_METHODS = [
    ("dense_search", retrieve_dense),
    ("sparse_search", retrieve_sparse),
    ("hybrid_search", retrieve_hybrid_manual),
    ("hybrid_rrf", retrieve_hybrid_rrf),
    ("hybrid_reranker", retrieve_hybrid_with_reranker),
    ("all_combined", retrieve_all_combined),
]


def format_hit_list(results: list[dict[str, Any]]) -> str:
    lines = []
    for rank, item in enumerate(results, start=1):
        payload = item["payload"]
        lines.append(
            f"{rank}. {payload.get('filename', '<unknown>')} | chunk={payload.get('chunk_id', '<none>')} | type={payload.get('source_type', '<none>')}"
        )
    return "\n".join(lines)


def evaluate_methods(max_queries: int | None = None) -> None:
    dataset = load_golden_dataset()
    if max_queries is not None:
        dataset = dataset[:max_queries]

    for method_name, method_fn in RETRIEVAL_METHODS:
        print("\n" + "#" * 80)
        print(f"Evaluating method: {method_name}")
        print("#" * 80)

        totals = {"hit@5": 0.0, "recall@5": 0.0, "mrr@5": 0.0, "ndcg@5": 0.0}
        for item in dataset:
            query = item["question"]
            gold_file = item["source_file"]
            retrieved = method_fn(query, top_k=5)
            metrics = compute_metrics(retrieved, gold_file, top_k=5)
            totals = {k: totals[k] + metrics[k] for k in totals}

            print(f"\nQuery: {query}")
            print(f"Ground truth file: {gold_file}")
            print(format_hit_list(retrieved))
            print(
                f"Metrics: hit@5={metrics['hit@5']:.2f}, recall@5={metrics['recall@5']:.2f}, "
                f"mrr@5={metrics['mrr@5']:.3f}, ndcg@5={metrics['ndcg@5']:.3f}"
            )

        count = len(dataset)
        print("\nSummary:")
        print(f"Queries evaluated: {count}")
        print(
            f"Average hit@5: {totals['hit@5'] / count:.3f}, "
            f"Average recall@5: {totals['recall@5'] / count:.3f}, "
            f"Average MRR@5: {totals['mrr@5'] / count:.3f}, "
            f"Average nDCG@5: {totals['ndcg@5'] / count:.3f}"
        )


def test_retrieval_methods_return_results() -> None:
    dataset = load_golden_dataset()
    sample_query = dataset[0]["question"]
    for _, method_fn in RETRIEVAL_METHODS:
        results = method_fn(sample_query, top_k=5)
        assert isinstance(results, list)
        assert len(results) <= 5
        for item in results:
            assert "payload" in item and isinstance(item["payload"], dict)


if __name__ == "__main__":
    evaluate_methods(max_queries=10)
