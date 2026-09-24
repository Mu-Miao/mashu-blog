import DOMPurify from "dompurify";

export default function Rendered({ html }: { html: string }) {
  return (
    <div
      className="prose prose-stone max-w-none prose-pre:bg-stone-900 prose-pre:text-stone-100"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}
