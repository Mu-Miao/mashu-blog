import json
import re
from datetime import datetime, timezone
from html import escape
from urllib.parse import quote
from xml.etree import ElementTree as ET

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from sqlmodel import select

from .. import config, crud
from ..db import get_session
from ..models import Post

router = APIRouter(tags=["seo"])

SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", SITEMAP_NS)


def absolute_url(path: str = "") -> str:
    return f"{config.SITE_URL}/{path.lstrip('/')}" if path else f"{config.SITE_URL}/"


def iso_utc(value: datetime) -> str:
    aware = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return aware.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def add_sitemap_url(root: ET.Element, loc: str, lastmod: datetime | None = None) -> None:
    node = ET.SubElement(root, f"{{{SITEMAP_NS}}}url")
    ET.SubElement(node, f"{{{SITEMAP_NS}}}loc").text = loc
    if lastmod:
        ET.SubElement(node, f"{{{SITEMAP_NS}}}lastmod").text = iso_utc(lastmod)


@router.get("/robots.txt", include_in_schema=False)
def robots() -> PlainTextResponse:
    body = "\n".join([
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin/",
        "Disallow: /search",
        "",
        f"Sitemap: {absolute_url('sitemap.xml')}",
        "",
    ])
    return PlainTextResponse(
        body,
        headers={
            "Cache-Control": "no-cache, max-age=0, must-revalidate",
            "Cloudflare-CDN-Cache-Control": "no-store",
        },
    )


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap() -> Response:
    root = ET.Element(f"{{{SITEMAP_NS}}}urlset")
    with get_session() as session:
        posts = session.exec(
            select(Post).where(Post.status == "published")
            .order_by(Post.updated_at.desc())
        ).all()
        newest = posts[0].updated_at if posts else None
        add_sitemap_url(root, absolute_url(), newest)
        add_sitemap_url(root, absolute_url("archive"), newest)
        add_sitemap_url(root, absolute_url("tools"))
        add_sitemap_url(root, absolute_url("teaching"), newest)

        tags: set[str] = set()
        for post in posts:
            add_sitemap_url(root, absolute_url(f"post/{quote(post.slug, safe='')}"), post.updated_at)
            tags.update(tag.name for tag in post.tags)
        for tag in sorted(tags):
            add_sitemap_url(root, absolute_url(f"tag/{quote(tag, safe='')}"), newest)

    xml = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    return Response(
        xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=300"},
    )


_spa_cache: tuple[float, str] | None = None


def spa_template() -> str:
    global _spa_cache
    index = config.STATIC_DIR / "index.html"
    try:
        mtime = index.stat().st_mtime
    except OSError:
        return "<!doctype html><html lang=\"zh-CN\"><head><title></title></head><body><div id=\"root\"></div></body></html>"
    if _spa_cache and _spa_cache[0] == mtime:
        return _spa_cache[1]
    text = index.read_text(encoding="utf-8")
    _spa_cache = (mtime, text)
    return text


def replace_or_insert_meta(page: str, *, name: str, content: str) -> str:
    tag = f'<meta name="{name}" content="{escape(content, quote=True)}" />'
    pattern = rf'<meta\s+name=["\']{re.escape(name)}["\'][^>]*>'
    if re.search(pattern, page, flags=re.IGNORECASE):
        return re.sub(pattern, lambda _: tag, page, count=1, flags=re.IGNORECASE)
    return page.replace("</head>", f"    {tag}\n  </head>", 1)


def article_page(post: Post | None, *, status_code: int = 200) -> HTMLResponse:
    if post:
        title = f"{post.title} · 麻薯ta爸"
        description = post.summary or config.SITE_DESCRIPTION
        canonical = absolute_url(f"post/{quote(post.slug, safe='')}")
        robots_value = "index, follow, max-image-preview:large"
        published = iso_utc(post.published_at or post.created_at)
        modified = iso_utc(post.updated_at)
        structured = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": description,
            "datePublished": published,
            "dateModified": modified,
            "mainEntityOfPage": canonical,
            "author": {"@type": "Person", "name": "麻薯ta爸"},
            "publisher": {"@type": "Person", "name": "麻薯ta爸"},
            "keywords": [tag.name for tag in post.tags],
        }
        fallback = (
            '<article data-seo-fallback style="max-width:760px;margin:96px auto;padding:0 20px;line-height:1.8">'
            f"<h1>{escape(post.title)}</h1>{crud.rendered_for_post(post)}</article>"
        )
    else:
        title = f"文章不存在 · {config.SITE_TITLE}"
        description = "这篇文章可能还是草稿，或者从未发表。"
        canonical = ""
        robots_value = "noindex, nofollow"
        structured = None
        fallback = '<main data-seo-fallback><h1>文章不存在</h1></main>'

    page = spa_template()
    page = re.sub(
        r"<title>.*?</title>",
        lambda _: f"<title>{escape(title)}</title>",
        page,
        count=1,
        flags=re.IGNORECASE | re.DOTALL,
    )
    page = replace_or_insert_meta(page, name="description", content=description)
    page = replace_or_insert_meta(page, name="robots", content=robots_value)

    head_tags = []
    if canonical:
        head_tags.extend([
            f'<link rel="canonical" href="{escape(canonical, quote=True)}" />',
            '<meta property="og:type" content="article" />',
            f'<meta property="og:title" content="{escape(title, quote=True)}" />',
            f'<meta property="og:description" content="{escape(description, quote=True)}" />',
            f'<meta property="og:url" content="{escape(canonical, quote=True)}" />',
            '<meta property="og:site_name" content="麻薯ta爸的博客" />',
            '<meta name="twitter:card" content="summary" />',
        ])
    if structured:
        payload = json.dumps(structured, ensure_ascii=False).replace("<", "\\u003c")
        head_tags.append(f'<script type="application/ld+json" id="seo-jsonld">{payload}</script>')
    if head_tags:
        page = page.replace("</head>", "    " + "\n    ".join(head_tags) + "\n  </head>", 1)
    page = page.replace('<div id="root"></div>', f'<div id="root">{fallback}</div>', 1)

    return HTMLResponse(
        page,
        status_code=status_code,
        headers={
            "Cache-Control": "public, max-age=300" if post else "no-store",
            "X-Robots-Tag": robots_value,
        },
    )


@router.get("/post/{slug}", include_in_schema=False)
def seo_post(slug: str) -> HTMLResponse:
    with get_session() as session:
        post = session.exec(
            select(Post).where(Post.slug == slug, Post.status == "published")
        ).first()
        if not post:
            return article_page(None, status_code=404)
        # Relationships are loaded while the session is active for metadata generation.
        _ = [tag.name for tag in post.tags]
        return article_page(post)
