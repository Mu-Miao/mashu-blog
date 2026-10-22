from urllib.parse import quote

from fastapi import APIRouter
from fastapi.responses import Response
from feedgen.feed import FeedGenerator
from sqlmodel import select

from .. import config
from ..db import get_session
from ..models import Post

router = APIRouter(tags=["feed"])


@router.get("/feed.xml")
def feed():
    base = config.SITE_URL.rstrip("/")
    feed_url = f"{base}/api/v1/feed.xml"
    fg = FeedGenerator()
    fg.title(config.SITE_TITLE)
    fg.link(href=feed_url, rel="self")
    fg.id(feed_url)
    with get_session() as s:
        posts = s.exec(
            select(Post).where(Post.status == "published")
            .order_by(Post.published_at.desc()).limit(20)
        ).all()
    for p in posts:
        article_url = f"{base}/post/{quote(p.slug, safe='')}"
        fe = fg.add_entry()
        fe.id(article_url)
        fe.title(p.title)
        fe.link(href=article_url)
        fe.summary(p.summary)
        if p.published_at:
            fe.published(p.published_at.isoformat() + "Z")
    return Response(fg.atom_str(pretty=True), media_type="application/atom+xml")
