import { useEffect, useState } from "react";
import { api, type Paged, type PostSummary } from "../lib/api";
import AnimatedContent from "./AnimatedContent";
import ClickSpark from "./ClickSpark";
import PostCard from "./PostCard";

export default function PostListPage({ query, empty }: { query: (page: number) => string; empty?: string }) {
  return <PostList key={query(1)} query={query} empty={empty} />;
}

function PostList({ query, empty }: { query: (page: number) => string; empty?: string }) {
  const [result, setResult] = useState<{ url: string; data: Paged<PostSummary> | null; failed: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const url = query(page);
  const current = result?.url === url ? result : null;
  const data = current?.data;
  useEffect(() => {
    const controller = new AbortController();
    api.get<Paged<PostSummary>>(url, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ url, data, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ url, data: null, failed: true });
      });
    return () => controller.abort();
  }, [url]);
  if (current?.failed) return <p role="alert" className="py-10 text-center text-sm text-red-500">文章加载失败，请刷新页面重试。</p>;
  if (!data)
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-card bg-black/[0.04] dark:bg-white/[0.06]" />
        ))}
      </div>
    );
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  return (
    <div>
      {data.items.length === 0 && (
        <p className="rounded-card bg-black/[0.03] py-16 text-center text-sm text-ink-faint dark:bg-white/[0.04] dark:text-white/40">
          {empty ?? "还没有文章"}
        </p>
      )}
      <div className="space-y-5">
        {data.items.map((p, index) => (
          <AnimatedContent key={`${page}-${p.id}`} delay={index * 50}>
            <PostCard post={p} />
          </AnimatedContent>
        ))}
      </div>
      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3 text-sm">
          <ClickSpark>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-ghost">
              上一页
            </button>
          </ClickSpark>
          <span className="px-2 text-ink-faint">
            {page} / {pages}
          </span>
          <ClickSpark>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="btn-ghost">
              下一页
            </button>
          </ClickSpark>
        </div>
      )}
    </div>
  );
}
