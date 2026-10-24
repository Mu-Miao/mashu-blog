import { Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import GlassSurface from "./GlassSurface";
import GradualBlur from "./GradualBlur";
import { useTheme } from "../lib/themeContext";
import BrandLogo from "./BrandLogo";

const nav =
  "rounded-pill px-4 py-1.5 text-sm text-ink/80 transition hover:bg-black/5 hover:text-ink dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white";
const navActive = "bg-black/[0.06] font-medium text-ink dark:bg-white/15 dark:text-white";
const links = [
  { to: "/", label: "首页", end: true },
  { to: "/teaching", label: "教学篇" },
  { to: "/archive", label: "归档" },
  { to: "/tools", label: "工具" },
  { to: "/search", label: "搜索" },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
      onClick={toggle}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-black/5 active:scale-95 dark:text-white/70 dark:hover:bg-white/10 sm:h-8 sm:w-8"
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}

export default function Layout() {
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const menuOpen = openOnPath === location.pathname;

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenOnPath(null);
    };
    const closeOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpenOnPath(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas dark:bg-[#0a0a0c]">
      <GradualBlur />
      <header ref={headerRef} className="fixed inset-x-0 top-3 z-50 px-4">
        <GlassSurface
          width="100%"
          height={52}
          borderRadius={26}
          backgroundOpacity={0.45}
          saturation={1.4}
          className="mx-auto max-w-5xl shadow-[0_8px_32px_rgb(0_0_0/0.12)]"
        >
          <div className="flex h-full w-full items-center justify-between gap-2 px-3 sm:px-5">
            <Link to="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[14px] font-semibold tracking-tight text-ink dark:text-white sm:text-[15px]">
              <BrandLogo />
              <span>
                麻薯<span className="text-pink-500 dark:text-pink-400">ta</span>爸<span className="text-ink-soft dark:text-white/50">的博客</span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <nav aria-label="主导航" className="hidden items-center gap-1 md:flex">
                {links.map(({ to, label, end }) => (
                  <NavLink key={to} to={to} end={end} className={({ isActive }) => `${nav} ${isActive ? navActive : ""}`}>
                    {label}
                  </NavLink>
                ))}
              </nav>
              <ThemeToggle />
              <button
                type="button"
                aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
                onClick={() => setOpenOnPath(menuOpen ? null : location.pathname)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-black/5 active:scale-95 dark:text-white/85 dark:hover:bg-white/10 md:hidden"
              >
                {menuOpen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 5l14 14M19 5L5 19" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </GlassSurface>
        {menuOpen && (
          <div className="mx-auto mt-2 max-w-5xl md:hidden">
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={22}
              backgroundOpacity={0.45}
              saturation={1.4}
              className="mobile-menu-glass shadow-lift"
            >
              <nav id="mobile-navigation" aria-label="移动导航" className="w-full">
                {links.map(({ to, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setOpenOnPath(null)}
                    className={({ isActive }) => `flex min-h-11 items-center rounded-2xl px-4 text-sm transition ${isActive ? navActive : "text-ink-soft hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"}`}
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </GlassSurface>
          </div>
        )}
      </header>
      <main className="flex-1">
        <Suspense fallback={<p role="status" className="px-5 pt-28 text-center text-sm text-ink-faint">页面加载中…</p>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-line bg-canvas-dim dark:border-white/10 dark:bg-[#101013]">
        <div className="mx-auto max-w-5xl px-5 py-8 text-center text-xs leading-6 text-ink-faint dark:text-white/40">
          <div className="flex items-center justify-center gap-2 font-medium text-ink-soft dark:text-white/60">
            <BrandLogo />
            <span>麻薯<span className="text-pink-500 dark:text-pink-400">ta</span>爸的博客</span>
          </div>
          <p>© {new Date().getFullYear()} · powered by FastAPI + React</p>
        </div>
      </footer>
    </div>
  );
}
