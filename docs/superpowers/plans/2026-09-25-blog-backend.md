# 博客后端与部署 实施计划（计划 A）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建个人博客的 FastAPI 后端（文章/标签/搜索/上传/API Key/导入/RSS）与阿里云 ECS 部署脚本。

**Architecture:** 单体 FastAPI + SQLite(SQLModel)，服务端完成 Markdown 渲染与 HTML 消毒（nh3），JWT cookie 管理会话、SHA-256 哈希 API Key 供脚本导入；Nginx 反代 + systemd 托管，部署用 Git Bash rsync/ssh 脚本。

**Tech Stack:** Python 3.12, FastAPI, SQLModel, python-jose, passlib[bcrypt], python-markdown, nh3, beautifulsoup4, python-frontmatter, feedgen, pytest + httpx(TestClient)。

**Spec:** `docs/superpowers/specs/2026-09-25-blog-design.md`

## Global Constraints

- Python 3.12（venv 隔离在 `server/.venv`，不污染系统；Windows 开发用 Git Bash）
- 所有 HTML 输出必须经 `sanitize_html` 消毒后才可下发/渲染（服务端消毒，前端仅兜底）
- 密码 bcrypt；JWT httpOnly + SameSite=Lax；API Key 只存 SHA-256 哈希
- 上传：白名单 jpg/png/gif/webp、≤5MB、随机文件名
- 服务器：阿里云试用 ECS `120.26.177.214`，IP 直连 `:8080`，不绑域名不备案
- 每个任务结束时 pytest 全绿并提交一次

## 文件结构（本计划产出）

```
server/
├─ pyproject.toml
├─ app/
│  ├─ __init__.py
│  ├─ main.py          # 应用装配、lifespan、静态挂载
│  ├─ config.py        # env 配置与路径
│  ├─ db.py            # engine、init_db、FTS 建表/同步
│  ├─ models.py        # User/Post/PostTag/Tag/Asset/ApiKey
│  ├─ schemas.py       # Pydantic 出入参
│  ├─ security.py      # bcrypt/JWT/API Key 哈希/消毒/markdown 渲染/slug
│  ├─ deps.py          # require_admin / require_write 依赖
│  ├─ crud.py          # 文章/标签/资产/密钥数据操作
│  └─ routers/
│     ├─ auth.py  posts.py  assets.py  keys.py  import_.py  feed.py
├─ tests/  (conftest.py + test_*.py)
deploy/
├─ blog.service  blog.nginx  provision.sh  deploy.sh  backup.sh  README.md
```

---

### Task 1: 项目骨架 + 配置 + 数据库 + 模型

**Files:**
- Create: `server/pyproject.toml`, `server/app/__init__.py`, `server/app/config.py`, `server/app/models.py`, `server/app/db.py`, `server/tests/conftest.py`, `server/tests/test_models.py`, `.gitignore`

**Interfaces:**
- Produces: `settings`(BLOG_DIR/DATABASE_URL/SECRET_KEY/ADMIN_USER/ADMIN_PASSWORD)、`get_session()`、`init_db()`、模型 `User/Post/PostTag/Tag/Asset/ApiKey`、`create_app()` 空壳

- [ ] **Step 1: 建 venv 并装依赖**

```bash
cd server && py -3.12 -m venv .venv && .venv/Scripts/python -m pip install -e ".[dev]"
```

`server/pyproject.toml`:

```toml
[project]
name = "blog-server"
version = "0.1.0"
requires-python = ">=3.12,<3.13"
dependencies = [
  "fastapi>=0.115", "uvicorn[standard]>=0.30", "sqlmodel>=0.0.21",
  "python-jose[cryptography]>=3.3", "passlib[bcrypt]==1.7.4", "bcrypt==4.0.1",
  "python-frontmatter>=1.1", "Markdown>=3.6", "nh3>=0.2", "beautifulsoup4>=4.12",
  "python-multipart>=0.0.9", "feedgen>=1.0", "email-validator>=2.0",
]
[project.optional-dependencies]
dev = ["pytest>=8", "httpx>=0.27"]
[tool.pytest.ini_options]
testpaths = ["tests"]
```

`.gitignore`（仓库根）：`**/.venv/` `**/node_modules/` `web/dist/` `*.db*` `uploads/` `.env` `__pycache__/` `*.egg-info/`

- [ ] **Step 2: 写失败测试 `tests/test_models.py`**

