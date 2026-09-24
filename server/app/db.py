from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from . import config

db_path = Path(config.DATABASE_URL.removeprefix("sqlite:///"))
db_path.parent.mkdir(parents=True, exist_ok=True)
config.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(config.DATABASE_URL, connect_args={"check_same_thread": False})

FTS_SQL = (
    "CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5("
    "post_id UNINDEXED, title, body, tokenize='unicode61')"
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    with engine.begin() as c:
        c.execute(text(FTS_SQL))


def sync_fts(session: Session) -> None:
    from sqlmodel import select

    from .models import Post

    session.execute(text("DELETE FROM posts_fts"))
    for p in session.exec(select(Post)).all():
        session.execute(
            text("INSERT INTO posts_fts(post_id, title, body) VALUES (:i, :t, :b)"),
            {"i": p.id, "t": p.title, "b": p.body},
        )
    session.commit()


@contextmanager
def get_session():
    with Session(engine) as s:
        yield s
