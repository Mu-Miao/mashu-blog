from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel

try:  # sqlmodel>=0.0.30 强制 tz-aware，需 NaiveDatetime；旧版直接用 datetime
    from sqlmodel.main import NaiveDatetime
except ImportError:
    from datetime import datetime as NaiveDatetime


def now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    created_at: NaiveDatetime = Field(default_factory=now)


class PostTag(SQLModel, table=True):
    post_id: int = Field(foreign_key="post.id", primary_key=True)
    tag_id: int = Field(foreign_key="tag.id", primary_key=True)


class Tag(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    posts: list["Post"] = Relationship(back_populates="tags", link_model=PostTag)


class Post(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    kind: str = "md"
    body: str
    rendered: str = ""
    summary: str = ""
    status: str = "draft"
    published_at: NaiveDatetime | None = None
    created_at: NaiveDatetime = Field(default_factory=now)
    updated_at: NaiveDatetime = Field(default_factory=now)
    tags: list[Tag] = Relationship(back_populates="posts", link_model=PostTag)


class Asset(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    filename: str
    mime: str
    size: int
    created_at: NaiveDatetime = Field(default_factory=now)


class ApiKey(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    key_hash: str = Field(index=True, unique=True)
    created_at: NaiveDatetime = Field(default_factory=now)
    revoked_at: NaiveDatetime | None = None
