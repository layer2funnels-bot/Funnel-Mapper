"use client";
// Blocks sidebar (V2, reference "Blocks-sidebar"): search, Recent, Pinned, this client's products, then ONE accordion of
// the approved categories with computed counts, and Widgets as the last section. Click places a block in view, drag
// places it where it is dropped. Everything renders from the library registry (lib/library.ts).
import { useReactFlow } from "@xyflow/react";
import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";
import { CATCOLOR, groupColor, LIB_GROUPS, typeOf, type LibGroup, type NodeParams } from "@/lib/catalog";
import type { IconName } from "@/lib/icons";
import { money } from "@/lib/format";
import { addNode, useEditor } from "@/lib/editor/store";
import { BlockTile } from "./block-visual";
import { FAV_KEY, markUsed, RECENT_KEY, toggleFav as toggleFavKey, useList } from "./library-lists";
import { DND_MIME } from "./canvas";
import { BY_KEY, groupCounts, ITEMS, searchLibrary, type LibItem, type LibPayload } from "@/lib/library";
import { WIDGET_PRESETS } from "@/lib/widget-presets";

export interface PaletteProduct {
  id: string;
  name: string;
  type: string;
  params: NodeParams;
}

export { ITEMS };
export type { LibItem, LibPayload };

/** Small random offset so blocks added by tap don't stack exactly on top of each other. */
const jitter = () => Math.random() * 80 - 40;
/** Items shown in an open category before "Show all N". */
const PREVIEW = 9;

/* Which categories are open: remembered per device (Traffic sources and Pages open the first time). */
const OPEN_KEY = "fm-lib-open";
const DEFAULT_OPEN = "traffic,page";
const openListeners = new Set<() => void>();
const readOpen = () => {
  try {
    return localStorage.getItem(OPEN_KEY) ?? DEFAULT_OPEN;
  } catch {
    return DEFAULT_OPEN;
  }
};
const writeOpen = (v: string) => {
  try {
    localStorage.setItem(OPEN_KEY, v);
  } catch {}
  openListeners.forEach((l) => l());
};
const subscribeOpen = (cb: () => void) => (openListeners.add(cb), () => openListeners.delete(cb));

