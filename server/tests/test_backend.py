import pytest
from conftest import login
from sqlalchemy import text
from sqlmodel import select

from app import config
from app.db import get_session
from app.models import Comment, CommentLike, PostTag


def publish(client, title, body="正文", tags=None, status="published"):
    response = client.post("/api/v1/posts", json={
        "title": title, "kind": "md", "body": body,
        "tags": tags or [], "status": status,
    })
    assert response.status_code == 200, response.text
    return response.json()


def test_delete_post_removes_comments_and_likes(client):
    login(client)
    post = publish(client, "待删除文章", "正文", tags=["删除回归"])
    comment = client.post(f"/api/v1/posts/{post['slug']}/comments", json={
        "author_name": "访客", "content": "一条评论",
    })
    assert comment.status_code == 201, comment.text
    comment_id = comment.json()["id"]
    liked = client.post(f"/api/v1/comments/{comment_id}/like",
                        json={"visitor_id": "a" * 16})
    assert liked.status_code == 200

    assert client.delete(f"/api/v1/posts/{post['id']}").status_code == 200

    with get_session() as session:
        assert session.exec(
            select(Comment).where(Comment.post_id == post["id"])
        ).all() == []
        assert session.exec(
            select(CommentLike).where(CommentLike.comment_id == comment_id)
        ).all() == []
        assert session.exec(
            select(PostTag).where(PostTag.post_id == post["id"])
        ).all() == []
        fts_count = session.execute(
            text("SELECT count(*) FROM posts_fts WHERE post_id = :i"),
            {"i": post["id"]},
        ).scalar_one()
        assert fts_count == 0


@pytest.mark.parametrize("query", ["*", '"', "NEAR", "a AND", "-", "title:x"])
def test_search_survives_fts_syntax(client, query):
    login(client)
    publish(client, "FTS 语法验证", "内容")
    response = client.get("/api/v1/search", params={"q": query})
    assert response.status_code == 200, (query, response.text)


def test_search_index_updates_incrementally(client):
    login(client)
    post = publish(client, "增量索引验证", "alphaunique 关键词")
    hits = client.get("/api/v1/search", params={"q": "alphaunique"}).json()
    assert any(item["id"] == post["id"] for item in hits)

    updated = client.put(f"/api/v1/posts/{post['id']}",
                         json={"body": "betawordunique 关键词"})
    assert updated.status_code == 200

    assert client.get("/api/v1/search", params={"q": "alphaunique"}).json() == []
    hits = client.get("/api/v1/search", params={"q": "betawordunique"}).json()
    assert any(item["id"] == post["id"] for item in hits)


def test_feed_uses_public_site_url(client):
    login(client)
    publish(client, "Feed URL 验证", "正文")
    xml = client.get("/api/v1/feed.xml").text
    assert "https://example.test/post/" in xml
    assert "http://testserver" not in xml


def test_list_pagination_uses_sql_total(client):
    tag = "分页回归标签"
    login(client)
    created = [publish(client, f"分页文章 {index}", f"正文 {index}", tags=[tag])
               for index in range(5)]
    client.cookies.clear()

    first = client.get("/api/v1/posts",
                       params={"tag": tag, "size": 2, "page": 1}).json()
    second = client.get("/api/v1/posts",
                        params={"tag": tag, "size": 2, "page": 2}).json()
    third = client.get("/api/v1/posts",
                       params={"tag": tag, "size": 2, "page": 3}).json()
    assert first["total"] == second["total"] == third["total"] == 5
    assert [len(first["items"]), len(second["items"]), len(third["items"])] == [2, 2, 1]
    ids = [item["id"] for page in (first, second, third) for item in page["items"]]
    assert sorted(ids) == sorted(item["id"] for item in created)


def test_unknown_api_path_returns_json_404(client):
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")


def test_docs_disabled_by_default(client):
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_cookie_secure_is_env_driven(client, monkeypatch):
    monkeypatch.setattr(config, "COOKIE_SECURE", True)
    response = login(client)
    assert response.status_code == 200
    assert "secure" in response.headers["set-cookie"].lower()