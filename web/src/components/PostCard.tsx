import { format } from "date-fns";
import { Link } from "react-router-dom";
import type { PostSummary } from "../lib/api";

export default function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="group rounded-card border border-line bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-7 dark:border-white/10 dark:bg-[#151518] dark:hover:bg-[#19191d]">
      <div className="flex items-center gap-2 text-xs text-ink-faint dark:text-white/40">
        {post.published_at && (
          <time>{format(new Date(post.published_at), "yyyy 年 M 月 d 日")}</time>
        )}
        {post.status === "draft" && (
          <span className="pill bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">草稿</span>
        )}
      </div>
      <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight sm:text-xl dark:text-white">
        <Link to={`/post/${post.slug}`} className="transition-colors group-hover:text-accent-link">
          {post.title}
        </Link>
      </h2>
      {post.summary && (
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-soft dark:text-white/60">{post.summary}</p>
      )}
      {post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Link
              key={t}
              to={`/tag/${encodeURIComponent(t)}`}
              className="pill bg-canvas-dim text-ink-soft hover:bg-accent/10 hover:text-accent-link dark:bg-white/10 dark:text-white/55 dark:hover:bg-accent/20 dark:hover:text-sky-400"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
