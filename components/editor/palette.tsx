"use client";
import { useReactFlow } from "@xyflow/react";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { CATCOLOR, LIB_GROUPS, typeOf, type LibGroup, type NodeParams } from "@/lib/catalog";
import type { IconName } from "@/lib/icons";
import { money } from "@/lib/format";
import { addNode, useEditor } from "@/lib/editor/store";
import { BlockTile } from "./block-visual";
import { FAV_KEY, markUsed, RECENT_KEY, toggleFav as toggleFavKey, useList } from "./library-lists";
import { DND_MIME } from "./canvas";

export interface PaletteProduct {
  id: string;
  name: string;
  type: string;
  params: NodeParams;
}

import { BY_KEY, ITEMS, searchLibrary, type LibItem, type LibPayload } from "@/lib/library";
export { ITEMS };
export type { LibItem, LibPayload };


/** Small random offset so blocks added by tap don't stack exactly on top of each other. */
const jitter = () => Math.random() * 80 - 40;

export function Palette({ products, onPicked }: { products: PaletteProduct[]; onPicked?: () => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<LibGroup | "">("");
  const cur = useEditor((x) => x.settings.currency);
  const recent = useList(RECENT_KEY);
  const fav = useList(FAV_KEY);
  const rf = useReactFlow();
  const s = q.trim().toLowerCase();

  const used = markUsed;
  const toggleFav = toggleFavKey;
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

  const item = (it: { key: string; label: string; icon: IconName; payload: LibPayload; price?: number }, favKey?: string) => (
    <div key={it.key} className="fm-pitem">
      <button type="button" {...dragProps(it.payload, favKey)} onClick={() => addAtCentre(it.payload, favKey)} aria-label={`Add ${it.label}`}>
        <BlockTile type={it.payload.type} icon={it.icon} />
        <span className="fm-pname">{it.label}</span>
        {it.price ? <span className="fm-pprice">{money(it.price, cur)}</span> : null}
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
              <button key={k} type="button" {...dragProps(it.payload, k)} onClick={() => addAtCentre(it.payload, k)} aria-label={`${title === "Pinned" ? "Favourite" : "Recent"}: ${it.label}`} title={`Add ${it.label}`}>
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
    .filter((g) => !cat || g === cat)
    .map((g) => ({ g, items: searchLibrary(s).filter((it) => it.group === g) }))
    .filter((x) => x.items.length);
  return (
    <>
      <label>
        <span className="sr-only">Search blocks</span>
        <input className="fm-psearch" type="search" placeholder={`Search ${ITEMS.length} blocks`} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="fm-pcats" role="group" aria-label="Block categories">
        <button type="button" aria-pressed={!cat} onClick={() => setCat("")}>
          All
        </button>
        {(Object.keys(LIB_GROUPS) as LibGroup[]).map((g) => (
          <button key={g} type="button" aria-pressed={cat === g} onClick={() => setCat(cat === g ? "" : g)}>
            <i style={{ background: CATCOLOR[g === "comms" || g === "sales" ? "action" : g] }} aria-hidden="true" />
            {LIB_GROUPS[g]}
          </button>
        ))}
      </div>
      {!s && chips("Pinned", fav)}
      {!s && chips("Recent", recent.filter((k) => !fav.includes(k)))}
      {prods.length > 0 && (
        <>
          <h2>Client products</h2>
          <div className="fm-pal">{prods.map((p) => item({ key: p.id, label: p.name, icon: typeOf(p.type).icon, payload: { type: p.type, p: p.params, name: p.name }, price: Number(p.params.price) || undefined }))}</div>
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
