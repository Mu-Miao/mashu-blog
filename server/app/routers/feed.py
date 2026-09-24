from fastapi import APIRouter, Request
from fastapi.responses import Response
from feedgen.feed import FeedGenerator
from sqlmodel import select

from .. import config
from ..db import get_session
from ..models import Post

router = APIRouter(tags=["feed"])


@router.get("/feed.xml")
def feed(request: Request):
    fg = FeedGenerator()
    fg.title(config.SITE_TITLE)
    fg.link(href=str(request.base_url), rel="self")
    fg.id(str(request.base_url))
    with get_session() as s:
        posts = s.exec(
            select(Post).where(Post.status == "published")
            .order_by(Post.published_at.desc()).limit(20)
        ).all()
    for p in posts:
        fe = fg.add_entry()
        fe.id(f"{request.base_url}post/{p.slug}")
        fe.title(p.title)
        fe.link(href=f"{request.base_url}post/{p.slug}")
        fe.summary(p.summary)
        if p.published_at:
            fe.published(p.published_at.isoformat() + "Z")
    return Response(fg.atom_str(pretty=True), media_type="application/atom+xml")
