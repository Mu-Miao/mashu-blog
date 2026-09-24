#!/usr/bin/env bash
# 部署：本地构建前端 -> tar/ssh 上传后端+前端 -> 装依赖 -> 重启服务
# 用法：BLOG_HOST=root@120.26.177.214 bash deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BLOG_HOST:?需要 export BLOG_HOST=root@IP}"

if [ -d web ]; then
  (cd web && npm run build)
fi

ssh "$BLOG_HOST" "mkdir -p /opt/blog/server /var/www/blog && rm -rf /opt/blog/server/* /var/www/blog/*"
tar cf - -C server --exclude .venv --exclude .blogdata --exclude __pycache__ --exclude "*.egg-info" . \
  | ssh "$BLOG_HOST" "tar xf - -C /opt/blog/server"
if [ -d web/dist ]; then
  tar cf - -C web/dist . | ssh "$BLOG_HOST" "tar xf - -C /var/www/blog"
else
  echo "(no web/dist, backend-only)"
fi

ssh "$BLOG_HOST" "python3 -m venv /opt/blog/venv 2>/dev/null || true
/opt/blog/venv/bin/pip install -q -e /opt/blog/server
systemctl restart blog
systemctl is-active blog nginx"
echo "部署完成 -> http://${BLOG_HOST#root@}:8080"
