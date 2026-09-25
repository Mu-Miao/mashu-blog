import sys; sys.path.insert(0, ".")
import httpx
B = "http://127.0.0.1:8000/api/v1"
s = httpx.Client()
r = s.post(B + "/auth/login", json={"username": "admin", "password": "blog" + "123456"})
assert r.status_code == 200, ("login", r.status_code)
key = s.post(B + "/api-keys", json={"name": "cli-test"}).json()["key"]
md = "---\ntitle: curl导入验证\ntags: [cli]\n---\n# curl 通道\n\n成功\n"
d = s.post(B + "/import", headers={"X-API-Key": key},
           files={"file": ("demo.md", md.encode(), "text/markdown")}).json()
print("import ok | slug:", d["slug"], "| tags:", d["tags"], "| status:", d["status"])
print("search hit:", any(h["slug"] == d["slug"] for h in s.get(B + "/search", params={"q": "curl"}).json()))
xss = s.post(B + "/import", headers={"X-API-Key": key}, files={"file": ("bad.html",
    b"<html><head><title>xss test</title></head><body><p>safe</p><script>alert(1)</script></body></html>",
    "text/html")}).json()
det = s.get(B + "/posts/" + xss["slug"]).json()
print("xss sanitized:", "<script" not in det["rendered"], "| title auto:", xss["title"])
print("rss ok:", "<title>" in s.get(B + "/feed.xml").text)
