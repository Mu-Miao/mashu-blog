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


def test_comments_replies_likes_and_unread_notification(client):
    login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "testpass123"})
    assert login.status_code == 200
    post = client.post("/api/v1/posts", json={
        "title": "Comments Post", "kind": "md", "body": "hello", "status": "published",
    }).json()
    slug = post["slug"]
    client.cookies.clear()

    created = client.post(f"/api/v1/posts/{slug}/comments", json={
        "author_name": "  小 明  ", "content": "这篇文章很有帮助！",
    })
    assert created.status_code == 201
    comment = created.json()
    assert comment["author_name"] == "小 明"
    assert client.get("/api/v1/admin/comments/unread-count").status_code == 401

    visitor_id = "visitor_1234567890abcdef"
    liked = client.post(f"/api/v1/comments/{comment['id']}/like", json={"visitor_id": visitor_id})
    assert liked.json() == {"liked": True, "count": 1}
    public = client.get(f"/api/v1/posts/{slug}/comments?visitor_id={visitor_id}").json()
    assert public[0]["liked"] is True and public[0]["like_count"] == 1
    unliked = client.post(f"/api/v1/comments/{comment['id']}/like", json={"visitor_id": visitor_id})
    assert unliked.json() == {"liked": False, "count": 0}

    client.post("/api/v1/auth/login", json={"username": "admin", "password": "testpass123"})
    assert client.get("/api/v1/admin/comments/unread-count").json()["count"] == 1
    reply = client.post(f"/api/v1/admin/comments/{comment['id']}/reply", json={"content": "谢谢你的反馈！"})
    assert reply.status_code == 201 and reply.json()["is_admin"] is True
    assert reply.json()["parent_id"] == comment["id"]
    assert client.get("/api/v1/admin/comments/unread-count").json()["count"] == 0

    threaded = client.get(f"/api/v1/posts/{slug}/comments").json()
    assert len(threaded) == 2
    assert threaded[1]["parent_id"] == comment["id"]


def test_comment_validation_and_parent_scope(client):
    client.post("/api/v1/auth/login", json={"username": "admin", "password": "testpass123"})
    first = client.post("/api/v1/posts", json={
        "title": "First Comments Post", "kind": "md", "body": "one", "status": "published",
    }).json()
    second = client.post("/api/v1/posts", json={
        "title": "Second Comments Post", "kind": "md", "body": "two", "status": "published",
    }).json()
    client.cookies.clear()
    comment = client.post(f"/api/v1/posts/{first['slug']}/comments", json={
        "author_name": "读者", "content": "第一篇",
    }).json()
    cross_post = client.post(f"/api/v1/posts/{second['slug']}/comments", json={
        "author_name": "读者", "content": "错误回复", "parent_id": comment["id"],
    })
    assert cross_post.status_code == 404
    assert client.post(f"/api/v1/posts/{first['slug']}/comments", json={
        "author_name": "读者", "content": "空蜜罐", "website": "spam.example",
    }).status_code == 422


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


def test_search_chinese(client):
    login(client)
    client.post("/api/v1/posts", json={"title": "嵌入式学习笔记", "kind": "md",
                                       "body": "中断控制器与DMA", "status": "published"})
    hits = client.get("/api/v1/search?q=嵌入式学习").json()
    assert any(h["title"] == "嵌入式学习笔记" for h in hits)  # trigram 路径
    hits = client.get("/api/v1/search?q=笔记").json()
    assert any(h["title"] == "嵌入式学习笔记" for h in hits)  # 短查询 LIKE 路径
    hits = client.get("/api/v1/search?q=中断控制器").json()
    assert any(h["title"] == "嵌入式学习笔记" for h in hits)  # 正文中文命中


def test_archive_ok(client):
    login(client)
    client.post("/api/v1/posts", json={"title": "Arch Me", "kind": "md",
                                       "body": "b", "tags": ["a"], "status": "published"})
    r = client.get("/api/v1/archive")
    assert r.status_code == 200
    assert any(p["title"] == "Arch Me" and p["tags"] == ["a"]
               for g in r.json() for p in g["posts"])


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


def test_asset_delete_preserves_images_used_by_articles(client):
    import io

    png = bytes.fromhex("89504e470d0a1a0a") + b"\0" * 100
    assert client.delete("/api/v1/assets/1").status_code == 401
    login(client)
    uploaded = client.post("/api/v1/assets", files={
        "file": ("photo.png", io.BytesIO(png), "image/png")
    }).json()
    image_url = uploaded["url"]
    article = client.post("/api/v1/posts", json={
        "title": "HTML image", "kind": "html", "body": f"![photo]({image_url})",
        "status": "published",
    })
    assert f'<img src="{image_url}"' in article.json()["rendered"]
    from sqlmodel import Session
    from app.db import engine
    from app.models import Post
    with Session(engine) as session:
        saved = session.get(Post, article.json()["id"])
        saved.rendered = saved.body  # simulate an article saved before the compatibility fix
        session.add(saved)
        session.commit()
    slug = article.json()["slug"]
    assert f'<img src="{image_url}"' in client.get(f"/api/v1/posts/{slug}").json()["rendered"]
    assert f'<img src="{image_url}"' in client.get(f"/post/{slug}").text
    assert client.delete(f"/api/v1/assets/{uploaded['id']}").status_code == 409
    assert client.get(image_url).status_code == 200

    client.put(f"/api/v1/posts/{article.json()['id']}", json={"body": "<p>No image</p>"})
    assert client.delete(f"/api/v1/assets/{uploaded['id']}").status_code == 204
    assert client.get(image_url).status_code == 404
    assert all(asset["id"] != uploaded["id"] for asset in client.get("/api/v1/assets").json())
    assert client.delete(f"/api/v1/assets/{uploaded['id']}").status_code == 404


