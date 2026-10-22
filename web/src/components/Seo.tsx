import { useEffect } from "react";

const SITE_NAME = "麻薯ta爸的博客";
const DEFAULT_DESCRIPTION = "麻薯ta爸记录嵌入式、编程实践与生活思考的个人博客。";

interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  noindex?: boolean;
  article?: boolean;
  publishedAt?: string | null;
  modifiedAt?: string | null;
  tags?: string[];
  image?: string | null;
}

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function normalizedDate(value?: string | null) {
  if (!value) return undefined;
  return /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`;
}

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  noindex = false,
  article = false,
  publishedAt,
  modifiedAt,
  tags = [],
  image,
}: SeoProps) {
  const tagsKey = tags.join(",");

  useEffect(() => {
    const pageTitle = title ? `${title} · 麻薯ta爸` : SITE_NAME;
    const canonical = new URL(path ?? window.location.pathname, window.location.origin).href;
    const robots = noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large";

    document.title = pageTitle;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertMeta("property", "og:type", article ? "article" : "website");
    upsertMeta("property", "og:title", pageTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    upsertMeta("name", "twitter:title", pageTitle);
    upsertMeta("name", "twitter:description", description);
    if (image) upsertMeta("property", "og:image", new URL(image, window.location.origin).href);
    else document.head.querySelector('meta[property="og:image"]')?.remove();

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    document.getElementById("seo-jsonld")?.remove();
    if (article) {
      const script = document.createElement("script");
      script.id = "seo-jsonld";
      script.type = "application/ld+json";
      script.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        description,
        datePublished: normalizedDate(publishedAt),
        dateModified: normalizedDate(modifiedAt),
        mainEntityOfPage: canonical,
        author: { "@type": "Person", name: "麻薯ta爸" },
        publisher: { "@type": "Person", name: "麻薯ta爸" },
        keywords: tagsKey ? tagsKey.split(",") : undefined,
        image: image ? new URL(image, window.location.origin).href : undefined,
      }).replaceAll("<", "\\u003c");
      document.head.appendChild(script);
    }
  }, [article, description, image, modifiedAt, noindex, path, publishedAt, tagsKey, title]);

  return null;
}
