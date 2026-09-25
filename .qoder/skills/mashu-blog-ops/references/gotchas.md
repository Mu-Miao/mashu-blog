# Environment gotchas (this user / machine)

These cost real time when rediscovered. Check here first.

## Windows shell & tooling

- The user's shell is **Git Bash** (POSIX), not cmd/PowerShell. Bash tool commands use `/dev/null`,
  forward slashes, `$VAR`. Use `dir_path`/absolute paths; avoid `cd` chains that trigger prompts.
- **`.bat` files must be CRLF + pure ASCII.** cmd parses `.bat` in the GBK codepage; a UTF-8 file
  with Chinese comments/echo corrupts line parsing (first chars of lines get eaten, `set` breaks).
  Author `.bat` in English, then convert line endings: `sed -i 's/$/\r/' file.bat`. `本地调试.bat`
  follows this — keep it that way.
- **Qoder CLI masks secrets typed in Bash commands** (passwords show as `***`). If a command needs a
  real credential, `Write` a script file with the value and run the file, rather than inlining it.
  Also: reading a secret with `grep`/`cat` may print `***` — write a server-side script that uses the
  value from env without echoing it.

## Network (China / this machine)

- **GitHub is slow or fails** from both the Hangzhou ECS and sometimes the local machine. npm
  registry is fine (mirrors). For GitHub release binaries (e.g. cloudflared): download **locally
  through the proxy**, then `scp` to the server. Don't `curl` GitHub on the ECS.
- **Local proxy = Clash Verge**, mixed port currently **`127.0.0.1:7897`** (fall back to 7890/10809
  if it changes). Prefix proxy-needing commands with
  `HTTPS_PROXY=http://127.0.0.1:7897 HTTP_PROXY=http://127.0.0.1:7897` or `curl -x http://127.0.0.1:7897`.
- Cloudflare free + mainland origin = visitors may see latency; fine for a personal blog.

## Browser / rendering

- **User's main browser is 360 安全浏览器 — no WebGPU.** Any WebGPU effect (ShapeWaves) must have a
  Canvas-2D/WebGL fallback (WavesCanvas). Never claim "you'll see the effect" based only on the
  built-in browser (which does have WebGPU on localhost/https).
- **WebGPU needs a secure context**: `navigator.gpu` is undefined on plain `http://IP:port`. That's
  why the cloud only animates the fancy hero over https://blog.mashutaba.best, not http://…:8080.
- **Hidden browser tab throttles rAF to ~0** → canvas/scroll animations look frozen and pixel probes
  return blank. Only trust visual/animation checks with the browser panel visible; use an offscreen
  canvas benchmark otherwise. `take_screenshot` fails when the panel is hidden — use
  `evaluate_script` DOM probes instead.
- **Lenis** (smooth scroll) only updates transforms on real `wheel` events; `scrollTop=`/`scrollTo=`
  bypass it. Test scroll-linked effects by dispatching a `WheelEvent`.

## Tailwind / Vite

- **Changing `tailwind.config.js` does NOT hot-reload in a running Vite.** An orphaned Vite/node
  process keeps serving the old theme (e.g. `darkMode` strategy, custom colors) and can silently hold
  the port. After editing the config, kill the dev server (and any orphan `node .../vite` child on
  :5173) and start fresh.
- `@apply` of custom theme utilities (e.g. `rounded-pill`) inside `@layer components` can fail to
  resolve — write those as plain CSS (`border-radius: 980px;`) instead.
- Tailwind v3 opacity steps are limited: `bg-white/72`, `divide-white/8` are invalid — use bracket
  values (`bg-white/[0.72]`) or a valid step.

## Deploy / server

- **Backend fails fast** without valid `SECRET_KEY`/`ADMIN_PASSWORD` — always check `/etc/blog.env`
  before a deploy that restarts `blog` (see deploy.md).
- **Server SSH is key-auth only**; no password. Lost key → re-add pubkey via Aliyun console
  (Workbench / cloud-assistant RunCommand), see the `qoder-ecs-console-api-proxy` memory.
- **Shared working tree**: another agent may be editing the repo at the same time. `git status`
  first, `git add` explicit paths only, never `git add -A` or stash others' work.
- `pip` on the server may cache an old wheel and misreport the Python version requirement; if a
  deploy's pip step errors about `>=3.11`, `rm -rf /opt/blog/venv` and reinstall with
  `--no-cache-dir`.
