from conftest import login


def test_models_and_fts(client):
    from sqlalchemy import text
    from sqlmodel import Session, select
    from app.db import engine, sync_fts
    from app.models import Post, PostTag, Tag

    with Session(engine) as s:
        p = Post(title="Hello", slug="hello-x", kind="md", body="alpha content")
        s.add(p); s.commit(); s.refresh(p)
        t = Tag(name="tech"); s.add(t); s.commit(); s.refresh(t)
        s.add(PostTag(post_id=p.id, tag_id=t.id)); s.commit()
        assert len(s.exec(select(PostTag)).all()) == 1
        sync_fts(s)
        rows = s.exec(text(
            "SELECT post_id FROM posts_fts WHERE posts_fts MATCH '\"alpha\"'"
        )).all()
        assert rows[0][0] == p.id


def test_login_wrong_password(client):
    assert login(client, "bad").status_code == 401


def test_login_and_me(client):
    assert login(client).status_code == 200
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 200 and r.json()["username"] == "admin"


def test_write_requires_auth(client):
    login(client)
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").status_code == 401
    r = client.post("/api/v1/posts", json={"title": "x", "kind": "md", "body": "y"})
    assert r.status_code == 401


def test_full_flow(client):
    login(client)
    r = client.post("/api/v1/posts", json={
        "title": "Hello World", "kind": "md",
        "body": "# Hello\n\nkernel 笔记", "tags": ["os"], "status": "published"})
    assert r.status_code == 200, r.text
    pid, slug = r.json()["id"], r.json()["slug"]
    assert slug == "hello-world"
    assert client.get("/api/v1/posts").json()["total"] >= 1
    detail = client.get(f"/api/v1/posts/{slug}")
    assert "<h1" in detail.json()["rendered"]
    hits = client.get("/api/v1/search?q=kernel").json()
    assert any(h["slug"] == slug for h in hits)
    assert "os" in [t["name"] for t in client.get("/api/v1/tags").json()]
    client.put(f"/api/v1/posts/{pid}", json={"status": "draft"})
    assert client.get(f"/api/v1/posts/{slug}").status_code == 200  # 管理员可见草稿
    client.cookies.clear()
    assert client.get(f"/api/v1/posts/{slug}").status_code == 404  # 公众不可见
    login(client)
    drafts = client.get("/api/v1/posts?all=1").json()["items"]
    assert any(d["id"] == pid for d in drafts)


def test_admin_all_requires_login(client):
    assert client.get("/api/v1/posts?all=1").status_code == 401


def test_html_sanitized_and_unique_slug(client):
    login(client)
    r = client.post("/api/v1/posts", json={
        "title": "xss", "kind": "html",
        "body": "<p>ok</p><script>alert(1)</script><b onclick='evil()'>b</b>",
        "status": "published"})
    d = client.get(f"/api/v1/posts/{r.json()['slug']}").json()
    assert "<script" not in d["rendered"]
    assert "onclick" not in d["rendered"]
    assert ">ok<" in d["rendered"]
    a = client.post("/api/v1/posts", json={"title": "Same Title", "kind": "md", "body": "1"})
    b = client.post("/api/v1/posts", json={"title": "Same Title", "kind": "md", "body": "2"})
    assert a.json()["slug"] != b.json()["slug"]


def test_upload_and_keys(client):
    import io
    login(client)
    png = bytes.fromhex("89504e470d0a1a0a") + b"\0" * 100
    r = client.post("/api/v1/assets",
                    files={"file": ("a.png", io.BytesIO(png), "image/png")})
    assert r.status_code == 200
    assert client.get(r.json()["url"]).status_code == 200
    bad = client.post("/api/v1/assets",
                      files={"file": ("a.exe", io.BytesIO(b"MZ\0\0" + b"\0" * 100),
                                      "application/x-msdownload")})
    assert bad.status_code == 400

    k = client.post("/api/v1/api-keys", json={"name": "laptop"})
    assert k.status_code == 200
    key = k.json()["key"]
    assert client.get("/api/v1/api-keys").json()[0]["name"] == "laptop"

    md = b"---\ntitle: Imported Post\ntags: [net, lab]\nstatus: published\n---\n# content\n"
    r = client.post("/api/v1/import", headers={"X-API-Key": key},
                    files={"file": ("post.md", io.BytesIO(md), "text/markdown")})
    assert r.status_code == 200, r.text
    assert r.json()["kind"] == "md"
    slugs = [p["slug"] for p in client.get("/api/v1/posts").json()["items"]]
    assert "imported-post" in slugs
    names = sorted(t["name"] for t in client.get("/api/v1/tags").json())
    assert "net" in names and "lab" in names

    html = (b"<html><head><title>Page One</title></head>"
            b"<body><p>body text</p><script>x</script></body></html>")
    r = client.post("/api/v1/import", headers={"X-API-Key": key},
                    files={"file": ("p.html", io.BytesIO(html), "text/html")})
    assert r.json()["title"] == "Page One"
    d = client.get(f"/api/v1/posts/{r.json()['slug']}").json()
    assert "<script" not in d["rendered"] and "body text" in d["rendered"]

    client.delete(f"/api/v1/api-keys/{k.json()['id']}")
    assert client.get("/api/v1/api-keys").json() == []
    client.cookies.clear()  # 去掉管理员 cookie，纯验 API Key 通道
    r = client.post("/api/v1/import", headers={"X-API-Key": key},
                    files={"file": ("x.md", io.BytesIO(b"t"), "text/markdown")})
    assert r.status_code == 401


def test_import_requires_auth(client):
    import io
    r = client.post("/api/v1/import",
                    files={"file": ("p.md", io.BytesIO(b"x"), "text/markdown")})
    assert r.status_code == 401


def test_rss(client):
    login(client)
    client.post("/api/v1/posts", json={"title": "Feed Post", "kind": "md",
                                       "body": "b", "status": "published"})
    xml = client.get("/api/v1/feed.xml").text
    assert "<title>Feed Post</title>" in xml


def test_login_rate_limit(client):
    from app.routers import auth as auth_mod
    auth_mod._attempts.clear()
    for _ in range(5):
        assert login(client, "bad").status_code == 401
    assert login(client).status_code == 429
    # 不同 X-Real-IP（经 nginx）各自独立计数
    r = client.post("/api/v1/auth/login",
                    json={"username": "admin", "password": "***"},
                    headers={"X-Real-IP": "1.2.3.4"})
    assert r.status_code == 401
    auth_mod._attempts.clear()
