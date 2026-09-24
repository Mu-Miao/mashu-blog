# 马叔塔巴的个人博客

FastAPI + React + SQLite 个人博客，支持 Markdown/HTML 文章、网页后台与 API Key 脚本双通道上传、全文搜索、图片库。

## 本地开发

```bash
# 后端（端口 8000）
cd server && py -3.13 -m venv .venv && .venv/Scripts/python -m pip install -e ".[dev]"
BLOG_DIR=./.blogdata ADMIN_PASSWORD=*** .venv/Scripts/python -m uvicorn app.main:app --port 8000

# 前端（端口 5173，已代理 /api 与 /uploads）
cd web && npm i && npm run dev
```

测试：`cd server && .venv/Scripts/python -m pytest`

## 部署（阿里云 ECS，IP 直连 :8080）

前置（控制台操作）：
1. 实例 root 密码已设置（ECS → 实例 → 更多 → 账号/密码 → 重置实例密码，需重启生效）
2. 安全组入方向放行 TCP 8080（0.0.0.0/0）

```bash
export BLOG_HOST=root@120.26.177.214
bash deploy/provision.sh   # 一次性：装 nginx/systemd/生成 /etc/blog.env（会提示设后台密码）
bash deploy/deploy.sh      # 日常：构建前端 + rsync + 重启服务
bash deploy/backup.sh      # 备份 blog.db + uploads 到 backups/
```

上线地址：`http://120.26.177.214:8080`，后台 `/admin/login`。

## 脚本上传文章

后台「API 密钥」页生成密钥后：

```bash
curl -H "X-API-Key: <密钥>" -F file=@我的文章.md http://120.26.177.214:8080/api/v1/import
```

`.md` 支持 YAML frontmatter（title/tags/date/status/slug），`.html` 自动取 `<title>` 并消毒正文。

## 文档

- 设计：`docs/superpowers/specs/2026-09-25-blog-design.md`
- 实施计划：`docs/superpowers/plans/`
- 试用机约 2026-12-25 到期，届时迁移付费机：新机执行 provision + 恢复备份 + deploy 即可
