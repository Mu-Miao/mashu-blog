# ops-secrets — encrypted backup of this blog's secrets

`secrets.enc` is an **AES-256 (openssl, PBKDF2, 200k iters)** encrypted tarball containing the
credentials needed to operate the blog from a new machine:

| File inside | What it is |
|---|---|
| `blog.env` | prod `/etc/blog.env` — SECRET_KEY, ADMIN_USER, ADMIN_PASSWORD, BLOG_DIR |
| `tunnel-<id>.json` | Cloudflare named-tunnel credentials (recreate/move the tunnel) |
| `cert.pem` | `cloudflared tunnel login` origin cert (CF API admin ops) |
| `id_ed25519` / `.pub` | the SSH private key that the ECS `authorized_keys` trusts |

## The passphrase is NOT in this repo
It lives only on the original machine at `ops-secrets/PASSPHRASE-DO-NOT-COMMIT.txt`
(gitignored). **Copy it into a password manager now** and delete that file. Without it the bundle is
unreadable — and that's the point. If you lose it, you must rotate every secret instead.

## Decrypt (on a new machine)

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in secrets.enc -out secrets.tar.gz -pass file:./PASSPHRASE-DO-NOT-COMMIT.txt   # or: -pass pass:<YOUR_PASSPHRASE>
tar xzf secrets.tar.gz && rm secrets.tar.gz
```

Then wire it up:
```bash
# SSH key: use it to reach the ECS (or better, generate a fresh keypair and add its pubkey to the server)
install -m600 id_ed25519 ~/.ssh/mashu_blog_key
ssh -i ~/.ssh/mashu_blog_key root@120.26.177.214 'echo ok'

# Cloudflare tunnel creds (only needed to recreate/move the tunnel)
mkdir -p ~/.cloudflared && cp cert.pem tunnel-*.json ~/.cloudflared/

# Prod env is already on the server at /etc/blog.env; blog.env here is your off-server copy
```

## Re-encrypt after rotating any secret
```bash
tar czf - -C <dir-with-fresh-files> . | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -out secrets.enc -pass file:./PASSPHRASE-DO-NOT-COMMIT.txt
```

## Security notes
- This repo MUST stay **private**. The bundle is only as safe as its passphrase — keep that out of
  the repo, chat, and screenshots.
- Prefer rotating over leaking: if the passphrase or bundle may be compromised, change the admin
  password + SECRET_KEY on the server, re-run `cloudflared tunnel login`, and re-encrypt.
- The SSH private key is included for convenience; the cleaner pattern is to generate a NEW keypair
  per machine and add its pubkey to the server (see the ops skill's `new-machine.md`), then remove
  this one from the bundle.
