"use client";
import { useReactFlow } from "@xyflow/react";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { BLOCK_TYPES, CATCOLOR, CATS, typeOf, type BlockTypeKey, type Category, type NodeParams } from "@/lib/catalog";
import { addNode } from "@/lib/editor/store";
import { DND_MIME } from "./canvas";

export interface PaletteProduct {
  id: string;
  name: string;
  type: string;
  params: NodeParams;
}

export function Palette({ products, onPicked }: { products: PaletteProduct[]; onPicked?: () => void }) {
  const [q, setQ] = useState("");
  const rf = useReactFlow();
  const s = q.trim().toLowerCase();
  const addAtCentre = (type: string, extra: { p?: NodeParams; name?: string } = {}) => {
    const el = document.querySelector(".fm-stage")?.getBoundingClientRect();
    const c = el ? rf.screenToFlowPosition({ x: el.left + el.width / 2, y: el.top + el.height / 2 }) : { x: 200, y: 200 };
    addNode(type, c.x - 105 + (Math.random() * 80 - 40), c.y - 48 + (Math.random() * 80 - 40), extra);
    onPicked?.();
  };
  const item = (key: string, label: string, color: string, icon: Parameters<typeof Icon>[0]["name"], payload: { type: string; p?: NodeParams; name?: string }) => (
    <button
      key={key}
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDragEnd={() => onPicked?.()}
      onClick={() => addAtCentre(payload.type, payload)}
      aria-label={`Add ${label}`}
    >
      <span className="pi" style={{ background: color }}>
        <Icon name={icon} size={16} />
      </span>
      {label}
    </button>
  );
  const prods = products.filter((p) => typeOf(p.type) && (!s || p.name.toLowerCase().includes(s)));
  const groups = (Object.keys(CATS) as Category[])
    .map((c) => ({ c, items: (Object.entries(BLOCK_TYPES) as [BlockTypeKey, (typeof BLOCK_TYPES)[BlockTypeKey]][]).filter(([, t]) => t.cat === c && (!s || t.label.toLowerCase().includes(s))) }))
    .filter((g) => g.items.length);
  return (
    <>
      <label>
        <span className="sr-only">Search blocks</span>
        <input className="fm-psearch" type="search" placeholder="Search blocks" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {prods.length > 0 && (
        <>
          <h2>Client products</h2>
          <div className="fm-pal">
            {prods.map((p) => {
              const T = typeOf(p.type);
              return item(p.id, p.name, CATCOLOR[T.color ?? T.cat], T.icon, { type: p.type, p: p.params, name: p.name });
            })}
          </div>
        </>
      )}
      {groups.map(({ c, items }) => (
        <div key={c}>
          <h2>{CATS[c]}</h2>
          <div className="fm-pal">{items.map(([k, t]) => item(k, t.label, CATCOLOR[t.color ?? c], t.icon, { type: k }))}</div>
        </div>
      ))}
      {!groups.length && !prods.length && <p className="hint">No blocks match.</p>}
      <p className="hint">
        Drag a block onto the canvas or tap it. Drag from a block’s right dot to connect people who move on. The bottom dot sends people who don’t. Shift-drag the canvas to select several blocks.
      </p>
    </>
  );
}
