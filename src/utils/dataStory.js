import { normalizeGeographicFrame } from "./datasetViewShareQuery";
import { DEFAULT_MAP_COLOR_SCHEME, normalizeMapColorScheme } from "./datasetMapPreview";

export const dataStoryTitleMax = 300;
export const dataStoryBodyMax = 20000;
export const dataStoryUrlMax = 12000;

const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "STRIKE", "DEL", "H2", "H3", "UL", "OL", "LI", "A", "BLOCKQUOTE", "HR", "DIV", "SPAN", "FONT"]);
const droppedTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "IMG"]);
const forbiddenKeys = new Set(["__proto__", "constructor", "prototype"]);
const safeHref = /^(https?:\/\/|mailto:)[^\s<>"']+$/i;
const safeTextColor = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/;

/**
 * Keep a small set of formatting tags, http/mailto links, and text color so a
 * shared story cannot carry scripts. Anything else is unwrapped to its text.
 */
export function sanitizeStoryHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");

  const clean = (node) => {
    const fragment = doc.createDocumentFragment();
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return fragment.append(child.textContent);
      if (child.nodeType !== Node.ELEMENT_NODE || droppedTags.has(child.tagName)) return;

      const tag = child.tagName;
      const isColor = tag === "SPAN" || tag === "FONT";
      const href = tag === "A" ? String(child.getAttribute("href") || "").trim() : "";
      const color = String((tag === "FONT" ? child.getAttribute("color") : child.style?.color) || "").trim().toLowerCase();
      const keep = allowedTags.has(tag)
        && (tag !== "A" || safeHref.test(href))
        && (!isColor || safeTextColor.test(color));
      if (!keep) return fragment.append(clean(child));

      const element = doc.createElement(isColor ? "span" : tag.toLowerCase());
      if (tag === "A") {
        element.setAttribute("href", href);
        element.setAttribute("rel", "noopener noreferrer");
        element.setAttribute("target", "_blank");
      }
      if (isColor) element.setAttribute("style", `color: ${color}`);
      element.append(clean(child));
      fragment.append(element);
    });
    return fragment;
  };

  const root = doc.createElement("div");
  root.append(clean(doc.body));
  return root.innerHTML.slice(0, dataStoryBodyMax);
}

export function buildDataStoryPayload({ dataset, mapVar, year, geoFrame, colors, dims, title, body }) {
  const pick = (value, pattern, max) => {
    const text = String(value ?? "").trim();
    return text && text.length <= max && pattern.test(text) ? text : null;
  };

  const datasetId = pick(dataset, /^\d+$/, 12);
  if (!datasetId) return null;

  const cleanDims = Object.fromEntries(
    Object.entries(dims && typeof dims === "object" ? dims : {})
      .filter(([key]) => !forbiddenKeys.has(key))
      .map(([key, value]) => [pick(key, /^[\w.-]+$/, 80), pick(value, /^[^<>\p{Cc}]+$/u, 160)])
      .filter(([key, value]) => key && value)
      .slice(0, 12),
  );

  return {
    v: 1,
    dataset: datasetId,
    mapVar: pick(mapVar, /^[\w.-]+$/, 80),
    year: pick(year, /^[\w./-]+$/, 32),
    geoFrame: normalizeGeographicFrame(geoFrame) || "mapc",
    colors: normalizeMapColorScheme(colors) || DEFAULT_MAP_COLOR_SCHEME,
    dims: cleanDims,
    title: String(title || "").trim().slice(0, dataStoryTitleMax),
    body: sanitizeStoryHtml(body),
  };
}

/** Gzip and base64url-encode a story payload into a `z.…` share token. */
export async function encodeDataStory(payload) {
  const gzipped = new Blob([JSON.stringify(payload)]).stream().pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(gzipped).arrayBuffer());
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return `z.${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

export async function decodeDataStory(token) {
  const raw = String(token || "");
  if (!raw.startsWith("z.") || raw.length < 3) return null;

  try {
    const bytes = Uint8Array.from(atob(raw.slice(2).replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
    const json = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    if (json.length > dataStoryBodyMax * 2) return null;
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? buildDataStoryPayload(parsed) : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function dataStorySharePath(token, datasetId) {
  return `/explore/story/${token}${datasetId ? `?dataset=${encodeURIComponent(datasetId)}` : ""}`;
}
