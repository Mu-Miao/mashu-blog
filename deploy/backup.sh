#!/usr/bin/env bash
# 备份数据库与图片到本地 backups/。可放进 crontab。
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BLOG_HOST:?需要 export BLOG_HOST=root@IP}"
mkdir -p backups
D=$(date +%F)
ssh "$BLOG_HOST" "tar czf /root/blog-backup-$D.tgz -C /srv blog"
scp "$BLOG_HOST:/root/blog-backup-$D.tgz" backups/
ssh "$BLOG_HOST" "find /root -name 'blog-backup-*.tgz' -mtime +14 -delete"
echo "备份: backups/blog-backup-$D.tgz"
