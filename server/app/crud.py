from sqlmodel import Session, select
from sqlalchemy import text

from . import security
from .db import sync_fts
from .models import now, Post, PostTag, Tag


def get_or_create_tags(session: Session, names: list[str]) -> list[Tag]:
    tags = []
    for raw in names:
        name = raw.strip()
        if not name:
            continue
        tag = session.exec(select(Tag).where(Tag.name == name)).first()
        if not tag:
            tag = Tag(name=name)
            session.add(tag)
            session.commit()
            session.refresh(tag)
        tags.append(tag)
    return tags


def unique_slug(session: Session, base: str) -> str:
    slug = security.slugify(base)
    candidate = slug
    i = 2
    while session.exec(select(Post).where(Post.slug == candidate)).first():
        candidate = f"{slug}-{i}"
        i += 1
    return candidate


def create_post(
    session: Session,
    title: str,
    kind: str,
    body: str,
    tags: list[str] | None = None,
    status: str = "draft",
    slug: str | None = None,
) -> Post:
    post = Post(
        slug=unique_slug(session, slug or title),
        title=title,
        kind=kind,
        body=body,
        rendered=(
            security.render_markdown(body)
            if kind == "md"
            else security.sanitize_html(body)
        ),
        summary=security.make_summary(
            security.render_markdown(body) if kind == "md" else security.sanitize_html(body)
        ),
        status=status,
        published_at=now() if status == "published" else None,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    for tag in get_or_create_tags(session, tags or []):
        session.add(PostTag(post_id=post.id, tag_id=tag.id))
    session.commit()
    session.refresh(post)
    sync_fts(session)
    return post


def update_post(session: Session, post: Post, data: dict) -> Post:
    tags = data.pop("tags", None)
    if "slug" in data and data["slug"] and data["slug"] != post.slug:
        post.slug = unique_slug(session, data["slug"])
    for field in ("title", "kind", "body", "status"):
        if field in data:
            setattr(post, field, data[field])
    if "body" in data or "kind" in data:
        post.rendered = (
            security.render_markdown(post.body)
            if post.kind == "md"
            else security.sanitize_html(post.body)
        )
        post.summary = security.make_summary(post.rendered)
    if post.status == "published" and not post.published_at:
        post.published_at = now()
    post.updated_at = now()
    session.add(post)
    session.commit()
    if tags is not None:
        session.execute(
            text("DELETE FROM posttag WHERE post_id = :p"), {"p": post.id}
        )
        for tag in get_or_create_tags(session, tags):
            session.add(PostTag(post_id=post.id, tag_id=tag.id))
        session.commit()
    session.refresh(post)
    sync_fts(session)
    return post


def delete_post(session: Session, post: Post) -> None:
    session.execute(text("DELETE FROM posttag WHERE post_id = :p"), {"p": post.id})
    session.delete(post)
    session.commit()
    sync_fts(session)


def post_to_dict(post: Post, include_body: bool = False) -> dict:
    data = {
        "id": post.id,
        "slug": post.slug,
        "title": post.title,
        "kind": post.kind,
        "summary": post.summary,
        "status": post.status,
        "published_at": post.published_at,
        "created_at": post.created_at,
        "tags": [t.name for t in post.tags],
    }
    if include_body:
        data["body"] = post.body
        data["rendered"] = post.rendered
    return data
