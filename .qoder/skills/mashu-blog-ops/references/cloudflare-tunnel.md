# Cloudflare named tunnel (HTTPS)

Why: **WebGPU only runs in a secure context** (HTTPS or localhost). The plain
`http://120.26.177.214:8080` origin has `navigator.gpu === undefined`, so the homepage hero falls
back to the 2D `WavesCanvas`. Putting the site behind **https://blog.mashutaba.best** via a
Cloudflare tunnel restores the full WebGPU `ShapeWaves`. A named tunnel is outbound-only: no
inbound ports, no ICP 备案, no paid plan, no Zero Trust dashboard needed.

## Current setup (already live)

- Domain `mashutaba.best` on Cloudflare (nameservers `elliot`/`teresa.ns.cloudflare.com`).
- Named tunnel `mashu-blog`, id `629234d0-b400-4c0b-a728-db1dddb6d538`.
- Connector runs on the **ECS** as systemd `cloudflared`, reading:
  - `/etc/cloudflared/config.yml` → ingress `blog.mashutaba.best` → `http://localhost:8080`
    (the nginx site, so static + `/api` both flow), catch-all `http_status:404`.
  - `/etc/cloudflared/<id>.json` → tunnel credentials (SECRET — never commit/echo).
- DNS: `blog.mashutaba.best` proxied CNAME → tunnel (added by `tunnel route dns`).

## Day-2 ops (read-only / safe)

```bash
ssh root@120.26.177.214 'systemctl is-active cloudflared; journalctl -u cloudflared -n 15 --no-pager'
```
"Registered tunnel connection" ×4 = healthy. If down: `ssh root@120.26.177.214 'systemctl restart cloudflared'`.

## Local cloudflared + the proxy (IMPORTANT)

`cloudflared` admin commands and downloads from this machine must go through the user's local
proxy (Clash Verge). Any `cloudflared`/`curl` to GitHub/Cloudflare needs:
```bash
export HTTPS_PROXY=http://127.0.0.1:7897 HTTP_PROXY=http://127.0.0.1:7897
```
(7897 is the current mixed port; if it fails, probe 7890/10809. `curl` also accepts `-x`.)
The Hangzhou ECS itself has very slow/flaky access to GitHub — **don't download cloudflared on the
ECS**; download the Linux binary locally through the proxy and `scp` it up (see below).

## Recreate from scratch (e.g. new server, or cert expired)

1. **Login** (interactive — the user clicks Authorize in their browser). Run in background, capture
   the URL from its log, hand it to the user:
   ```bash
   cd "C:\Users\MZH\Desktop\个人博客"
   HTTPS_PROXY=http://127.0.0.1:7897 ./tools/cloudflared.exe tunnel login   # writes ~/.cloudflared/cert.pem
   ```
   The command prints a `https://dash.cloudflare.com/argotunnel?...callback=...` URL; the user opens
   it and Authorizes. cert.pem lands in `C:\Users\MZH\.cloudflared\cert.pem`.
2. **Create tunnel + route DNS** (local, via proxy):
   ```bash
   export HTTPS_PROXY=http://127.0.0.1:7897
   ./tools/cloudflared.exe tunnel create mashu-blog            # prints <id>, writes <id>.json
   ./tools/cloudflared.exe tunnel route dns mashu-blog blog.mashutaba.best
   ```
3. **Install the connector on the ECS.** Get the Linux binary (local download via proxy → scp):
   ```bash
   curl -x http://127.0.0.1:7897 -sL -o /tmp/cf \
     https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   scp /tmp/cf root@120.26.177.214:/usr/local/bin/cloudflared
   ssh root@120.26.177.214 'chmod +x /usr/local/bin/cloudflared'
   ```
4. **Copy creds + write config on the ECS:**
   ```bash
   TID=<id>
   ssh root@120.26.177.214 "mkdir -p /etc/cloudflared"
   scp "$HOME/.cloudflared/$TID.json" root@120.26.177.214:/etc/cloudflared/$TID.json
   ssh root@120.26.177.214 "cat > /etc/cloudflared/config.yml <<'EOF'
   tunnel: $TID
   credentials-file: /etc/cloudflared/$TID.json
   ingress:
     - hostname: blog.mashutaba.best
       service: http://localhost:8080
     - service: http_status:404
   EOF"
   ```
5. **Install + start the systemd service:**
   ```bash
   ssh root@120.26.177.214 'cloudflared service install && systemctl enable --now cloudflared'
   ```
6. **Verify:** `curl -sI https://blog.mashutaba.best/` → 200; open in Edge/Chrome and confirm the
   hero uses `ShapeWaves` (`'gpu' in navigator` true, `.shape-waves` present).

## Gotchas

- `config.yml` ingress order matters: specific hostnames first, catch-all `http_status:404` last.
- The connector must run where the origin lives (the ECS), so it can reach `localhost:8080`.
- Cloudflare free + a mainland-China origin means visitors may see extra latency; acceptable for a
  personal blog. If it's too slow, options are a CF plan with China network (paid) or a closer host.
- Rotating the tunnel credentials = delete the tunnel in CF and redo steps 2–5.
- The temp `xxx.trycloudflare.com` quick tunnel (`cloudflared tunnel --url ...`) is for throwaway
  previews only — URL changes every restart; don't use it as the real entry.
