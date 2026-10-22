import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { api, type Paged, type PostSummary } from "../lib/api";
import { TEACHING_TAG, TEACHING_TOPICS } from "../lib/teaching";
import Seo from "../components/Seo";

function Arrow({ className = "h-4 w-4" }: { className?: string }) {
  return <svg className={className} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
}

function useTeachingArticles(endpoint: string) {
  const [result, setResult] = useState<{ endpoint: string; data?: Paged<PostSummary>; error?: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      api.get<Paged<PostSummary>>(endpoint)
        .then(data => { if (alive) setResult({ endpoint, data }); })
        .catch(() => { if (alive) setResult({ endpoint, error: true }); });
    }, 200);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [endpoint, retry]);

  const current = result?.endpoint === endpoint ? result : null;
  return { current, reload: () => { setResult(null); setRetry(value => value + 1); } };
}

function TeachingArticles({ current, reload, search, topic }: { current: ReturnType<typeof useTeachingArticles>["current"]; reload: () => void; search: string; topic?: typeof TEACHING_TOPICS[number] }) {
  if (!current) return <div aria-label="加载教学文章" className="space-y-5 py-10">{[0, 1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-black/[0.03] dark:bg-white/[0.04]" />)}</div>;
  if (current.error) return <div role="alert" className="py-20 text-center"><p className="text-sm text-ink-soft dark:text-white/60">教学文章暂时没有加载出来。</p><button className="btn-ghost mt-4" onClick={reload}>重新加载</button></div>;
  const data = current.data!;
  if (!data.items.length) return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-4 text-center">
      <h3 className="text-base font-medium text-ink dark:text-white/85">{search ? "没有找到匹配的教学文章" : topic ? "这个专题正在准备" : "这里的内容正在准备"}</h3>
      <p className="mt-3 text-sm leading-7 text-ink-faint dark:text-white/45">{search ? "试试更短的关键词，或切换到全部教学。" : topic ? "对应专题的文章发布后，会自动出现在这里。" : "第一篇教学文章发布后，会出现在这里。"}</p>
    </div>
  );
  return <ul className="divide-y divide-line dark:divide-white/10">{data.items.map(post => (
    <li key={post.id} className="py-6">
      <Link to={`/post/${post.slug}`} className="group block rounded-lg outline-offset-4 focus-visible:outline-pink-500">
        <div className="flex items-start justify-between gap-5"><h3 className="text-xl font-semibold leading-snug tracking-tight text-ink transition group-hover:text-pink-600 dark:text-white/90 dark:group-hover:text-pink-400">{post.title}</h3><Arrow className="mt-1 h-5 w-5 shrink-0 text-ink-faint transition group-hover:translate-x-1 group-hover:text-pink-500 motion-reduce:transform-none dark:text-white/40" /></div>
        <p className="mt-3 line-clamp-2 text-sm leading-7 text-ink-soft dark:text-white/55">{post.summary}</p>
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-faint dark:text-white/40">
          {post.published_at && <time dateTime={post.published_at}>{format(new Date(post.published_at), "yyyy.MM.dd")}</time>}
          {post.tags.filter(tag => tag !== TEACHING_TAG).map(tag => <span key={tag}>#{tag}</span>)}
        </div>
      </Link>
    </li>
  ))}</ul>;
}

export default function Teaching() {
  const [params, setParams] = useSearchParams();
  const topic = TEACHING_TOPICS.find(item => item.id === params.get("topic"));
  const search = params.get("q") ?? "";
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  // Pagination uses the same filtered API; no unrelated posts or drafts enter this section.
  const query = new URLSearchParams({ tag: TEACHING_TAG, page: String(page), size: "10" });
  if (topic) query.set("topic", topic.title);
  if (search.trim()) query.set("q", search.trim());
  const endpoint = `/posts?${query}`;
  const { current, reload } = useTeachingArticles(endpoint);
  const pages = current?.data ? Math.ceil(current.data.total / 10) : 0;
  useEffect(() => {
    if (!current?.data || page <= Math.max(1, pages)) return;
    setParams(previous => { const next = new URLSearchParams(previous); next.set("page", String(Math.max(1, pages))); return next; }, { replace: true });
  }, [current?.data, page, pages, setParams]);

  function change(name: "topic" | "q", value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set(name, value); else next.delete(name);
      next.delete("page");
      return next;
    }, { replace: name === "q" });
  }
  function changePage(nextPage: number) {
    setParams(previous => { const next = new URLSearchParams(previous); next.set("page", String(nextPage)); return next; });
    document.getElementById("teaching-articles")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-32 sm:px-8 sm:pt-36">
      <Seo title="STM32 教学篇" description="从时钟、中断、定时器到串口 DMA，围绕 STM32 学习中容易卡住的问题，解释现象、机制与验证过程。" path="/teaching" />
      <header className="border-b border-line pb-8 dark:border-white/10">
        <h1 className="text-[36px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[64px] dark:text-white">把 <span className="text-pink-500">STM32</span> 的难点，<br />慢慢讲明白。</h1>
        <p className="mt-5 max-w-4xl text-sm leading-7 text-ink-soft sm:text-lg dark:text-white/55">不止贴一段能运行的代码。把容易踩的坑、背后的机制和排查过程，一起讲清楚。</p>
        <a href="#teaching-articles" className="btn-primary mt-5 gap-3 !bg-ink !px-5 !py-2.5 !text-white hover:!bg-ink/90 dark:!bg-white dark:!text-ink">浏览教学文章 <Arrow /></a>
      </header>

      <div className="mt-9 grid items-start gap-8 md:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="min-w-0 md:border-r md:border-line md:pr-6 dark:md:border-white/10">
          <h2 className="mb-4 text-base font-semibold text-ink dark:text-white/85">按难点找答案</h2>
          <nav aria-label="教学专题" className="flex gap-2 overflow-x-auto pb-2 md:block md:space-y-1 md:overflow-visible">
            <button aria-pressed={!topic} onClick={() => change("topic", "")} className={`shrink-0 rounded-xl px-4 py-3 text-left text-sm font-medium transition md:w-full ${!topic ? "bg-pink-500/[0.08] text-pink-600 dark:bg-pink-400/10 dark:text-pink-400" : "text-ink-soft hover:bg-black/[0.03] dark:text-white/60 dark:hover:bg-white/[0.04]"}`}>全部教学</button>
            {TEACHING_TOPICS.map((item, index) => <button key={item.id} aria-pressed={topic?.id === item.id} onClick={() => change("topic", item.id)} className={`flex shrink-0 items-start gap-3 rounded-xl px-3 py-3 text-left transition md:w-full ${topic?.id === item.id ? "bg-pink-500/[0.08] text-pink-600 dark:bg-pink-400/10 dark:text-pink-400" : "text-ink-soft hover:bg-black/[0.03] dark:text-white/60 dark:hover:bg-white/[0.04]"}`}>
              <span className="font-mono text-xs leading-6 opacity-65">{String(index + 1).padStart(2, "0")}</span>
              <span><span className="block whitespace-nowrap text-sm font-medium md:text-base">{item.title}</span><span className="mt-1 hidden text-xs opacity-65 md:block">{item.caption}</span></span>
            </button>)}
          </nav>
        </aside>

        <section id="teaching-articles" className="min-w-0 scroll-mt-24" aria-label="教学文章">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[32px] dark:text-white">{topic?.title ?? "教学文章"}</h2>
            <div className="relative w-full sm:w-72">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint dark:text-white/40"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
              <input aria-label="搜索教学文章" type="search" maxLength={200} value={search} onChange={event => change("q", event.target.value)} placeholder="搜索标题或关键词…" className="field !rounded-xl !py-2.5 !pl-9 !text-sm" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-ink-soft dark:text-white/55">{topic?.description ?? "从遇到的问题出发，沿着原理找到答案。"}</p>
          {topic && <div className="mt-5 border-l-2 border-pink-500/30 pl-4"><p className="text-xs text-ink-faint dark:text-white/40">这一专题关注的问题</p><ul className="mt-2 space-y-1.5 text-sm leading-6 text-ink-soft dark:text-white/60">{topic.questions.map(question => <li key={question}>{question}</li>)}</ul></div>}
          <div className="mt-5 border-y border-line dark:border-white/10"><TeachingArticles current={current} reload={reload} search={search.trim()} topic={topic} /></div>
          {pages > 1 && <div className="mt-6 flex items-center justify-center gap-4 text-sm"><button disabled={page <= 1} className="btn-ghost" onClick={() => changePage(page - 1)}>上一页</button><span className="text-ink-faint dark:text-white/40">{page} / {pages}</span><button disabled={page >= pages} className="btn-ghost" onClick={() => changePage(page + 1)}>下一页</button></div>}
        </section>
      </div>

      <section aria-label="教学方式" className="mt-8 grid gap-5 rounded-xl bg-canvas-dim px-6 py-5 sm:grid-cols-3 sm:gap-8 dark:bg-white/[0.04]">
        {[{ title: "现象", text: "先说清哪里不对。" }, { title: "机制", text: "沿着数据与控制流往回找。" }, { title: "验证", text: "用最小实验确认判断。" }].map((item, index) => <div key={item.title} className={index ? "sm:border-l sm:border-line sm:pl-6 dark:sm:border-white/10" : ""}><h2 className="text-sm font-semibold text-ink dark:text-white/85">{item.title}</h2><p className="mt-2 text-sm leading-6 text-ink-soft dark:text-white/50">{item.text}</p></div>)}
      </section>
    </div>
  );
}
