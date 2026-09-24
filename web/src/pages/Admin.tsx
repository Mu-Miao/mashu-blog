import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, Navigate, Outlet, useNavigate, useParams } from "react-router-dom";
import { ApiError, api, type PostDetail, type Paged } from "../lib/api";
import Rendered from "../components/Rendered";

export function Login() {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await api.login(u, p); nav("/admin"); }
    catch (x) {
      setErr(x instanceof ApiError && x.status === 429 ? "尝试过多，10 分钟后再试" : "用户名或密码错误");
    }
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-xs space-y-3">
      <h1 className="text-xl font-bold">博主登录</h1>
      <input value={u} onChange={(e) => setU(e.target.value)} placeholder="用户名"
        className="w-full rounded border px-3 py-2 text-sm" />
      <input type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="密码"
        className="w-full rounded border px-3 py-2 text-sm" />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="w-full rounded bg-stone-800 py-2 text-sm text-white">登录</button>
    </form>
  );
}

export function AdminShell() {
  const [me, setMe] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    api.get<{ username: string }>("/auth/me").then((r) => setMe(r.username))
      .catch(() => setMe(null));
  }, []);
  if (me === undefined) return <p className="text-stone-400">检查登录状态…</p>;
  if (me === null) return <Navigate to="/admin/login" replace />;
  return (
    <div>
      <div className="mb-6 flex gap-4 border-b pb-2 text-sm">
        <Link to="/admin" className="font-medium">文章</Link>
        <Link to="/admin/assets" className="text-stone-500">图片</Link>
        <Link to="/admin/keys" className="text-stone-500">API 密钥</Link>
        <button className="ml-auto text-stone-400" onClick={async () => { await api.logout(); location.href = "/"; }}>
          退出
        </button>
      </div>
      <Outlet />
    </div>
  );
}

export function PostList() {
  const [data, setData] = useState<Paged<PostDetail> | null>(null);
  const load = () => api.get<Paged<PostDetail>>("/posts?all=1&size=50").then(setData);
  useEffect(() => { load(); }, []);
  if (!data) return <p className="text-stone-400">加载中…</p>;
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Link to="/admin/post/new" className="rounded bg-stone-800 px-3 py-1.5 text-sm text-white">
          + 新建文章
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-stone-500"><tr><th>标题</th><th>状态</th><th>标签</th><th /></tr></thead>
        <tbody>
          {data.items.map((p) => (
            <tr key={p.id} className="border-t border-stone-100">
              <td className="py-2"><Link className="hover:underline" to={`/post/${p.slug}`}>{p.title}</Link></td>
              <td>{p.status === "published" ? "已发布" : "草稿"}</td>
              <td className="text-stone-400">{p.tags.join(", ")}</td>
              <td className="py-2 text-right space-x-3">
                <Link className="text-sky-700 hover:underline" to={`/admin/post/${p.id}`}>编辑</Link>
                <button className="text-red-500" onClick={async () => {
                  if (confirm(`删除《${p.title}》？`)) { await api.del(`/posts/${p.id}`); load(); }
                }}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <div className="space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题"
        className="w-full rounded border px-3 py-2 font-semibold" />
      <div className="flex flex-wrap gap-3 text-sm">
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug（留空自动生成）"
          className="w-56 rounded border px-3 py-1.5" />
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="标签，逗号分隔"
          className="w-56 rounded border px-3 py-1.5" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded border px-2 py-1.5">
          <option value="md">Markdown</option><option value="html">HTML</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border px-2 py-1.5">
          <option value="draft">草稿</option><option value="published">发布</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={22}
          className="rounded border p-3 font-mono text-sm" placeholder={kind === "md" ? "支持 frontmatter 的 Markdown" : "完整 HTML 片段"} />
        <div className="overflow-auto rounded border bg-white p-3">
          <p className="mb-2 text-xs text-stone-400">实时预览</p>
          {kind === "md"
            ? <div className="prose prose-stone prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown></div>
            : <Rendered html={body} />}
        </div>
      </div>
      <button onClick={save} disabled={busy || !title}
        className="rounded bg-stone-800 px-5 py-2 text-sm text-white disabled:opacity-40">
        {busy ? "保存中…" : "保存"}
      </button>
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
      <label className="inline-block cursor-pointer rounded bg-stone-800 px-3 py-1.5 text-sm text-white">
        上传图片（jpg/png/gif/webp，≤5MB）
        <input type="file" accept="image/*" className="hidden" onChange={upload} />
      </label>
      <ul className="mt-4 grid grid-cols-4 gap-3">
        {list.map((a) => (
          <li key={a.id} className="text-center">
            <img src={a.url} className="h-24 w-full rounded border object-cover" />
            <button className="mt-1 block w-full truncate text-xs text-sky-700"
              onClick={() => { navigator.clipboard.writeText(location.origin + a.url); alert("链接已复制"); }}>
              {a.url}
            </button>
          </li>
        ))}
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
    <div className="space-y-4 text-sm">
      <p className="text-stone-500">
        用脚本上传文章：<code className="rounded bg-stone-100 px-1">curl -H "X-API-Key: 密钥" -F file=@post.md /api/v1/import</code>
      </p>
      {fresh && (
        <div className="rounded border border-green-300 bg-green-50 p-3">
          新密钥（只显示这一次，请立刻保存）：<code className="font-mono break-all">{fresh}</code>
        </div>
      )}
      <form onSubmit={create} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="密钥名称，如 laptop"
          className="w-56 rounded border px-3 py-1.5" />
        <button className="rounded bg-stone-800 px-4 py-1.5 text-white">生成</button>
      </form>
      <ul className="space-y-1">
        {list.map((k) => (
          <li key={k.id} className="flex items-center justify-between rounded border px-3 py-1.5">
            {k.name}
            <button className="text-red-500" onClick={async () => { await api.del(`/api-keys/${k.id}`); load(); }}>吊销</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
