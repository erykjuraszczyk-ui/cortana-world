from fastapi.testclient import TestClient

from app import main

client = TestClient(main.app)


def test_health_reports_missing_ai_key_without_exposing_secrets(monkeypatch):
    monkeypatch.setattr(main, "ai_client", None)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "ai_configured": False, "model": None}


def test_world_state_returns_prototype_defaults():
    response = client.get("/api/v1/world/state")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Cortara"
    assert body["dome_status"] == "stable"
    assert body["biomes"] == 7


def test_chat_requires_server_side_key(monkeypatch):
    monkeypatch.setattr(main, "ai_client", None)
    response = client.post(
        "/api/v1/chat",
        json={"message": "Cześć Cortano", "history": [],
              "world_state": {"location": "Dolina Cytadeli", "relay_activated": False}},
    )
    assert response.status_code == 503
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_chat_rejects_oversized_message():
    response = client.post(
        "/api/v1/chat",
        json={"message": "x" * 1201, "history": [], "world_state": {}},
    )
    assert response.status_code == 422
