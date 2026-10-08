"use client";
// Floating Quick Add: double-click empty canvas (or press /) to search the library and drop a block there. Also opens
// when a connection is dragged off an open port into empty space (the block lands at the release point, already
// connected) and from "Insert step on line". Same library definitions as the palette; Pinned / Recent / client products first.
import { useReactFlow } from "@xyflow/react";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";
import { CATCOLOR, groupColor, LIB_GROUPS, typeOf, type LibGroup } from "@/lib/catalog";
import { addConnectedNode, addNode, canFollowType, canInsertType, closeQuickAdd, insertStepOnEdge, openQuickAdd, useEditor } from "@/lib/editor/store";
import { BY_KEY, ITEMS, searchLibrary, type LibItem } from "@/lib/library";
import { useBand } from "@/lib/use-band";
import { BlockTile } from "./block-visual";
import { FAV_KEY, markUsed, RECENT_KEY, useList } from "./library-lists";
import { searchCommands, type Command } from "@/lib/editor/commands";
import { kbd } from "@/lib/platform";

/** "Insert step on line": open Quick Add next to the connection's label. */
export function openInsertStep(edgeId: string) {
  const stage = document.querySelector(".fm-stage")?.getBoundingClientRect();
  const lbl = document.querySelector(`[data-edge="${edgeId}"]`)?.getBoundingClientRect();
  if (!stage || !lbl) return false;
  openQuickAdd({ sx: lbl.left - stage.left + lbl.width / 2, sy: lbl.top - stage.top + lbl.height / 2, fx: 0, fy: 0, edge: edgeId });
  return true;
}

export function QuickAdd() {
  const q = useEditor((s) => s.quick);
  if (!q) return null;
  return <QuickAddBox key={`${q.sx},${q.sy},${q.edge ?? ""},${q.from?.id ?? ""}`} />;
}

interface Row {
  key: string;
  item?: LibItem;
  /** A command from the registry (free placement only), run instead of adding a block. */
  cmd?: Command;
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
  const band = useBand();
  const phone = band === "phone";
  const rf = useReactFlow();
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openedAt = useRef(0);
  const s = text.trim();
  const context = q.from ? "connect" : q.edge ? "insert" : "free";
  const valid = (it: LibItem) => (context === "connect" ? canFollowType(it.payload.type) : context === "insert" ? canInsertType(it.payload.type) : true);
  const rows = useMemo<Row[]>(() => {
    const ok = (it: LibItem) => valid(it) && (!group || it.group === group);
    if (s) {
      const blocks = searchLibrary(s).filter(ok).slice(0, phone ? 20 : 12).map((item) => ({ key: item.key, item, section: "Results" }));
      const cmds = context === "free" && !group ? searchCommands(s).slice(0, 4).map((cmd) => ({ key: `cmd-${cmd.id}`, cmd, section: "Commands" })) : [];
      return [...blocks, ...cmds];
    }
    const out: Row[] = [];
    const seen = new Set<string>();
    const push = (item: LibItem | undefined, section: string, product?: Row["product"]) => {
      if (!item || !ok(item)) return;
      const key = product ? `p-${product.name}` : item.key;
      if (seen.has(key) || out.length >= (phone ? 24 : 14)) return;
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
  }, [s, group, fav, recent, products, context, phone]);
  const pick = (k: number) => {
    const r = rows[k];
    if (!r) return;
    if (r.cmd) {
      closeQuickAdd();
      r.cmd.run();
      return;
    }
    if (!r.item) return;
    const payload = { ...r.item.payload, ...(r.product ? { p: r.product.p, name: r.product.name } : {}) };
    if (q.from) addConnectedNode(q.from, payload.type, q.fx, q.fy, payload);
    else if (q.edge) insertStepOnEdge(q.edge, payload.type, payload);
    else addNode(payload.type, q.fx, q.fy, payload);
    markUsed(r.product ? undefined : r.item.key);
    closeQuickAdd();
  };
  const heading = context === "connect" ? "Add the next step" : context === "insert" ? "Insert a step on this line" : "Add a block";
  const close = closeQuickAdd;

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  // keep the highlighted row in view while moving with the keyboard. Only the list scrolls: scrollIntoView would also move the
  // canvas container around it by a few pixels.
  useEffect(() => {
    const ul = listRef.current;
    const row = rows[i] && ul?.querySelector<HTMLElement>(`[id="fm-quick-${rows[i].key}"]`);
    if (!ul || !row) return;
    const u = ul.getBoundingClientRect(),
      r = row.getBoundingClientRect();
    if (r.top < u.top) ul.scrollTop -= u.top - r.top + 4;
    else if (r.bottom > u.bottom) ul.scrollTop += r.bottom - u.bottom + 4;
  }, [i, rows]);

  // Placement. Desktop / tablet: a popover beside the point it was opened from, flipped and clamped to the canvas so it never
  // clips, and short enough to fit. Phone: a bottom sheet above the keyboard, with the canvas panned so the point stays visible.
  useLayoutEffect(() => {
    const el = boxRef.current;
    const stage = el?.offsetParent as HTMLElement | null;
    if (!el || !stage) return;
    if (phone) {
      el.style.cssText = "";
      return;
    }
    const SW = stage.clientWidth,
      SH = stage.clientHeight,
      M = 8,
      GAP = 14;
    const width = Math.min(340, SW - 2 * M);
    const maxH = Math.max(160, Math.min(460, SH - 2 * M));
    el.style.width = `${width}px`;
    el.style.maxHeight = `${maxH}px`;
    const h = Math.min(el.scrollHeight, maxH);
    // beside the point (right, else left, else centred), so the block's landing spot and the line stay visible
    let left = q.sx + GAP;
    if (left + width > SW - M) left = q.sx - GAP - width;
    if (left < M) left = Math.max(M, (SW - width) / 2);
    // level with the point, shifted up when it would run off the bottom
    let top = q.sy - 20;
    if (top + h > SH - M) top = SH - M - h;
    top = Math.max(M, top);
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }, [phone, q.sx, q.sy, rows.length, group, text]);

  useEffect(() => {
    if (!phone) return;
    const el = boxRef.current;
    const vv = window.visualViewport;
    const fit = () => {
      if (!el) return;
      const h = vv?.height ?? window.innerHeight;
      el.style.bottom = `${Math.max(0, window.innerHeight - h - (vv?.offsetTop ?? 0))}px`;
      el.style.maxHeight = `${Math.round(Math.min(h * 0.62, h - 12))}px`;
    };
    fit();
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    // pan so the point being connected from stays above the sheet (a fixed element has no offsetParent: find the canvas by class)
    const stage = document.querySelector<HTMLElement>(".fm-stage");
    const t = setTimeout(() => {
      if (!el || !stage) return;
      const sr = stage.getBoundingClientRect(),
        er = el.getBoundingClientRect();
      const ay = sr.top + q.sy;
      const limit = er.top - 40;
      // bring the release point and the block it came from above the sheet, without pushing the block off the top of the canvas
      const src = q.from ? document.querySelector<HTMLElement>(`.react-flow__node[data-id="${q.from.id}"]`)?.getBoundingClientRect() : undefined;
      let dy = Math.max(0, ay - limit + 20, src ? src.bottom - limit + 20 : 0);
      if (src) dy = Math.min(dy, src.top - (sr.top + 56));
      if (dy > 4) {
        const vp = rf.getViewport();
        rf.setViewport({ ...vp, y: vp.y - dy }, { duration: 200 });
      }
    }, 80);
    return () => {
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
      clearTimeout(t);
    };
  }, [phone, q.sy, q.from, rf]);

  // close on a tap outside, or when focus leaves the box (Tab away); moving inside it (the categories) keeps it open
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (e.target instanceof Node && !boxRef.current?.contains(e.target)) close();
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [close]);