```python
def test_create_post_with_tags(client):
    from sqlmodel import Session, select
    from app.db import engine
    from app.models import Post, Tag, PostTag
    with Session(engine) as s:
        p = Post(title="Hello 世界", kind="md", body="hi", status="published")
        s.add(p); s.commit(); s.refresh(p)
        t = Tag(name="tech"); s.add(t); s.commit(); s.refresh(t)
        s.add(PostTag(post_id=p.id, tag_id=t.id)); s.commit()
        got = s.exec(select(Post).where(Post.id == p.id)).first()
        assert got.title == "Hello 世界"
        assert len(s.exec(select(PostTag)).all()) == 1
```

- [ ] **Step 3: 实现 config/models/db/conftest 使测试通过**

`app/config.py`:

```python
import os
from pathlib import Path

BLOG_DIR = Path(os.environ.get("BLOG_DIR", "./.blogdata"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BLOG_DIR / 'blog.db'}")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
UPLOADS_DIR = BLOG_DIR / "uploads"
```

`app/models.py`:

```python
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Relationship

def now() -> datetime: return datetime.now(timezone.utc)

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    created_at: datetime = Field(default_factory=now)

class PostTag(SQLModel, table=True):
    post_id: int = Field(foreign_key="post", primary_key=True)
    tag_id: int = Field(foreign_key="tag", primary_key=True)

class Tag(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    posts: list["Post"] = Relationship(back_populates="tags", link_model=PostTag)

class Post(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    kind: str  # md | html
    body: str
    rendered: str = ""
    summary: str = ""
    status: str = "draft"  # draft | published
    published_at: datetime | None = None
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)
    tags: list[Tag] = Relationship(back_populates="posts", link_model=PostTag)

class Asset(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    filename: str
    mime: str
    size: int
    created_at: datetime = Field(default_factory=now)

class ApiKey(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    key_hash: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=now)
    revoked_at: datetime | None = None
```

`app/db.py`（含 FTS5）:

```python
from contextlib import contextmanager
from pathlib import Path
from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine, select
from . import config
from .models import Post

Path(config.DATABASE_URL.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
config.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
engine = create_engine(config.DATABASE_URL, connect_args={"check_same_thread": False})

FTS_SQL = """
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  post_id UNINDEXED, title, body, tokenize='unicode61');
"""

def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    with engine.begin() as c:
        c.execute(text(FTS_SQL))

def sync_fts(session: Session) -> None:
    session.execute(text("DELETE FROM posts_fts"))
    for p in session.exec(select(Post)).all():
        session.execute(text("INSERT INTO posts_fts(post_id,title,body) VALUES (:i,:t,:b)"),
                        {"i": p.id, "t": p.title, "b": p.body})
    session.commit()

@contextmanager
def get_session():
    with Session(engine) as s:
        yield s
```

`tests/conftest.py`:

```python
import os
import sys
import tempfile
from pathlib import Path
import pytest

TMP = tempfile.mkdtemp(prefix="blogtest-")
os.environ["BLOG_DIR"] = os.path.join(TMP, "data")
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(TMP, "blog.db").replace("\\", "/")
os.environ["SECRET_KEY"] = "test-secret"
os.environ["ADMIN_USER"] = "admin"
os.environ["ADMIN_PASSWORD"] = "testpass123"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

@pytest.fixture()
def client():
    from fastapi.testclient import TestClient
    from app.main import create_app
    with TestClient(create_app()) as c:
        yield c
```

`app/main.py` 最小壳：

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .db import init_db

def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        init_db()
        yield
    return FastAPI(title="mashu-blog", lifespan=lifespan)

app = create_app()
```

- [ ] **Step 4: 跑测试**

Run: `cd server && .venv/Scripts/python -m pytest -v` → Expected: PASS（1 passed）

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(server): 骨架/配置/模型/FTS 建表"`

---

### Task 2: 安全工具（bcrypt/JWT/消毒/slug/导入解析）

**Files:**
- Create: `server/app/security.py`, `server/tests/test_security.py`

**Interfaces:**
- Produces: `hash_password(p)->str`、`verify_password(p,h)->bool`、`create_token(sub)->str`、`decode_token(t)->str|None`、`sanitize_html(raw)->str`、`render_markdown(md)->str`、`slugify(text)->str`、`parse_frontmatter(text)->(dict,str)`、`hash_api_key(k)->str`、`new_api_key()->(plain,hashed)`

