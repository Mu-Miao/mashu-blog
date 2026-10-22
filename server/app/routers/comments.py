import re
import time

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlmodel import func, select

from ..db import get_session
from ..deps import require_admin
from ..models import Comment, CommentLike, Post

router = APIRouter(tags=["comments"])

_VISITOR_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")
_comment_attempts: dict[str, list[float]] = {}
COMMENT_WINDOW_SECONDS = 60
COMMENT_LIMIT = 6


class CommentCreate(BaseModel):
    author_name: str = Field(min_length=1, max_length=32)
    content: str = Field(min_length=1, max_length=2000)
    parent_id: int | None = None
    website: str = Field(default="", max_length=0)


class LikeToggle(BaseModel):
    visitor_id: str = Field(min_length=16, max_length=64)


class AdminReply(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


def _clean(value: str) -> str:
    return " ".join(value.strip().split())


def _client_ip(request: Request) -> str:
    return (request.headers.get("X-Real-IP")
            or request.headers.get("CF-Connecting-IP")
            or (request.client.host if request.client else "?"))


def _prune_attempts() -> None:
    if len(_comment_attempts) < 512:
        return
    now = time.monotonic()
    for key in [k for k, v in _comment_attempts.items()
                if not v or now - v[-1] >= COMMENT_WINDOW_SECONDS]:
        _comment_attempts.pop(key, None)


def _check_comment_rate(ip: str) -> None:
    _prune_attempts()
    now = time.monotonic()
    recent = [t for t in _comment_attempts.get(ip, []) if now - t < COMMENT_WINDOW_SECONDS]
    if len(recent) >= COMMENT_LIMIT:
        raise HTTPException(429, "评论太频繁，请稍后再试")
    recent.append(now)
    _comment_attempts[ip] = recent


def _public_comments(
    session, comments: list[Comment], visitor_id: str | None = None
) -> list[dict]:
    ids = [c.id for c in comments if c.id is not None]
    counts: dict[int, int] = {}
    liked_ids: set[int] = set()
    if ids:
        counts = dict(session.exec(
            select(CommentLike.comment_id, func.count())
            .where(CommentLike.comment_id.in_(ids))
            .group_by(CommentLike.comment_id)
        ).all())
        if visitor_id:
            liked_ids = set(session.exec(
                select(CommentLike.comment_id)
                .where(CommentLike.comment_id.in_(ids),
                       CommentLike.visitor_id == visitor_id)
            ).all())
    result = []
    for comment in comments:
        result.append({
            "id": comment.id,
            "parent_id": comment.parent_id,
            "author_name": comment.author_name,
            "content": comment.content,
            "is_admin": comment.is_admin,
            "created_at": comment.created_at,
            "like_count": int(counts.get(comment.id, 0)),
            "liked": comment.id in liked_ids,
        })
    return result


def _public_comment(session, comment: Comment, visitor_id: str | None = None) -> dict:
    return _public_comments(session, [comment], visitor_id)[0]


@router.get("/posts/{slug}/comments")
def list_comments(slug: str, visitor_id: str | None = Query(default=None, max_length=64)):
    if visitor_id and not _VISITOR_RE.fullmatch(visitor_id):
        raise HTTPException(422, "访客标识无效")
    with get_session() as session:
        post = session.exec(select(Post).where(Post.slug == slug, Post.status == "published")).first()
        if not post:
            raise HTTPException(404, "文章不存在")
        comments = session.exec(
            select(Comment).where(Comment.post_id == post.id).order_by(Comment.created_at, Comment.id)
        ).all()
        return _public_comments(session, comments, visitor_id)


@router.post("/posts/{slug}/comments", status_code=201)
def create_comment(slug: str, body: CommentCreate, request: Request):
    _check_comment_rate(_client_ip(request))
    author_name = _clean(body.author_name)
    content = body.content.strip()
    if not author_name or not content:
        raise HTTPException(422, "昵称和评论内容不能为空")
    with get_session() as session:
        post = session.exec(select(Post).where(Post.slug == slug, Post.status == "published")).first()
        if not post:
            raise HTTPException(404, "文章不存在")
        if body.parent_id is not None:
            parent = session.get(Comment, body.parent_id)
            if not parent or parent.post_id != post.id:
                raise HTTPException(404, "要回复的评论不存在")
        comment = Comment(
            post_id=post.id,
            parent_id=body.parent_id,
            author_name=author_name,
            content=content,
        )
        session.add(comment)
        session.commit()
        session.refresh(comment)
        return _public_comment(session, comment)


@router.post("/comments/{comment_id}/like")
def toggle_like(comment_id: int, body: LikeToggle):
    if not _VISITOR_RE.fullmatch(body.visitor_id):
        raise HTTPException(422, "访客标识无效")
    with get_session() as session:
        comment = session.get(Comment, comment_id)
        if not comment:
            raise HTTPException(404, "评论不存在")
        existing = session.get(CommentLike, (comment_id, body.visitor_id))
        if existing:
            session.delete(existing)
        else:
            session.add(CommentLike(comment_id=comment_id, visitor_id=body.visitor_id))
        session.commit()
        public = _public_comments(session, [comment], body.visitor_id)[0]
        return {"liked": public["liked"], "count": public["like_count"]}


@router.get("/admin/comments")
def admin_comments(_: str = Depends(require_admin)):
    with get_session() as session:
        rows = session.exec(
            select(Comment, Post)
            .join(Post, Post.id == Comment.post_id)
            .where(Comment.is_admin.is_(False))
            .order_by(Comment.created_at.desc(), Comment.id.desc())
        ).all()
        public = _public_comments(session, [comment for comment, _ in rows])
        return [{
            **item,
            "post_slug": post.slug,
            "post_title": post.title,
            "is_read": comment.is_read,
        } for (comment, post), item in zip(rows, public)]


@router.get("/admin/comments/unread-count")
def unread_count(_: str = Depends(require_admin)):
    with get_session() as session:
        count = session.exec(
            select(func.count()).select_from(Comment)
            .where(Comment.is_admin.is_(False), Comment.is_read.is_(False))
        ).one()
        return {"count": int(count)}


@router.post("/admin/comments/read-all")
def mark_all_read(_: str = Depends(require_admin)):
    with get_session() as session:
        comments = session.exec(
            select(Comment).where(Comment.is_admin.is_(False), Comment.is_read.is_(False))
        ).all()
        for comment in comments:
            comment.is_read = True
            session.add(comment)
        session.commit()
        return {"updated": len(comments)}


@router.post("/admin/comments/{comment_id}/reply", status_code=201)
def admin_reply(comment_id: int, body: AdminReply, _: str = Depends(require_admin)):
    content = body.content.strip()
    if not content:
        raise HTTPException(422, "回复内容不能为空")
    with get_session() as session:
        parent = session.get(Comment, comment_id)
        if not parent:
            raise HTTPException(404, "评论不存在")
        parent.is_read = True
        reply = Comment(
            post_id=parent.post_id,
            parent_id=parent.id,
            author_name="博主",
            content=content,
            is_admin=True,
            is_read=True,
        )
        session.add(parent)
        session.add(reply)
        session.commit()
        session.refresh(reply)
        return _public_comment(session, reply)
