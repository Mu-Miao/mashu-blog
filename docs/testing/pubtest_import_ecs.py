import httpx

B = "http://120.26.177.214:8080/api/v1"
s = httpx.Client(timeout=30)
assert s.post(B + "/auth/login", json={"username": "admin", "password": "blog" + "123456"}).status_code == 200
key = s.post(B + "/api-keys", json={"name": "pc-import"}).json()["key"]
md = "---\ntitle: 从命令行导入的文章\ntags: [导入, cli]\n---\n# 命令行通道\n\n这篇验证 API Key 导入。\n"
r = s.post(B + "/import", headers={"X-API-Key": key},
           files={"file": ("demo.md", md.encode(), "text/markdown")})
assert r.status_code == 200, r.text
d = r.json()
assert d["tags"] == ["导入", "cli"] and d["status"] == "published"
assert any(h["slug"] == d["slug"] for h in s.get(B + "/search", params={"q": "命令行"}).json())
print("ECS API-KEY IMPORT: PASS | slug:", d["slug"])
