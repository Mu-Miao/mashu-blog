import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, NavLink, Navigate, Outlet, useNavigate, useParams } from "react-router-dom";
import { ApiError, api, type PostDetail, type Paged } from "../lib/api";
import Rendered from "../components/Rendered";

export function Login() {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await api.login(u, p); nav("/admin"); }
    catch (x) {
      setErr(x instanceof ApiError && x.status === 429 ? "尝试过多，10 分钟后再试" : "用户名或密码错误");
    } finally { setBusy(false); }
  }
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col px-5 pt-32 pb-20">
      <div className="surface p-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#3a3a3c] to-[#1d1d1f] text-2xl font-semibold text-white shadow-lift dark:from-[#5e5ce6] dark:to-[#30d158]">
            麻
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight dark:text-white">博主登录</h1>
          <p className="mt-1 text-sm text-ink-faint dark:text-white/40">管理你的文章与媒体</p>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-3">
          <input value={u} onChange={(e) => setU(e.target.value)} placeholder="用户名" className="field" autoComplete="username" />
          <input type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="密码" className="field" autoComplete="current-password" />
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button className="btn-primary w-full !py-2.5" disabled={busy}>
            {busy ? "登录中…" : "登录"}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-xs text-ink-faint dark:text-white/40">
        <Link to="/" className="text-accent-link hover:underline dark:text-sky-400">← 返回博客首页</Link>
      </p>
    </div>
  );
}

const tab = "pill px-4 py-1.5 text-sm text-ink-soft transition hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10";
const tabActive = "bg-ink text-white font-medium dark:bg-white dark:text-ink";

export function AdminShell() {
  const [me, setMe] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    api.get<{ username: string }>("/auth/me").then((r) => setMe(r.username))
      .catch(() => setMe(null));
  }, []);
  if (me === undefined)
    return (
      <div className="mx-auto max-w-3xl px-5 py-24">
        <div className="h-5 w-40 animate-pulse rounded-lg bg-black/[0.06] mx-auto" />
      </div>
    );
  if (me === null) return <Navigate to="/admin/login" replace />;
  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-24 pb-10">
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <NavLink to="/admin" className={({ isActive }) => `${tab} ${isActive ? tabActive : ""}`} end>
          文章
        </NavLink>
        <NavLink to="/admin/assets" className={({ isActive }) => `${tab} ${isActive ? tabActive : ""}`}>
          图片
        </NavLink>
        <NavLink to="/admin/keys" className={({ isActive }) => `${tab} ${isActive ? tabActive : ""}`}>
          API 密钥
        </NavLink>
        <span className="ml-auto text-xs text-ink-faint dark:text-white/40">你好，{me}</span>
        <button className="btn-ghost !px-3 !py-1 text-xs" onClick={async () => { await api.logout(); location.href = "/"; }}>
          退出
        </button>
      </div>
      <div className="surface p-6 sm:p-8">
        <Outlet />
      </div>
    </div>
  );
}

