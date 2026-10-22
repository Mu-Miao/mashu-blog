from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Row, or_, text
from sqlalchemy.orm import defer
from sqlmodel import func, select

from .. import crud
from ..db import get_session
from ..deps import optional_admin, require_admin
from ..models import Post, PostTag, Tag

router = APIRouter(tags=["posts"])


@router.get("/posts")
def list_posts(
    page: int = Query(1, ge=1),
    tag: str | None = None,
    topic: str | None = None,
    keyword: str | None = Query(None, alias="q", max_length=200),
    all: int = 0,
    size: int = Query(10, ge=1, le=50),
    admin: str | None = Depends(optional_admin),
):
    if all and not admin:
        raise HTTPException(401, "需要登录")
    include_body = bool(all and admin)
    keyword_value = keyword.strip() if keyword else ""
    with get_session() as s:
        statement = select(Post)
        count_statement = select(func.count()).select_from(Post)
        conditions = []
        if not include_body:
            conditions.append(Post.status == "published")
        if tag:
            statement = (statement.join(PostTag, PostTag.post_id == Post.id)
                         .join(Tag, Tag.id == PostTag.tag_id))
            count_statement = (count_statement.join(PostTag, PostTag.post_id == Post.id)
                               .join(Tag, Tag.id == PostTag.tag_id))
            conditions.append(Tag.name == tag)
        if topic:
            conditions.append(Post.tags.any(Tag.name == topic))
        if keyword_value:
            conditions.append(or_(
                Post.title.contains(keyword_value, autoescape=True),
                Post.body.contains(keyword_value, autoescape=True),
            ))
        statement = statement.where(*conditions)
        count_statement = count_statement.where(*conditions)
        total = int(s.exec(count_statement).one())
        statement = (
            statement.order_by(
                func.coalesce(Post.published_at, Post.created_at).desc(),
                Post.id.desc(),
            )
            .offset((page - 1) * size)
            .limit(size)
        )
        if not include_body:
            statement = statement.options(defer(Post.body), defer(Post.rendered))
        items = s.exec(statement).all()
        return {
            "items": [crud.post_to_dict(p, include_body=include_body) for p in items],
            "total": total, "page": page, "page_size": size,
        }


@router.get("/posts/{slug}")
def get_post(slug: str, admin: str | None = Depends(optional_admin)):
    with get_session() as s:
        p = s.exec(select(Post).where(Post.slug == slug)).first()
        if not p or (p.status != "published" and not admin):
            raise HTTPException(404, "文章不存在")
        return crud.post_to_dict(p, include_body=True)


@router.get("/posts/{slug}/adjacent")
def post_adjacent(slug: str):
    def key(p: Post):
        return (p.published_at or p.created_at, p.id)

    with get_session() as s:
        p = s.exec(select(Post).where(Post.slug == slug, Post.status == "published")).first()
        if not p:
            raise HTTPException(404, "文章不存在")
        pub = s.exec(select(Post).where(Post.status == "published")).all()
        pub.sort(key=key)
        idx = pub.index(p)
        prev = pub[idx - 1] if idx > 0 else None
        nxt = pub[idx + 1] if idx < len(pub) - 1 else None

        tag_ids = [t.id for t in p.tags]
        related = []
        if tag_ids:
            rows: list[Row] = s.exec(
                select(Post, func.count(PostTag.tag_id).label("shared"))
                .join(PostTag, PostTag.post_id == Post.id)
                .where(PostTag.tag_id.in_(tag_ids), Post.status == "published",
                       Post.id != p.id)
                .group_by(Post.id)
                .order_by(None)
            ).all()
            rows.sort(key=lambda r: (r[1], key(r[0])), reverse=True)
            related = [crud.post_to_dict(r[0]) for r in rows[:3]]
        return {
            "prev": crud.post_to_dict(prev) if prev else None,
            "next": crud.post_to_dict(nxt) if nxt else None,
            "related": related,
        }


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
    q = q.replace('"', "").strip()
    if not q:
        return []
    with get_session() as s:
        fts_ok = False
        ids: list[int] = []
        if len(q) >= 3:
            try:
                ids = list(s.execute(
                    text("SELECT post_id FROM posts_fts WHERE posts_fts MATCH :q"),
                    {"q": '"' + q + '"'},
                ).scalars().all())
                fts_ok = True
            except Exception:
                fts_ok = False
        if fts_ok:
            if not ids:
                return []
            posts = s.exec(
                select(Post).where(Post.id.in_(ids), Post.status == "published")
            ).all()
            return [crud.post_to_dict(p) for p in posts]
        posts = s.exec(
            select(Post).where(
                or_(Post.title.contains(q, autoescape=True),
                    Post.body.contains(q, autoescape=True)),
                Post.status == "published",
            )
        ).all()
        return [crud.post_to_dict(p) for p in posts]
