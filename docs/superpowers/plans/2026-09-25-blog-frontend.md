# 博客前端 实施计划（计划 B）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建博客 React 前端：读者端（首页/文章/标签/归档/搜索）+ 管理端（登录/文章编辑/图片库/API Key）。

**Architecture:** Vite + React 19 + TS + Tailwind + React Router 单页应用；统一 `api.ts` 封装 fetch；文章内容一律经 DOMPurify 二次消毒后 innerHTML（后端已消毒，此为纵深防御）；构建产物 `web/dist` 由 Nginx 静态托管。

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind CSS 3, react-router-dom 7, react-markdown + remark-gfm, DOMPurify, date-fns。

**Spec:** `docs/superpowers/specs/2026-09-25-blog-design.md`；后端 API 见计划 A（前缀 `/api/v1`）。

## Global Constraints

- Node.js ≥ 20（本机 v24 已满足）；依赖全部走 npm 官方源
- 任何来自服务器的 HTML（`post.rendered`）注入 DOM 前必须 `DOMPurify.sanitize()`
- 开发期 `npm run dev`，vite 代理 `/api`、`/uploads` → `http://127.0.0.1:8000`
- 界面文案中文；排版简洁衬线正文 + 无衬线标题，深浅自适应（Tailwind `dark:` 可选，不做主题切换器）
- 每个任务结束 `npm run build` 无 TS 错误并提交

## 文件结构（本计划产出）

```
web/
├─ index.html  vite.config.ts  tailwind.config.js  postcss.config.js  tsconfig.json
├─ src/
│  ├─ main.tsx  App.tsx  index.css
│  ├─ lib/api.ts            # fetch 封装 + 类型
│  ├─ components/Layout.tsx  PostCard.tsx  Rendered.tsx  MarkdownPreview.tsx
│  ├─ pages/Home.tsx  Post.tsx  TagPage.tsx  Archive.tsx  Search.tsx
│  └─ admin/Login.tsx  AdminLayout.tsx  PostList.tsx  Editor.tsx  Assets.tsx  Keys.tsx
```

---

### Task 1: 脚手架（Vite + Tailwind + Router 空壳可跑）

**Files:**
- Create: `web/`（脚手架生成）, `web/vite.config.ts`, `web/tailwind.config.js`, `web/postcss.config.js`, `web/src/index.css`, `web/src/App.tsx`, `web/src/main.tsx`

- [ ] **Step 1: 生成项目并装依赖**

```bash
cd "C:/Users/MZH/Desktop/个人博客"
npm create vite@latest web -- --template react-ts
cd web && npm i react-router-dom react-markdown remark-gfm dompurify date-fns \
  && npm i -D tailwindcss@3 postcss autoprefixer @tailwindcss/typography
```

- [ ] **Step 2: 配置**

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:8000", "/uploads": "http://127.0.0.1:8000" } },
});
```

`tailwind.config.js` + `postcss.config.js` 标准内容（tailwindcss/autoprefixer 插件，content 指 `./index.html` 与 `./src/**/*.{ts,tsx}`，启用 `@tailwindcss/typography`）。`src/index.css`：`@tailwind base; @tailwind components; @tailwind utilities;` 加 body 基础样式（`max-width` 内容容器由 Layout 负责）。

- [ ] **Step 3: 空壳 App**：`main.tsx` 用 `BrowserRouter` 包 `<App/>`；`App.tsx` 暂渲染 `<h1>blog</h1>`
- [ ] **Step 4: 验证** `npm run build` 无错误；`npm run dev` 打开 http://localhost:5173 可见
- [ ] **Step 5: Commit** `"chore(web): vite+tailwind+router 脚手架"`

---

### Task 2: API 客户端 + 消毒渲染组件 + 布局

**Files:**
- Create: `src/lib/api.ts`, `src/components/Rendered.tsx`, `src/components/Layout.tsx`, `src/components/PostCard.tsx`

**Interfaces:**
- Produces（后续所有页面依赖）:

```ts
// api.ts
export interface Tag { name: string; count: number }
export interface PostSummary { id: number; slug: string; title: string; kind: string; summary: string; published_at: string | null; created_at: string; tags: string[] }
export interface PostDetail extends PostSummary { body: string; rendered: string }
export interface Paged<T> { items: T[]; total: number; page: number; page_size: number }
export const api: {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  del(path: string): Promise<void>;
  upload(path: string, form: FormData): Promise<any>;
  login(u: string, p: string): Promise<void>;
  logout(): Promise<void>;
};
```

`Rendered.tsx`：`({ html }: { html: string }) => <div className="prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />`
`Layout.tsx`：顶栏（博客名链接 `/`、导航：首页/归档/搜索、右侧"管理"链接 `/admin`）+ `<Outlet/>` + 简单 footer。
`PostCard.tsx`：`(post: PostSummary) =>` 标题链接 `/post/{slug}`、日期（date-fns format `yyyy-MM-dd`）、摘要、标签徽章链接 `/tag/{name}`。

- [ ] **Step 1: 实现上述 4 个文件**（api 封装：`credentials: "same-origin"`、非 2xx 抛 `Error(await res.text())`、`FormData` 不设 Content-Type）
- [ ] **Step 2: 验证** `npm run build` 通过
- [ ] **Step 3: Commit** `"feat(web): api 客户端/消毒渲染/布局组件"`

---

### Task 3: 读者端五个页面

**Files:**
- Create: `src/pages/Home.tsx`, `Post.tsx`, `TagPage.tsx`, `Archive.tsx`, `Search.tsx`
- Modify: `src/App.tsx`（路由表）

- [ ] **Step 1: 实现**

