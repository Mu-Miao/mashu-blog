#!/usr/bin/env bash
# 一键：初始化 + 部署 + 冒烟验收。用法：BLOG_HOST=root@IP bash deploy/go.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BLOG_HOST:?需要 export BLOG_HOST=root@IP}"
IP="${BLOG_HOST#root@}"

bash deploy/provision.sh
bash deploy/deploy.sh
sleep 3

echo "--- 冒烟验收 ---"
ssh "$BLOG_HOST" "python3 -c \"
import urllib.request as u
ok = True
for name, path in [('api','/api/v1/posts'), ('front','/'), ('spa','/post/x')]:
    try:
        s = u.urlopen('http://127.0.0.1:8080'+path).status
        print(name, s); ok = ok and s == 200
    except Exception as e:
        print(name, 'FAIL', e); ok = False
print('SMOKE:', 'PASS' if ok else 'FAIL')
\""
echo "外网检查: http://$IP:8080 （若不通，检查安全组 8080）"
curl -s -o /dev/null -m 8 -w "本机访问公网 8080: %{http_code}\n" "http://$IP:8080/api/v1/posts" || echo "本机访问公网 8080: 不通（安全组未放行？）"
