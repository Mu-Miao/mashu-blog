from fastapi import Cookie, HTTPException, Request
from sqlmodel import select

from .db import get_session
from .models import ApiKey
from .security import decode_token, hash_api_key


def require_admin(blog_session: str | None = Cookie(None)) -> str:
    if not blog_session or decode_token(blog_session) != "admin":
        raise HTTPException(401, "未登录")
    return "admin"


def optional_admin(blog_session: str | None = Cookie(None)) -> str | None:
    if blog_session and decode_token(blog_session) == "admin":
        return "admin"
    return None


def require_write(request: Request, blog_session: str | None = Cookie(None)) -> str:
    if blog_session and decode_token(blog_session) == "admin":
        return "admin"
    key = request.headers.get("X-API-Key")
    if not key:
        raise HTTPException(401, "未登录")
    with get_session() as s:
        k = s.exec(
            select(ApiKey).where(
                ApiKey.key_hash == hash_api_key(key), ApiKey.revoked_at.is_(None)
            )
        ).first()
    if not k:
        raise HTTPException(401, "API Key 无效")
    return f"apikey:{k.name}"
