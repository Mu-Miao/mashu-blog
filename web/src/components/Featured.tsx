import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <section className="border-b border-line bg-canvas-dim py-14 dark:border-white/10 dark:bg-[#101013]">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mb-2 text-center">
          <h2 className="text-xl font-semibold tracking-tight dark:text-white">精选文章</h2>
          <p className="mt-1 text-sm text-ink-faint dark:text-white/40">每 5 秒自动换一张，悬停暂停，点击阅读</p>
        </div>
        <div className="h-[340px] sm:h-[400px]">
          <CardSwap
            width={380}
            height={230}
            cardDistance={44}
            verticalDistance={56}
            skewAmount={4}
            delay={5000}
            pauseOnHover
            easing="elastic"
            onCardClick={(i: number) => nav(`/post/${posts[i].slug}`)}
          >
            {posts.map((p) => (
              <PostCard
                key={p.id}
                customClass="surface cursor-pointer !border-white/60 p-7 text-left dark:!border-white/10"
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2 text-xs text-ink-faint dark:text-white/40">
                    {p.published_at && <time>{format(new Date(p.published_at), "yyyy-MM-dd")}</time>}
                    {p.tags[0] && <span className="pill bg-accent/10 text-accent-link dark:bg-sky-400/15 dark:text-sky-400">#{p.tags[0]}</span>}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight dark:text-white">{p.title}</h3>
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
