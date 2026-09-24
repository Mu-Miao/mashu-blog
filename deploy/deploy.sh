#!/usr/bin/env bash
# 部署：本地构建前端 -> rsync 后端+前端 -> 装依赖 -> 重启服务
# 用法：BLOG_HOST=root@120.26.177.214 bash deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BLOG_HOST:?需要 export BLOG_HOST=root@IP}"

if [ -d web ]; then
  (cd web && npm run build)
fi

rsync -az --delete --exclude .venv --exclude .blogdata --exclude __pycache__ --exclude "*.egg-info" server/ "$BLOG_HOST:/opt/blog/server/"
[ -d web/dist ] && rsync -az --delete web/dist/ "$BLOG_HOST:/var/www/blog/"

ssh "$BLOG_HOST" "python3 -m venv /opt/blog/venv 2>/dev/null || true
/opt/blog/venv/bin/pip install -q -e /opt/blog/server
systemctl restart blog
systemctl is-active blog nginx"
echo "部署完成 -> http://${BLOG_HOST#root@}:8080"
