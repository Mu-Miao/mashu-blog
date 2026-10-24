import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { api, type CommentItem } from "../lib/api";
import PulseHeart from "./PulseHeart";
import { visitorId } from "../lib/commentVisitor";
import { readStorage, writeStorage } from "../lib/storage";

const AUTHOR_KEY = "mashu-blog-comment-author";

interface CommentCardProps {
  comment: CommentItem;
  depth: number;
  childrenByParent: Map<number, CommentItem[]>;
  visitor: string;
  onReply: (parentId: number, content: string) => Promise<void>;
  onLike: (commentId: number, liked: boolean, count: number) => void;
}

function CommentCard({ comment, depth, childrenByParent, visitor, onReply, onLike }: CommentCardProps) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [error, setError] = useState("");
  const replies = childrenByParent.get(comment.id) ?? [];

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onReply(comment.id, reply);
      setReply("");
      setReplying(false);
    } catch {
      setError("回复发送失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={depth ? "mt-4 border-l border-black/10 pl-4 dark:border-white/10" : ""}>
      <article className={`rounded-2xl p-4 sm:p-5 ${comment.is_admin ? "bg-pink-50/80 dark:bg-pink-400/[0.08]" : "bg-black/[0.025] dark:bg-white/[0.035]"}`}>
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="text-sm font-semibold dark:text-white/90">{comment.author_name}</strong>
          {comment.is_admin ? <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-[11px] font-medium text-pink-600 dark:text-pink-300">博主</span> : null}
          <time className="text-xs text-ink-faint dark:text-white/35" dateTime={comment.created_at}>
            {format(new Date(comment.created_at), "M月d日 HH:mm", { locale: zhCN })}
          </time>
        </header>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink-soft dark:text-white/65">{comment.content}</p>
        <div className="mt-3 flex items-center gap-3">
          <PulseHeart
            liked={comment.liked}
            count={comment.like_count}
            size={19}
            pillColor="transparent"
            textColor="currentColor"
            idleColor="#8e8e93"
            likedColor="#ec4899"
            disabled={likeBusy}
            onChange={async () => {
              setLikeBusy(true);
              try {
                setError("");
                const result = await api.post<{ liked: boolean; count: number }>(`/comments/${comment.id}/like`, { visitor_id: visitor });
                onLike(comment.id, result.liked, result.count);
              } catch {
                setError("点赞失败，请稍后再试。");
              } finally {
                setLikeBusy(false);
              }
            }}
          />
          <button type="button" className="text-xs text-ink-faint transition hover:text-pink-500 dark:text-white/40" onClick={() => setReplying((value) => !value)}>
            回复
          </button>
        </div>
        {replying ? (
          <form className="mt-3 flex gap-2" onSubmit={submitReply}>
            <input className="field !py-2 text-sm" value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`回复 ${comment.author_name}`} maxLength={2000} autoFocus />
            <button className="btn-primary shrink-0 !px-4 !py-2 text-sm" disabled={busy || !reply.trim()}>{busy ? "发送中" : "发送"}</button>
          </form>
        ) : null}
        {error ? <p role="alert" className="mt-3 text-sm text-red-500">{error}</p> : null}
      </article>
      {replies.map((child) => (
        <CommentCard key={child.id} comment={child} depth={Math.min(depth + 1, 3)} childrenByParent={childrenByParent} visitor={visitor} onReply={onReply} onLike={onLike} />
      ))}
    </div>
  );
}

export default function Comments({ slug }: { slug: string }) {
  return <PostComments key={slug} slug={slug} />;
}

function PostComments({ slug }: { slug: string }) {
  const [visitor] = useState(visitorId);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [author, setAuthor] = useState(() => readStorage(AUTHOR_KEY) ?? "");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.get<CommentItem[]>(`/posts/${encodeURIComponent(slug)}/comments?visitor_id=${encodeURIComponent(visitor)}`, { signal: controller.signal })
      .then(setComments)
      .catch(() => {
        if (!controller.signal.aborted) setError("评论暂时加载失败，请稍后再试。");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, visitor]);

  const childrenByParent = useMemo(() => {
    const map = new Map<number, CommentItem[]>();
    for (const comment of comments) {
      if (comment.parent_id === null) continue;
      const siblings = map.get(comment.parent_id) ?? [];
      siblings.push(comment);
      map.set(comment.parent_id, siblings);
    }
    return map;
  }, [comments]);
  const roots = comments.filter((comment) => comment.parent_id === null);

  async function send(parentId: number | null, text: string) {
    setError("");
    const created = await api.post<CommentItem>(`/posts/${encodeURIComponent(slug)}/comments`, {
      author_name: author.trim(), content: text.trim(), parent_id: parentId, website: "",
    });
    writeStorage(AUTHOR_KEY, author.trim());
    setComments((current) => [...current, created]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!author.trim() || !content.trim()) return;
    setBusy(true);
    try {
      await send(null, content);
      setContent("");
    } catch {
      setError("评论发送失败；如果刚刚发送过多，请稍等一分钟。 ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-14" aria-labelledby="comments-title">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-pink-500">Discussion</p>
          <h2 id="comments-title" className="mt-1 text-xl font-semibold tracking-tight dark:text-white">评论区</h2>
        </div>
        <span className="text-sm text-ink-faint dark:text-white/40">{comments.length} 条讨论</span>
      </div>
      <form className="surface p-5 sm:p-6" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <label className="text-sm font-medium dark:text-white/75">
            你的昵称
            <input className="field mt-2" value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={32} placeholder="怎么称呼你？" />
          </label>
          <label className="text-sm font-medium dark:text-white/75">
            想说的话
            <textarea className="field mt-2 min-h-24 resize-y" value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} placeholder="友善交流，分享你的想法…" />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-faint dark:text-white/35">支持评论回复，也可以给喜欢的评论点个小爱心。</p>
          <button className="btn-primary shrink-0" disabled={loading || busy || !author.trim() || !content.trim()}>{busy ? "发送中…" : "发表评论"}</button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      </form>
      <div className="mt-6 space-y-4">
        {loading ? <p className="py-6 text-center text-sm text-ink-faint">评论加载中…</p> : null}
        {!loading && roots.length === 0 ? <p className="rounded-2xl border border-dashed border-black/10 py-10 text-center text-sm text-ink-faint dark:border-white/10">还没有评论，来坐第一排吧。</p> : null}
        {roots.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            depth={0}
            childrenByParent={childrenByParent}
            visitor={visitor}
            onReply={async (parentId, text) => {
              if (!author.trim()) {
                setError("回复前请先填写上方的昵称。 ");
                throw new Error("missing author");
              }
              await send(parentId, text);
            }}
            onLike={(commentId, liked, count) => setComments((current) => current.map((item) => item.id === commentId ? { ...item, liked, like_count: count } : item))}
          />
        ))}
      </div>
    </section>
  );
}
