import { Link, NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../lib/theme";

const nav =
  "rounded-pill px-4 py-1.5 text-sm text-ink/80 transition hover:bg-black/5 hover:text-ink dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white";
const navActive = "bg-black/[0.06] font-medium text-ink dark:bg-white/15 dark:text-white";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-black/5 active:scale-95 dark:text-white/70 dark:hover:bg-white/10"
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
  return (
    <div className="flex min-h-screen flex-col bg-canvas dark:bg-[#0a0a0c]">
      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/[0.72] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-[#0a0a0c]/[0.72]">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-5">
          <Link to="/" className="text-[15px] font-semibold tracking-tight text-ink dark:text-white">
            麻薯<span className="text-pink-500 dark:text-pink-400">ta</span>爸<span className="text-ink-soft dark:text-white/50">的博客</span>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-1">
              <NavLink to="/" className={({ isActive }) => `${nav} ${isActive ? navActive : ""}`} end>
                首页
              </NavLink>
              <NavLink to="/archive" className={({ isActive }) => `${nav} ${isActive ? navActive : ""}`}>
                归档
              </NavLink>
              <NavLink to="/search" className={({ isActive }) => `${nav} ${isActive ? navActive : ""}`}>
                搜索
              </NavLink>
              <NavLink to="/admin" className={({ isActive }) => `${nav} ${isActive ? navActive : ""}`}>
                管理
              </NavLink>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-canvas-dim dark:border-white/10 dark:bg-[#101013]">
        <div className="mx-auto max-w-5xl px-5 py-8 text-center text-xs leading-6 text-ink-faint dark:text-white/40">
          <p className="font-medium text-ink-soft dark:text-white/60">麻薯<span className="text-pink-500 dark:text-pink-400">ta</span>爸的博客</p>
          <p>© {new Date().getFullYear()} · powered by FastAPI + React</p>
        </div>
      </footer>
    </div>
  );
}
