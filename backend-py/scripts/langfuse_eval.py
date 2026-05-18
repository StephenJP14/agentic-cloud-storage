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
import json
from typing import Any, Optional

LANGFUSE_URL = os.getenv("LANGFUSE_URL", "").rstrip("/")
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY", "")
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY", "")
DATASET_FILE = os.getenv("DATASET_FILE", os.path.join(os.path.dirname(__file__), "dataset.json"))

ROUTE_NAME_MAP = {
    "vectorstore": "rag_qa",
    "chitchat": "chit_chat",
    "service_capture": "create_ticket",
    "summarize": "summarize",
}


def load_dataset(path: str) -> list[dict]:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise SystemExit(f"Dataset file not found: {path}")
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in dataset file {path}: {exc}")


DATASET = load_dataset(DATASET_FILE)



def send_langfuse(event_type: str, data: dict, trace_id: Optional[str] = None):
    """Send trace event to Langfuse using public/secret key auth."""
    if not LANGFUSE_URL or not LANGFUSE_PUBLIC_KEY or not LANGFUSE_SECRET_KEY:
        print("[langfuse] disabled - set LANGFUSE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY")
        return
    try:
        endpoint = f"{LANGFUSE_URL}/api/events"
        headers = {"Content-Type": "application/json"}
        payload = {
            "id": trace_id or str(uuid.uuid4()),
            "type": event_type,
            **data
        }
        # Use Basic auth with public_key:secret_key
        auth = (LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY)
        resp = httpx.post(endpoint, json=payload, auth=auth, timeout=5)
        if resp.status_code >= 400:
            print(f"[langfuse] error {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[langfuse] failed to send {event_type}:", e)


def map_decision(raw: str) -> str:
    if raw is None:
        return "unknown"
    return ROUTE_NAME_MAP.get(raw, raw)


def extract_tool_calls(output: Any) -> list[dict]:
    """Extract tool calls from router output if available."""
    tools = []
    
    # Try various ways to extract tool information from LangChain output
    if isinstance(output, dict):
        # Check for steps/intermediate_steps
        if "steps" in output:
            tools = output["steps"]
        elif "intermediate_steps" in output:
            tools = output["intermediate_steps"]
        # Check for tool_calls
        if "tool_calls" in output:
            for call in output["tool_calls"]:
                tools.append({"tool": call.get("name"), "args": call.get("args")})
    elif hasattr(output, "intermediate_steps"):
        tools = list(output.intermediate_steps)
    
    return tools


def calculate_detailed_metrics(results: list[dict]) -> dict:
    """Calculate quantifiable metrics beyond pass/fail rate."""
    total = len(results)
    passed = sum(1 for r in results if r["pass"])
    failed = total - passed
    
    # Categorize failures
    failure_categories = {}
    for r in results:
        if not r["pass"]:
            expected = r.get("expected", "unknown")
            if expected not in failure_categories:
                failure_categories[expected] = 0
            failure_categories[expected] += 1
    
    # Tool call statistics
    tools_invoked = []
    for r in results:
        if "tools" in r:
            tools_invoked.extend([t.get("tool") for t in r["tools"] if t.get("tool")])
    
    tool_frequency = {}
    for tool in tools_invoked:
        tool_frequency[tool] = tool_frequency.get(tool, 0) + 1
    
    return {
        "total_tests": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": passed / total if total > 0 else 0,
        "failures_by_expected_type": failure_categories,
        "tools_invoked_count": len(tools_invoked),
        "unique_tools": len(tool_frequency),
        "tool_frequency": tool_frequency,
    }


def evaluate():
    router = agent.router_chain
    results = []
    trace_id = str(uuid.uuid4())
    
    for sample in DATASET:
        message = sample["input"]
        expected = sample["expected_route"]
        req_id = str(uuid.uuid4())
        print(f"\n[eval] request_id={req_id} message={message!r} expected={expected}")
        try:
            out = router.invoke({"question": message})
            raw = getattr(out, "datasource", None) or (out.get("datasource") if isinstance(out, dict) else None)
            tools = extract_tool_calls(out)
        except Exception as e:
            print("Router invocation failed:", e)
            raw = "error"
            tools = []
        
        mapped = map_decision(raw)
        passed = (mapped == expected)
        rec = {
            "request_id": req_id,
            "trace_id": trace_id,
            "input": message,
            "expected": expected,
            "actual": mapped,
            "pass": passed,
            "tools": tools,
            "tool_count": len(tools),
        }
        results.append(rec)
        print(f" -> actual: {mapped} (pass: {passed}) | tools invoked: {len(tools)}")
        
        # Send individual result
        send_langfuse("routing.eval", {
            "request_id": req_id,
            "input": message,
            "expected": expected,
            "actual": mapped,
            "passed": passed,
            "tools_count": len(tools),
            "tools": [t.get("tool") if isinstance(t, dict) else str(t) for t in tools],
        }, trace_id=req_id)
        time.sleep(0.5)

    # Calculate and send detailed metrics
    metrics = calculate_detailed_metrics(results)
    print(f"\n{'='*60}")
    print(f"EVALUATION METRICS")
    print(f"{'='*60}")
    print(f"Pass Rate: {metrics['passed']}/{metrics['total_tests']} ({metrics['pass_rate']:.1%})")
    print(f"Tools Invoked (total): {metrics['tools_invoked_count']}")
    print(f"Unique Tools: {metrics['unique_tools']}")
    if metrics['tool_frequency']:
        print(f"Tool Frequency: {metrics['tool_frequency']}")
    if metrics['failures_by_expected_type']:
        print(f"Failures by Type: {metrics['failures_by_expected_type']}")
    print(f"{'='*60}")
    
    send_langfuse("routing.eval_summary", metrics, trace_id=trace_id)


if __name__ == "__main__":
    evaluate()
