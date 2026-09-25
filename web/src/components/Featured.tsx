import { useEffect, useState } from "react";
import MagicBento from "./MagicBento";
import { api, type Paged, type PostSummary } from "../lib/api";

export default function Featured() {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  useEffect(() => {
    api.get<Paged<PostSummary>>("/posts?size=6").then((d) => setPosts(d.items)).catch(() => setPosts([]));
  }, []);
  if (!posts || posts.length === 0) return null;
  return (
    <section id="content" className="scroll-mt-20 border-b border-line bg-canvas-dim py-16 dark:border-white/10 dark:bg-[#0a0a0c] sm:py-20">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl dark:text-white">最新文章</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-ink-soft dark:text-white/60">
            把鼠标移到卡片上看看 —— 聚光、辉光、星尘、倾斜与涟漪。麻薯
            <span className="text-pink-500 dark:text-pink-400">ta</span>爸记录嵌入式、写作与生活的地方。
          </p>
        </div>
        <MagicBento items={posts} glowColor="255, 55, 95" enableTilt enableMagnetism clickEffect particleCount={14} spotlightRadius={320} />
      </div>
    </section>
  );
}
