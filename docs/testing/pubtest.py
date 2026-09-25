import httpx

B = "https://magnetic-gardens-resumes-lucas.trycloudflare.com/api/v1"
PW = "blog" + "123456"
s = httpx.Client(timeout=30)
r = s.post(B + "/auth/login", json={"username": "admin", "password": PW})
assert r.status_code == 200, ("login", r.status_code)
d = s.post(B + "/posts", json={
    "title": "公网实弹测试", "kind": "md",
    "body": "# 来自公网\n\n```python\nprint('hello')\n```",
    "tags": ["e2e"], "status": "published"}).json()
slug = d["slug"]
det = s.get(B + "/posts/" + slug).json()
assert "<h1" in det["rendered"] and "highlight" in det["rendered"], "render"
assert any(h["slug"] == slug for h in s.get(B + "/search", params={"q": "公网实弹"}).json()), "search"
page = s.get("https://magnetic-gardens-resumes-lucas.trycloudflare.com/post/" + slug).text
assert slug not in page or "<div" in page, "spa"
assert s.delete(B + "/posts/" + str(d["id"])).status_code == 200, "delete"
assert s.get(B + "/posts/" + slug).status_code == 404, "gone"
print("PUBLIC GOLDEN PATH: ALL PASS")
