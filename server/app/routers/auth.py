import time

from fastapi import APIRouter, Depends, Request, Response
from sqlmodel import select

from .. import config
from ..db import get_session
from ..deps import require_admin
from ..models import User
from ..security import create_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
_attempts: dict[str, list[float]] = {}
LOCK_AFTER, LOCK_SECONDS = 5, 600


def _prune_attempts() -> None:
    if len(_attempts) < 512:
        return
    now = time.monotonic()
    for key in [k for k, v in _attempts.items() if not v or now - v[-1] >= LOCK_SECONDS]:
        _attempts.pop(key, None)


def _locked(ip: str) -> bool:
    _prune_attempts()
    t = time.monotonic()
    fails = [x for x in _attempts.get(ip, []) if t - x < LOCK_SECONDS]
    _attempts[ip] = fails
    return len(fails) >= LOCK_AFTER


@router.post("/login")
def login(body: dict, request: Request, response: Response):
    ip = (request.headers.get("X-Real-IP")
          or request.headers.get("CF-Connecting-IP")
          or (request.client.host if request.client else "?"))
    if _locked(ip):
        return Response(status_code=429)
    with get_session() as s:
        u = s.exec(select(User).where(User.username == body.get("username"))).first()
    if not u or not verify_password(body.get("password", ""), u.password_hash):
        _attempts.setdefault(ip, []).append(time.monotonic())
        return Response(status_code=401)
    _attempts.pop(ip, None)
    response.set_cookie(
        "blog_session", create_token("admin"),
        httponly=True, samesite="lax", secure=config.COOKIE_SECURE,
        max_age=7 * 86400, path="/",
    )
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("blog_session", path="/")
    return {"ok": True}


@router.get("/me")
def me(user: str = Depends(require_admin)):
    return {"username": "admin"}
