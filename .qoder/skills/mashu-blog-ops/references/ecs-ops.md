# ECS server operations

All via SSH key: `ssh root@120.26.177.214 '<cmd>'`. Password auth is disabled on the server, so
if the key ever stops working you must re-add the pubkey via the Aliyun console (Workbench /
cloud-assistant RunCommand), not by password.

## Services

| Unit | Runs | Notes |
|---|---|---|
| `blog` | uvicorn `:8000` (`User=blogd`) | the FastAPI backend; `EnvironmentFile=/etc/blog.env` |
| `nginx` | `:8080` | serves `web/dist` + proxies `/api`,`/uploads` → `:8000` |
| `cloudflared` | outbound tunnel | systemd connector → https://blog.mashutaba.best |

```bash
ssh root@120.26.177.214 'systemctl is-active blog nginx cloudflared'   # health (read-only)
ssh root@120.26.177.214 'systemctl restart blog'                        # restart backend
ssh root@120.26.177.214 'systemctl reload nginx'                        # apply nginx config (test first!)
ssh root@120.26.177.214 'nginx -t && systemctl reload nginx'            # ALWAYS test before reload
```

## Logs

```bash
ssh root@120.26.177.214 'journalctl -u blog -n 50 --no-pager'           # backend
ssh root@120.26.177.214 'journalctl -u blog --since "10 min ago"'
ssh root@120.26.177.214 'tail -n 50 /var/log/nginx/error.log'
ssh root@120.26.177.214 'journalctl -u cloudflared -n 20 --no-pager'    # tunnel
```
If `blog` is `activating`/`failed` after a deploy, it's almost always the env fail-fast
(`SECRET_KEY`/`ADMIN_PASSWORD`) — `journalctl -u blog` shows the RuntimeError.

## Secrets & config — `/etc/blog.env`

```
SECRET_KEY=<random hex>     # JWT signing; never default/empty
ADMIN_USER=admin
ADMIN_PASSWORD=<strong>     # used to CREATE admin on first boot only
BLOG_DIR=/srv/blog
```
- Edit it, then `systemctl restart blog`. Keep values out of chat/git.
- The plaintext prod password is also stored in the repo's gitignored `.env-local`.
- **Changing `ADMIN_PASSWORD` here does NOT change an existing admin's login** — the hash is set
  once at first boot. To reset the admin password, update the stored hash:
  ```bash
  ssh root@120.26.177.214 'set -a; . /etc/blog.env; set +a; cd /opt/blog/server && /opt/blog/venv/bin/python - <<PY
  from app.db import get_session
  from app import security
  from app.models import User
  import os
  with get_session() as s:
      u = s.query(User).filter_by(username=os.environ["ADMIN_USER"]).first()
      u.password_hash = security.hash_password(os.environ["ADMIN_PASSWORD"]); s.commit()
  print("admin password synced to /etc/blog.env")
  PY'
  ```
  (Set `ADMIN_PASSWORD` to the new value in `/etc/blog.env` first, then run this.)

## Data & backups

- Data lives in `/srv/blog/` (`blog.db` + `uploads/`), owned `blogd`, mode 750. Deploy never touches it.
- Weekly cron: `0 4 * * 0 /usr/local/bin/blog-backup.sh` → **`/root/blog-backups/blog-backup-YYYY-MM-DD.tgz`**
  (keeps 30 days). `deploy.sh` auto-pulls the newest to local `blog-backups/` after each deploy.
- The script source is `deploy/blog-backup.sh`, installed by `provision.sh`/`deploy.sh`. It runs
  `sqlite3 blog.db ".backup <tmp>"` first, then packs the snapshot + `uploads/` — never tar the live
  DB directly: with WAL, `blog.db` + `blog.db-wal` copied at different instants restore inconsistently.
- Manual backup now: `ssh root@120.26.177.214 '/usr/local/bin/blog-backup.sh'`
- List backups: `ssh root@120.26.177.214 'ls -la /root/blog-backups/'`
- Restore (careful — overwrites live data; back up first):
  ```bash
  ssh root@120.26.177.214 'systemctl stop blog && cp -a /srv/blog /srv/blog.pre-restore.$(date +%s) && tar xf /root/blog-backups/<file>.tgz -C / && systemctl start blog'
  ```
  Verify the exact tar layout of `blog-backup.sh` before restoring (it tars `/srv/blog`), so a
  restore path matches how it was packed.

## Security posture (already in place — keep, don't regress)

- Backend runs as unprivileged `blogd`; `/srv/blog` 750.
- Client IP: `deploy/blog.nginx` has a `map $remote_addr $client_ip` that trusts `CF-Connecting-IP`
  **only from loopback** (cloudflared) and otherwise uses the real peer address. Both `X-Real-IP`
  and `CF-Connecting-IP` are overwritten with it. Do not revert to `$remote_addr` blindly — under
  the tunnel every visitor arrives from 127.0.0.1, which would put them all in one rate-limit bucket
  and make one attacker's failed logins lock out everyone.
- Nginx sends `Referrer-Policy`, `Permissions-Policy`, and a **CSP in Report-Only** mode. When you
  confirm no violations in the report endpoint, tighten by renaming
  `Content-Security-Policy-Report-Only` → `Content-Security-Policy`. Caveat: `index.html` has an
  inline anti-flash theme `<script>`, so strict CSP needs `'unsafe-inline'` or a hash — test the
  dark-mode-no-flash behavior after tightening.
- Login is rate-limited (5 fails → 10 min lock). HTML posts are sanitized with DOMPurify on render.
- Image uploads: jpg/png/gif/webp only, ≤5 MB, random filenames.

## Firewall / Aliyun security group

- Only SSH and **8080** are opened in the security group (`sg-...`). The Cloudflare tunnel needs no
  inbound port (it's outbound). To change access, use the ECS console security-group rules (or the
  console API proxy — see the `qoder-ecs-console-api-proxy` memory).

## Migration off the trial box (~mid Dec 2026)

Trial ECS expires ~2026-12. Plan: spin a paid box (student ¥79/yr or e-instance ¥99/yr), run
`provision.sh` on it, restore the latest backup, `deploy.sh`, then move the Cloudflare tunnel
connector to the new host (re-run the tunnel steps there, or install cloudflared + copy the same
`/etc/cloudflared` creds/config). The domain stays on Cloudflare; no 备案 needed because the tunnel
is outbound.