- [ ] **Step 1: 写失败测试**

```python
from app.security import (hash_password, verify_password, create_token, decode_token,
                          sanitize_html, render_markdown, slugify, parse_frontmatter,
                          new_api_key, hash_api_key)

def test_password_roundtrip():
    h = hash_password("s3cret")
    assert verify_password("s3cret", h) and not verify_password("bad", h)

def test_jwt_roundtrip():
    t = create_token("admin")
    assert decode_token(t) == "admin"
    assert decode_token("garbage") is None

def test_sanitize_strips_scripts():
    out = sanitize_html("<p>hi</p><script>alert(1)</script><img src=x onerror=alert(1)>")
    assert "<script" not in out and "onerror" not in out and "<p>hi</p>" in out

def test_render_markdown():
    out = render_markdown("# T\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```python\nx=1\n```")
    assert "<h1" in out and "<table" in out and "highlight" in out

def test_slugify():
    assert slugify("Hello World!") == "hello-world"
    assert slugify("你好博客").startswith("post-")

def test_frontmatter():
    meta, body = parse_frontmatter('---\ntitle: Hi\ntags: [a, b]\n---\n正文')
    assert meta["title"] == "Hi" and meta["tags"] == ["a", "b"] and body == "正文"

def test_api_key():
    plain, hashed = new_api_key()
    assert hash_api_key(plain) == hashed and len(plain) == 48
```

- [ ] **Step 2: 实现 `app/security.py`**

```python
import hashlib
import re
import secrets
import unicodedata
from datetime import datetime, timedelta, timezone
from frontmatter import YAML
import markdown
import nh3
from jose import jwt
from passlib.context import CryptContext
from . import config

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
hash_password = _pwd.hash
verify_password = _pwd.verify

def create_token(sub: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": sub, "exp": exp}, config.SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> str | None:
    try:
        return jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"]).get("sub")
    except Exception:
        return None

ALLOWED_TAGS = {"p","div","span","br","hr","h1","h2","h3","h4","h5","h6","strong","em",
    "b","i","u","s","sup","sub","blockquote","pre","code","ul","ol","li","a","img","table",
    "thead","tbody","tr","td","th","figure","figcaption","details","summary","del","ins",
    "kbd","abbr","cite","q"}
ALLOWED_ATTRS = {"*": {"class","id","style"}, "a": {"href","title","target","rel"},
    "img": {"src","alt","title","width","height"}, "td": {"colspan","rowspan"},
    "th": {"colspan","rowspan"}, "ol": {"start"}, "blockquote": {"cite"},
    "abbr": {"title"}, "code": {"class"}, "pre": {"class"}}
ALLOWED_PROTOCOLS = {"http", "https", "mailto"}

def sanitize_html(raw: str) -> str:
    return nh3.clean(raw, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS,
                     link_rel="noopener noreferrer", url_schemes=ALLOWED_PROTOCOLS)

def render_markdown(md_text: str) -> str:
    html = markdown.markdown(md_text,
        extensions=["fenced_code", "tables", "toc", "nl2br",
                    "pymdownx.highlight", "pymdownx.superfences"])
    return sanitize_html(html)

_ASCII_RE = re.compile(r"[^a-z0-9]+")
def slugify(text: str) -> str:
    norm = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    slug = _ASCII_RE.sub("-", norm.lower()).strip("-")
    return slug or f"post-{secrets.token_hex(4)}"

def parse_frontmatter(text: str) -> tuple[dict, str]:
    try:
        post = YAML(text)
        return dict(post.metadata), post.content
    except Exception:
        return {}, text

def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

def new_api_key() -> tuple[str, str]:
    plain = secrets.token_hex(24)
    return plain, hash_api_key(plain)
```

依赖补充：`pyproject.toml` dependencies 加 `"pymdown-extensions>=10.0"`（frontmatter 包提供 `frontmatter.YAML`）。

- [ ] **Step 3: 跑测试** `pytest tests/test_security.py -v` → PASS
- [ ] **Step 4: Commit** `git commit -am "feat(server): 密码/JWT/消毒/渲染/slug/frontmatter/APIKey 工具"`

---

### Task 3: 认证路由 + 登录限流 + 管理员初始化

**Files:**
- Create: `server/app/deps.py`, `server/app/routers/__init__.py`, `server/app/routers/auth.py`, `server/app/crud.py`, `server/tests/test_auth.py`
- Modify: `server/app/main.py`（挂路由、lifespan 建管理员）

