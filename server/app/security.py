import hashlib
import re
import secrets
import unicodedata
from datetime import datetime, timedelta, timezone

import bcrypt
import markdown
import nh3
import frontmatter as _fm
from jose import jwt

from . import config

ALLOWED_TAGS = {
    "p", "div", "span", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "em", "b", "i", "u", "s", "sup", "sub", "blockquote", "pre",
    "code", "ul", "ol", "li", "a", "img", "table", "thead", "tbody", "tfoot",
    "tr", "td", "th", "figure", "figcaption", "details", "summary", "del",
    "ins", "kbd", "abbr", "cite", "q",
}
ALLOWED_ATTRS = {
    "*": {"class", "id", "style"},
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title", "width", "height"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
    "ol": {"start"},
    "blockquote": {"cite"},
    "abbr": {"title"},
}
ALLOWED_PROTOCOLS = {"http", "https", "mailto"}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(sub: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": sub, "exp": exp}, config.SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> str | None:
    try:
        return jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"]).get("sub")
    except Exception:
        return None


def sanitize_html(raw: str) -> str:
    return nh3.clean(
        raw,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        link_rel="noopener noreferrer",
        url_schemes=ALLOWED_PROTOCOLS,
    )


def render_markdown(md_text: str) -> str:
    html = markdown.markdown(
        md_text,
        extensions=[
            "fenced_code", "tables", "toc", "nl2br",
            "pymdownx.highlight", "pymdownx.superfences",
        ],
    )
    return sanitize_html(html)


_TAG_RE = re.compile(r"<[^>]+>")


def make_summary(rendered: str, limit: int = 120) -> str:
    text = _TAG_RE.sub(" ", rendered)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


_ASCII_RE = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    norm = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = _ASCII_RE.sub("-", norm.lower()).strip("-")
    return slug or f"post-{secrets.token_hex(4)}"


def parse_frontmatter(text_content: str) -> tuple[dict, str]:
    try:
        post = _fm.loads(text_content)
        return dict(post.metadata), post.content
    except Exception:
        return {}, text_content


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def new_api_key() -> tuple[str, str]:
    plain = secrets.token_hex(24)
    return plain, hash_api_key(plain)
