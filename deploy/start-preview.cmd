@echo off
rem One-click restart of local blog preview + public cloudflare tunnel.
rem Usage: deploy\start-preview.cmd   (run from anywhere)
cd /d "%~dp0.."
set BLOG_DIR=server\.blogdata
set SECRET_KEY=local-dev-001
set ADMIN_PASSWORD=blog123456
start "blog-api" /min server\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --app-dir server
timeout /t 3 /nobreak >nul
start "blog-tunnel" /min tools\cloudflared.exe tunnel --url http://127.0.0.1:8000 --no-autoupdate
echo API + tunnel starting. The public https://xxx.trycloudflare.com URL is printed in the "blog-tunnel" window.
