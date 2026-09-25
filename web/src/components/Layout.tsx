import { Link, Outlet } from "react-router-dom";
import GlassSurface from "./GlassSurface";
import GooeyNav from "./GooeyNav";
import { useTheme } from "../lib/theme";

const NAV_ITEMS = [
  { label: "首页", to: "/" },
  { label: "归档", to: "/archive" },
  { label: "搜索", to: "/search" },
  { label: "管理", to: "/admin" },
];

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
      <header className="fixed inset-x-0 top-3 z-50 px-4">
        <GlassSurface
          width="100%"
          height={52}
          borderRadius={26}
          backgroundOpacity={0.45}
          saturation={1.4}
          className="mx-auto max-w-5xl shadow-[0_8px_32px_rgb(0_0_0/0.12)]"
        >
          <div className="flex h-full w-full items-center justify-between px-5">
            <Link to="/" className="text-[15px] font-semibold tracking-tight text-ink dark:text-white">
              麻薯<span className="text-pink-500 dark:text-pink-400">ta</span>爸<span className="text-ink-soft dark:text-white/50">的博客</span>
            </Link>
            <div className="flex items-center gap-2">
              <GooeyNav items={NAV_ITEMS} />
              <ThemeToggle />
            </div>
          </div>
        </GlassSurface>
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
