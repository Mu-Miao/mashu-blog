import { useEffect, useState } from "react";
import { api, type Paged, type PostSummary } from "../lib/api";
import PostCard from "./PostCard";

export default function PostListPage({ query, empty }: { query: (page: number) => string; empty?: string }) {
  const [data, setData] = useState<Paged<PostSummary> | null>(null);
  const [page, setPage] = useState(1);
  useEffect(() => {
    setData(null);
    api.get<Paged<PostSummary>>(query(page)).then(setData).catch(console.error);
  }, [page, query]);
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
        {data.items.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-ghost">
            上一页
          </button>
          <span className="px-2 text-ink-faint">
            {page} / {pages}
          </span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="btn-ghost">
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
