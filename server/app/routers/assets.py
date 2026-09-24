import secrets

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import select

from .. import config
from ..db import get_session
from ..deps import require_admin
from ..models import Asset

router = APIRouter(prefix="/assets", tags=["assets"])

MAGIC = {
    b"\x89PNG\r\n\x1a\n": "png",
    b"\xff\xd8\xff": "jpg",
    b"GIF87a": "gif",
    b"GIF89a": "gif",
}
MAX_SIZE = 5 * 1024 * 1024


def _detect(name: str, head: bytes) -> str | None:
    for magic, ext in MAGIC.items():
        if head.startswith(magic):
            return ext
    if head[0:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    return None


@router.post("")
def upload_asset(file: UploadFile = File(...), user: str = Depends(require_admin)):
    data = file.file.read(MAX_SIZE + 1)
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "文件超过 5MB")
    ext = _detect(file.filename or "", data[:16])
    if not ext:
        raise HTTPException(400, "仅支持 jpg/png/gif/webp")
    name = f"{secrets.token_hex(8)}.{ext}"
    (config.UPLOADS_DIR / name).write_bytes(data)
    with get_session() as s:
        a = Asset(filename=name, mime=f"image/{'jpeg' if ext == 'jpg' else ext}",
                  size=len(data))
        s.add(a)
        s.commit()
        s.refresh(a)
        return {"id": a.id, "url": f"/uploads/{name}", "size": a.size}


@router.get("")
def list_assets(user: str = Depends(require_admin)):
    with get_session() as s:
        rows = s.exec(select(Asset).order_by(Asset.id.desc())).all()
        return [{"id": a.id, "url": f"/uploads/{a.filename}", "size": a.size,
                 "created_at": a.created_at} for a in rows]
