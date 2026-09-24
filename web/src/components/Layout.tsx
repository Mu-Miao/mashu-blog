import { Link, NavLink, Outlet } from "react-router-dom";

const nav = "px-2 py-1 text-stone-600 hover:text-stone-900 rounded";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-wide">
            马叔塔巴的博客
          </Link>
          <nav className="flex gap-1 text-sm">
            <NavLink to="/" className={nav} end>首页</NavLink>
            <NavLink to="/archive" className={nav}>归档</NavLink>
            <NavLink to="/search" className={nav}>搜索</NavLink>
            <NavLink to="/admin" className={`${nav} text-stone-400`}>管理</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-400">
        powered by FastAPI + React
      </footer>
    </div>
  );
}