export function Palette({ products, onPicked }: { products: PaletteProduct[]; onPicked?: () => void }) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState<Set<LibGroup>>(new Set());
  const cur = useEditor((x) => x.settings.currency);
  const recent = useList(RECENT_KEY);
  const fav = useList(FAV_KEY);
  const openRaw = useSyncExternalStore(subscribeOpen, readOpen, () => DEFAULT_OPEN);
  const open = new Set(openRaw.split(",").filter(Boolean) as LibGroup[]);
  const rf = useReactFlow();
  const s = q.trim().toLowerCase();
  const counts = groupCounts();

  const toggleGroup = (g: LibGroup) => {
    const next = new Set(open);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    writeOpen([...next].join(","));
  };
  const addAtCentre = (payload: LibPayload, key?: string) => {
    const el = document.querySelector(".fm-stage")?.getBoundingClientRect();
    const c = el ? rf.screenToFlowPosition({ x: el.left + el.width / 2, y: el.top + el.height / 2 }) : { x: 200, y: 200 };
    addNode(payload.type, c.x - 105 + jitter(), c.y - 48 + jitter(), payload);
    markUsed(key);
    onPicked?.();
  };
  const dragProps = (payload: LibPayload, key?: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "copy";
    },
    onDragEnd: (e: React.DragEvent) => {
      if (e.dataTransfer.dropEffect !== "none") markUsed(key);
      onPicked?.();
    },
  });

  const item = (it: { key: string; label: string; icon: IconName; payload: LibPayload; price?: number; group?: LibGroup }, favKey?: string) => (
    <div key={it.key} className="fm-pitem">
      <button
        type="button"
        {...dragProps(it.payload, favKey)}
        onClick={() => addAtCentre(it.payload, favKey)}
        aria-label={`Add ${it.label}`}
        title={`${it.label}${it.group ? ` · ${LIB_GROUPS[it.group]}` : ""}\nDrag onto the map, or click to place it in view`}
      >
        <BlockTile type={it.payload.type} icon={it.icon} artKey={BY_KEY[it.key] ? it.key : undefined} />
        <span className="fm-pname">{it.label}</span>
        {it.price ? <span className="fm-pprice">{money(it.price, cur)}</span> : null}
      </button>
      {favKey && (
        <button type="button" className={`fm-pfav${fav.includes(favKey) ? " on" : ""}`} aria-pressed={fav.includes(favKey)} aria-label={`Favourite ${it.label}`} title={fav.includes(favKey) ? "Remove from pinned" : "Pin to the top"} onClick={() => toggleFavKey(favKey)}>
          <Icon name="star" size={12} />
        </button>
      )}
    </div>
  );
  /** Compact chips for Pinned and Recent (named "Recent: …" so they don't repeat the library's "Add …" buttons). */
  const chips = (title: string, keys: string[]) =>
    keys.length > 0 && (
      <section className="fm-psec">
        <h2>{title}</h2>
        <div className="fm-pchips">
          {keys.map((k) => {
            const it = BY_KEY[k];
            return (
              <button key={k} type="button" {...dragProps(it.payload, k)} onClick={() => addAtCentre(it.payload, k)} aria-label={`${title === "Pinned" ? "Favourite" : "Recent"}: ${it.label}`} title={`Add ${it.label}`}>
                <BlockTile type={it.payload.type} icon={it.icon} size={13} artKey={k} />
                {it.label}
              </button>
            );
          })}
        </div>
      </section>
    );

  const prods = products.filter((p) => typeOf(p.type) && (!s || p.name.toLowerCase().includes(s)));
  const results = s ? searchLibrary(s) : [];
  const widgets = WIDGET_PRESETS.filter((w) => !s || `${w.label} widget ${w.help}`.toLowerCase().includes(s));
  const addCustom = () => addAtCentre({ type: "customevent", name: q.trim().slice(0, 120) });

  return (
    <>
      <label>
        <span className="sr-only">Search blocks</span>
        <input className="fm-psearch" type="search" placeholder={`Search ${ITEMS.length} blocks`} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) addAtCentre(results[0].payload, results[0].key);
          if (e.key === "Escape") setQ("");
        }} />
      </label>
      {!s && chips("Recent", recent.filter((k) => !fav.includes(k)))}
      {!s && chips("Pinned", fav)}
      {prods.length > 0 && (
        <section className="fm-psec">
          <h2>This client’s products</h2>
          <div className="fm-pal">{prods.map((p) => item({ key: p.id, label: p.name, icon: typeOf(p.type).icon, payload: { type: p.type, p: p.params, name: p.name }, price: Number(p.params.price) || undefined }))}</div>
        </section>
      )}
      {s ? (
        <section className="fm-psec" aria-live="polite">
          <h2>
            {results.length} {results.length === 1 ? "block" : "blocks"}
          </h2>
          {results.length > 0 ? (
            <div className="fm-pal">{results.map((it) => item(it, it.key))}</div>
          ) : (
            !prods.length && (
              <div className="fm-pempty">
                <p>No blocks match “{q.trim()}”.</p>
                <p className="hint">Try a shorter word, or add it as your own block. It behaves like any other step.</p>
                <button type="button" className="btn sm" onClick={addCustom}>
                  <Icon name="plus" size={14} /> Add “{q.trim().slice(0, 40)}” as a custom block
                </button>
              </div>
            )
          )}
        </section>
      ) : (
        <section className="fm-psec">
          <h2>All blocks</h2>
          <div className="fm-acc">
            {(Object.keys(LIB_GROUPS) as LibGroup[]).map((g) => {
              const isOpen = open.has(g);
              const items = ITEMS.filter((it) => it.group === g);
              const shown = all.has(g) ? items : items.slice(0, PREVIEW);
              return (
                <div key={g} className={`fm-accg${isOpen ? " open" : ""}`}>
                  <button type="button" className="fm-acch" aria-expanded={isOpen} aria-controls={`fm-acc-${g}`} onClick={() => toggleGroup(g)}>
                    <i style={{ background: CATCOLOR[groupColor(g)] }} aria-hidden="true" />
                    <span>{LIB_GROUPS[g]}</span>
                    <small>{counts[g]}</small>
                    <Icon name="chevronDown" size={14} />
                  </button>
                  {isOpen && (
                    <div id={`fm-acc-${g}`} className="fm-pal">
                      {shown.map((it) => item(it, it.key))}
                      {items.length > shown.length && (
                        <button type="button" className="fm-pmore" onClick={() => setAll(new Set(all).add(g))}>
                          Show all {items.length}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      {widgets.length > 0 && (
        <section className="fm-psec">
          <h2>
            Widgets <small className="fm-pcount">{WIDGET_PRESETS.length}</small>
          </h2>
          <div className="fm-pal">
            {widgets.map((w) => (
              <div key={w.key} className="fm-pitem">
                <button type="button" {...dragProps({ type: "widget", p: w.p, name: w.label })} onClick={() => addAtCentre({ type: "widget", p: w.p, name: w.label })} aria-label={`Add widget: ${w.label}`} title={`${w.help}\nScope and metrics are set in the panel after placing.`}>
                  <span className="pi wgt" aria-hidden="true">
                    <Icon name="chart" size={14} />
                  </span>
                  <span className="fm-pname">{w.label}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="hint">Drag a block onto the map, or click to place it in view. Star the ones you use most. Connect blocks from the dots on their sides.</p>
    </>
  );
}