  const dialog = (
    <div
      ref={boxRef}
      className={`fm-quick${phone ? " sheet" : ""}`}
      style={phone ? undefined : { left: q.sx, top: q.sy }}
      role="dialog"
      aria-label={heading}
      aria-modal="false"
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null) || !e.relatedTarget) return;
        // the canvas may still be taking focus back right after the release that opened this: keep the box and the caret
        if (Date.now() - openedAt.current < 500) return void inputRef.current?.focus();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      {phone && <span className="grab" aria-hidden="true" />}
      <div className="fm-quick-in">
        <Icon name="search" size={16} />
        <input
          ref={inputRef}
          autoFocus={!phone || context === "free"}
          aria-label="Search blocks to add"
          placeholder={context === "free" ? "Add a block…" : `${heading}…`}
          value={text}
          role="combobox"
          aria-expanded="true"
          aria-controls="fm-quick-list"
          aria-activedescendant={rows[i] ? `fm-quick-${rows[i].key}` : undefined}
          enterKeyHint="go"
          onChange={(e) => (setText(e.target.value), setI(0))}
          onKeyDown={(e) => {
            const move: Record<string, () => void> = {
              ArrowDown: () => setI((v) => Math.min(rows.length - 1, v + 1)),
              ArrowUp: () => setI((v) => Math.max(0, v - 1)),
              Home: () => setI(0),
              End: () => setI(Math.max(0, rows.length - 1)),
              Enter: () => pick(i),
            };
            if (move[e.key] && (e.key !== "Home" && e.key !== "End" ? true : !text)) {
              e.preventDefault();
              move[e.key]();
            }
          }}
        />
        {phone && (
          <button type="button" className="btn icon ghost" aria-label="Close" onClick={close}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      <div className="fm-quick-cats" role="group" aria-label="Categories">
        <button type="button" aria-pressed={!group} onClick={() => (setGroup(""), setI(0))}>
          All
        </button>
        {(Object.keys(LIB_GROUPS) as LibGroup[]).map((g) => (
          <button key={g} type="button" aria-pressed={group === g} onClick={() => (setGroup(group === g ? "" : g), setI(0))}>
            <i style={{ background: CATCOLOR[groupColor(g)] }} aria-hidden="true" />
            {LIB_GROUPS[g]}
          </button>
        ))}
      </div>
      <ul id="fm-quick-list" ref={listRef} role="listbox" aria-label="Blocks">
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
                {r.cmd ? (
                  <>
                    <span className="qcmd" aria-hidden="true">
                      <Icon name={r.cmd.icon ?? "zap"} size={13} />
                    </span>
                    <span className="qn">{r.cmd.label}</span>
                    <small>{r.cmd.shortcut ? kbd(r.cmd.shortcut) : "Command"}</small>
                  </>
                ) : (
                  r.item && (
                    <>
                      <BlockTile type={r.item.payload.type} icon={r.item.icon} size={13} artKey={r.item.key} />
                      <span className="qn">{r.product ? r.product.name : r.item.label}</span>
                      <small>{r.product ? typeOf(r.item.payload.type).label : LIB_GROUPS[r.item.group]}</small>
                    </>
                  )
                )}
              </li>
            </Fragment>
          );
        })}
        {!rows.length && <li className="empty">No blocks match{context !== "free" ? " that can follow here" : ""}.</li>}
      </ul>
    </div>
  );
  // a phone sheet sits above every other panel (the details sheet shares the canvas's stacking order)
  return phone ? createPortal(dialog, document.body) : dialog;
}
