import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { api, type PostDetail } from "../lib/api";
import Rendered from "../components/Rendered";
import PostListPage from "../components/PostListPage";
import Hero from "../components/Hero";

function Page({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto w-full px-5 pt-24 pb-10 sm:pt-28 sm:pb-14 ${wide ? "max-w-4xl" : "max-w-3xl"}`}>
      {children}
    </div>
  );
}

function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl dark:text-white">{title}</h1>
      {sub && <p className="mt-2 text-sm text-ink-soft dark:text-white/50">{sub}</p>}
    </header>
  );
}

export function Home() {
  return (
    <>
      <Hero />
      <Page>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight dark:text-white">最新文章</h2>
          <Link to="/archive" className="text-sm text-accent-link hover:underline dark:text-sky-400">
            归档 →
          </Link>
        </div>
        <PostListPage query={(p) => `/posts?page=${p}`} />
      </Page>
    </>
  );
}

export function TagPage() {
  const { name } = useParams();
  return (
    <Page>
      <PageTitle title={`# ${name ?? ""}`} sub="按标签浏览" />
      <PostListPage query={(p) => `/posts?page=${p}&tag=${encodeURIComponent(name ?? "")}`} />
    </Page>
  );
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
  if (missing)
    return (
      <Page>
        <p className="py-24 text-center text-ink-faint dark:text-white/40">文章不存在</p>
      </Page>
    );
  if (!post)
    return (
      <Page>
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-black/[0.06]" />
        <div className="mt-10 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-black/[0.04]" />
          ))}
        </div>
      </Page>
    );
  return (
    <article className="mx-auto w-full max-w-3xl px-5 pt-24 pb-10 sm:pt-28 sm:pb-14">
      <header className="mb-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {post.tags.map((t) => (
            <Link key={t} to={`/tag/${encodeURIComponent(t)}`} className="pill bg-accent/10 text-accent-link hover:bg-accent/15 dark:bg-sky-400/15 dark:text-sky-400">
              #{t}
            </Link>
          ))}
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-[40px] sm:leading-[1.15] dark:text-white">
          {post.title}
        </h1>
        {post.published_at && (
          <p className="mt-4 text-sm text-ink-faint dark:text-white/40">
            {format(new Date(post.published_at), "yyyy 年 M 月 d 日 HH:mm")}
          </p>
        )}
      </header>
      <div className="surface p-6 sm:p-10">
        <Rendered html={post.rendered} />
      </div>
      <div className="mt-8 text-center">
        <Link to="/" className="btn-ghost">← 返回首页</Link>
      </div>
    </article>
  );
}

export function Archive() {
  const [groups, setGroups] = useState<{ ym: string; posts: PostDetail[] }[] | null>(null);
  useEffect(() => { api.get<{ ym: string; posts: PostDetail[] }[]>("/archive").then(setGroups); }, []);
  return (
    <Page>
      <PageTitle title="归档" sub="按时间线回看所有文章" />
      {!groups ? (
        <div className="h-40 animate-pulse rounded-card bg-black/[0.04]" />
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.ym}>
              <h2 className="sticky top-[72px] z-10 -mx-1 bg-canvas/90 px-1 py-1 text-sm font-semibold text-ink-soft backdrop-blur dark:bg-[#0a0a0c]/90 dark:text-white/50">
                {g.ym.replace("-", " 年 ")} 月
              </h2>
              <ul className="mt-2 divide-y divide-line rounded-card border border-line bg-white px-6 shadow-card dark:divide-white/10 dark:border-white/10 dark:bg-[#151518] dark:shadow-none">
                {g.posts.map((p) => (
                  <li key={p.slug}>
                    <Link
                      to={`/post/${p.slug}`}
                      className="group flex items-baseline justify-between gap-4 py-4 text-[15px] transition-colors hover:text-accent-link dark:text-white/85 dark:hover:text-sky-400"
                    >
                      <span className="font-medium">{p.title}</span>
                      <span className="shrink-0 text-xs text-ink-faint dark:text-white/40">
                        {p.published_at && format(new Date(p.published_at), "M 月 d 日")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {groups.length === 0 && (
            <p className="rounded-card bg-black/[0.03] py-16 text-center text-sm text-ink-faint dark:bg-white/[0.04] dark:text-white/40">暂无文章</p>
          )}
        </div>
      )}
    </Page>
  );
}

export function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PostDetail[] | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try {
      setResults(await api.get<PostDetail[]>(`/search?q=${encodeURIComponent(q.trim())}`));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <PageTitle title="搜索" sub="全文检索，覆盖标题与正文" />
      <form onSubmit={run} className="mx-auto flex max-w-xl gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="输入关键词…"
          className="field !rounded-pill px-5"
          autoFocus
        />
        <button className="btn-primary shrink-0" disabled={busy}>
          {busy ? "搜索中…" : "搜索"}
        </button>
      </form>
      {results && (
        <ul className="mx-auto mt-8 max-w-xl space-y-3">
          {results.map((p) => (
            <li key={p.slug}>
              <Link
                to={`/post/${p.slug}`}
                className="surface block p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <p className="font-medium dark:text-white">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft dark:text-white/55">{p.summary}</p>
              </Link>
            </li>
          ))}
          {results.length === 0 && (
            <li className="rounded-card bg-black/[0.03] py-12 text-center text-sm text-ink-faint dark:bg-white/[0.04] dark:text-white/40">
              没有匹配结果
            </li>
          )}
        </ul>
      )}
    </Page>
  );
}
