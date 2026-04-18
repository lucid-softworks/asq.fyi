import { useEffect } from "react";

export interface MetaInput {
  title?: string;
  description?: string;
  url?: string;
}

function setMetaTag(selector: string, attr: string, value: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [, key, rawValue] = selector.match(/\[(\w+)="([^"]+)"\]/) ?? [];
    if (key && rawValue) el.setAttribute(key, rawValue);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLinkTag(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const DEFAULT_TITLE = "asq.fyi — Q&A on the AT Protocol";
const DEFAULT_DESC =
  "asq.fyi is a Q&A platform built on the AT Protocol. Every question, answer, vote, and comment lives on your own PDS.";

export function useMeta(input: MetaInput): void {
  useEffect(() => {
    const title = input.title ?? DEFAULT_TITLE;
    const description = input.description ?? DEFAULT_DESC;
    const url = input.url ?? (typeof window !== "undefined" ? window.location.href : "");

    document.title = title;
    setMetaTag(
      'meta[name="description"]',
      "content",
      description,
    );
    setMetaTag('meta[property="og:title"]', "content", title);
    setMetaTag('meta[property="og:description"]', "content", description);
    setMetaTag('meta[property="og:type"]', "content", "article");
    if (url) setMetaTag('meta[property="og:url"]', "content", url);
    setMetaTag('meta[name="twitter:card"]', "content", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "content", title);
    setMetaTag('meta[name="twitter:description"]', "content", description);
    if (url) setLinkTag("canonical", url);

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [input.title, input.description, input.url]);
}
