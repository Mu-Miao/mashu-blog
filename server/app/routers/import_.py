from pathlib import PurePosixPath

from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..crud import create_post
from ..db import get_session
from ..deps import require_write
from ..security import parse_frontmatter

router = APIRouter(tags=["import"])


@router.post("/import")
def import_file(file: UploadFile = File(...), user: str = Depends(require_write)):
    name = file.filename or "untitled"
    ext = PurePosixPath(name).suffix.lower()
    raw = file.file.read(2 * 1024 * 1024).decode("utf-8", "replace")
    stem = PurePosixPath(name).stem

    if ext == ".md":
        meta, body = parse_frontmatter(raw)
        title = str(meta.get("title") or stem)
        tags = meta.get("tags") or []
        if isinstance(tags, str):
            tags = [tags]
        status = str(meta.get("status", "published"))
        slug = meta.get("slug") or None
        kind = "md"
    elif ext in (".html", ".htm"):
        soup = BeautifulSoup(raw, "html.parser")
        title = soup.title.get_text(strip=True) if soup.title else stem
        body_node = soup.body or soup
        raw_html = body_node.decode_contents() if soup.body else raw
        from ..security import sanitize_html
        body = sanitize_html(raw_html)
        tags, status, slug, kind = [], "published", None, "html"
    else:
        raise HTTPException(400, "仅支持 .md / .html 文件")

    with get_session() as s:
        p = create_post(s, title, kind, body, tags=list(tags),
                        status=status, slug=slug)
        from ..crud import post_to_dict
        return post_to_dict(p, include_body=True)
