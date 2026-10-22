#!/usr/bin/env bash
# 服务器端备份：先对 SQLite 做一致性快照（WAL 安全），再连同图片打包。
# 安装到 /usr/local/bin/blog-backup.sh，由 cron 每周调用。
set -euo pipefail
SRC=${BLOG_DIR:-/srv/blog}
DEST=/root/blog-backups
DATE=$(date +%F)
OUT="$DEST/blog-backup-$DATE.tgz"

mkdir -p "$DEST"
TMP=$(mktemp -d /root/blog-backup.XXXXXX)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/blog"

if [ -f "$SRC/blog.db" ]; then
  # .backup 读取的是完整已提交状态，不会出现 db/-wal 不一致
  sqlite3 "$SRC/blog.db" ".backup '$TMP/blog/blog.db'"
fi
if [ -d "$SRC/uploads" ]; then
  cp -a "$SRC/uploads" "$TMP/blog/uploads"
fi

tar czf "$OUT" -C "$TMP" blog
find "$DEST" -name 'blog-backup-*.tgz' -mtime +30 -delete
echo "backup: $OUT"