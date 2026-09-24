#!/usr/bin/env bash
# 新服务器一次性初始化。用法：BLOG_HOST=root@120.26.177.214 bash deploy/provision.sh
set -euo pipefail
: "${BLOG_HOST:?需要 export BLOG_HOST=root@IP}"

ssh "$BLOG_HOST" "apt-get update && apt-get -y install nginx python3-venv rsync openssl"
ssh "$BLOG_HOST" "mkdir -p /opt/blog /var/www/blog /srv/blog"
scp deploy/blog.service "$BLOG_HOST:/etc/systemd/system/blog.service"
scp deploy/blog.nginx "$BLOG_HOST:/etc/nginx/sites-available/blog"
ssh "$BLOG_HOST" "ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog; rm -f /etc/nginx/sites-enabled/default; nginx -t && systemctl reload nginx; systemctl daemon-reload; systemctl enable blog"

# 生成环境变量（已存在则不覆盖）
if ! ssh "$BLOG_HOST" "test -f /etc/blog.env"; then
  read -rsp "设置博主后台 admin 密码: " ADMIN_PASSWORD; echo
  ssh "$BLOG_HOST" "umask 077; cat > /etc/blog.env" <<EOF
SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')
BLOG_DIR=/srv/blog
ADMIN_USER=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF
fi
echo "provision 完成。记得在阿里云安全组放行 TCP 8080 入方向。"
