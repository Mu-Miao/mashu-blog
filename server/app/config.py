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


def _env_flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


# 入口是 HTTPS 时才开启；HTTP 下开启会导致登录 Cookie 不下发
COOKIE_SECURE = _env_flag("COOKIE_SECURE")
ENABLE_DOCS = _env_flag("ENABLE_DOCS")

SITE_TITLE = os.environ.get("SITE_TITLE", "麻薯ta爸的博客")
SITE_URL = os.environ.get("SITE_URL", "https://blog.mashutaba.best").rstrip("/")
SITE_DESCRIPTION = os.environ.get(
    "SITE_DESCRIPTION",
    "麻薯ta爸记录嵌入式、编程实践与生活思考的个人博客。",
)
_DEFAULT_STATIC_DIR = Path(__file__).resolve().parents[2] / "web" / "dist"
if not _DEFAULT_STATIC_DIR.is_dir() and Path("/var/www/blog/index.html").is_file():
    _DEFAULT_STATIC_DIR = Path("/var/www/blog")
STATIC_DIR = Path(os.environ.get("STATIC_DIR", _DEFAULT_STATIC_DIR))
