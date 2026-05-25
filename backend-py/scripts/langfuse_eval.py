#!/usr/bin/env python3

import json
import os
import sys
import time
from typing import Any

from langfuse import Langfuse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

try:
    from app.services import agent
except Exception as e:
    raise RuntimeError(f"Failed importing agent module: {e}") from e

try:
    import matplotlib.pyplot as plt
except ImportError:
    plt = None


# =========================================================
# CONFIG
# =========================================================

DATASET_FILE = os.getenv(
    "DATASET_FILE",
    os.path.join(os.path.dirname(__file__), "dataset.json"),
)

CHART_OUTPUT_FILE = os.path.join(
    os.path.dirname(__file__),
    "route_success_rates.png"
)

ROUTE_NAME_MAP = {
    "vectorstore": "rag_qa",
    "chitchat": "chit_chat",
    "service_capture": "create_ticket",
    "summarize": "summarize",
}


# =========================================================
# LANGFUSE
# =========================================================

def init_langfuse() -> Langfuse:
    return Langfuse(
        public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
        secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
        host=os.getenv("LANGFUSE_URL", "").rstrip("/"),
    )


# =========================================================
# DATASET
# =========================================================

def load_dataset(path: str) -> list[dict]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise SystemExit(f"Dataset file not found: {path}")
    except json.JSONDecodeError as e:
        raise SystemExit(f"Invalid JSON dataset: {e}")


# =========================================================
# HELPERS
# =========================================================

def map_decision(raw: Any) -> str:
    if raw is None:
        return "unknown"

    return ROUTE_NAME_MAP.get(str(raw), str(raw))


def calculate_metrics(results: list[dict]) -> dict:
    total = len(results)
    passed = sum(1 for r in results if r["pass"])

    failures_by_type = {}

    for r in results:
        if not r["pass"]:
            expected = r["expected"]
            failures_by_type[expected] = (
                failures_by_type.get(expected, 0) + 1
            )

    return {
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": passed / total if total else 0.0,
        "failures_by_expected_type": failures_by_type,
    }


def calculate_route_success_rates(results: list[dict]) -> dict:
    stats = {}

    for r in results:
        route = r["expected"]

        if route not in stats:
            stats[route] = {
                "total": 0,
                "passed": 0
            }

        stats[route]["total"] += 1

        if r["pass"]:
            stats[route]["passed"] += 1

    for route in stats:
        total = stats[route]["total"]
        passed = stats[route]["passed"]

        stats[route]["success_rate"] = (
            passed / total if total else 0.0
        )

    return stats


# =========================================================
# CHART
# =========================================================

def plot_route_success_rates(
    results: list[dict],
    output_path: str = CHART_OUTPUT_FILE
):
    if plt is None:
        print("[chart] matplotlib not installed")
        return None

    stats = calculate_route_success_rates(results)

    labels = list(stats.keys())
    rates = [
        stats[label]["success_rate"] * 100
        for label in labels
    ]

    totals = [
        stats[label]["total"]
        for label in labels
    ]

    passed_counts = [
        stats[label]["passed"]
        for label in labels
    ]

    fig, ax = plt.subplots(figsize=(10, 6))

    bars = ax.bar(labels, rates)

    ax.set_ylim(0, 100)
    ax.set_ylabel("Success Rate (%)")
    ax.set_xlabel("Route")
    ax.set_title("Route Classification Success Rate")

    for bar, total, passed in zip(
        bars,
        totals,
        passed_counts
    ):
        height = bar.get_height()

        ax.annotate(
            f"{height:.0f}%\n({passed}/{total})",
            xy=(
                bar.get_x() + bar.get_width() / 2,
                height
            ),
            xytext=(0, 8),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=9
        )

    plt.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)

    print(f"[chart] Saved chart -> {output_path}")

    return output_path


# =========================================================
# EVALUATION
# =========================================================

def evaluate():
    dataset = load_dataset(DATASET_FILE)

    lf = init_langfuse()

    router = agent.router_chain

    results = []

    print("=" * 60)
    print("STARTING ROUTER EVALUATION")
    print("=" * 60)

    for idx, sample in enumerate(dataset, start=1):
        message = sample["input"]
        expected = sample["expected_route"]

        print(f"\n[{idx}] Input     : {message}")
        print(f"[{idx}] Expected  : {expected}")

        trace = lf.trace(
            name="router-eval",
            input={
                "question": message
            },
            metadata={
                "expected_route": expected
            }
        )

        try:
            out = router.invoke({
                "question": message
            })

            raw = getattr(out, "datasource", None)

            if raw is None and isinstance(out, dict):
                raw = out.get("datasource")

            actual = map_decision(raw)

            passed = actual == expected

            trace.update(
                output={
                    "actual_route": actual,
                    "passed": passed
                }
            )

            trace.score(
                name="route_correctness",
                value=1 if passed else 0
            )

        except Exception as e:
            actual = "error"
            passed = False

            trace.update(
                output={
                    "actual_route": actual,
                    "passed": passed,
                    "error": str(e)
                }
            )

            trace.score(
                name="route_correctness",
                value=0
            )

            print(f"[{idx}] ERROR     : {e}")

        result = {
            "input": message,
            "expected": expected,
            "actual": actual,
            "pass": passed
        }

        results.append(result)

        print(f"[{idx}] Actual     : {actual}")
        print(f"[{idx}] Pass       : {passed}")

        time.sleep(0.2)

    metrics = calculate_metrics(results)

    print("\n" + "=" * 60)
    print("FINAL METRICS")
    print("=" * 60)

    print(f"Total Tests : {metrics['total']}")
    print(f"Passed      : {metrics['passed']}")
    print(f"Failed      : {metrics['failed']}")
    print(f"Pass Rate   : {metrics['pass_rate']:.2%}")

    if metrics["failures_by_expected_type"]:
        print("\nFailures By Route:")
        for route, count in metrics["failures_by_expected_type"].items():
            print(f"- {route}: {count}")

    chart_path = plot_route_success_rates(results)

    summary_trace = lf.trace(
        name="router-eval-summary",
        input={
            "dataset_size": len(dataset)
        },
        output=metrics,
        metadata={
            "chart_path": chart_path
        }
    )

    lf.flush()

    print("\nLangfuse traces flushed successfully.")
    print("=" * 60)


# =========================================================
# MAIN
# =========================================================

if __name__ == "__main__":
    evaluate()