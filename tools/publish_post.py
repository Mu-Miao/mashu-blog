"""把本地 .md 文章发到博客线上库：登录 -> 同 slug 就更新，否则新建。

用法：
    server/.venv/Scripts/python tools/publish_post.py content/posts/xxx.md

说明：
- 凭据从仓库根目录 .env-local 读取（已 gitignore），本脚本不打印任何密码。
- 线上已存在相同 frontmatter slug 时走 PUT 更新那一篇；否则走 /import 新建。
  （import 遇到同名 slug 不会覆盖，会自动改成 xxx-2 再建一篇，容易留下重复文章。）
- 文内 frontmatter 的 status 决定文章是 draft 还是 published。
"""
from __future__ import annotations

import pathlib
import re
import sys

import httpx

BASE = "https://blog.mashutaba.best/api/v1"
SITE = "https://blog.mashutaba.best"
INDEXNOW_KEY = "cc8fae1b74479aceb9ac40d75c606cdb"
ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_env() -> dict[str, str]:
    f = ROOT / ".env-local"
    if not f.exists():
        sys.exit("缺少 .env-local（需要 ADMIN_USER / ADMIN_PASSWORD）")
    out = {}
    for line in f.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def parse_frontmatter(text: str) -> tuple[dict, str]:
    # 仓库在 Windows 下会把 .md 转成 CRLF，所以换行必须两种都认，否则整篇连 frontmatter 一起当正文
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?", text, re.S)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    raw_tags = meta.get("tags", "")
    inner = raw_tags[1:-1] if raw_tags.startswith("[") else raw_tags
    meta["tags"] = [t.strip().strip("'\"") for t in inner.split(",") if t.strip()]
    return meta, text[m.end():]


def report(mode: str, d: dict) -> None:
    print(f"{mode} -> /post/{d.get('slug')}  (id={d.get('id')})")
    print("  标题:", d.get("title"))
    print("  状态:", d.get("status"), "| 标签:", d.get("tags"), "| 发布时间:", d.get("published_at"))
    print("  正文字符:", len(d.get("body", "")), "| 渲染 HTML:", len(d.get("rendered", "")))
    print("  摘要:", (d.get("summary") or "")[:60])


def notify_indexnow(client: httpx.Client, slug: str) -> None:
    url = f"{SITE}/post/{slug}"
    try:
        response = client.get(
            "https://api.indexnow.org/indexnow",
            params={
                "url": url,
                "key": INDEXNOW_KEY,
                "keyLocation": f"{SITE}/{INDEXNOW_KEY}.txt",
            },
        )
        if response.status_code in {200, 202}:
            print("  IndexNow: 已通知搜索引擎", url)
        else:
            print(f"  IndexNow: 通知失败 HTTP {response.status_code}（文章已正常发布）")
    except httpx.HTTPError as exc:
        print(f"  IndexNow: 通知失败 {type(exc).__name__}（文章已正常发布）")


def main(md_path: pathlib.Path) -> None:
    meta, body = parse_frontmatter(md_path.read_text(encoding="utf-8"))
    slug = meta.get("slug") or md_path.stem
    env = load_env()
    with httpx.Client(timeout=30) as c:
        r = c.post(f"{BASE}/auth/login", json={
            "username": env.get("ADMIN_USER", "admin"),
            "password": env.get("ADMIN_PASSWORD", "")})
        if r.status_code != 200:
            # 故意不重试：连续 5 次失败会锁 IP 十分钟
            sys.exit(f"登录失败 HTTP {r.status_code}，已停止（未重试，避免触发 IP 锁定）")
        existing = None
        for page in range(1, 6):
            lr = c.get(f"{BASE}/posts", params={"all": 1, "size": 50, "page": page})
            if lr.status_code != 200:
                break
            items = lr.json().get("items", [])
            existing = next((p for p in items if p.get("slug") == slug), None)
            if existing or len(items) < 50:
                break
        payload = {
            "title": meta.get("title") or slug,
            "kind": "md",
            "body": body,
            "status": meta.get("status", "published"),
            "tags": meta.get("tags", []),
        }
        if existing:
            res = c.put(f"{BASE}/posts/{existing['id']}", json=payload)
            mode = "已更新线上同 slug 文章"
        else:
            res = c.post(f"{BASE}/import",
                         files={"file": (md_path.name, md_path.read_bytes(), "text/markdown")})
            mode = "已新建文章"
        if res.status_code != 200:
            sys.exit(f"写入失败 HTTP {res.status_code}: {res.text[:200]}")
        saved = res.json()
        report(mode, saved)
        if saved.get("status") == "published" and saved.get("slug"):
            notify_indexnow(c, saved["slug"])


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    p = pathlib.Path(sys.argv[1])
    if not p.exists():
        p = ROOT / sys.argv[1]
    if not p.exists():
        sys.exit(f"找不到文件：{sys.argv[1]}")
    main(p)