**Interfaces:**
- Produces: `POST /api/v1/auth/login`、`POST /api/v1/auth/logout`、`GET /api/v1/auth/me`、依赖 `require_admin`（JWT cookie）、`require_write`（cookie 或 `X-API-Key`）、`crud.get_or_create_tags(session,names)->list[Tag]`、`crud.get_post_by_slug`、`crud.list_published`、`crud.count_published`、`crud.create_post(session, data, tags)`、`crud.update_post`、`crud.delete_post`、`crud.search_posts`

- [ ] **Step 1: 写失败测试**

```python
def login(client, pw="testpass123"):
    return client.post("/api/v1/auth/login", json={"username": "admin", "password": pw})

def test_login_wrong_password(client):
    assert login(client, "bad").status_code == 401

def test_login_and_me(client):
    assert login(client).status_code == 200
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 200 and r.json()["username"] == "admin"

def test_write_requires_auth(client):
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.post("/api/v1/posts", json={"title": "x", "kind": "md", "body": "y"}).status_code in (401, 403)

def test_login_rate_limit(client):
    for _ in range(5):
        login(client, "bad")
    assert login(client).status_code == 429  # 锁 10 分钟（含此前 1 次失败=6 次）
```

- [ ] **Step 2: 实现**

`app/deps.py`:

```python
from fastapi import Cookie, Header, HTTPException, Request
from sqlmodel import select
from .db import get_session
from .models import ApiKey
from .security import decode_token, hash_api_key

def require_admin(blog_session: str | None = Cookie(None)) -> str:
    if not blog_session or decode_token(blog_session) != "admin":
        raise HTTPException(401, "未登录")
    return "admin"

def require_write(request: Request, blog_session: str | None = Cookie(None)) -> str:
    if blog_session and decode_token(blog_session) == "admin":
        return "admin"
    key = request.headers.get("X-API-Key")
    if not key:
        raise HTTPException(401, "未登录")
    with get_session() as s:
        k = s.exec(select(ApiKey).where(
            ApiKey.key_hash == hash_api_key(key), ApiKey.revoked_at.is_(None))).first()
    if not k:
        raise HTTPException(401, "API Key 无效")
    return f"apikey:{k.name}"
```

`app/routers/auth.py`（限流：内存 dict，key=client IP，5 次失败锁 600s）:

```python
import time
from fastapi import APIRouter, Depends, Request, Response
from sqlmodel import Session, select
from ..db import get_session
from ..deps import require_admin
from ..models import User
from ..security import create_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
_attempts: dict[str, list[float]] = {}
LOCK_AFTER, LOCK_SECONDS = 5, 600

def _locked(ip: str) -> bool:
    now = time.monotonic()
    fails = [t for t in _attempts.get(ip, []) if now - t < LOCK_SECONDS]
    _attempts[ip] = fails
    return len(fails) >= LOCK_AFTER

@router.post("/login")
def login(body: dict, request: Request, response: Response):
    ip = request.client.host if request.client else "?"
    if _locked(ip):
        return Response(status_code=429)
    with get_session() as s:
        u = s.exec(select(User).where(User.username == body.get("username"))).first()
    if not u or not verify_password(body.get("password", ""), u.password_hash):
        _attempts.setdefault(ip, []).append(time.monotonic())
        return Response(status_code=401)
    _attempts.pop(ip, None)
    response.set_cookie("blog_session", create_token("admin"),
                        httponly=True, samesite="lax", max_age=7 * 86400, path="/")
    return {"ok": True}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("blog_session", path="/")
    return {"ok": True}

@router.get("/me")
def me(user: str = Depends(require_admin)):
    return {"username": "admin"}
```

`app/crud.py` 本任务先实现 Tag/Post 基础函数（签名见 Interfaces；`create_post` 内调用 `slugify` 保证唯一：冲突则追加 `-2`…；`rendered = render_markdown(body) if kind=="md" else sanitize_html(body)`；`summary = 去标签正文[:120]`；发布时若无 `published_at` 则置 now；每次写库后调用 `db.sync_fts(session)` 全量重建 FTS——个人博客量小可接受）。

`app/main.py` 修改：lifespan 中 `init_db()` 后建管理员（不存在则用 settings 的 ADMIN_USER/ADMIN_PASSWORD hash 入库）；`app.include_router(auth.router, prefix="/api/v1")`。

