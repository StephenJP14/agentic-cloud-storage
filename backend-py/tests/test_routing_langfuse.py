import os
import sys
import uuid
import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from app.services import agent

SAMPLES = [
    ("hello!", "chitchat"),
    ("how do i find the charging port on MODEL-Z?", "rag_qa"),
]


def map_decision(raw):
    if raw == "vectorstore":
        return "rag_qa"
    return raw


@pytest.mark.parametrize("message,expected", SAMPLES)
def test_router_returns_known_category(message, expected):
    router = agent.router_chain
    out = router.invoke({"question": message})
    raw = getattr(out, "datasource", None) or (out.get("datasource") if isinstance(out, dict) else None)
    mapped = map_decision(raw)
    assert mapped in {"rag_qa", "chitchat", "summarize", "create_ticket"}, f"unexpected router output: {mapped}"
    assert mapped == expected
