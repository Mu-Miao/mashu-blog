import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { api, type PostDetail } from "../lib/api";
import Rendered from "../components/Rendered";
import PostListPage from "../components/PostListPage";

export function Home() {
  return <PostListPage query={(p) => `/posts?page=${p}`} />;
}

export function TagPage() {
  const { name } = useParams();
  return <PostListPage query={(p) => `/posts?page=${p}&tag=${encodeURIComponent(name ?? "")}`} />;
}

export function Post() {
  const { slug } = useParams();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    setPost(null); setMissing(false);
    api.get<PostDetail>(`/posts/${encodeURIComponent(slug ?? "")}`)
      .then(setPost).catch(() => setMissing(true));
  }, [slug]);
  if (missing) return <p className="text-stone-400">文章不存在</p>;
  if (!post) return <p className="text-stone-400">加载中…</p>;
  return (
    <article>
      <h1 className="text-2xl font-bold">{post.title}</h1>
      <p className="mt-1 text-sm text-stone-500">
        {post.published_at && format(new Date(post.published_at), "yyyy-MM-dd HH:mm")}
        {post.tags.map((t) => ` #${t}`).join("")}
      </p>
      <div className="mt-6"><Rendered html={post.rendered} /></div>
    </article>
  );
}

export function Archive() {
  const [groups, setGroups] = useState<{ ym: string; posts: PostDetail[] }[] | null>(null);
  useEffect(() => { api.get<{ ym: string; posts: PostDetail[] }[]>("/archive").then(setGroups); }, []);
  if (!groups) return <p className="text-stone-400">加载中…</p>;
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.ym}>
          <h2 className="font-semibold text-stone-500">{g.ym}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {g.posts.map((p) => (
              <li key={p.slug}>
                <Link className="hover:underline text-stone-700" to={`/post/${p.slug}`}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="text-stone-400">暂无文章</p>}
    </div>
  );
}

export function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PostDetail[] | null>(null);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setResults(await api.get<PostDetail[]>(`/search?q=${encodeURIComponent(q.trim())}`));
  }
  return (
    <div>
      <form onSubmit={run} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索文章…"
          className="flex-1 rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500" />
        <button className="rounded bg-stone-800 px-4 py-2 text-sm text-white">搜索</button>
      </form>
      {results && (
        <ul className="mt-4 space-y-2 text-sm">
          {results.map((p) => (
            <li key={p.slug}>
              <a className="hover:underline" href={`/post/${p.slug}`}>{p.title}</a>
              <span className="ml-2 text-stone-400">{p.summary.slice(0, 60)}</span>
            </li>
          ))}
          {results.length === 0 && <li className="text-stone-400">没有匹配结果</li>}
        </ul>
      )}
    </div>
  );
}
