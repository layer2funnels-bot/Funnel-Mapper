// The block library as data: every item the palette, Quick Add and search offer. ONE list (169 items = 152 flow blocks +
// 17 layout presets). Visual treatment lives in lib/block-visuals.ts; behaviour and maths in lib/catalog.ts.
import { BLOCK_TYPES, LIB_GROUPS, libOf, type BlockTypeKey, type LibGroup, type NodeParams } from "./catalog";
import type { IconName } from "./icons";

/** What a library item adds: a block type plus optional preset params, name and size. */
export interface LibPayload {
  type: string;
  p?: NodeParams;
  name?: string;
  w?: number;
  h?: number;
}
export interface LibItem {
  key: string;
  label: string;
  icon: IconName;
  group: LibGroup;
  kw: string;
  payload: LibPayload;
}

/** Layout elements: one block type can appear several times with different presets (heading / subheading / text…). */
const ANNOT_ITEMS: Omit<LibItem, "group">[] = [
  { key: "note", label: "Sticky note", icon: "note", kw: "comment memo", payload: { type: "note" } },
  { key: "label", label: "Heading text", icon: "text", kw: "title stage name", payload: { type: "label" } },
  { key: "subhead", label: "Subheading", icon: "text", kw: "heading title", payload: { type: "label", p: { text: "Subheading", size: 20 } } },
  { key: "text", label: "Canvas text", icon: "text", kw: "paragraph label body", payload: { type: "label", p: { text: "Text", size: 15 } } },
  { key: "shape", label: "Shape", icon: "shape", kw: "rounded rectangle box", payload: { type: "shape" } },
  { key: "rect", label: "Rectangle", icon: "frame", kw: "box square shape", payload: { type: "shape", p: { shape: "rect" } } },
  { key: "circle", label: "Circle", icon: "circle", kw: "round shape", payload: { type: "shape", p: { shape: "circle" }, w: 140, h: 140 } },
  { key: "ellipse", label: "Ellipse", icon: "circle", kw: "oval shape", payload: { type: "shape", p: { shape: "ellipse" } } },
  { key: "diamond", label: "Diamond", icon: "diamond", kw: "decision rhombus shape", payload: { type: "shape", p: { shape: "diamond" } } },
  { key: "callout", label: "Callout", icon: "callout", kw: "speech bubble annotation", payload: { type: "shape", p: { shape: "callout", text: "Callout" }, w: 220, h: 110 } },
  { key: "line", label: "Line", icon: "line", kw: "divider connector", payload: { type: "shape", p: { shape: "line", dir: "h" }, w: 220, h: 24 } },
  { key: "arrow", label: "Arrow", icon: "arrow", kw: "pointer direction", payload: { type: "shape", p: { shape: "arrow", dir: "h" }, w: 220, h: 24 } },
  { key: "frame", label: "Stage frame", icon: "frame", kw: "container group section", payload: { type: "frame" } },
  { key: "image", label: "Image / logo", icon: "image", kw: "picture upload", payload: { type: "image" } },
  { key: "screenshot", label: "Screenshot", icon: "window", kw: "image page capture", payload: { type: "image", name: "Screenshot", w: 360, h: 230 } },
  { key: "link", label: "Link / video", icon: "link", kw: "embed preview youtube loom url", payload: { type: "link" } },
  { key: "checklist", label: "Checklist", icon: "task", kw: "to-do tasks", payload: { type: "checklist" } },
];

export const ITEMS: LibItem[] = [
  ...(Object.entries(BLOCK_TYPES) as [BlockTypeKey, (typeof BLOCK_TYPES)[BlockTypeKey]][])
    .filter(([, t]) => t.cat !== "annot")
    .map(([k, t]) => ({ key: k, label: t.label, icon: t.icon, group: libOf(k), kw: t.kw ?? "", payload: { type: k } })),
  ...ANNOT_ITEMS.map((x) => ({ ...x, group: "annot" as LibGroup })),
];

export const BY_KEY: Record<string, LibItem> = Object.fromEntries(ITEMS.map((x) => [x.key, x]));

/** Library search (palette, Quick Add and `/`): label, keywords and group name, case-insensitive. */
export function searchLibrary(query: string, items: LibItem[] = ITEMS): LibItem[] {
  const s = query.trim().toLowerCase();
  if (!s) return items;
  return items.filter((it) => `${it.label} ${it.kw} ${LIB_GROUPS[it.group]}`.toLowerCase().includes(s));
}
