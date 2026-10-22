import { useEffect, useState } from "react";
import { api, type Tool } from "../lib/api";
import Seo from "../components/Seo";

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export default function Tools() {
  const [tools, setTools] = useState<Tool[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.get<Tool[]>("/tools")
      .then(setTools)
      .catch(() => { setTools([]); setFailed(true); });
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-16 pt-24 sm:pt-28">
      <Seo title="软件工具" description="麻薯ta爸分享使用过、值得推荐的软件工具与下载入口。" path="/tools" />
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl dark:text-white">软件工具</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-ink-soft dark:text-white/55">
          一些我用过、觉得顺手的工具。文件放在网盘，少占服务器，也方便随时更新。
        </p>
      </header>

      {tools === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((item) => <div key={item} className="h-56 animate-pulse rounded-card bg-black/[0.04] dark:bg-white/[0.04]" />)}
        </div>
      ) : tools.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <li key={tool.id} className="surface flex min-h-56 flex-col justify-between p-6 transition duration-300 hover:-translate-y-0.5 hover:border-pink-500/35 hover:shadow-lift dark:hover:border-pink-400/35">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint dark:text-white/40">
                  {tool.platform && <span className="pill bg-black/[0.04] dark:bg-white/[0.06]">{tool.platform}</span>}
                  {tool.version && <span>v{tool.version}</span>}
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight dark:text-white">{tool.name}</h2>
                <p className="mt-2 text-sm leading-7 text-ink-soft dark:text-white/55">{tool.description || "一个值得留在工具箱里的小东西。"}</p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a href={tool.download_url} target="_blank" rel="noreferrer nofollow" className="btn-primary gap-2">
                  <DownloadIcon />
                  前往网盘
                </a>
                {tool.access_code && (
                  <span className="text-xs text-ink-faint dark:text-white/40">
                    提取码 <code className="ml-1 rounded-md bg-black/[0.04] px-1.5 py-1 font-mono text-ink-soft dark:bg-white/[0.06] dark:text-white/65">{tool.access_code}</code>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="surface py-20 text-center">
          <p className="text-lg font-medium dark:text-white">工具箱还在整理</p>
          <p className="mt-2 text-sm text-ink-faint dark:text-white/40">等我挑出真正值得分享的，再放进来。</p>
        </div>
      )}

      {failed && <p className="mt-4 text-center text-xs text-red-500">工具列表暂时没有加载出来，请稍后再试。</p>}
    </div>
  );
}
