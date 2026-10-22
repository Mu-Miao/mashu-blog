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
COPYFILE_DISABLE=1 tar cf - -C server --exclude .venv --exclude .blogdata --exclude __pycache__ --exclude "*.egg-info" --exclude "._*" --exclude "pubtest*.py" --exclude "verify_e2e.py" . \
  | ssh "$BLOG_HOST" "tar xf - -C /opt/blog/server"
scp -q deploy/blog.nginx "$BLOG_HOST:/tmp/blog.nginx.new"
scp -q deploy/blog-backup.sh "$BLOG_HOST:/usr/local/bin/blog-backup.sh"
ssh "$BLOG_HOST" 'chmod +x /usr/local/bin/blog-backup.sh; mkdir -p /root/blog-backups'
if [ -d web/dist ]; then
  tar cf - -C web/dist . | ssh "$BLOG_HOST" "tar xf - -C /var/www/blog"
else
  echo "(no web/dist, backend-only)"
fi

ssh "$BLOG_HOST" "PY=\$(cat /opt/blog/python-bin 2>/dev/null || echo python3)
\$PY -m venv /opt/blog/venv 2>/dev/null || { \$PY -m ensurepip 2>/dev/null; \$PY -m venv /opt/blog/venv; }
/opt/blog/venv/bin/pip install -q -e /opt/blog/server
systemctl restart blog
if [ -d /etc/nginx/sites-enabled ]; then
  NGINX_TARGET=/etc/nginx/sites-available/blog
else
  NGINX_TARGET=/etc/nginx/conf.d/blog.conf
fi
[ -f \"\$NGINX_TARGET\" ] || { echo \"找不到现有 nginx 站点配置: \$NGINX_TARGET\" >&2; exit 1; }
cp \"\$NGINX_TARGET\" /tmp/blog.nginx.backup
cp /tmp/blog.nginx.new \"\$NGINX_TARGET\"
if ! nginx -t; then
  cp /tmp/blog.nginx.backup \"\$NGINX_TARGET\"
  nginx -t
  exit 1
fi
systemctl reload nginx
systemctl is-active blog nginx"

# 把服务器最新一份周备份回捞到本机，避免"机器没了备份一起没"
LATEST=$(ssh "$BLOG_HOST" 'ls -1t /root/blog-backups/*.tgz /root/blog-backups/*.tar.gz 2>/dev/null | head -1' || true)
if [ -n "$LATEST" ]; then
  mkdir -p blog-backups
  scp -q "$BLOG_HOST:$LATEST" blog-backups/ && echo "已回捞备份: blog-backups/$(basename "$LATEST")"
fi
echo "部署完成 -> http://${BLOG_HOST#root@}:8080"
