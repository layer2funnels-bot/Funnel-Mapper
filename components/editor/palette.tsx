"use client";
import { useReactFlow } from "@xyflow/react";
import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";
import { BLOCK_TYPES, LIB_GROUPS, libOf, typeOf, type BlockTypeKey, type LibGroup, type NodeParams } from "@/lib/catalog";
import type { IconName } from "@/lib/icons";
import { addNode } from "@/lib/editor/store";
import { BlockTile } from "./block-visual";
import { DND_MIME } from "./canvas";

export interface PaletteProduct {
  id: string;
  name: string;
  type: string;
  params: NodeParams;
}

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
const BY_KEY = Object.fromEntries(ITEMS.map((x) => [x.key, x]));

const RECENT_KEY = "fm-lib-recent",
  FAV_KEY = "fm-lib-fav";
// Per-device lists in browser storage, read through useSyncExternalStore (empty on the server, so hydration matches).
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const rawList = (k: string) => {
  try {
    return localStorage.getItem(k) || "[]";
  } catch {
    return "[]";
  }
};
const parseList = (raw: string): string[] => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!BY_KEY[x]) : [];
  } catch {
    return [];
  }
};
const readList = (k: string) => parseList(rawList(k));
const writeList = (k: string, v: string[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
  listeners.forEach((l) => l());
};
const useList = (k: string) =>
  parseList(
    useSyncExternalStore(
      subscribe,
      () => rawList(k),
      () => "[]",
    ),
  );

/** Small random offset so blocks added by tap don't stack exactly on top of each other. */
const jitter = () => Math.random() * 80 - 40;

export function Palette({ products, onPicked }: { products: PaletteProduct[]; onPicked?: () => void }) {
  const [q, setQ] = useState("");
  const recent = useList(RECENT_KEY);
  const fav = useList(FAV_KEY);
  const rf = useReactFlow();
  const s = q.trim().toLowerCase();

  const used = (key?: string) => {
    if (!key || !BY_KEY[key]) return;
    const next = [key, ...readList(RECENT_KEY).filter((k) => k !== key)].slice(0, 6);
    writeList(RECENT_KEY, next);
  };
  const toggleFav = (key: string) => {
    const cur = readList(FAV_KEY);
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    writeList(FAV_KEY, next);
  };
  const addAtCentre = (payload: LibPayload, key?: string) => {
    const el = document.querySelector(".fm-stage")?.getBoundingClientRect();
    const c = el ? rf.screenToFlowPosition({ x: el.left + el.width / 2, y: el.top + el.height / 2 }) : { x: 200, y: 200 };
    addNode(payload.type, c.x - 105 + jitter(), c.y - 48 + jitter(), payload);
    used(key);
    onPicked?.();
  };
  const dragProps = (payload: LibPayload, key?: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "copy";
    },
    onDragEnd: (e: React.DragEvent) => {
      if (e.dataTransfer.dropEffect !== "none") used(key);
      onPicked?.();
    },
  });

  const item = (it: { key: string; label: string; icon: IconName; payload: LibPayload }, favKey?: string) => (
    <div key={it.key} className="fm-pitem">
      <button type="button" {...dragProps(it.payload, favKey)} onClick={() => addAtCentre(it.payload, favKey)} aria-label={`Add ${it.label}`}>
        <BlockTile type={it.payload.type} icon={it.icon} />
        {it.label}
      </button>
      {favKey && (
        <button type="button" className={`fm-pfav${fav.includes(favKey) ? " on" : ""}`} aria-pressed={fav.includes(favKey)} aria-label={`Favourite ${it.label}`} title={fav.includes(favKey) ? "Remove from favourites" : "Add to favourites"} onClick={() => toggleFav(favKey)}>
          <Icon name="star" size={12} />
        </button>
      )}
    </div>
  );
  /** Compact chips for favourites and recents (named "Recent: …" so they don't repeat the library's "Add …" buttons). */
  const chips = (title: string, keys: string[]) =>
    keys.length > 0 && (
      <>
        <h2>{title}</h2>
        <div className="fm-pchips">
          {keys.map((k) => {
            const it = BY_KEY[k];
            return (
              <button key={k} type="button" {...dragProps(it.payload, k)} onClick={() => addAtCentre(it.payload, k)} aria-label={`${title === "Favourites" ? "Favourite" : "Recent"}: ${it.label}`} title={`Add ${it.label}`}>
                <BlockTile type={it.payload.type} icon={it.icon} size={13} />
                {it.label}
              </button>
            );
          })}
        </div>
      </>
    );

  const prods = products.filter((p) => typeOf(p.type) && (!s || p.name.toLowerCase().includes(s)));
  const groups = (Object.keys(LIB_GROUPS) as LibGroup[])
    .map((g) => ({ g, items: ITEMS.filter((it) => it.group === g && (!s || `${it.label} ${it.kw} ${LIB_GROUPS[g]}`.toLowerCase().includes(s))) }))
    .filter((x) => x.items.length);
  return (
    <>
      <label>
        <span className="sr-only">Search blocks</span>
        <input className="fm-psearch" type="search" placeholder={`Search ${ITEMS.length} blocks`} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {!s && chips("Favourites", fav)}
      {!s && chips("Recent", recent.filter((k) => !fav.includes(k)))}
      {prods.length > 0 && (
        <>
          <h2>Client products</h2>
          <div className="fm-pal">{prods.map((p) => item({ key: p.id, label: p.name, icon: typeOf(p.type).icon, payload: { type: p.type, p: p.params, name: p.name } }))}</div>
        </>
      )}
      {groups.map(({ g, items }) => (
        <div key={g}>
          <h2>{LIB_GROUPS[g]}</h2>
          <div className="fm-pal">{items.map((it) => item(it, it.key))}</div>
        </div>
      ))}
      {!groups.length && !prods.length && <p className="hint">No blocks match.</p>}
      <p className="hint">
        Drag a block onto the canvas or tap it. Star the ones you use most. Drag from a block’s right dot to connect people who move on. The bottom dot sends people who don’t. Shift-drag the canvas to select several blocks.
      </p>
    </>
  );
}
