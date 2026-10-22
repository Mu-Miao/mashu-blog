import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

import { api, type AdminComment } from "../lib/api";

function AdminCommentCard({ comment, onReplied }: { comment: AdminComment; onReplied: (id: number) => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/comments/${comment.id}/reply`, { content: reply.trim() });
      setReply("");
      onReplied(comment.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`rounded-2xl border p-4 ${comment.is_read ? "border-black/[0.06] dark:border-white/[0.06]" : "border-pink-300 bg-pink-50/60 dark:border-pink-400/30 dark:bg-pink-400/[0.06]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        {!comment.is_read ? <span className="h-2 w-2 rounded-full bg-pink-500" aria-label="未读" /> : null}
        <strong className="text-sm dark:text-white/85">{comment.author_name}</strong>
        <span className="text-xs text-ink-faint">评论了</span>
        <Link className="text-xs font-medium text-accent-link hover:underline dark:text-pink-400" to={`/post/${comment.post_slug}`}>{comment.post_title}</Link>
        <time className="ml-auto text-xs text-ink-faint">{format(new Date(comment.created_at), "yyyy-MM-dd HH:mm")}</time>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-soft dark:text-white/65">{comment.content}</p>
      <form className="mt-4 flex gap-2" onSubmit={submit}>
        <input className="field !py-2 text-sm" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} placeholder="以博主身份回复…" />
        <button className="btn-primary shrink-0 !px-4 !py-2 text-sm" disabled={busy || !reply.trim()}>{busy ? "发送中" : "回复"}</button>
      </form>
    </article>
  );
}

export default function AdminComments() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<AdminComment[]>("/admin/comments"),
      api.post<{ updated: number }>("/admin/comments/read-all"),
    ]).then(([items]) => {
      setComments(items.map((comment) => ({ ...comment, is_read: true })));
      window.dispatchEvent(new CustomEvent("blog-comments-read"));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-pink-500">Inbox</p>
        <h1 className="mt-1 text-xl font-semibold dark:text-white">评论消息</h1>
        <p className="mt-1 text-sm text-ink-faint dark:text-white/40">在这里查看读者留言，并直接回复到文章评论区。</p>
      </div>
      {loading ? <p className="py-8 text-center text-sm text-ink-faint">消息加载中…</p> : null}
      {!loading && comments.length === 0 ? <p className="rounded-2xl border border-dashed border-black/10 py-10 text-center text-sm text-ink-faint dark:border-white/10">还没有收到评论。</p> : null}
      <div className="space-y-3">
        {comments.map((comment) => (
          <AdminCommentCard key={comment.id} comment={comment} onReplied={(id) => setComments((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item))} />
        ))}
      </div>
    </section>
  );
}