- [ ] **Step 3: 跑测试** → 4 passed
- [ ] **Step 4: Commit** `"feat(server): 登录/JWT cookie/限流/写权限依赖/文章CRUD基础"`

---

### Task 4: 公开文章 API + 标签 + 归档 + 搜索

**Files:**
- Create: `server/app/schemas.py`, `server/app/routers/posts.py`, `server/tests/test_posts.py`
- Modify: `server/app/main.py`

**Interfaces:**
- Produces: `GET /api/v1/posts?page=&tag=`、`GET /api/v1/posts/{slug}`、`GET /api/v1/tags`、`GET /api/v1/archive`、`GET /api/v1/search?q=`；schema `PostOut{id,slug,title,kind,summary,published_at,created_at,tags:list[str],page内不含body}`、`PostDetail(PostOut+body+rendered)`

- [ ] **Step 1: 写失败测试**（登录→建文→发布→公开可见→标签过滤→搜索命中→草稿不可见）

```python
def _login(client): client.post("/api/v1/auth/login", json={"username": "admin", "password": "***"})

def test_full_flow(client):
    _login(client)
    r = client.post("/api/v1/posts", json={"title": "Hello World", "kind": "md",
        "body": "# Hello\n\nkernel 笔记", "tags": ["os"], "status": "published"})
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    assert client.get("/api/v1/posts").json()["total"] == 1
    detail = client.get(f"/api/v1/posts/{r.json()['slug']}")
    assert "<h1" in detail.json()["rendered"]
    assert client.get("/api/v1/search?q=kernel").json()[0]["slug"] == r.json()["slug"]
    assert [t["name"] for t in client.get("/api/v1/tags").json()] == ["os"]
    client.put(f"/api/v1/posts/{pid}", json={"status": "draft"})
    assert client.get("/api/v1/posts").json()["total"] == 0
```

- [ ] **Step 2: 实现 schemas/posts 路由**（list 分页 page_size=10 按 published_at 倒序，**带 `?all=1` 且请求通过 `require_admin` 时返回全部状态含草稿（未登录带 all=1 直接 401）**；`/posts/{slug}` 404 草稿；archive 返回 `[{"ym":"2026-09","posts":[{slug,title,published_at}]}]`；search 用 `text("SELECT post_id FROM posts_fts WHERE posts_fts MATCH :q")`，查询词包成 `f'"{q}"'` 短语防 FTS 语法注入，再按 id 取 published 文章）
- [ ] **Step 3: 跑测试** → PASS
- [ ] **Step 4: Commit** `"feat(server): 公开文章/标签/归档/FTS 搜索 API"`

---

### Task 5: 管理端文章 API（创建/更新/删除）+ 消毒验证

**Files:**
- Modify: `server/app/routers/posts.py`（加 POST/PUT/DELETE，依赖 `require_admin`）
- Create: `server/tests/test_admin_posts.py`

- [ ] **Step 1: 写失败测试**

```python
def _login(client): client.post("/api/v1/auth/login", json={"username":"admin","password":"***"})

def test_html_post_sanitized(client):
    _login(client)
    r = client.post("/api/v1/posts", json={"title": "xss", "kind": "html",
        "body": "<p>ok</p><script>alert(1)</script><b onclick='evil()'>b</b>",
        "status": "published"})
    rendered = client.get(f"/api/v1/posts/{r.json()['slug']}").json()["rendered"]
    assert "<script" not in rendered and "onclick" not in rendered and ">ok<" in rendered

def test_slug_auto_unique(client):
    _login(client)
    a = client.post("/api/v1/posts", json={"title": "Same Title", "kind": "md", "body": "1"})
    b = client.post("/api/v1/posts", json={"title": "Same Title", "kind": "md", "body": "2"})
    assert a.json()["slug"] != b.json()["slug"]

def test_unauthenticated_write_blocked(client):
    assert client.post("/api/v1/posts", json={"title":"t","kind":"md","body":"b"}).status_code == 401
```

- [ ] **Step 2: 实现**（POST/PUT/DELETE；PUT 支持部分字段，kind/md 变更时重渲染；删除同时清 FTS 与关联）
- [ ] **Step 3: 跑测试** → PASS；全量 `pytest -v` 全绿
- [ ] **Step 4: Commit** `"feat(server): 管理端文章写 API + 服务端 HTML 消毒"`

---

