import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { api, type Adjacent, type PostDetail, type PostSummary } from "../lib/api";
import Rendered from "../components/Rendered";
import PostListPage from "../components/PostListPage";
import Hero from "../components/Hero";
import Featured from "../components/Featured";
import AnimatedContent from "../components/AnimatedContent";
import GitHubShowcase from "../components/GitHubShowcase";
import Seo from "../components/Seo";
import Comments from "../components/Comments";
import LineSidebar from "../components/LineSidebar";
import { useTheme } from "../lib/theme";

function Page({ children, wide = false, flush = false }: { children: React.ReactNode; wide?: boolean; flush?: boolean }) {
  return (
    <div className={`mx-auto w-full px-5 pb-10 sm:pb-14 ${flush ? "pt-10" : "pt-24 sm:pt-28"} ${wide ? "max-w-4xl" : "max-w-3xl"}`}>
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
      <Seo path="/" />
      <Hero />
      <Featured />
      <GitHubShowcase />
    </>
  );
}

export function TagPage() {
  const { name } = useParams();
  return (
    <Page>
      <Seo title={`# ${name ?? ""}`} description={`浏览“${name ?? ""}”标签下的文章。`} path={`/tag/${encodeURIComponent(name ?? "")}`} />
      <PageTitle title={`# ${name ?? ""}`} sub="按标签浏览" />
      <PostListPage query={(p) => `/posts?page=${p}&tag=${encodeURIComponent(name ?? "")}`} />
    </Page>
  );
}

interface Heading { id: string; text: string; level: number }

function useArticle(html: string) {
  return useMemo(() => {
    const doc = new DOMParser().parseFromString(
      `<article>${html}</article>`, "text/html");
    const headings: Heading[] = [];
    doc.querySelectorAll("article h2,article h3").forEach((h, i) => {
      const id = `h-${i}`;
      h.id = id;
      headings.push({ id, text: h.textContent ?? "", level: Number(h.tagName[1]) });
    });
    const img = doc.querySelector("article p > img[src], article > img[src]");
    const cover = img?.getAttribute("src") ?? null;
    const coverAlt = img?.getAttribute("alt") ?? "";
    if (img) (img.closest("p") ?? img).remove();
    const article = doc.querySelector("article");
    const nodes = article ? [...article.children] : [];
    article?.replaceChildren();
    nodes.forEach((n) => {
      if (/^H[23]$/.test(n.tagName)) {
        const sec = doc.createElement("section");
        sec.append(n);
        article?.append(sec);
      } else {
        article?.lastElementChild?.tagName === "SECTION"
          ? article.lastElementChild.append(n)
          : article?.append(n);
      }
    });
    return { html: article?.innerHTML ?? "", headings, cover, coverAlt };
  }, [html]);
}

function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      setPct(max > 80 ? Math.min(100, (scrollY / max) * 100) : 0);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  if (!pct) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent" aria-hidden>
      <div className="h-full bg-pink-500 transition-[width] duration-150 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Toc({ headings }: { headings: Heading[] }) {
  const { theme } = useTheme();
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!headings.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = 0;
      headings.forEach((heading, index) => {
        if ((document.getElementById(heading.id)?.getBoundingClientRect().top ?? Infinity) <= 132) current = index;
      });
      setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const hash = window.location.hash.slice(1);
    if (headings.some(heading => heading.id === hash)) document.getElementById(hash)?.scrollIntoView({ block: "start", behavior: "instant" });
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);
  useEffect(() => {
    const container = scrollRef.current;
    const link = container?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!container || !link || !container.clientHeight) return;
    const bounds = container.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    if (item.top < bounds.top) container.scrollTop += item.top - bounds.top - 12;
    else if (item.bottom > bounds.bottom) container.scrollTop += item.bottom - bounds.bottom + 12;
  }, [active]);
  if (!headings.length) return null;
  const jump = (index: number) => {
    const id = headings[index].id;
    setActive(index);
    history.replaceState(history.state, "", `#${id}`);
    document.getElementById(id)?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };
  return (
    <div ref={scrollRef} className="max-h-[min(60vh,520px)] overflow-y-auto overflow-x-hidden px-1 pb-2 lg:max-h-[calc(100dvh-180px)]">
      <LineSidebar
        items={headings.map(h => h.text)}
        hrefs={headings.map(h => `#${h.id}`)}
        levels={headings.map(h => h.level)}
        activeItem={active}
        onItemClick={jump}
        accentColor={theme === "dark" ? "#f472b6" : "#db2777"}
        textColor={theme === "dark" ? "#a1a1aa" : "#6e6e73"}
        markerColor={theme === "dark" ? "#3f3f46" : "#d1d1d6"}
        markerLength={24}
        markerGap={10}
        maxShift={8}
        proximityRadius={80}
        itemGap={12}
        fontSize={0.8125}
        smoothing={120}
      />
    </div>
  );
}

