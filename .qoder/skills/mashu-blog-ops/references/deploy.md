# Build & deploy to ECS

Production: Aliyun ECS `root@120.26.177.214` (Ubuntu 22.04), SSH key auth only
(`~/.ssh/id_ed25519` is in the server's `/root/.ssh/authorized_keys`).

## Before you deploy — safety check (do this every time)

The backend **fails fast** on boot if `SECRET_KEY`/`ADMIN_PASSWORD` are missing or equal the weak
defaults (`dev-secret` / `admin123`). A deploy restarts `blog`, so a bad `/etc/blog.env` takes the
site down. Verify first (this prints only YES/NO, never the secret):
```bash
ssh root@120.26.177.214 'awk -F= "/^SECRET_KEY=/{print \"SECRET_KEY ok:\", (\$2!=\"\" && \$2!=\"dev-secret\")?\"YES\":\"NO\"} /^ADMIN_PASSWORD=/{print \"ADMIN_PASSWORD ok:\", (\$2!=\"\" && \$2!=\"admin123\")?\"YES\":\"NO\"}" /etc/blog.env; systemctl is-active blog nginx cloudflared'
```
All three must be `active` and both checks `YES`. Also check the working tree so you don't sweep
someone else's uncommitted work into the deploy:
```bash
cd "C:\Users\MZH\Desktop\个人博客" && git status --short
```
If another agent has uncommitted changes you don't want to ship, commit only your own files by
explicit path (`git add <files>`) — a plain `git add -A`/`deploy.sh` carries the whole tree.

## Full deploy (frontend + backend)

```bash
cd "C:\Users\MZH\Desktop\个人博客"
BLOG_HOST=root@120.26.177.214 bash deploy/deploy.sh
```
What `deploy/deploy.sh` does:
1. `cd web && npm run build` → `web/dist`.
2. `ssh` `rm -rf /opt/blog/server/* /var/www/blog/*` (wipes remote app + static).
3. tar `server/` (excludes `.venv`, `.blogdata`, `__pycache__`, `*.egg-info`) → `/opt/blog/server`.
4. tar `web/dist` → `/var/www/blog`.
5. recreate venv, `pip install -e /opt/blog/server`, `systemctl restart blog`, check `is-active`.
6. auto-pull the newest `/root/blog-backups/*.tgz` back to local `blog-backups/`.

Data (`/srv/blog/blog.db`, `uploads/`) is **not** touched by deploy — it lives outside `/opt`.

## Frontend-only push (no backend change, no service restart)

Safer + faster when only UI changed. Push just the built static to nginx's web root:
```bash
cd "C:\Users\MZH\Desktop\个人博客/web" && npm run build
tar cf - -C dist . | ssh root@120.26.177.214 'rm -rf /var/www/blog/* && tar xf - -C /var/www/blog'
```
Nginx serves static directly — no restart needed. (Or run the full `deploy.sh`; it's idempotent.)

## Smoke test after deploy

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://blog.mashutaba.best/            # expect 200
curl -s https://blog.mashutaba.best/api/v1/posts | head -c 120                   # JSON items
curl -s -D - -o /dev/null https://blog.mashutaba.best/ | grep -i content-security # headers live
```
Then load the homepage in a real browser (Edge/Chrome) and confirm the hero animates.

## Provision a fresh server (first-time / migration)

```bash
BLOG_HOST=root@<new-ip> bash deploy/provision.sh   # installs nginx/python, /srv/blog, /etc/blog.env (prompts for admin pw), systemd units
BLOG_HOST=root@<new-ip> bash deploy/deploy.sh
```
`deploy/go.sh` = provision + deploy + smoke in one shot. Migration to a paid server = provision on
the new box + restore the latest backup (see ecs-ops) + deploy. Re-point the Cloudflare tunnel's
connector to the new box (see cloudflare-tunnel.md).

## Rollback

There's no per-deploy version pin; rollback = redeploy the previous commit's tree, or restore a
backup (`ecs-ops.md`). Because deploy wipes `/opt/blog/server` from the local tree, keep the local
repo at the known-good commit before deploying.
