import { useEffect, useState } from "react";
import { api, type Paged, type PostSummary } from "../lib/api";
import PostCard from "../components/PostCard";

export default function PostListPage({ query, empty }: { query: (page: number) => string; empty?: string }) {
  const [data, setData] = useState<Paged<PostSummary> | null>(null);
  const [page, setPage] = useState(1);
  useEffect(() => {
    setData(null);
    api.get<Paged<PostSummary>>(query(page)).then(setData).catch(console.error);
  }, [page, query]);
  if (!data) return <p className="text-stone-400">加载中…</p>;
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  return (
    <div>
      {data.items.length === 0 && <p className="text-stone-400">{empty ?? "还没有文章"}</p>}
      {data.items.map((p) => <PostCard key={p.id} post={p} />)}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40">上一页</button>
          <span className="text-stone-500">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40">下一页</button>
        </div>
      )}
    </div>
  );
}