def test_import_requires_auth(client):
    import io
    r = client.post("/api/v1/import",
                    files={"file": ("p.md", io.BytesIO(b"x"), "text/markdown")})
    assert r.status_code == 401


def test_tools_crud_and_public_visibility(client):
    payload = {
        "name": "串口助手",
        "description": "调试串口设备",
        "download_url": "https://example.com/tool.zip",
        "version": "1.2.0",
        "platform": "Windows",
        "access_code": "mashu",
        "status": "draft",
    }
    assert client.post("/api/v1/tools", json=payload).status_code == 401
    login(client)
    created = client.post("/api/v1/tools", json=payload)
    assert created.status_code == 200, created.text
    tool = created.json()
    assert tool["name"] == "串口助手" and tool["access_code"] == "mashu"
    assert client.get("/api/v1/tools").json() == []
    assert len(client.get("/api/v1/tools?all=1").json()) == 1

    updated = client.put(f"/api/v1/tools/{tool['id']}", json={"status": "published"})
    assert updated.status_code == 200 and updated.json()["status"] == "published"
    client.cookies.clear()
    public = client.get("/api/v1/tools").json()
    assert len(public) == 1 and public[0]["download_url"] == payload["download_url"]
    assert client.get("/api/v1/tools?all=1").status_code == 401

    login(client)
    assert client.delete(f"/api/v1/tools/{tool['id']}").status_code == 204
    assert client.get("/api/v1/tools?all=1").json() == []


def test_tools_reject_invalid_download_url(client):
    login(client)
    response = client.post("/api/v1/tools", json={
        "name": "不安全链接",
        "download_url": "javascript:alert(1)",
    })
    assert response.status_code == 400


def test_rss(client):
    login(client)
    client.post("/api/v1/posts", json={"title": "Feed Post", "kind": "md",
                                       "body": "b", "status": "published"})
    xml = client.get("/api/v1/feed.xml").text
    assert "<title>Feed Post</title>" in xml


def test_robots_and_sitemap_only_publish_public_urls(client):
    login(client)
    published = client.post("/api/v1/posts", json={
        "title": "SEO Public", "kind": "md", "body": "public body",
        "tags": ["搜索 优化"], "status": "published",
    }).json()
    draft = client.post("/api/v1/posts", json={
        "title": "SEO Draft", "kind": "md", "body": "draft body",
        "status": "draft",
    }).json()

    robots = client.get("/robots.txt")
    assert robots.status_code == 200
    assert robots.headers["content-type"].startswith("text/plain")
    assert robots.headers["cache-control"].startswith("no-cache")
    assert robots.headers["cloudflare-cdn-cache-control"] == "no-store"
    assert "Disallow: /admin/" in robots.text
    assert "Sitemap: https://example.test/sitemap.xml" in robots.text

    sitemap = client.get("/sitemap.xml")
    assert sitemap.status_code == 200
    assert sitemap.headers["content-type"].startswith("application/xml")
    assert f"https://example.test/post/{published['slug']}" in sitemap.text
    assert draft["slug"] not in sitemap.text
    assert "https://example.test/tag/%E6%90%9C%E7%B4%A2%20%E4%BC%98%E5%8C%96" in sitemap.text


def test_article_html_has_server_rendered_seo_and_real_404(client):
    login(client)
    published = client.post("/api/v1/posts", json={
        "title": "SEO <文章>", "kind": "md", "body": "## 能被抓取的正文",
        "tags": ["SEO"], "status": "published",
    }).json()
    draft = client.post("/api/v1/posts", json={
        "title": "Hidden Draft", "kind": "md", "body": "secret",
        "status": "draft",
    }).json()
    client.cookies.clear()

    page = client.get(f"/post/{published['slug']}")
    assert page.status_code == 200
    assert page.headers["content-type"].startswith("text/html")
    assert "SEO &lt;文章&gt; · 麻薯ta爸" in page.text
    assert f'https://example.test/post/{published["slug"]}' in page.text
    assert 'type="application/ld+json"' in page.text
    assert "能被抓取的正文" in page.text
    assert page.headers["x-robots-tag"].startswith("index, follow")

    missing = client.get(f"/post/{draft['slug']}")
    assert missing.status_code == 404
    assert 'content="noindex, nofollow"' in missing.text


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
