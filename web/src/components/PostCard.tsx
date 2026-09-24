import { format } from "date-fns";
import { Link } from "react-router-dom";
import type { PostSummary } from "../lib/api";

export default function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="border-b border-stone-200 py-5">
      <h2 className="text-lg font-semibold">
        <Link to={`/post/${post.slug}`} className="hover:underline">
          {post.title}
        </Link>
        {post.status === "draft" && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">草稿</span>
        )}
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        {post.published_at ? format(new Date(post.published_at), "yyyy-MM-dd") : ""}
        {post.tags.length > 0 && " · "}
        {post.tags.map((t, i) => (
          <span key={t}>
            {i > 0 && " "}
            <Link to={`/tag/${encodeURIComponent(t)}`} className="text-sky-700 hover:underline">
              #{t}
            </Link>
          </span>
        ))}
      </p>
      {post.summary && <p className="mt-2 text-sm text-stone-600 line-clamp-3">{post.summary}</p>}
    </article>
  );
}
