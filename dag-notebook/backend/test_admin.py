"""
Unit tests for Admin DB and telemetry features in FlowNotebook.
"""

import pytest
from admin_db import (
    init_db,
    record_user_activity,
    record_pipeline,
    get_admin_overview,
    get_all_users,
    get_user_creations,
    get_recent_activity,
    ADMIN_EMAILS,
)

def test_admin_db_initialization_and_seeding():
    init_db()
    overview = get_admin_overview()
    assert overview["total_users"] >= 1  # Admin user exists
    assert "alonglry@gmail.com" in ADMIN_EMAILS
    
    users = get_all_users()
    admin_user = next((u for u in users if u["email"] == "alonglry@gmail.com"), None)
    assert admin_user is not None
    assert admin_user["name"] == "Awai Li"

def test_record_user_activity_and_pipeline():
    init_db()
    test_user = {
        "id": "usr_tester_99",
        "email": "tester99@domain.com",
        "name": "Alex Tester",
        "avatarUrl": "https://example.com/avatar.png"
    }

    user_id = record_user_activity(test_user, action="login", details="Alex logged in")
    assert user_id == "usr_tester_99"

    test_pipeline = {
        "id": "pipe_test_99",
        "name": "Alpha Research Graph",
        "category": "quant",
        "description": "A test DAG pipeline",
        "nodes": [
            {
                "id": "node_1",
                "data": {
                    "title": "Ingest Alpha",
                    "code": "x = 42\nprint('Alpha')",
                    "inputs": [],
                    "outputs": ["x"]
                }
            }
        ],
        "edges": []
    }

    pipe_id = record_pipeline(test_pipeline, test_user)
    assert pipe_id == "pipe_test_99"

    # Verify user creations query
    creations = get_user_creations("tester99@domain.com")
    assert creations["user"]["email"] == "tester99@domain.com"
    assert len(creations["pipelines"]) >= 1
    assert creations["pipelines"][0]["name"] == "Alpha Research Graph"
    assert len(creations["pipelines"][0]["nodes"]) == 1
    assert "Alpha" in creations["pipelines"][0]["nodes"][0]["data"]["code"]

    # Verify all users query
    all_users = get_all_users()
    emails = [u["email"] for u in all_users]
    assert "tester99@domain.com" in emails
    assert "alonglry@gmail.com" in emails

    # Verify recent activity
    activities = get_recent_activity(20)
    assert len(activities) > 0
