import os
import sys
import tempfile
from pathlib import Path

import pytest

TMP = tempfile.mkdtemp(prefix="blogtest-")
os.environ["BLOG_DIR"] = os.path.join(TMP, "data")
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(TMP, "blog.db").replace("\\", "/")
os.environ["SECRET_KEY"] = "test-secret"
os.environ["ADMIN_USER"] = "admin"
os.environ["ADMIN_PASSWORD"] = "testpass123"
os.environ["SITE_URL"] = "https://example.test"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient
    from app.main import create_app
    with TestClient(create_app()) as c:
        yield c


def login(client, password="testpass123"):
    return client.post("/api/v1/auth/login",
                       json={"username": "admin", "password": password})
