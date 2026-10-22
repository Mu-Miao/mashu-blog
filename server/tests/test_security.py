from app.security import (
    create_token, decode_token, hash_api_key, hash_password, new_api_key,
    parse_frontmatter, render_html, render_markdown, sanitize_html, slugify, verify_password,
)


def test_password_roundtrip():
    h = hash_password("s3cret")
    assert verify_password("s3cret", h)
    assert not verify_password("bad", h)


def test_jwt_roundtrip():
    t = create_token("admin")
    assert decode_token(t) == "admin"
    assert decode_token("garbage") is None


def test_sanitize_strips_scripts():
    out = sanitize_html(
        "<p>hi</p><script>alert(1)</script><img src=x onerror=alert(1)>")
    assert "<script" not in out
    assert "onerror" not in out
    assert "<p>hi</p>" in out


def test_render_markdown():
    out = render_markdown(
        "# T\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```python\nx=1\n```")
    assert "<h1" in out
    assert "<table" in out
    assert "highlight" in out


def test_html_article_renders_legacy_uploaded_image():
    out = render_html('![自拍](/uploads/2e0ee55b8f8d5f93.jpg)')
    assert '<img src="/uploads/2e0ee55b8f8d5f93.jpg" alt="自拍">' in out
    assert "<script" not in render_html('<script>alert(1)</script>')


def test_slugify():
    assert slugify("Hello World!") == "hello-world"
    assert slugify("你好博客").startswith("post-")


def test_frontmatter():
    meta, body = parse_frontmatter("---\ntitle: Hi\ntags: [a, b]\n---\n正文")
    assert meta["title"] == "Hi"
    assert meta["tags"] == ["a", "b"]
    assert body.strip() == "正文"


def test_api_key():
    plain, hashed = new_api_key()
    assert hash_api_key(plain) == hashed
    assert len(plain) == 48
