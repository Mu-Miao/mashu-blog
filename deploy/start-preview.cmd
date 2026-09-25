@echo off
rem One-click restart of local blog preview + public cloudflare tunnel.
rem Usage: deploy\start-preview.cmd   (run from anywhere)
cd /d "%~dp0.."
set BLOG_DIR=server\.blogdata
set SECRET_KEY=local-only-not-a-secret
set ADMIN_PASSWORD=blog123456
start "blog-api" /min server\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --app-dir server
timeout /t 3 /nobreak >nul
if exist tools\cloudflared.exe start "blog-tunnel" /min tools\cloudflared.exe tunnel --url http://127.0.0.1:8000 --no-autoupdate
echo API starting on http://127.0.0.1:8000 (tunnel only if tools\cloudflared.exe exists).
