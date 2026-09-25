@echo off
setlocal
cd /d "%~dp0"

rem ====== Local dev one-click: backend :8000 + frontend :5173, then open browser ======
rem config.py now requires SECRET_KEY and ADMIN_PASSWORD (local debug values below)
set BLOG_DIR=server\.blogdata
set SECRET_KEY=local-on…cret
set ADMIN_PASSWORD=***

rem ---- backend FastAPI (uvicorn :8000, --reload auto restart) ----
netstat -ano | findstr /c:":8000" | findstr LISTENING >nul 2>&1
if errorlevel 1 (
  start "blog-api-8000" cmd /k "cd /d %~dp0server && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
  echo [start] backend  http://127.0.0.1:8000
) else (
  echo [skip ] backend already running on :8000
)

rem ---- frontend Vite (npm run dev :5173, proxies /api and /uploads to 8000) ----
netstat -ano | findstr /c:":5173" | findstr LISTENING >nul 2>&1
if errorlevel 1 (
  start "blog-web-5173" cmd /k "cd /d %~dp0web && npm run dev"
  echo [start] frontend http://localhost:5173
) else (
  echo [skip ] frontend already running on :5173
)

rem ---- wait a few seconds, then open browser ----
timeout /t 4 /nobreak >nul
start "" http://localhost:5173
echo.
echo Done. Local admin login:  user admin   password blog123456
echo Close the black console windows to stop backend / frontend.
echo.
pause
