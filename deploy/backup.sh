#!/usr/bin/env bash
# 触发服务器端备份并把最新一份回捞到本地 backups/。可放进 crontab。
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BLOG_HOST:?需要 export BLOG_HOST=root@IP}"
mkdir -p backups
D=$(date +%F)
ssh "$BLOG_HOST" '/usr/local/bin/blog-backup.sh'
scp "$BLOG_HOST:/root/blog-backups/blog-backup-$D.tgz" backups/
echo "备份: backups/blog-backup-$D.tgz"
