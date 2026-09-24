# 个人博客设计文档（mashu-blog）

日期：2026-09-25 状态：已确认
作者：与用户共同头脑风暴定稿

## 1. 目标与背景

用户（在校学生）要一个个人博客：自己写文章发布，支持上传 Markdown 和 HTML 两种格式，带网页管理后台和脚本上传 API，读者通过公网访问。

### 部署环境（已定）

- **服务器**：阿里云 ECS 个人免费试用（2核2G / 40G ESSD / 220GB流量/月 / 3个月，按量实例 ecs.e-c1m1.large），地域华东1-杭州
- **访问方式**：公网 IP 直连（如 `http://<IP>:8080`）。**不绑域名、不备案**——试用机不满足 ICP 备案要求，且 `.best` 域名本就无法备案
- 已有域名 mashutaba.best 托管在 Cloudflare Free，本期不使用，留作以后迁移
- **到期计划**：3 个月试用结束前迁移到付费机（学生 ¥79/年 或 e实例 ¥99/年），代码与数据用同一套部署脚本原样搬迁

### 非目标（本期不做）

- 评论系统（用户明确暂缓）
- HTTPS / 域名绑定 / 备案
- 多作者、国际化、主题系统
- 视频等大体量附件

## 2. 总体架构

单体后端 + 静态前端，一台服务器：

```
访客/作者 ──▶ 安全组/防火墙(8080) ──▶ Nginx
                                       ├─ /           → React 构建产物(dist 静态文件)
                                       ├─ /api/*      → uvicorn:8000 (FastAPI, systemd 管理)
                                       └─ /uploads/*  → 图片目录(静态)
数据：/srv/blog/blog.db (SQLite) + /srv/blog/uploads/
```

开发期在本地 Windows 跑同样的两端（Vite dev server 代理到 uvicorn），部署用脚本同步到服务器。

## 3. 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 后端 | Python 3.12 + FastAPI + SQLModel + SQLite | 单文件数据库，零运维 |
| 认证 | JWT（httpOnly cookie）+ API Key（SHA-256 哈希存储） | 单管理员 |
| Markdown | python-frontmatter 解析；渲染在前端完成 | react-markdown + remark-gfm |
| HTML 消毒 | **DOMPurify，所有渲染 HTML 的地方一律消毒**（前台文章页 + 后台预览） | 上传的 HTML 从不以原文直接 innerHTML，防存储型 XSS 偷管理员会话 |
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS + React Router | |
| 测试 | pytest + httpx（后端打真实接口）；前端以本地手工验证为主 | |
| 部署 | Nginx + systemd + bash 部署脚本（Git Bash 可执行） | |

## 4. 数据模型（SQLite）

- `users`：id, username, password_hash, created_at（仅一个管理员）
- `posts`：id, slug(唯一), title, kind(`md`|`html`), body(原文), summary, status(`draft`|`published`), published_at, created_at, updated_at
- `tags`：id, name(唯一)；`post_tags`：post_id, tag_id
- `assets`：id, filename(随机名), mime, size, created_at
- `api_keys`：id, name, key_hash, created_at, revoked_at(可空)
- `posts_fts`：FTS5 虚拟表（title + body），全文搜索用

## 5. API 设计（前缀 /api/v1）

公开：
- `GET /posts?page=&tag=` 分页列表（仅 published，返回摘要不含全文）
- `GET /posts/{slug}` 单篇
- `GET /tags` 标签及计数
- `GET /archive` 按年月归档
- `GET /search?q=` FTS5 全文搜索
- `GET /feed.xml` RSS（顺手项，成本低）

需登录（JWT cookie）：
- `POST /auth/login` / `POST /auth/logout`（登录限流：失败 5 次锁 10 分钟）
- `POST/PUT/DELETE /posts`（含草稿/发布切换；slug 冲突自动加后缀）
- `POST /assets` 图片上传；`GET /assets` 列表
- `GET/POST/DELETE /api-keys` 管理脚本通道密钥

API Key 通道（`X-API-Key` 头）：
- `POST /import`：multipart 上传 `.md`/`.html` 文件。`.md` 支持 YAML frontmatter（title/tags/date/status/slug），缺省自动推断；`.html` 取 `<title>` 为标题、正文入库

## 6. 前端页面

读者端：首页（列表+分页）、文章页（md 渲染 / html 消毒渲染，代码高亮）、标签页、归档页、搜索页。
管理端 `/admin`：登录页 → 文章列表（草稿/发布筛选）、编辑器（Markdown 实时预览、标签编辑、slug 自定义）、图片库、API Key 管理。

## 7. 安全

- 密码 bcrypt；会话 JWT httpOnly + SameSite=Lax，密钥存服务器 `.env`
- HTML 消毒后才渲染；Markdown 禁 raw HTML 注入；`<script>`/事件属性一律剥除
- 图片白名单 jpg/png/gif/webp + 5MB 上限 + 随机文件名（防路径穿越/防存储型 XSS via SVG 等）
- 服务器防火墙只开：SSH（改非标端口+密钥登录，禁密码）、8080
- Nginx 加基础安全头、gzip

## 8. 部署与运维

- `deploy/provision.sh`：新服务器一次性初始化（装 Nginx/Python/systemd 服务、建 /srv/blog）
- `deploy/deploy.sh`：本地构建前端 → rsync 上传 dist+server → 重启服务
- `deploy/blog.nginx`、`blog.service`、`backup.sh`（tar 打包 blog.db + uploads，cron 每周）
- 迁移到新机器 = 新机器跑 provision + 恢复备份 + deploy，一次完成

## 9. 仓库结构

```
个人博客/
├─ server/        # FastAPI 应用 (app/ + tests/ + pyproject.toml)
├─ web/           # React 前端 (src/ + dist 构建产物不入库)
├─ deploy/        # nginx/systemd/脚本
├─ docs/specs/    # 本设计文档
└─ .env.example
```

## 10. 验收标准

1. 本地 `uvicorn` + `npm run dev` 可完整走通：登录→建 Markdown 文章→发布→首页可见→搜索命中
2. 上传 `.html` 文件（含 `<script>alert(1)</script>`）后，前台渲染不执行脚本
3. `curl -H "X-API-Key: ..." -F file=@post.md /api/v1/import` 成功建文
4. pytest 全绿（认证、消毒入库、上传校验、搜索、导入）
5. 部署到试用 ECS 后，公网 IP:8080 可访问并完成上述流程
