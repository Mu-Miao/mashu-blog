# Local development

Repo root: `C:\Users\MZH\Desktop\个人博客`. Two ends run locally and mirror production.

## One-click (recommended for the user)

Double-click **`本地调试.bat`** at the repo root. It:
- starts the backend (uvicorn `:8000`, `--reload`) in its own console window,
- starts the frontend (Vite `:5173`) in another console window,
- skips either one if its port is already listening,
- opens `http://localhost:5173`.

Stop by closing the black console windows. The `.bat` sets the required env vars itself.
(It is authored as CRLF + pure-ASCII — see gotchas — keep it that way if you edit it.)

## Manual (Git Bash)

Backend — **must** set `SECRET_KEY` and `ADMIN_PASSWORD` or `config.py` refuses to boot:
```bash
cd server
BLOG_DIR=./.blogdata SECRET_KEY=local-on…cret ADMIN_PASSWORD=*** \
  .venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
If there is no `.venv` yet:
```bash
cd server && py -3.13 -m venv .venv && .venv/Scripts/python -m pip install -e ".[dev]"
```

Frontend (proxies `/api` and `/uploads` → `127.0.0.1:8000`, see `web/vite.config.ts`):
```bash
cd web && npm install && npm run dev      # http://localhost:5173
```

## Local admin login

`admin` / `blog123456` (dev only — production uses a different strong password in `/etc/blog.env`;
never reuse this one on the server).

## First boot

`main.py` creates the admin user from `ADMIN_USER`/`ADMIN_PASSWORD` on startup if it doesn't
already exist. So the local DB (`server/.blogdata/blog.db`) gets an admin the first time you run
with those env vars. Changing `ADMIN_PASSWORD` later does NOT re-hash an existing admin — to change
a password you must update the stored hash (see ecs-ops).

## Tests

```bash
cd server && .venv/Scripts/python -m pytest        # backend hits real endpoints via httpx
```
Frontend has no automated tests; verify in the browser (see performance.md for how to test
animations correctly — a hidden browser tab will fake "no animation").

## Handy URLs / ports
- Frontend dev: http://localhost:5173
- Backend API:  http://127.0.0.1:8000/api/v1  (docs at /docs)
- Local admin:  http://localhost:5173/admin/login
