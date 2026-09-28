---
name: mashu-blog-ops
description: >-
  Operate and develop the "麻薯ta爸" personal blog — React 19 + Vite + Tailwind frontend,
  FastAPI + SQLModel + SQLite backend, deployed on an Aliyun ECS (Ubuntu 22.04) behind a
  Cloudflare named tunnel (https://blog.mashutaba.best). Use this skill whenever the user wants
  to: start the local dev servers, build or deploy the site, restart or inspect the `blog`/nginx
  service, read server logs, run or restore backups, check/edit /etc/blog.env secrets or the
  security hardening, set up or repair the Cloudflare tunnel / HTTPS, add or integrate a
  react-bits / shadcn component, or debug the homepage hero / WebGPU / lag. Trigger even when the
  user only says things like "部署", "上线", "重启服务", "看日志", "备份", "恢复", "隧道挂了",
  "起本地", "本地调试", "加个组件", "首屏没动效", "好卡", "换密码", "迁移服务器" about this blog.
---

# 麻薯ta爸博客 — 运维 & 开发手册

This is a project-specific runbook for one deployment. It encodes the exact paths, commands,
ports, and the hard-won gotchas for THIS blog so you don't re-derive them (or repeat mistakes)
each time. The repo root is the directory containing `web/`, `server/`, `deploy/`, `tools/`
(on the original machine that's `C:\Users\MZH\Desktop\个人博客`; substitute your clone path elsewhere —
and read `references/new-machine.md` first if you're on a different machine).

## Golden rules (read before touching anything)

1. **Never put secrets in the skill, the repo, or a chat message.** The production admin password,
   the Cloudflare tunnel credentials, and `cert.pem` are secrets. They live only on the server
   (`/etc/blog.env`, `/etc/cloudflared/*.json`) and, for local dev, in the gitignored
   `.env-local` / `本地调试.bat`. Reference their *location*, never echo their value.
2. **Production is live and shared.** Before any command that restarts a service, redeploys,
   deletes data, or changes DNS/nginx/systemd on the ECS, say what you're about to do and why.
   Reads (status, logs, `is-active`, `ls`) are always fine.
3. **A deploy restarts the backend, and the backend now fails fast** if `SECRET_KEY` or
   `ADMIN_PASSWORD` is missing/weak. Always verify `/etc/blog.env` is valid *before* deploying
   (see deploy reference) or you can take the site down.
4. **The user's main browser is 360 (no WebGPU) and they run Windows + Git Bash.** Effects must
   have a 2D fallback; shell commands are Git-Bash (POSIX) unless you use a `.cmd`/`.bat`.

## What lives where

| Piece | Where | Notes |
|---|---|---|
| Frontend (React+Vite) | `web/` → built to `web/dist` | Tailwind 3, `darkMode:"class"`, React Router |
| Backend (FastAPI+SQLite) | `server/` (`app/`, `.venv`) | uvicorn on `:8000`, SQLModel, FTS5 trigram search |
| Nginx site | server `/etc/nginx/sites-enabled/blog` | listens `:8080`, serves `dist`, proxies `/api`→`:8000` |
| Backend service | systemd `blog` (`User=blogd`) | `EnvironmentFile=/etc/blog.env` |
| Data | server `/srv/blog/` (`blog.db`, `uploads/`) | 750 blogd-owned; backed up weekly |
| Secrets (prod) | server `/etc/blog.env` | SECRET_KEY / ADMIN_USER / ADMIN_PASSWORD / BLOG_DIR |
| Secrets (local) | repo `.env-local` (gitignored) + `本地调试.bat` | dev admin = `admin`/`blog123456` |
| Cloudflare tunnel | server `/etc/cloudflared/` + systemd `cloudflared` | named tunnel `mashu-blog` → `localhost:8080` |
| Server SSH | `root@120.26.177.214`, key auth only (`~/.ssh/id_ed25519`) | password auth disabled |
| Public URL | **https://blog.mashutaba.best** (via CF tunnel) | `http://120.26.177.214:8080` also works (no WebGPU) |

## Task router — read the matching reference before acting

- Start / debug locally, ports, `.bat`, admin login → `references/local-dev.md`
- Build & deploy to ECS, frontend-only push, pre-deploy safety check, rollback → `references/deploy.md`
- Server ops: `blog`/nginx service, logs, backups/restore, `/etc/blog.env`, security headers,
  firewall/security-group, moving to a paid server → `references/ecs-ops.md`
- Cloudflare named tunnel: create/renew login, config, systemd connector, DNS, proxy for
  downloads, why HTTPS matters for WebGPU, troubleshooting → `references/cloudflare-tunnel.md`
- Add a react-bits / shadcn component, the homepage components, theming → `references/frontend-reactbits.md`
- Performance (hero lag, canvas throttle, hover cost) and testing animation correctly → `references/performance.md`
- Environment gotchas (Qoder masks secrets, `.bat` CRLF/ASCII, GitHub slow from ECS,
  hidden-tab rAF throttling) → `references/gotchas.md`
- **Writing / publishing a post** — sources live in `content/posts/*.md`, but the server's SQLite is
  the only truth. Markdown renders with `nl2br`, so keep each paragraph on ONE physical line.
  Publish with `tools/publish_post.py <file>`: it PUTs when the slug already exists (`/import` would
  silently create `slug-2`). Never write to production without the user asking. Note `tools/` is
  gitignored — the script is tracked via `git add -f`.
- **Operating from a NEW machine / different agent** (clone the private GitHub remote
  `origin = https://github.com/Mu-Miao/mashu-blog.git`; SSH key + secrets + tooling are per-machine)
  → `references/new-machine.md`

## The one-command cheatsheet (most common)

```bash
# Local dev (or double-click 本地调试.bat):
cd server && BLOG_DIR=./.blogdata SECRET_KEY=local-only-not-a-secret ADMIN_PASSWORD=blog123456 \
  .venv/Scripts/python -m uvicorn app.main:app --port 8000 --reload      # backend :8000
cd web && npm run dev                                                    # frontend :5173

# Deploy everything to ECS (builds web, pushes server+dist, restarts blog+nginx, pulls backup):
BLOG_HOST=root@120.26.177.214 bash deploy/deploy.sh

# Server health / logs (read-only, safe):
ssh root@120.26.177.214 'systemctl is-active blog nginx cloudflared'
ssh root@120.26.177.214 'journalctl -u blog -n 30 --no-pager'
```

When unsure which reference to open, the deploy + cloudflare + local-dev trio covers ~90% of asks.
Prefer reading the relevant reference file over improvising commands against production.
