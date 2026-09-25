import os
from pathlib import Path

BLOG_DIR = Path(os.environ.get("BLOG_DIR", "./.blogdata"))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BLOG_DIR / 'blog.db'}")
SECRET_KEY = os.environ.get("SECRET_KEY", "")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
if not SECRET_KEY or SECRET_KEY == "dev-secret":
    raise RuntimeError("缺少 SECRET_KEY：请在 /etc/blog.env 配置随机密钥（deploy/provision.sh 可生成）")
if not ADMIN_PASSWORD or ADMIN_PASSWORD == "admin123":
    raise RuntimeError("缺少 ADMIN_PASSWORD：请在 /etc/blog.env 配置强密码")
UPLOADS_DIR = BLOG_DIR / "uploads"
SITE_TITLE = os.environ.get("SITE_TITLE", "马叔塔巴的博客")
STATIC_DIR = Path(os.environ.get("STATIC_DIR", Path(__file__).resolve().parents[2] / "web" / "dist"))
