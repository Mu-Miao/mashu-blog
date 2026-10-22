from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import event, text
from sqlmodel import Session, SQLModel, create_engine

from . import config

db_path = Path(config.DATABASE_URL.removeprefix("sqlite:///"))
db_path.parent.mkdir(parents=True, exist_ok=True)
config.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(config.DATABASE_URL, connect_args={"check_same_thread": False})

if config.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

FTS_SQL = (
    "CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5("
    "post_id UNINDEXED, title, body, tokenize='trigram')"
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    from sqlalchemy import text
    with engine.begin() as c:
        row = c.execute(text(
            "SELECT sql FROM sqlite_master WHERE name='posts_fts'")).fetchone()
        if row and "trigram" not in (row[0] or ""):
            c.execute(text("DROP TABLE posts_fts"))
        c.execute(text(FTS_SQL))
    with Session(engine) as s:
        sync_fts(s)


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


def sync_post_fts(session: Session, post_id: int, title: str, body: str) -> None:
    session.execute(text("DELETE FROM posts_fts WHERE post_id = :i"), {"i": post_id})
    session.execute(
        text("INSERT INTO posts_fts(post_id, title, body) VALUES (:i, :t, :b)"),
        {"i": post_id, "t": title, "b": body},
    )
    session.commit()


def remove_post_fts(session: Session, post_id: int) -> None:
    session.execute(text("DELETE FROM posts_fts WHERE post_id = :i"), {"i": post_id})
    session.commit()


@contextmanager
def get_session():
    with Session(engine) as s:
        yield s
