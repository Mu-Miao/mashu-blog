#!/usr/bin/env bash
# 把 mashutaba.best 接到本机博客（Cloudflare 命名隧道，全免费）。
# 前置（只需一次浏览器点击）：./tools/cloudflared.exe tunnel login
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
  echo "先执行: ./tools/cloudflared.exe tunnel login  （浏览器里登录 Cloudflare 并点 Authorize，你的域名本来就在 CF）"
  exit 1
fi

./tools/cloudflared.exe tunnel create mashu-blog 2>/dev/null || true
CRED=$(ls "$HOME/.cloudflared/"*.json | head -1)
TUNNEL_ID=$(basename "$CRED" .json)

cat > "$HOME/.cloudflared/config.yml" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $CRED
ingress:
  - hostname: mashutaba.best
    service: http://127.0.0.1:8000
  - hostname: blog.mashutaba.best
    service: http://127.0.0.1:8000
  - service: http_status:404
EOF

./tools/cloudflared.exe tunnel route dns mashu-blog mashutaba.best 2>/dev/null || true
./tools/cloudflared.exe tunnel route dns mashu-blog blog.mashutaba.best 2>/dev/null || true

echo "配置完成。保持两件事运行即可用 https://mashutaba.best 访问："
echo "  1) 8000 端口的 FastAPI（本地预览或 ECS 隧道版）"
echo "  2) ./tools/cloudflared.exe tunnel run mashu-blog"
