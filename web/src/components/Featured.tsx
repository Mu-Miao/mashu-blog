import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import ScrollStack, { ScrollStackItem } from "./ScrollStack";
import { api, type Paged, type PostSummary } from "../lib/api";

export default function Featured() {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  useEffect(() => {
    api.get<Paged<PostSummary>>("/posts?size=5").then((d) => setPosts(d.items)).catch(() => setPosts([]));
  }, []);
  if (!posts || posts.length === 0) return null;
  return (
    <section id="content" className="scroll-mt-20 border-b border-line bg-canvas-dim dark:border-white/10 dark:bg-[#0a0a0c]">
      <div className="mx-auto max-w-5xl px-5 pt-16 text-center sm:pt-20">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl dark:text-white">最新文章</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-ink-soft dark:text-white/60">
          继续下滑，文章卡片会一张张叠起来 —— 这是麻薯
          <span className="text-pink-500 dark:text-pink-400">ta</span>
          爸记录嵌入式、写作与生活的地方。
        </p>
      </div>
      <ScrollStack
        useWindowScroll
        itemDistance={90}
        itemScale={0.045}
        itemStackDistance={44}
        stackPosition="18%"
        scaleEndPosition="8%"
        baseScale={0.82}
        blurAmount={1.5}
      >
        {posts.map((p) => (
          <ScrollStackItem key={p.slug}>
            <Link to={`/post/${p.slug}`} className="flex h-full flex-col">
              <div className="flex items-center gap-2 text-xs text-ink-faint dark:text-white/40">
                {p.published_at && <time>{format(new Date(p.published_at), "yyyy 年 M 月 d 日")}</time>}
                {p.tags.map((t) => (
                  <span key={t} className="pill bg-accent/10 text-accent-link dark:bg-sky-400/15 dark:text-sky-400">
                    #{t}
                  </span>
                ))}
              </div>
              <h3 className="mt-3 text-2xl font-semibold leading-snug tracking-tight dark:text-white">{p.title}</h3>
              <p className="mt-3 line-clamp-3 flex-1 text-[15px] leading-7 text-ink-soft dark:text-white/60">
                {p.summary || "点击阅读全文"}
              </p>
              <span className="mt-4 text-sm font-medium text-accent-link dark:text-sky-400">阅读全文 →</span>
            </Link>
          </ScrollStackItem>
        ))}
      </ScrollStack>
    </section>
  );
}
