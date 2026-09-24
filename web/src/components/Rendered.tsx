import DOMPurify from "dompurify";
import { useTheme } from "../lib/theme";

export default function Rendered({ html }: { html: string }) {
  const { theme } = useTheme();
  return (
    <div
      className={`prose max-w-none prose-headings:tracking-tight prose-a:text-accent-link prose-code:rounded prose-code:bg-canvas-dim prose-code:text-ink prose-pre:rounded-2xl prose-pre:bg-[#1d1d1f] prose-pre:text-stone-100 dark:prose-code:bg-white/10 dark:prose-code:text-white/90 ${
        theme === "dark" ? "prose-invert" : ""
      }`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}
