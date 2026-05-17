#!/usr/bin/env python3
"""
Lightweight evaluation script that invokes the existing router_chain in
`app.services.agent` and optionally sends events to Langfuse.

This script deliberately does not modify runtime model code.
"""

import os
import sys
import time
import uuid

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

try:
    from app.services import agent
except Exception as e:
    print("Failed importing agent module:", e)
    raise

import httpx

LANGFUSE_URL = os.getenv("LANGFUSE_URL", "").rstrip("/")
LANGFUSE_API_KEY = os.getenv("LANGFUSE_API_KEY", "")

SAMPLES = [
    ("hi there, how are you?", "chitchat"),
    ("where is the reset button on device MODEL-X?", "rag_qa"),
    ("my device won't power on and makes a buzzing sound, it's hardware failure", "create_ticket"),
    ("please summarize the manual for MODEL-Y", "rag_qa"),
    ("thanks!", "chitchat"),
]


def send_langfuse(event_name: str, payload: dict):
    if not LANGFUSE_URL or not LANGFUSE_API_KEY:
        print("[langfuse] disabled - set LANGFUSE_URL/API_KEY to enable")
        return
    try:
        headers = {"Authorization": f"Bearer {LANGFUSE_API_KEY}", "Content-Type": "application/json"}
        body = {"event_type": event_name, "payload": payload}
        httpx.post(LANGFUSE_URL, headers=headers, json=body, timeout=5)
    except Exception as e:
        print("Failed to send langfuse event:", e)


def map_decision(raw: str) -> str:
    if raw == "vectorstore":
        return "rag_qa"
    return raw


def evaluate():
    router = agent.router_chain
    results = []
    for message, expected in SAMPLES:
        req_id = str(uuid.uuid4())
        print(f"\n[eval] request_id={req_id} message={message!r} expected={expected}")
        try:
            out = router.invoke({"question": message})
            raw = getattr(out, "datasource", None) or (out.get("datasource") if isinstance(out, dict) else None)
        except Exception as e:
            print("Router invocation failed:", e)
            raw = "error"
        mapped = map_decision(raw)
        passed = (mapped == expected)
        rec = {"request_id": req_id, "input": message, "expected": expected, "actual": mapped, "pass": passed}
        results.append(rec)
        print(" -> actual:", mapped, "pass:", passed)
        send_langfuse("routing.eval", rec)
        time.sleep(0.5)

    total = len(results)
    passed = sum(1 for r in results if r["pass"])
    print(f"\nSUMMARY: {passed}/{total} passed ({passed/total:.2%})")
    send_langfuse("routing.eval_summary", {"total": total, "passed": passed, "rate": passed/total})


if __name__ == "__main__":
    evaluate()