### Task 6: 图片上传 + API Key 管理

**Files:**
- Create: `server/app/routers/assets.py`, `server/app/routers/keys.py`, `server/tests/test_assets_keys.py`
- Modify: `server/app/main.py`（挂路由 + `/uploads` StaticFiles）

- [ ] **Step 1: 写失败测试**

```python
import io
def _login(client): client.post("/api/v1/auth/login", json={"username":"admin","password":"***"})

def test_upload_png_ok(client):
    _login(client)
    png = bytes.fromhex("89504e470d0a1a0a") + b"\0" * 100
    r = client.post("/api/v1/assets", files={"file": ("a.png", io.BytesIO(png), "image/png")})
    assert r.status_code == 200
    url = r.json()["url"]
    assert client.get(url).status_code == 200

def test_upload_rejects_exe(client):
    _login(client)
    r = client.post("/api/v1/assets", files={"file": ("a.exe", io.BytesIO(b"MZ...."), "application/x-msdownload")})
    assert r.status_code == 400

def test_api_key_crud(client):
    _login(client)
    k = client.post("/api/v1/api-keys", json={"name": "laptop"}).json()
    assert client.get("/api/v1/api-keys").json()[0]["name"] == "laptop"
    client.delete(f"/api/v1/api-keys/{k['id']}")
    assert client.get("/api/v1/api-keys").json() == []
```

- [ ] **Step 2: 实现**（assets：magic-bytes 校验 PNG/JPG/GIF/WEBP 文件头 + 扩展名白名单 + 5MB 上限 + `secrets.token_hex(8).ext` 存 `config.UPLOADS_DIR`，返回 `{"url": "/uploads/<name>"}`；keys：仅 require_admin，创建返回一次明文；main 里 `app.mount("/uploads", StaticFiles(directory=config.UPLOADS_DIR))`）
- [ ] **Step 3: 跑测试** → PASS
- [ ] **Step 4: Commit** `"feat(server): 图片上传校验 + API Key 管理"`

---

### Task 7: 文件导入通道 + RSS

**Files:**
- Create: `server/app/routers/import_.py`, `server/app/routers/feed.py`, `server/tests/test_import_feed.py`

- [ ] **Step 1: 写失败测试**

```python
import io
def _login(client): client.post("/api/v1/auth/login", json={"username":"admin","password":"***"})

def _key(client):
    _login(client)
    return client.post("/api/v1/api-keys", json={"name": "t"}).json()["key"]

def test_import_md_with_frontmatter(client):
    key = _key(client)
    md = b"---\ntitle: Imported Post\ntags: [net, lab]\nstatus: published\n---\n# content\n"
    r = client.post("/api/v1/import", headers={"X-API-Key": key},
                    files={"file": ("post.md", io.BytesIO(md), "text/markdown")})
    assert r.status_code == 200 and r.json()["kind"] == "md"
    slugs = [p["slug"] for p in client.get("/api/v1/posts").json()["items"]]
    assert "imported-post" in slugs
    assert sorted(client.get("/api/v1/tags").json() and [t["name"] for t in client.get("/api/v1/tags").json()]) == ["lab", "net"]

def test_import_html(client):
    key = _key(client)
    html = b"<html><head><title>Page One</title></head><body><p>body text</p><script>x</script></body></html>"
    r = client.post("/api/v1/import", headers={"X-API-Key": key},
                    files={"file": ("p.html", io.BytesIO(html), "text/html")})
    assert r.json()["title"] == "Page One"
    d = client.get(f"/api/v1/posts/{r.json()['slug']}").json()
    assert "<script" not in d["rendered"] and "body text" in d["rendered"]

def test_import_requires_key(client):
    assert client.post("/api/v1/import", files={"file": ("p.md", io.BytesIO(b"x"), "text/markdown")}).status_code == 401

def test_rss(client):
    _key(client)
    client.post("/api/v1/posts", json={"title": "Feed Post", "kind": "md", "body": "b", "status": "published"})
    xml = client.get("/api/v1/feed.xml").text
    assert "<title>Feed Post</title>" in xml
```

- [ ] **Step 2: 实现**（import：`.md`→parse_frontmatter（meta 可含 title/tags/date/status/slug），无 title 取文件名 stem；`.html`→BeautifulSoup 取 `<title>`（无则文件名）与 `<body>` 内 HTML；均走 create_post 通道（kind 对应），依赖 `require_write`；feed：feedgen AtomGenerator，标题取最近 20 篇 published，`<link>` 用请求 base_url）
- [ ] **Step 3: 跑测试** → PASS
- [ ] **Step 4: Commit** `"feat(server): API Key 文件导入 + RSS"`