export function PostList() {
  const [data, setData] = useState<Paged<PostDetail> | null>(null);
  const load = () => api.get<Paged<PostDetail>>("/posts?all=1&size=50").then(setData);
  useEffect(() => { load(); }, []);
  if (!data)
    return <div className="h-40 animate-pulse rounded-card bg-black/[0.04]" />;
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight dark:text-white">全部文章</h2>
        <Link to="/admin/post/new" className="btn-primary">+ 新建文章</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-faint dark:border-white/10 dark:text-white/40">
              <th className="py-3 pr-4 font-medium">标题</th>
              <th className="py-3 pr-4 font-medium">状态</th>
              <th className="py-3 pr-4 font-medium">标签</th>
              <th className="py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line dark:divide-white/10">
            {data.items.map((p) => (
              <tr key={p.id} className="group transition hover:bg-canvas-dim/60 dark:hover:bg-white/5">
                <td className="max-w-[280px] truncate py-3.5 pr-4">
                  <Link className="font-medium hover:text-accent-link dark:text-white/90 dark:hover:text-sky-400" to={`/post/${p.slug}`}>{p.title}</Link>
                </td>
                <td className="py-3.5 pr-4">
                  <span className={`pill ${p.status === "published" ? "bg-green-50 text-green-600 dark:bg-green-400/10 dark:text-green-400" : "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400"}`}>
                    {p.status === "published" ? "已发布" : "草稿"}
                  </span>
                </td>
                <td className="py-3.5 pr-4 text-ink-faint dark:text-white/40">{p.tags.join(", ") || "—"}</td>
                <td className="py-3.5 text-right whitespace-nowrap space-x-4">
                  <Link className="text-accent-link hover:underline dark:text-sky-400" to={`/admin/post/${p.id}`}>编辑</Link>
                  <button className="text-red-500 hover:underline" onClick={async () => {
                    if (confirm(`删除《${p.title}》？`)) { await api.del(`/posts/${p.id}`); load(); }
                  }}>删除</button>
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr><td colSpan={4} className="py-12 text-center text-ink-faint dark:text-white/40">还没有文章，点右上角新建</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Editor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState("md");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isNew) {
      api.get<Paged<PostDetail>>("/posts?all=1&size=50").then((d) => {
        const p = d.items.find((x) => x.id === Number(id));
        if (p) { setTitle(p.title); setSlug(p.slug); setKind(p.kind); setTags(p.tags.join(", ")); setStatus(p.status ?? "draft"); setBody(p.body); }
      });
    }
  }, [id, isNew]);

  async function save() {
    setBusy(true);
    const payload = {
      title, kind, body, status,
      tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      ...(slug.trim() ? { slug: slug.trim() } : {}),
    };
    try {
      if (isNew) await api.post("/posts", payload);
      else await api.put(`/posts/${id}`, payload);
      nav("/admin");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="文章标题"
        className="field !border-0 !bg-transparent !px-0 !text-2xl !font-semibold tracking-tight focus:!ring-0 dark:!bg-transparent" />
      <div className="flex flex-wrap gap-3 border-t border-line pt-4 text-sm dark:border-white/10">
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug（留空自动生成）" className="field !w-56 !py-2" />
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="标签，逗号分隔" className="field !w-56 !py-2" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="field !w-36 !py-2">
          <option value="md">Markdown</option><option value="html">HTML</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field !w-32 !py-2">
          <option value="draft">草稿</option><option value="published">发布</option>
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={22}
          className="field resize-y font-mono !text-[13px] !leading-6" placeholder={kind === "md" ? "支持 frontmatter 的 Markdown" : "完整 HTML 片段"} />
        <div className="overflow-auto rounded-xl border border-line bg-canvas-dim p-5 dark:border-white/10 dark:bg-white/5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint dark:text-white/40">实时预览</p>
          {kind === "md"
            ? <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown></div>
            : <Rendered html={body} />}
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-4 dark:border-white/10">
        <button onClick={save} disabled={busy || !title} className="btn-primary">
          {busy ? "保存中…" : isNew ? "创建文章" : "保存修改"}
        </button>
        <button onClick={() => nav("/admin")} className="btn-ghost">取消</button>
      </div>
    </div>
  );
}

export function Assets() {
  const [list, setList] = useState<{ id: number; url: string; size: number }[]>([]);
  const load = () => api.get<typeof list>("/assets").then(setList);
  useEffect(() => { load(); }, []);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    await api.upload("/assets", form);
    e.target.value = "";
    load();
  }
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight dark:text-white">图片库</h2>
        <label className="btn-primary cursor-pointer">
          上传图片
          <input type="file" accept="image/*" className="hidden" onChange={upload} />
        </label>
      </div>
      <p className="mb-5 text-xs text-ink-faint dark:text-white/40">支持 jpg / png / gif / webp，单张不超过 5MB</p>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {list.map((a) => (
          <li key={a.id} className="overflow-hidden rounded-xl border border-line dark:border-white/10">
            <img src={a.url} className="aspect-square w-full object-cover" />
            <button className="block w-full truncate px-2 py-2 text-center text-xs text-accent-link transition hover:bg-accent/5 dark:text-sky-400"
              onClick={() => { navigator.clipboard.writeText(location.origin + a.url); alert("链接已复制"); }}>
              复制链接
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="col-span-full rounded-card bg-black/[0.03] py-14 text-center text-sm text-ink-faint dark:bg-white/[0.04] dark:text-white/40">还没有图片</li>
        )}
      </ul>
    </div>
  );
}

export function Keys() {
  const [list, setList] = useState<{ id: number; name: string }[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState("");
  const load = () => api.get<typeof list>("/api-keys").then(setList);
  useEffect(() => { load(); }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const r = await api.post<{ key: string }>("/api-keys", { name: name.trim() });
    setFresh(r.key); setName(""); load();
  }
  return (
    <div className="space-y-5 text-sm">
      <h2 className="text-lg font-semibold tracking-tight dark:text-white">API 密钥</h2>
      <p className="leading-7 text-ink-soft dark:text-white/60">
        用脚本上传文章：
        <code className="ml-1 block overflow-x-auto rounded-xl bg-[#1d1d1f] p-3 font-mono text-xs text-white/90">
          curl -H "X-API-Key: 密钥" -F file=@post.md /api/v1/import
        </code>
      </p>
      {fresh && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-400/20 dark:bg-green-400/10 dark:text-green-400">
          新密钥（只显示这一次，请立刻保存）：
          <code className="mt-1 block break-all font-mono text-xs">{fresh}</code>
        </div>
      )}
      <form onSubmit={create} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="密钥名称，如 laptop" className="field !w-60" />
        <button className="btn-primary shrink-0">生成</button>
      </form>
      <ul className="divide-y divide-line rounded-xl border border-line dark:divide-white/10 dark:border-white/10">
        {list.map((k) => (
          <li key={k.id} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium dark:text-white/90">{k.name}</span>
            <button className="text-red-500 hover:underline" onClick={async () => { await api.del(`/api-keys/${k.id}`); load(); }}>吊销</button>
          </li>
        ))}
        {list.length === 0 && <li className="py-8 text-center text-ink-faint dark:text-white/40">还没有密钥</li>}
      </ul>
    </div>
  );
}
