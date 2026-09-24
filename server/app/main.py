from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from . import config
from .db import get_session, init_db
from .models import User
from .routers import assets, auth, feed, import_, keys, posts
from .security import hash_password


def _ensure_admin() -> None:
    with get_session() as s:
        if not s.exec(select(User).where(User.username == config.ADMIN_USER)).first():
            s.add(User(username=config.ADMIN_USER,
                       password_hash=hash_password(config.ADMIN_PASSWORD)))
            s.commit()


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        init_db()
        _ensure_admin()
        yield

    app = FastAPI(title="mashu-blog", lifespan=lifespan)
    api = "/api/v1"
    app.include_router(auth.router, prefix=api)
    app.include_router(posts.router, prefix=api)
    app.include_router(assets.router, prefix=api)
    app.include_router(keys.router, prefix=api)
    app.include_router(import_.router, prefix=api)
    app.include_router(feed.router, prefix=api)
    app.mount("/uploads", StaticFiles(directory=config.UPLOADS_DIR), name="uploads")

    dist = config.STATIC_DIR
    if dist.is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="spa-assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str):
            file = (dist / path).resolve()
            if path and file.is_file() and file.is_relative_to(dist.resolve()):
                return FileResponse(file)
            return FileResponse(dist / "index.html")
    return app


app = create_app()