- `Home`：`api.get<Paged<PostSummary>>("/api/v1/posts?page=" + n)`，PostCard 列表 + 上/下页按钮（total 算页数）
- `Post`：`/post/:slug` → `api.get<PostDetail>("/api/v1/posts/" + slug)`；标题/日期/标签 + `<Rendered html={post.rendered}/>`
- `TagPage`：`/tag/:name` → 复用 Home 逻辑加 `&tag=` 参数
- `Archive`：`api.get<{ym: string; posts: PostSummary[]}[]>("/api/v1/archive")` 按月分组列表
- `Search`：输入框 + `api.get<PostSummary[]>("/api/v1/search?q=")`，回车触发，结果显示标题/链接
- `App.tsx` 路由：`<Route element={<Layout/>}>` 下挂 `/`、`/post/:slug`、`/tag/:name`、`/archive`、`/search`，`/admin/*` 留 Task 5

- [ ] **Step 2: 联调验证**（后端 `uvicorn` 起在 8000；用 curl 建一篇发布文章后 `npm run dev` 逐页点验：列表、文章渲染含代码块、标签过滤、归档分组、搜索命中）
- [ ] **Step 3: Commit** `"feat(web): 读者端页面"`

---

### Task 4: 管理端登录 + 文章列表

**Files:**
- Create: `src/admin/Login.tsx`, `src/admin/AdminLayout.tsx`, `src/admin/PostList.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 实现**

- `Login`：用户名/密码表单 → `api.login`，成功 `navigate("/admin")`；401 显示"密码错误"、429 显示"尝试过多，10 分钟后再试"
- `AdminLayout`：调 `api.get("/api/v1/auth/me")`，401 则 `<Navigate to="/admin/login"/>`；侧栏链接：文章/图片/密钥 + 退出登录按钮（`api.logout` 后跳首页）
- `PostList`：`GET /api/v1/posts?all=1`（计划 A 已支持 admin 查询含草稿：`all=1` 且带 cookie 时返回全部状态）+ 状态徽章 + "编辑"链接 `/admin/post/:id` + "删除"（confirm 后 `api.del`）+ "新建"按钮 `/admin/post/new`
- 路由：`/admin/login`、`/admin`（AdminLayout 嵌 Outlet：index→PostList、`post/new`、`post/:id`、`assets`、`keys`）

- [ ] **Step 2: 验证**：登录→列表→删除一篇草稿
- [ ] **Step 3: Commit** `"feat(web): 管理端登录与文章列表"`

---

### Task 5: Markdown 编辑器（实时预览）

**Files:**
- Create: `src/admin/Editor.tsx`

- [ ] **Step 1: 实现**

表单字段：标题、slug（留空自动生成，提示占位）、kind 单选（Markdown / HTML）、tags（逗号分隔输入）、状态（草稿/发布）、正文 `<textarea>`。
md 模式右侧实时预览：`<ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>` 外包 `<div className="prose">`（react-markdown 默认不渲染 raw HTML，安全）；html 模式预览用 `<Rendered html={draft}/>`（DOMPurify 消毒）。
保存：新建 POST / 更新 PUT `/api/v1/posts/:id`，成功跳回列表。

- [ ] **Step 2: 验证**：写一篇含表格+代码块的 md 实时预览正确；发布后首页可见；编辑改状态为草稿后首页不可见
- [ ] **Step 3: Commit** `"feat(web): 编辑器与实时预览"`

---

### Task 6: 图片库 + API Key 页 + 端到端验收

**Files:**
- Create: `src/admin/Assets.tsx`, `src/admin/Keys.tsx`

- [ ] **Step 1: 实现**

- `Assets`：文件选择上传（`api.upload("/api/v1/assets", form)`），列表显示缩略图 + 可点击复制 `/uploads/xxx` 链接（编辑器里手动粘贴引用）
- `Keys`：创建（输入名字→POST，明文只显示一次并带复制按钮）、列表、吊销（DELETE）

- [ ] **Step 2: 端到端走查（spec 验收 1）**：登录→上传图片→编辑器引用→发布→首页文章显示图片→搜索命中→API 通道 `curl -H "X-API-Key: ..." -F file=@test.md http://127.0.0.1:8000/api/v1/import` 成功建文
- [ ] **Step 3: `npm run build` + 全量 pytest 回归，Commit** `"feat(web): 图片库与密钥管理; 端到端验收通过"`

---

### Task 7: 实机部署（阿里云试用 ECS）

**Files:**
- Modify: 无（执行 deploy 脚本）；如实机问题产生的小修改记录在 `deploy/README.md`

- [ ] **Step 1: 安全组**：用户在阿里云控制台放行入方向 TCP 8080（引导用户操作或经其同意用控制台完成）
- [ ] **Step 2: provision**：`export BLOG_HOST=root@120.26.177.214 && bash deploy/provision.sh`（需 root 密码，向用户索取）
- [ ] **Step 3: deploy**：`bash deploy/deploy.sh`
- [ ] **Step 4: 公网验收（spec 验收 5）**：`curl http://120.26.177.214:8080/api/v1/posts` 返回 JSON；浏览器打开首页、登录后台发文一篇，手机 4G 网络下可访问
- [ ] **Step 5: 备份 cron**：`ssh $BLOG_HOST "crontab -l | { cat; echo '0 4 * * 0 /root/backup.sh'; } | crontab -"` 并跑一次 `deploy/backup.sh` 验证
- [ ] **Step 6: Commit** `"chore: 部署至阿里云试用机并验收"`

---

## 验收对照（spec §10）

1. 本地全链路 → Task 3/5/6 Step 2；2. XSS 不执行 → 计划 A Task 5 测试 + `Rendered` 双保险；3. API 导入 → Task 6 Step 2；4. pytest 全绿 → 计划 A；5. 公网可访问 → Task 7。
