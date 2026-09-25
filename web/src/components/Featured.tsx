import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import CardSwap, { Card } from "./CardSwap";
import { api, type Paged, type PostSummary } from "../lib/api";

const PostCard = Card as React.ComponentType<{ children?: React.ReactNode; customClass?: string; key?: React.Key }>;

export default function Featured() {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const nav = useNavigate();
  useEffect(() => {
    api.get<Paged<PostSummary>>("/posts?size=3").then((d) => setPosts(d.items)).catch(() => setPosts([]));
  }, []);
  if (!posts || posts.length < 2) return null;
  return (
    <section id="content" className="scroll-mt-20 border-b border-line bg-canvas-dim py-16 dark:border-white/10 dark:bg-[#101013] sm:py-20">
      <div className="mx-auto grid max-w-5xl items-center gap-12 px-5 md:grid-cols-2 md:gap-8">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl dark:text-white">
            卡片堆叠，
            <br className="hidden sm:block" />
            也能很好看
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-ink-soft md:mx-0 dark:text-white/60">
            这里是麻薯<span className="text-pink-500 dark:text-pink-400">ta</span>爸的个人博客，记录嵌入式开发、写作与日常生活。
            右侧自动轮播最新的几篇文章——
          </p>
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">悬停暂停 · 点击卡片直接阅读</p>
          <div className="mt-6 flex items-center justify-center gap-3 md:justify-start">
            <Link to="/archive" className="btn-primary">浏览全部文章</Link>
            <a href="/api/v1/feed.xml" className="btn-ghost" target="_blank" rel="noopener">RSS</a>
          </div>
        </div>
        <div className="h-[320px] sm:h-[380px]">
          <CardSwap
            width={330}
            height={210}
            cardDistance={36}
            verticalDistance={46}
            skewAmount={4}
            delay={5000}
            pauseOnHover
            easing="elastic"
            onCardClick={(i: number) => nav(`/post/${posts[i].slug}`)}
          >
            {posts.map((p) => (
              <PostCard
                key={p.id}
                customClass="surface cursor-pointer !border-white/60 p-6 text-left dark:!border-white/10"
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2 text-xs text-ink-faint dark:text-white/40">
                    {p.published_at && <time>{format(new Date(p.published_at), "yyyy-MM-dd")}</time>}
                    {p.tags[0] && <span className="pill bg-accent/10 text-accent-link dark:bg-sky-400/15 dark:text-sky-400">#{p.tags[0]}</span>}
                  </div>
                  <h3 className="mt-2.5 text-lg font-semibold leading-snug tracking-tight dark:text-white">{p.title}</h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-ink-soft dark:text-white/60">{p.summary || "点击阅读全文"}</p>
                  <span className="text-sm font-medium text-accent-link dark:text-sky-400">阅读全文 →</span>
                </div>
              </PostCard>
            ))}
          </CardSwap>
        </div>
      </div>
    </section>
  );
}