function PostNavCard({ to, label, post }: { to: string; label: string; post?: PostSummary | null }) {
  if (!post) return <div />;
  return (
    <Link to={to} className="surface group block p-5 transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:shadow-lift">
      <p className="text-xs text-ink-faint dark:text-white/40">{label}</p>
      <p className="mt-1.5 line-clamp-1 font-medium text-ink group-hover:text-accent-link dark:text-white/85 dark:group-hover:text-pink-400">
        {post.title}
      </p>
    </Link>
  );
}

export function NotFound({ title = "页面不存在", sub = "它可能搬家了，或者链接输错了。" }: { title?: string; sub?: string }) {
  return (
    <Page>
      <Seo title={title} description={sub} noindex />
      <div className="py-24 text-center">
        <p className="text-[72px] font-semibold leading-none tracking-tight text-ink-faint/40 dark:text-white/15">404</p>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft dark:text-white/50">{sub}</p>
        <Link to="/" className="btn-primary mt-8">回到首页</Link>
      </div>
    </Page>
  );
}

export function Post() {
  const { slug } = useParams();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [adj, setAdj] = useState<Adjacent | null>(null);
  const [missing, setMissing] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPost(null); setAdj(null); setMissing(false);
    const s = encodeURIComponent(slug ?? "");
    api.get<PostDetail>(`/posts/${s}`)
      .then(setPost)
      .catch(() => setMissing(true));
    api.get<Adjacent>(`/posts/${s}/adjacent`).then(setAdj).catch(() => {});
  }, [slug]);

  const { html, headings, cover, coverAlt } = useArticle(post?.rendered ?? "");

  useEffect(() => {
    if (!html || !bodyRef.current) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = [...bodyRef.current.querySelectorAll("article > section")];
    if (reduce) { targets.forEach((s) => s.classList.add("reveal-in")); return; }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("reveal-in"); io.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -10% 0px" },
    );
    targets.forEach((s) => { s.classList.add("reveal"); io.observe(s); });
    // 兜底：IO 失灵（后台标签页/异常环境）时不允许正文永久透明
    const t = setTimeout(() => targets.forEach((s) => s.classList.add("reveal-in")), 1500);
    return () => { io.disconnect(); clearTimeout(t); };
  }, [html]);

  if (missing)
    return <NotFound title="文章不存在" sub="这篇文章可能还是草稿，或者从未发表。" />;
  if (!post)
    return (
      <Page wide>
        <Seo title="文章加载中" noindex />
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/10" />
        <div className="mt-10 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-black/[0.04] dark:bg-white/[0.06]" />
          ))}
        </div>
      </Page>
    );

  const minutes = Math.max(1, Math.round((post.body.length || 1) / 400));
  const date = post.published_at && format(new Date(post.published_at), "yyyy 年 M 月 d 日");

  return (
    <article className="mx-auto w-full max-w-6xl px-5 pt-24 pb-10 sm:px-8 sm:pt-28 sm:pb-14">
      <Seo
        title={post.title}
        description={post.summary}
        path={`/post/${encodeURIComponent(post.slug)}`}
        article
        publishedAt={post.published_at}
        modifiedAt={post.updated_at}
        tags={post.tags}
        image={cover}
      />
      <ReadingProgress />
      <div className={headings.length ? "grid items-start gap-8 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-12" : "mx-auto max-w-3xl"}>
      {headings.length > 0 && (
        <aside className="hidden min-w-0 lg:sticky lg:top-28 lg:block" aria-label="阅读导航">
          <Link to="/archive" className="mb-8 inline-flex text-xs text-ink-faint transition hover:text-pink-600 dark:text-white/40 dark:hover:text-pink-400">← 文章归档</Link>
          <p className="mb-1 text-[10px] font-medium tracking-[0.2em] text-ink-faint dark:text-white/35">ON THIS PAGE</p>
          <p className="mb-3 text-sm font-semibold text-ink dark:text-white/85">文章目录 <span className="ml-1 text-xs font-normal text-ink-faint dark:text-white/35">{headings.length}</span></p>
          <Toc key={post.slug} headings={headings} />
        </aside>
      )}
      <div className="mx-auto w-full min-w-0 max-w-3xl">
      <header className="mb-8 border-b border-line pb-8 text-left dark:border-white/10 sm:mb-10">
        <div className="flex flex-wrap items-center gap-1.5">
          {post.tags.map((t) => (
            <Link key={t} to={`/tag/${encodeURIComponent(t)}`} className="pill bg-pink-500/[0.08] text-pink-600 hover:bg-pink-500/15 dark:bg-pink-400/10 dark:text-pink-400">
              #{t}
            </Link>
          ))}
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-[40px] sm:leading-[1.15] dark:text-white">
          {post.title}
        </h1>
        <p className="mt-4 text-sm text-ink-faint dark:text-white/40">
          {date && <span>{date}</span>}
          {date && <span className="mx-2">·</span>}
          <span>约 {minutes} 分钟阅读</span>
        </p>
      </header>
      {cover && (
        <img
          src={cover}
          alt={coverAlt}
          className="mx-auto mb-12 block max-h-[420px] w-full rounded-card object-cover shadow-lift"
        />
      )}
      {headings.length > 0 && (
        <details className="mb-6 rounded-2xl border border-line bg-canvas-dim/60 px-4 dark:border-white/10 dark:bg-white/[0.03] lg:hidden">
          <summary className="cursor-pointer py-3 text-sm font-medium text-ink-soft dark:text-white/65">文章目录 <span className="ml-1 text-xs opacity-60">{headings.length} 个章节</span></summary>
          <Toc key={`mobile-${post.slug}`} headings={headings} />
        </details>
      )}
        <div ref={bodyRef} className="min-w-0 [&_h2]:scroll-mt-28 [&_h3]:scroll-mt-28">
          <Rendered html={html} />
        </div>
      <nav className="mt-12 grid gap-4 sm:grid-cols-2" aria-label="上下篇">
        <PostNavCard to={`/post/${adj?.prev?.slug ?? ""}`} label="← 上一篇" post={adj?.prev} />
        <PostNavCard to={`/post/${adj?.next?.slug ?? ""}`} label="下一篇 →" post={adj?.next} />
      </nav>
      {adj && adj.related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-lg font-semibold tracking-tight dark:text-white">相关文章</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {adj.related.map((p) => (
              <Link key={p.slug} to={`/post/${p.slug}`} className="surface group block p-5 transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:shadow-lift">
                <p className="line-clamp-2 font-medium leading-snug group-hover:text-accent-link dark:text-white/85 dark:group-hover:text-pink-400">{p.title}</p>
                <p className="mt-2 line-clamp-2 text-sm text-ink-soft dark:text-white/50">{p.summary}</p>
                {p.published_at && (
                  <p className="mt-3 text-xs text-ink-faint dark:text-white/40">{format(new Date(p.published_at), "yyyy-MM-dd")}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
      <Comments slug={post.slug} />
      <div className="mt-12 text-center">
        <Link to="/" className="btn-ghost">← 返回首页</Link>
      </div>
      </div>
      </div>
    </article>
  );
}

export function Archive() {
  const [groups, setGroups] = useState<{ ym: string; posts: PostDetail[] }[] | null>(null);
  useEffect(() => { api.get<{ ym: string; posts: PostDetail[] }[]>("/archive").then(setGroups); }, []);
  return (
    <Page>
      <Seo title="文章归档" description="按时间浏览麻薯ta爸发布的全部文章。" path="/archive" />
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
                {g.posts.map((p, index) => (
                  <AnimatedContent as="li" key={p.slug} delay={index * 50}>
                    <Link
                      to={`/post/${p.slug}`}
                      className="group flex items-baseline justify-between gap-4 py-4 text-[15px] transition-colors hover:text-accent-link dark:text-white/85 dark:hover:text-pink-400"
                    >
                      <span className="font-medium">{p.title}</span>
                      <span className="shrink-0 text-xs text-ink-faint dark:text-white/40">
                        {p.published_at && format(new Date(p.published_at), "M 月 d 日")}
                      </span>
                    </Link>
                  </AnimatedContent>
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
      <Seo title="站内搜索" description="搜索麻薯ta爸博客中的文章。" path="/search" noindex />
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
          {results.map((p, index) => (
            <AnimatedContent as="li" key={p.slug} delay={index * 50}>
              <Link
                to={`/post/${p.slug}`}
                className="surface block p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <p className="font-medium dark:text-white">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft dark:text-white/55">{p.summary}</p>
              </Link>
            </AnimatedContent>
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
