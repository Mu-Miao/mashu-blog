import { useState } from "react";
import { Link } from "react-router-dom";

const GITHUB_PROFILE = "https://github.com/Mu-Miao";

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.24c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.74-1.55-2.58-.3-5.29-1.29-5.29-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.96 10.96 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.72 5.39-5.31 5.68.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

function ArrowIcon({ external = false }: { external?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {external ? (
        <>
          <path d="M14 5h5v5" />
          <path d="m10 14 9-9" />
          <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
        </>
      ) : (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      )}
    </svg>
  );
}

export default function GitHubShowcase() {
  const [rssCopyState, setRssCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const copyRssUrl = async () => {
    try {
      await navigator.clipboard.writeText(new URL("/api/v1/feed.xml", window.location.origin).href);
      setRssCopyState("copied");
    } catch {
      setRssCopyState("failed");
    }
  };

  return (
    <section className="border-t border-line bg-white py-16 dark:border-white/10 dark:bg-[#0a0a0c] sm:py-20">
      <div className="mx-auto max-w-5xl px-5">
        <div className="grid gap-4 lg:grid-cols-[1.55fr_0.85fr]">
          <div className="relative overflow-hidden rounded-[28px] bg-[#151518] p-7 text-white shadow-card sm:p-10">
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-pink-500/25 blur-3xl dark:bg-pink-400/20"
            />
            <div className="relative flex h-full min-h-72 flex-col justify-between gap-12">
              <div className="flex items-center gap-3 text-white/65">
                <GitHubIcon className="h-7 w-7 text-white" />
                <span className="font-mono text-sm">@Mu-Miao</span>
              </div>

              <div>
                <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  把想法写成能运行的东西
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-7 text-white/60 sm:text-[15px]">
                  文章负责解释为什么，代码负责证明不是吹牛。
                </p>
                <a
                  href={GITHUB_PROFILE}
                  target="_blank"
                  rel="noreferrer"
                  className="group mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#151518] transition hover:bg-pink-50 active:scale-[0.97]"
                >
                  去看看代码
                  <ArrowIcon external />
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Link
              to="/tools"
              className="surface group flex min-h-40 flex-col justify-between p-6 transition duration-300 hover:-translate-y-0.5 hover:border-pink-500/35 hover:shadow-lift dark:hover:border-pink-400/35"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-pink-500 dark:text-pink-400">Toolbox</span>
                <ArrowIcon />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight dark:text-white">分享的软件工具</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft dark:text-white/50">我用过、觉得顺手的工具，下载入口会放在这里。</p>
              </div>
            </Link>

            <div
              className="surface flex min-h-40 flex-col justify-between p-6 transition duration-300 hover:-translate-y-0.5 hover:border-pink-500/35 hover:shadow-lift dark:hover:border-pink-400/35"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-pink-500 dark:text-pink-400">RSS feed</span>
                <a
                  href="/api/v1/feed.xml"
                  aria-label="打开 RSS 订阅源"
                  title="打开 RSS 订阅源"
                  className="group rounded-full p-1 text-ink-soft transition hover:bg-black/5 hover:text-ink dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <ArrowIcon external />
                </a>
              </div>
              <div>
                <h3 className="font-semibold tracking-tight dark:text-white">RSS 订阅</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft dark:text-white/50">复制地址到阅读器，新文章会自动送达。</p>
                <button
                  type="button"
                  onClick={copyRssUrl}
                  className="mt-3 text-xs font-medium text-pink-500 transition hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300"
                >
                  {rssCopyState === "copied" ? "已复制订阅地址 ✓" : rssCopyState === "failed" ? "复制失败，请打开订阅源" : "复制订阅地址"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Link to="/search" className="group inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink dark:text-white/50 dark:hover:text-white">
            想找点具体的？去搜索
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
