"use client";
// Floating Quick Add: double-click empty canvas (or press /) to search the library and drop a block there. Also opens
// when a connection is dragged off an open port into empty space (the block lands at the release point, already
// connected) and from "Insert step on line". Same library definitions as the palette; Pinned / Recent / client products first.
import { Fragment, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { CATCOLOR, LIB_GROUPS, typeOf, type LibGroup } from "@/lib/catalog";
import { addConnectedNode, addNode, canFollowType, canInsertType, closeQuickAdd, insertStepOnEdge, openQuickAdd, useEditor } from "@/lib/editor/store";
import { BY_KEY, ITEMS, searchLibrary, type LibItem } from "@/lib/library";
import { BlockTile } from "./block-visual";
import { FAV_KEY, markUsed, RECENT_KEY, useList } from "./library-lists";

/** "Insert step on line": open Quick Add next to the connection's label. */
export function openInsertStep(edgeId: string) {
  const stage = document.querySelector(".fm-stage")?.getBoundingClientRect();
  const lbl = document.querySelector(`[data-edge="${edgeId}"]`)?.getBoundingClientRect();
  if (!stage || !lbl) return false;
  openQuickAdd({ sx: Math.max(8, Math.min(stage.width - 308, lbl.left - stage.left + 20)), sy: Math.max(8, Math.min(stage.height - 400, lbl.top - stage.top + 20)), fx: 0, fy: 0, edge: edgeId });
  return true;
}

export function QuickAdd() {
  const q = useEditor((s) => s.quick);
  if (!q) return null;
  return <QuickAddBox key={`${q.sx},${q.sy},${q.edge ?? ""},${q.from?.id ?? ""}`} />;
}

interface Row {
  key: string;
  item: LibItem;
  section: string;
  /** Client product: preset params and name. */
  product?: { name: string; p: Record<string, unknown> };
}

function QuickAddBox() {
  const q = useEditor((s) => s.quick)!;
  const products = useEditor((s) => s.products);
  const fav = useList(FAV_KEY);
  const recent = useList(RECENT_KEY);
  const [text, setText] = useState("");
  const [group, setGroup] = useState<LibGroup | "">("");
  const [i, setI] = useState(0);
  const s = text.trim();
  const context = q.from ? "connect" : q.edge ? "insert" : "free";
  const valid = (it: LibItem) => (context === "connect" ? canFollowType(it.payload.type) : context === "insert" ? canInsertType(it.payload.type) : true);
  const rows = useMemo<Row[]>(() => {
    const ok = (it: LibItem) => valid(it) && (!group || it.group === group);
    if (s) return searchLibrary(s).filter(ok).slice(0, 10).map((item) => ({ key: item.key, item, section: "Results" }));
    const out: Row[] = [];
    const seen = new Set<string>();
    const push = (item: LibItem | undefined, section: string, product?: Row["product"]) => {
      if (!item || !ok(item)) return;
      const key = product ? `p-${product.name}` : item.key;
      if (seen.has(key) || out.length >= 12) return;
      seen.add(key);
      out.push({ key, item, section, product });
    };
    fav.forEach((k) => push(BY_KEY[k], "Pinned"));
    products.forEach((p) => push(ITEMS.find((it) => it.key === p.type), "Client products", { name: p.name, p: p.params }));
    recent.forEach((k) => push(BY_KEY[k], "Recent"));
    ["landing", "optin", "checkout", "upsell", "seq", "cond", "fbads", "note"].forEach((k) => push(BY_KEY[k], "Common"));
    if (group) ITEMS.filter((it) => it.group === group).forEach((it) => push(it, LIB_GROUPS[group]));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, group, fav, recent, products, context]);
  const pick = (k: number) => {
    const r = rows[k];
    if (!r) return;
    const payload = { ...r.item.payload, ...(r.product ? { p: r.product.p, name: r.product.name } : {}) };
    if (q.from) addConnectedNode(q.from, payload.type, q.fx, q.fy, payload);
    else if (q.edge) insertStepOnEdge(q.edge, payload.type, payload);
    else addNode(payload.type, q.fx, q.fy, payload);
    markUsed(r.product ? undefined : r.item.key);
    closeQuickAdd();
  };
  const heading = context === "connect" ? "Add the next step" : context === "insert" ? "Insert a step on this line" : "Add a block";
  return (
    <div className="fm-quick" style={{ left: q.sx, top: q.sy }} role="dialog" aria-label={heading} onDoubleClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="fm-quick-in">
        <Icon name="search" size={16} />
        <input
          autoFocus
          aria-label="Search blocks to add"
          placeholder={context === "free" ? "Add a block…" : `${heading}…`}
          value={text}
          role="combobox"
          aria-expanded="true"
          aria-controls="fm-quick-list"
          aria-activedescendant={rows[i] ? `fm-quick-${rows[i].key}` : undefined}
          onChange={(e) => (setText(e.target.value), setI(0))}
          onBlur={() => setTimeout(closeQuickAdd, 160)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              return closeQuickAdd();
            }
            const move: Record<string, () => void> = {
              ArrowDown: () => setI((v) => Math.min(rows.length - 1, v + 1)),
              ArrowUp: () => setI((v) => Math.max(0, v - 1)),
              Enter: () => pick(i),
            };
            if (move[e.key]) {
              e.preventDefault();
              move[e.key]();
            }
          }}
        />
      </div>
      <div className="fm-quick-cats" role="group" aria-label="Categories" onMouseDown={(e) => e.preventDefault()}>
        <button type="button" aria-pressed={!group} onClick={() => (setGroup(""), setI(0))}>
          All
        </button>
        {(Object.keys(LIB_GROUPS) as LibGroup[]).map((g) => (
          <button key={g} type="button" aria-pressed={group === g} onClick={() => (setGroup(group === g ? "" : g), setI(0))}>
            <i style={{ background: CATCOLOR[g === "comms" || g === "sales" ? "action" : g] }} aria-hidden="true" />
            {LIB_GROUPS[g]}
          </button>
        ))}
      </div>
      <ul id="fm-quick-list" role="listbox" aria-label="Blocks">
        {rows.map((r, k) => {
          const head = k === 0 || rows[k - 1].section !== r.section;
          return (
            <Fragment key={r.key}>
              {head && (
                <li role="presentation" className="qh">
                  {r.section}
                </li>
              )}
              <li
                id={`fm-quick-${r.key}`}
                role="option"
                aria-selected={k === i}
                onMouseEnter={() => setI(k)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(k);
                }}
              >
                <BlockTile type={r.item.payload.type} icon={r.item.icon} size={13} />
                <span className="qn">{r.product ? r.product.name : r.item.label}</span>
                <small>{r.product ? typeOf(r.item.payload.type).label : LIB_GROUPS[r.item.group]}</small>
              </li>
            </Fragment>
          );
        })}
        {!rows.length && <li className="empty">No blocks match{context !== "free" ? " that can follow here" : ""}.</li>}
      </ul>
    </div>
  );
}
