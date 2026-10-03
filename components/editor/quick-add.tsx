"use client";
// Floating quick-add: double-click the empty canvas (or press /) to search the library and drop a block right there.
import { useState } from "react";
import { Icon } from "@/components/icon";
import { LIB_GROUPS } from "@/lib/catalog";
import { addNode, closeQuickAdd, useEditor } from "@/lib/editor/store";
import { BlockTile } from "./block-visual";
import { ITEMS } from "./palette";

export function QuickAdd() {
  const q = useEditor((s) => s.quick);
  if (!q) return null;
  return <QuickAddBox key={`${q.sx},${q.sy}`} />;
}

function QuickAddBox() {
  const q = useEditor((s) => s.quick)!;
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const s = text.trim().toLowerCase();
  const list = (s ? ITEMS.filter((it) => `${it.label} ${it.kw} ${LIB_GROUPS[it.group]}`.toLowerCase().includes(s)) : ITEMS.filter((it) => ["landing", "optin", "checkout", "upsell", "seq", "cond", "fbads", "note"].includes(it.key))).slice(0, 8);
  const pick = (k: number) => {
    const it = list[k];
    if (!it) return;
    addNode(it.payload.type, q.fx, q.fy, it.payload);
    closeQuickAdd();
  };
  return (
    <div className="fm-quick" style={{ left: q.sx, top: q.sy }} role="dialog" aria-label="Quick add a block" onDoubleClick={(e) => e.stopPropagation()}>
      <div className="fm-quick-in">
        <Icon name="search" size={16} />
        <input
          autoFocus
          aria-label="Search blocks to add"
          placeholder="Add a block…"
          value={text}
          role="combobox"
          aria-expanded="true"
          aria-controls="fm-quick-list"
          aria-activedescendant={list[i] ? `fm-quick-${list[i].key}` : undefined}
          onChange={(e) => (setText(e.target.value), setI(0))}
          onBlur={() => setTimeout(closeQuickAdd, 120)}
          onKeyDown={(e) => {
            if (e.key === "Escape") return closeQuickAdd();
            const move: Record<string, () => void> = {
              ArrowDown: () => setI((v) => Math.min(list.length - 1, v + 1)),
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
      <ul id="fm-quick-list" role="listbox" aria-label="Blocks">
        {list.map((it, k) => (
          <li key={it.key} id={`fm-quick-${it.key}`} role="option" aria-selected={k === i} onMouseEnter={() => setI(k)} onMouseDown={(e) => {
              e.preventDefault();
              pick(k);
            }}>
            <BlockTile type={it.payload.type} icon={it.icon} size={13} />
            {it.label}
            <small>{LIB_GROUPS[it.group]}</small>
          </li>
        ))}
        {!list.length && <li className="empty">No blocks match.</li>}
      </ul>
    </div>
  );
}
