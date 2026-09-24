import os
from pathlib import Path

BLOG_DIR = Path(os.environ.get("BLOG_DIR", "./.blogdata"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BLOG_DIR / 'blog.db'}")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
UPLOADS_DIR = BLOG_DIR / "uploads"
SITE_TITLE = os.environ.get("SITE_TITLE", "马叔塔巴的博客")
STATIC_DIR = Path(os.environ.get("STATIC_DIR", Path(__file__).resolve().parents[2] / "web" / "dist"))
