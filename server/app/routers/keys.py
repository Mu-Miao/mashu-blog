from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

from ..db import get_session
from ..deps import require_admin
from ..models import ApiKey, now
from ..security import new_api_key

router = APIRouter(prefix="/api-keys", tags=["keys"])


@router.get("")
def list_keys(user: str = Depends(require_admin)):
    with get_session() as s:
        rows = s.exec(select(ApiKey).where(ApiKey.revoked_at.is_(None))).all()
        return [{"id": k.id, "name": k.name, "created_at": k.created_at} for k in rows]


@router.post("")
def create_key(body: dict, user: str = Depends(require_admin)):
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "需要 name")
    plain, hashed = new_api_key()
    with get_session() as s:
        k = ApiKey(name=name, key_hash=hashed)
        s.add(k)
        s.commit()
        s.refresh(k)
        return {"id": k.id, "name": k.name, "key": plain}


@router.delete("/{key_id}")
def revoke_key(key_id: int, user: str = Depends(require_admin)):
    with get_session() as s:
        k = s.get(ApiKey, key_id)
        if not k or k.revoked_at:
            raise HTTPException(404, "不存在")
        k.revoked_at = now()
        s.add(k)
        s.commit()
        return {"ok": True}