---

### Task 8: 部署产物（systemd/Nginx/provision/deploy/backup）

**Files:**
- Create: `deploy/blog.service`, `deploy/blog.nginx`, `deploy/provision.sh`, `deploy/deploy.sh`, `deploy/backup.sh`, `deploy/README.md`

**Interfaces:** Consumes 前端构建产物 `web/dist/`（计划 B 产出；deploy.sh 若 dist 不存在则跳过前端步骤仅部署后端）

- [ ] **Step 1: 写 systemd 单元 `deploy/blog.service`**

```ini
[Unit]
Description=mashu blog api
After=network.target

[Service]
WorkingDirectory=/opt/blog/server
EnvironmentFile=/etc/blog.env
ExecStart=/opt/blog/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: 写 `deploy/blog.nginx`**

```nginx
server {
    listen 8080;
    root /var/www/blog;
    client_max_body_size 10m;
    gzip on; gzip_types text/css application/javascript text/html;
    add_header X-Content-Type-Options nosniff;
    location /api/ { proxy_pass http://127.0.0.1:8000; proxy_set_header Host $host; }
    location /uploads/ { proxy_pass http://127.0.0.1:8000; expires 7d; }
    location / { try_files $uri /index.html; }
}
```

- [ ] **Step 3: 写脚本**

`deploy/provision.sh`（一次性，需 `export BLOG_HOST=root@120.26.177.214`）：

```bash
#!/usr/bin/env bash
set -euo pipefail
ssh $BLOG_HOST "apt-get update && apt-get -y install nginx python3.12 python3.12-venv rsync"
ssh $BLOG_HOST "mkdir -p /opt/blog /var/www/blog /srv/blog"
scp deploy/blog.service $BLOG_HOST:/etc/systemd/system/
scp deploy/blog.nginx $BLOG_HOST:/etc/nginx/sites-available/blog
ssh $BLOG_HOST "ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog; rm -f /etc/nginx/sites-enabled/default; systemctl daemon-reload; systemctl enable --now nginx blog 2>/dev/null || true"
ssh $BLOG_HOST "[ -f /etc/blog.env ] || (umask 077; echo \"SECRET_KEY=$(openssl rand -hex 32)\" > /etc/blog.env; echo 'BLOG_DIR=/srv/blog' >> /etc/blog.env; echo 'ADMIN_USER=admin' >> /etc/blog.env; echo \"ADMIN_PASSWORD=${ADMIN_PASSWORD:*** ssh 交互输入}\" >> /etc/blog.env)"
echo "provision done; 去阿里云安全组放行 TCP 8080"
```

`deploy/deploy.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${BLOG_HOST:=root@120.26.177.214}"
[ -d web/dist ] && (cd web && npm run build) || echo "no web/dist, backend-only deploy"
rsync -az --delete --exclude .venv --exclude .blogdata server/ $BLOG_HOST:/opt/blog/server/
rsync -az --delete web/dist/ $BLOG_HOST:/var/www/blog/ 2>/dev/null || true
ssh $BLOG_HOST "python3.12 -m venv /opt/blog/venv; /opt/blog/venv/bin/pip install -q -e /opt/blog/server && systemctl restart blog"
echo "deployed -> http://120.26.177.214:8080"
```

`deploy/backup.sh`：`ssh $BLOG_HOST "tar czf /root/blog-backup-\$(date +%F).tgz -C /srv blog" && scp $BLOG_HOST:/root/blog-backup-*.tgz ./backups/`

- [ ] **Step 4: 本地验证后端可启动**

Run: `cd server && BLOG_DIR=./.blogdata .venv/Scripts/python -m uvicorn app.main:app --port 8000`，`curl http://127.0.0.1:8000/api/v1/posts` → `{"items":[],"total":0,...}`；Ctrl+C 停
- [ ] **Step 5: Commit** `"chore(deploy): systemd/nginx/provision/deploy/backup 脚本"`

---

## 验收对照（spec §10）

条目 1/2/3/4 由 Task 1-7 的 pytest 覆盖；条目 5（公网可访问）在计划 B 完成后执行 `provision.sh + deploy.sh` 实机验证。
