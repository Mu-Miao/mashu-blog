import { useEffect, useState } from "react";
import { api, type Tool } from "../lib/api";

type ToolDraft = Pick<Tool, "name" | "description" | "download_url" | "version" | "platform" | "access_code" | "status">;

const EMPTY_TOOL: ToolDraft = {
  name: "",
  description: "",
  download_url: "",
  version: "",
  platform: "",
  access_code: "",
  status: "draft",
};

export default function AdminTools() {
  const [tools, setTools] = useState<Tool[] | null>(null);
  const [draft, setDraft] = useState<ToolDraft>(EMPTY_TOOL);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.get<Tool[]>("/tools?all=1").then(setTools);
  useEffect(() => { load(); }, []);

  const update = <K extends keyof ToolDraft>(key: K, value: ToolDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setDraft(EMPTY_TOOL);
    setEditingId(null);
    setError("");
  };

  const edit = (tool: Tool) => {
    setDraft({
      name: tool.name,
      description: tool.description,
      download_url: tool.download_url,
      version: tool.version,
      platform: tool.platform,
      access_code: tool.access_code,
      status: tool.status,
    });
    setEditingId(tool.id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editingId === null) await api.post("/tools", draft);
      else await api.put(`/tools/${editingId}`, draft);
      reset();
      await load();
    } catch {
      setError("保存失败，请检查网盘链接是否以 http:// 或 https:// 开头。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight dark:text-white">{editingId === null ? "分享新工具" : "修改工具"}</h2>
            <p className="mt-1 text-xs text-ink-faint dark:text-white/40">这里只保存工具信息和网盘链接，不上传安装包。</p>
          </div>
          <select value={draft.status} onChange={(event) => update("status", event.target.value as ToolDraft["status"])} className="field !w-28 !py-2">
            <option value="draft">草稿</option>
            <option value="published">发布</option>
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input required value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="工具名称" className="field" />
          <input required type="url" value={draft.download_url} onChange={(event) => update("download_url", event.target.value)} placeholder="网盘链接（https://…）" className="field" />
          <input value={draft.platform} onChange={(event) => update("platform", event.target.value)} placeholder="适用平台，如 Windows / macOS" className="field" />
          <input value={draft.version} onChange={(event) => update("version", event.target.value)} placeholder="版本号，如 1.2.0" className="field" />
          <input value={draft.access_code} onChange={(event) => update("access_code", event.target.value)} placeholder="提取码（可选）" className="field sm:col-span-2" />
          <textarea value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="简单说说它解决什么问题" rows={4} className="field resize-y sm:col-span-2" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button disabled={busy || !draft.name.trim() || !draft.download_url.trim()} className="btn-primary">
            {busy ? "保存中…" : editingId === null ? "添加工具" : "保存修改"}
          </button>
          {editingId !== null && <button type="button" onClick={reset} className="btn-ghost">取消修改</button>}
        </div>
      </form>

      <div className="border-t border-line pt-7 dark:border-white/10">
        <h3 className="mb-4 font-semibold tracking-tight dark:text-white">已经添加的工具</h3>
        {tools === null ? (
          <div className="h-28 animate-pulse rounded-card bg-black/[0.04] dark:bg-white/[0.04]" />
        ) : tools.length > 0 ? (
          <ul className="divide-y divide-line rounded-xl border border-line dark:divide-white/10 dark:border-white/10">
            {tools.map((tool) => (
              <li key={tool.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium dark:text-white/90">{tool.name}</span>
                    <span className={`pill !px-2 !py-0.5 ${tool.status === "published" ? "bg-green-50 text-green-600 dark:bg-green-400/10 dark:text-green-400" : "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400"}`}>
                      {tool.status === "published" ? "已发布" : "草稿"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-faint dark:text-white/40">{tool.platform || "未填写平台"}{tool.version ? ` · v${tool.version}` : ""}</p>
                </div>
                <button type="button" onClick={() => edit(tool)} className="text-sm text-accent-link hover:underline dark:text-pink-400">编辑</button>
                <button type="button" onClick={async () => {
                  if (confirm(`删除工具“${tool.name}”？`)) {
                    await api.del(`/tools/${tool.id}`);
                    if (editingId === tool.id) reset();
                    load();
                  }
                }} className="text-sm text-red-500 hover:underline">删除</button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card bg-black/[0.03] py-12 text-center text-sm text-ink-faint dark:bg-white/[0.04] dark:text-white/40">还没有工具，从上面的表单开始添加</div>
        )}
      </div>
    </div>
  );
}
