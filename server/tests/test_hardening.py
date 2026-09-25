import importlib

import pytest
from conftest import login

import app.config as config_mod


@pytest.fixture(autouse=True)
def _restore_config():
    yield
    # config 守卫 raise 后模块会被摘出 sys.modules，恢复给后续用例
    importlib.reload(config_mod)


def test_config_requires_explicit_secrets(monkeypatch):
    for var in ("SECRET_KEY", "ADMIN_PASSWORD"):
        monkeypatch.delenv(var, raising=False)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        importlib.reload(config_mod)


def test_config_rejects_weak_defaults(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "dev-secret")
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        importlib.reload(config_mod)


def _publish(client, title, body, tags):
    login(client)
    r = client.post("/api/v1/posts", json={
        "title": title, "kind": "md", "body": body,
        "tags": tags, "status": "published"})
    assert r.status_code == 200
    return r.json()["slug"]


def test_adjacent_prev_next_and_related(client):
    s1 = _publish(client, "第一篇", "内容一", ["算法"])
    s2 = _publish(client, "第二篇", "内容二", ["算法", "随笔"])
    s3 = _publish(client, "第三篇", "内容三", ["工具"])
    d1 = client.get(f"/api/v1/posts/{s1}").json()
    d2 = client.get(f"/api/v1/posts/{s2}").json()
    d3 = client.get(f"/api/v1/posts/{s3}").json()

    r = client.get(f"/api/v1/posts/{s2}/adjacent").json()
    assert r["prev"]["slug"] == s1          # 更早=上一篇
    assert r["next"]["slug"] == s3          # 更晚=下一篇
    slugs = {p["slug"] for p in r["related"]}
    assert s1 in slugs                      # 共享标签"算法"
    assert s2 not in slugs                  # 排除自身

    edges = client.get(f"/api/v1/posts/{s3}/adjacent").json()
    assert edges["next"] is None            # s3 是最新发布
    assert edges["prev"]["slug"] == s2

    _ = d1 and d2 and d3


def test_adjacent_missing_post_404(client):
    assert client.get("/api/v1/posts/no-such-slug/adjacent").status_code == 404


def test_adjacent_excludes_drafts(client):
    login(client)
    s_pub = _publish(client, "公开", "b", ["t9"])
    r = client.post("/api/v1/posts", json={
        "title": "草稿", "kind": "md", "body": "b", "tags": ["t9"], "status": "draft"})
    draft_id = r.json()["id"]
    adj = client.get(f"/api/v1/posts/{s_pub}/adjacent").json()
    assert all(p.get("id") != draft_id for p in adj["related"])
    assert adj["next"] is None              # 最新发布只能是公开帖
