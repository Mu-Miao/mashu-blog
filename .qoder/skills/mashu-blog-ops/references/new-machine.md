# Onboarding a new machine / agent

This skill carries the *know-how*. This file lists the per-machine things it **cannot** carry —
the gates you must clear before another computer (or another agent on it) can operate the blog.

## Gate 0 — get the code (now on GitHub)
- The repo is pushed to a **private GitHub remote**: `origin = https://github.com/Mu-Miao/mashu-blog.git`
  (branch `master`). On a new machine: `git clone https://github.com/Mu-Miao/mashu-blog.git`
  (needs your GitHub login / PAT / SSH key on that account). Keep pushing here — it's the offsite
  backup (the trial ECS dies ~Dec 2026).
- `.gitignore` deliberately excludes: `.env`, `.env-local`, `*.db`, `.blogdata/`, `blog-backups/`,
  `tools/` (the cloudflared binary), `.tmp/`, `node_modules/`, `.venv/`, `web/dist/`. So a fresh clone gives
  you **source only** — no secrets, no data, no cloudflared. That's by design; expect to rebuild
  those (below).

## Gate 1 — SSH access (the real gate)
- The server accepts **public-key auth only** (password auth is off). A new machine's key is not in
  `/root/.ssh/authorized_keys`, so you literally cannot SSH/deploy until it's added.
- Chicken-and-egg: you can't SSH to add the key. Use the **Aliyun ECS console** (Workbench terminal,
  or Cloud Assistant `RunCommand`) to append the new public key. Steps:
  1. On the new machine: `ssh-keygen -t ed25519 -C "blog-ops"` → prints a `id_ed25519.pub`.
  2. Console → Cloud Assistant → RunCommand (as root), append that pubkey:
     `mkdir -p /root/.ssh && echo '<NEW_PUBKEY>' >> /root/.ssh/authorized_keys`
  3. Verify: `ssh root@120.26.177.214 'echo ok'`.
- Keep exactly one or two authorized keys; remove old ones when a machine is retired.

## Gate 2 — secrets that are NOT in the repo
- **Prod admin password**: read it from the server once you have SSH — `grep ADMIN_PASSWORD /etc/blog.env`
  (Qoder may mask it in output; view it in a console session). Don't rely on `.env-local` — it lives
  only on the original machine.
- **Local dev admin**: just set `ADMIN_PASSWORD=blog123456` in your local env; it's throwaway.
- **Cloudflare**: for day-to-day tunnel ops you don't need local creds (the connector + creds live on
  the ECS). Only to *recreate* the tunnel do you run `cloudflared tunnel login` on the new machine
  (interactive Authorize). See cloudflare-tunnel.md.

## Gate 3 — tooling to reinstall
- Install: Git, Node 20+, Python 3.10+ (server runs 3.10; local dev used `py -3.13`).
- `cd web && npm install`
- `cd server && python -m venv .venv && .venv/Scripts/python -m pip install -e ".[dev]"`  (Windows;
  on Linux use `.venv/bin/python`)
- **cloudflared**: not in the repo. Download the binary for your OS (see cloudflare-tunnel.md). Put
  it wherever; the skill's `tools/cloudflared.exe` path is just the original machine's location.

## Gate 4 — network / proxy
- If GitHub/Cloudflare are slow from the new machine, find its proxy port (the original machine uses
  Clash Verge at `127.0.0.1:7897`) and `export HTTPS_PROXY=http://127.0.0.1:<port>` for those
  commands. Without a proxy, downloads may just work — test first.

## After Gates 0–4
Everything else in this skill (deploy, restart, logs, backups/restore, tunnel, frontend dev) works
unchanged — it's all driven through SSH + the repo, which the gates just enabled.

## Path note
This skill mentions `C:\Users\MZH\Desktop\个人博客` as the repo root. On another machine, substitute
your actual clone location — it's the directory containing `web/`, `server/`, `deploy/`, `tools/`.

## Security note
Do NOT commit `.env-local`, the tunnel credentials json, or `cert.pem` to make them "portable". If a
new machine needs a secret, transfer it out-of-band (password manager / console) or re-derive it
(re-login cloudflared, read /etc/blog.env over SSH). A leaked repo must never carry prod access.
