import { SITE } from "./site";

export function wecomLink(from?: string) {
  const base = SITE.wecomUrl;
  if (!base) return null;

  const param = from ?? SITE.wecomDefaultFrom;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}from=${encodeURIComponent(param)}`;
}
