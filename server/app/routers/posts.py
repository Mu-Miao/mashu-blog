from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlmodel import select

from .. import crud
from ..db import get_session
from ..deps import optional_admin, require_admin
from ..models import Post, PostTag, Tag

router = APIRouter(tags=["posts"])


@router.get("/posts")
def list_posts(
    page: int = Query(1, ge=1),
    tag: str | None = None,
    all: int = 0,
    size: int = Query(10, ge=1, le=50),
    admin: str | None = Depends(optional_admin),
):
    if all and not admin:
        raise HTTPException(401, "需要登录")
    with get_session() as s:
        q = select(Post)
        if not (all and admin):
            q = q.where(Post.status == "published")
        if tag:
            q = (q.join(PostTag, PostTag.post_id == Post.id)
                 .join(Tag, Tag.id == PostTag.tag_id).where(Tag.name == tag))
        matched = s.exec(q).all()
        total = len(matched)
        matched.sort(key=lambda p: (p.published_at or p.created_at, p.id), reverse=True)
        items = matched[(page - 1) * size: page * size]
        return {
            "items": [crud.post_to_dict(p, include_body=bool(all and admin)) for p in items],
            "total": total, "page": page, "page_size": size,
        }


@router.get("/posts/{slug}")
def get_post(slug: str, admin: str | None = Depends(optional_admin)):
    with get_session() as s:
        p = s.exec(select(Post).where(Post.slug == slug)).first()
        if not p or (p.status != "published" and not admin):
            raise HTTPException(404, "文章不存在")
        return crud.post_to_dict(p, include_body=True)


@router.post("/posts")
def create_post(data: dict, user: str = Depends(require_admin)):
    for field in ("title", "kind", "body"):
        if field not in data:
            raise HTTPException(400, f"缺少字段 {field}")
    with get_session() as s:
        p = crud.create_post(
            s, data["title"], data["kind"], data["body"],
            tags=data.get("tags"), status=data.get("status", "draft"),
            slug=data.get("slug"),
        )
        return crud.post_to_dict(p, include_body=True)


@router.put("/posts/{post_id}")
def update_post(post_id: int, data: dict, user: str = Depends(require_admin)):
    with get_session() as s:
        p = s.get(Post, post_id)
        if not p:
            raise HTTPException(404, "文章不存在")
        crud.update_post(s, p, data)
        return crud.post_to_dict(p, include_body=True)


@router.delete("/posts/{post_id}")
def delete_post(post_id: int, user: str = Depends(require_admin)):
    with get_session() as s:
        p = s.get(Post, post_id)
        if not p:
            raise HTTPException(404, "文章不存在")
        crud.delete_post(s, p)
        return {"ok": True}


@router.get("/tags")
def list_tags():
    with get_session() as s:
        rows = s.exec(select(Tag, PostTag).join(PostTag, PostTag.tag_id == Tag.id)).all()
        counts: dict[str, int] = {}
        for tag, _ in rows:
            counts[tag.name] = counts.get(tag.name, 0) + 1
        return [{"name": n, "count": c} for n, c in sorted(counts.items())]


@router.get("/archive")
def archive():
    groups: dict[str, list] = {}
    with get_session() as s:
        posts = s.exec(
            select(Post).where(Post.status == "published")
            .order_by(Post.published_at.desc())
        ).all()
        for p in posts:
            if not p.published_at:
                continue
            groups.setdefault(p.published_at.strftime("%Y-%m"), []).append(
                crud.post_to_dict(p))
    return [{"ym": ym, "posts": ps} for ym, ps in groups.items()]


@router.get("/search")
def search(q: str = Query(..., min_length=1)):
    with get_session() as s:
        rows = s.execute(
            text("SELECT post_id FROM posts_fts WHERE posts_fts MATCH :q"),
            {"q": '"' + q.replace('"', "") + '"'},
        ).scalars().all()
        ids = list(rows)
        if not ids:
            return []
        posts = s.exec(select(Post).where(Post.id.in_(ids))).all()
        return [crud.post_to_dict(p) for p in posts if p.status == "published"]
