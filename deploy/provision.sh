#!/usr/bin/env bash
# 新服务器一次性初始化（兼容 Debian/Ubuntu 与 Alibaba Cloud Linux/CentOS）。
# 用法：BLOG_HOST=root@120.26.177.214 bash deploy/provision.sh
set -euo pipefail
: "${BLOG_HOST:?需要 export BLOG_HOST=root@IP}"

ssh "$BLOG_HOST" 'set -e
if command -v apt-get >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq nginx python3-venv openssl dos2unix sqlite3
elif command -v dnf >/dev/null; then
  dnf -y -q install nginx openssl dos2unix sqlite || dnf -y -q install nginx openssl sqlite3
  dnf -y -q install python3.11 2>/dev/null || true
else
  echo "未知包管理器" >&2; exit 1
fi
mkdir -p /opt/blog /var/www/blog /srv/blog
id -u blogd >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin blogd
chown -R blogd:blogd /srv/blog
chmod 750 /srv/blog
PYBIN=""
for c in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v $c >/dev/null && $c -c "import sys; sys.exit(0 if sys.version_info>=(3,10) else 1)"; then PYBIN=$c; break; fi
done
[ -n "$PYBIN" ] || { echo "需要 Python>=3.10" >&2; exit 1; }
echo "$PYBIN" > /opt/blog/python-bin
echo "provision base ok: $PYBIN"'

scp deploy/blog.service "$BLOG_HOST:/etc/systemd/system/blog.service"
scp deploy/blog.nginx "$BLOG_HOST:/tmp/blog.nginx"
scp deploy/blog-backup.sh "$BLOG_HOST:/usr/local/bin/blog-backup.sh"
ssh "$BLOG_HOST" 'chmod +x /usr/local/bin/blog-backup.sh
mkdir -p /root/blog-backups
crontab -l 2>/dev/null | grep -q "/usr/local/bin/blog-backup.sh" || {
  { crontab -l 2>/dev/null; echo "0 4 * * 0 /usr/local/bin/blog-backup.sh"; } | crontab -
}'
ssh "$BLOG_HOST" 'set -e
if [ -d /etc/nginx/sites-enabled ]; then
  mkdir -p /etc/nginx/sites-available
  cp /tmp/blog.nginx /etc/nginx/sites-available/blog
  ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
  rm -f /etc/nginx/sites-enabled/default
else
  cp /tmp/blog.nginx /etc/nginx/conf.d/blog.conf
fi
dos2unix /etc/systemd/system/blog.service /tmp/blog.nginx /etc/nginx/sites-available/blog /etc/nginx/conf.d/blog.conf 2>/dev/null || true
nginx -t && systemctl restart nginx
systemctl daemon-reload
systemctl enable blog
if command -v getenforce >/dev/null && [ "$(getenforce)" = "Enforcing" ]; then
  setsebool -P httpd_can_network_connect 1 || true
  semanage port -a -t http_port_t -p tcp 8080 2>/dev/null || true
fi
if command -v firewall-cmd >/dev/null && firewall-cmd --state >/dev/null 2>&1; then
  firewall-cmd --permanent --add-port=8080/tcp && firewall-cmd --reload && echo "firewalld 放行 8080"
elif command -v ufw >/dev/null && ufw status | grep -q active; then
  ufw allow 8080/tcp && echo "ufw 放行 8080"
fi'

if ! ssh "$BLOG_HOST" "test -f /etc/blog.env"; then
  read -rsp "设置博主后台 admin 密码: " ADMIN_PASSWORD; echo
  ssh "$BLOG_HOST" "umask 077; cat > /etc/blog.env" <<EOF
SECRET_KEY=$(head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')
BLOG_DIR=/srv/blog
ADMIN_USER=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
# 入口切到 HTTPS 后改为 1，否则 HTTP 下登录 Cookie 不会下发
COOKIE_SECURE=0
EOF
fi
echo "provision 完成。记得在安全组放行 TCP 8080 入方向。"
