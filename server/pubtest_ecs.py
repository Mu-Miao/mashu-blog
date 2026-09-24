import httpx

B = "http://120.26.177.214:8080/api/v1"
PW = "blog" + "123456"
s = httpx.Client(timeout=30)
assert s.post(B + "/auth/login", json={"username": "admin", "password": PW}).status_code == 200, "login"
d = s.post(B + "/posts", json={
    "title": "博客开张啦", "kind": "md",
    "body": "# 你好世界\n\n这是我在**自己的服务器**上写的第一篇博客。\n\n| 技术 | 用途 |\n|---|---|\n| FastAPI | 后端 |\n| React | 前端 |\n\n```python\nprint('hello mashutaba')\n```\n",
    "tags": ["随笔"], "status": "published"}).json()
det = s.get(B + "/posts/" + d["slug"]).json()
assert "<h1" in det["rendered"] and "<table" in det["rendered"], "render"
assert any(h["slug"] == d["slug"] for h in s.get(B + "/search", params={"q": "博客开张"}).json()), "zh-search"
xss = s.post(B + "/posts", json={"title": "xss-probe", "kind": "html",
    "body": "<p>safe</p><script>alert(1)</script>", "status": "published"}).json()
assert "<script" not in s.get(B + "/posts/" + xss["slug"]).json()["rendered"], "xss"
s.delete(B + "/posts/" + str(xss["id"]))
assert s.get(B + "/feed.xml").status_code == 200, "rss"
print("ECS GOLDEN PATH: ALL PASS | first post:", d["slug"])
