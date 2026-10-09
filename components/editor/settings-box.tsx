"use client";
// The block settings box (V3 "Block settings box"): double-click or Enter on a block opens a small tabbed box below it. Settings first
// (the few numbers people change most), then Page (pages) or Pricing (offers), Style and Notes. Edits update the canvas live; Enter
// applies, Esc puts everything back, Tab moves. The right panel stays for the whole funnel. Only inputs the engine already has.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";
import { baseOf, retypeTargets, typeOf } from "@/lib/catalog";
import { money, nf, people as ppl, perSuffix } from "@/lib/format";
import { ICONS, type IconName } from "@/lib/icons";
import { num } from "@/lib/funnel-math";
import { placePeek, type Rect } from "@/lib/peek-place";
import { cleanStyle } from "@/lib/style";
import type { FunnelNode } from "@/lib/graph";
import { closeSettingsBox, deleteSelection, duplicateSelection, retypeNode, selectNodes, setLocked, setOpt, updateNode, updateParams, useEditor, viewK } from "@/lib/editor/store";
import { NumInput, Seg, TextField } from "./fields";
import { ChecklistEditor } from "./style-panel";
import { InternalNotes } from "./inspector";
import { ThumbnailField } from "./thumbnail-field";
import { WaitField } from "./wait-field";

type Tab = "settings" | "page" | "pricing" | "style" | "notes";
const SWATCHES = ["#A78BFA", "#10B981", "#FB923C", "#60A5FA", "#2DD4BF", "#FBBF24", "#94A3B8"];
const rect = (r: DOMRect): Rect => ({ x: r.left, y: r.top, w: r.width, h: r.height });

export function SettingsBox() {
  const id = useEditor((s) => s.settingsBox);
  const n = useEditor((s) => (s.settingsBox ? s.nodes.find((x) => x.id === s.settingsBox) : undefined));
  const selected = useEditor((s) => (s.settingsBox ? s.selNodes.includes(s.settingsBox) : false));
  // selecting another block, or the empty canvas, closes the box and keeps the edits
  useEffect(() => {
    if (id && !selected) closeSettingsBox();
  }, [id, selected]);
  if (!id || !n) return null;
  return createPortal(<Box key={id} n={n} />, document.body);
}

function Rate({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="fm-sbx-f">
      <span className="lbl">{label}</span>
      <div className="fm-sbx-rate">
        <input type="range" min={0} max={100} step={1} value={Math.max(0, Math.min(100, value))} aria-label={label} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
        <span className="fm-sbx-num">
          <NumInput value={value} onChange={onChange} min={0} max={100} aria-label={`${label} (%)`} />
          <span aria-hidden="true">%</span>
        </span>
      </div>
    </div>
  );
}
function Unit({ label, value, onChange, unit }: { label: string; value: number; onChange: (v: number) => void; unit: string }) {
  return (
    <div className="fm-sbx-f">
      <span className="lbl">{label}</span>
      <span className="fm-sbx-unit">
        <NumInput value={value} onChange={onChange} min={0} aria-label={label} />
        <span aria-hidden="true">{unit}</span>
      </span>
    </div>
  );
}

function Box({ n }: { n: FunnelNode }) {
  const T = typeOf(n.type);
  const base = baseOf(n.type);
  const ro = useEditor((s) => s.readOnly);
  const cur = useEditor((s) => s.settings.currency);
  const r = useEditor((s) => s.R.N[n.id]);
  const k = useEditor((s) => viewK(s.opts));
  const [tab, setTab] = useState<Tab>("settings");
  const [pos, setPos] = useState<{ left: number; top: number; w: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const P = (key: string) => (v: number | string | boolean) => updateParams(n.id, { [key]: v });
  const p = n.p;
  const isPage = T.cat === "page",
    isOffer = T.cat === "offer",
    isCond = base === "cond" || base === "split",
    isTraffic = T.cat === "traffic",
    isAction = T.cat === "action";
  const tabs: [Tab, string][] = [["settings", "Settings"], ...(isPage ? ([["page", "Page"]] as [Tab, string][]) : isOffer ? ([["pricing", "Pricing"]] as [Tab, string][]) : []), ["style", "Style"], ["notes", "Notes"]];
  const close = (revert: boolean) => {
    closeSettingsBox(revert);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`.react-flow__node[data-id="${n.id}"]`)?.focus());
  };

  // below the block, then above, right, left; follows the block while the map moves
  useLayoutEffect(() => {
    let raf = 0;
    let last = "";
    const tick = () => {
      const el = ref.current;
      const nodeEl = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${n.id}"]`);
      const stageEl = document.querySelector(".fm-stage");
      if (el && nodeEl && stageEl) {
        const others = [...document.querySelectorAll<HTMLElement>(".fm-stage .react-flow__node")]
          .filter((x) => x !== nodeEl && !x.classList.contains("react-flow__node-frame"))
          .map((x) => rect(x.getBoundingClientRect()));
        const h = el.offsetHeight;
        const place = placePeek(rect(nodeEl.getBoundingClientRect()), others, rect(stageEl.getBoundingClientRect()), { w: 340, h }, 18, { w: 300, h });
        const key = `${Math.round(place.x)}|${Math.round(place.y)}|${place.w}`;
        if (key !== last) {
          last = key;
          setPos({ left: Math.round(place.x), top: Math.round(place.y), w: place.w });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [n.id, tab]);
  // clicking away keeps the edits and closes
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current?.contains(t) || t.closest(`.react-flow__node[data-id="${n.id}"]`) || t.closest(".fm-ftb, [role=menu], dialog")) return;
      closeSettingsBox();
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [n.id]);
  // focus the first field so the keyboard works straight away
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("input:not([type=range]), select, textarea")?.focus();
  }, []);

  // what the entry means, in people
  const result = (() => {
    if (!r) return null;
    if (isPage) return `${ppl(r.out * k)} of ${ppl(r.inflow * k)} people continue`;
    if (isAction) return `${ppl(r.out * k)} of ${ppl(r.inflow * k)} people move on`;
    if (isOffer) return `${ppl(r.out * k)} buyers · ${money(r.rev * k, cur)} ${perSuffix(k)}`;
    if (isCond) return `${ppl(r.out * k)} ${(T.ports?.[0] ?? "Yes").toLowerCase()} · ${ppl(r.non * k)} ${(T.ports?.[1] ?? "No").toLowerCase()}`;
    if (isTraffic) {
      const visits = r.out * k;
      return r.spend > 0 && visits > 0 ? `${money(r.spend / r.out, cur)} per visit` : "No spend on this source";
    }
    return null;
  })();
  const style = (patch: Partial<NonNullable<FunnelNode["s"]>>) => updateNode(n.id, { s: cleanStyle({ ...(n.s ?? {}), ...patch }) });

  return (
    <div
      ref={ref}
      className="fm-sbx"
      role="dialog"
      aria-label={`Settings for ${n.name}`}
      style={pos ? { left: pos.left, top: pos.top, width: pos.w } : { left: -9999, top: 0 }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          close(true);
        } else if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          close(false);
        }
      }}
    >
      <header className="fm-sbx-h">
        <span className="fm-sbx-tile" style={{ background: n.s?.accent ?? undefined }} aria-hidden="true" data-cat={T.cat} />
        <div>
          <b>{n.name || T.label}</b>
          <small>{T.label}</small>
        </div>
        <button type="button" className="fm-sbx-x" aria-label="Close settings" title="Close (Enter keeps your changes, Esc undoes them)" onClick={() => close(false)}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="fm-sbx-tabs" role="tablist" aria-label="Block settings">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      <fieldset className="fm-sbx-body" disabled={ro || !!n.locked}>
        {n.locked && !ro && <p className="fm-sbx-note">Locked. Unlock it below to change it.</p>}
        {tab === "settings" && (
          <>
            {isCond && base === "cond" && <TextField label="Question" value={n.name} onChange={(v) => updateNode(n.id, { name: v })} />}
            {isPage && <Rate label="People who continue" value={num(p.cr)} onChange={P("cr")} />}
            {isPage && (
              <div className="fm-sbx-f">
                <label className="lbl" htmlFor={`sbx-type-${n.id}`}>
                  Page type
                </label>
                <select id={`sbx-type-${n.id}`} className="input" value={n.type} onChange={(e) => retypeNode(n.id, e.target.value)}>
                  {[n.type, ...retypeTargets(n.type)].map((t) => (
                    <option key={t} value={t}>
                      {typeOf(t).label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isOffer && <Rate label="Buy rate" value={num(p.cr)} onChange={P("cr")} />}
            {isOffer && base === "sub" && (
              <div className="fm-sbx-f">
                <span className="lbl">Counts as</span>
                <Seg label="Billing" value={String(p.interval || "monthly")} options={[["weekly", "Weekly"], ["monthly", "Monthly"], ["quarterly", "Quarterly"], ["yearly", "Yearly"]]} onChange={P("interval")} />
              </div>
            )}
            {isCond && <Rate label={`${T.ports?.[0] ?? "Yes"}`} value={num(p.pct)} onChange={P("pct")} />}
            {isCond && <p className="fm-sbx-sub">{T.ports?.[1] ?? "No"}: {nf(100 - num(p.pct), 1)}%, the rest (automatic)</p>}
            {isTraffic && (
              <>
                <div className="fm-sbx-f">
                  <span className="lbl">Cost is</span>
                  <Seg label="Cost is" value={String(p.model || "budget")} options={[["budget", "Budget"], ["cpc", "Per click"], ["cpm", "Per 1,000"]]} onChange={P("model")} />
                </div>
                {p.model === "cpc" ? (
                  <>
                    <Unit label="Clicks per month" value={num(p.clicks)} onChange={P("clicks")} unit="clicks" />
                    <Unit label="Cost per click" value={num(p.cpc)} onChange={P("cpc")} unit={cur} />
                  </>
                ) : p.model === "cpm" ? (
                  <>
                    <Unit label="Views per month" value={num(p.impr)} onChange={P("impr")} unit="views" />
                    <Unit label="Cost per 1,000 views" value={num(p.cpm)} onChange={P("cpm")} unit={cur} />
                  </>
                ) : (
                  <>
                    <Unit label="Visits per month" value={num(p.visitors)} onChange={P("visitors")} unit="visits" />
                    <Unit label="Budget" value={num(p.spend)} onChange={P("spend")} unit={`${cur} / mo`} />
                  </>
                )}
              </>
            )}
            {isAction && <Rate label={T.crl ?? "People who move on"} value={num(p.cr)} onChange={P("cr")} />}
            {isAction && n.type === "wait" && <WaitField n={n} />}
            {!isPage && !isOffer && !isCond && !isTraffic && !isAction && <TextField label="Name" value={n.name} onChange={(v) => updateNode(n.id, { name: v })} />}
            {result && (
              <div className="fm-sbx-res" role="status">
                {result}
              </div>
            )}
          </>
        )}
        {tab === "page" && (
          <>
            <TextField label="Page name" value={n.name} onChange={(v) => updateNode(n.id, { name: v })} />
            <ThumbnailField n={n} />
          </>
        )}
        {tab === "pricing" && (
          <>
            <TextField label="Name" value={n.name} onChange={(v) => updateNode(n.id, { name: v })} />
            <Unit label={base === "plan" ? "Each payment" : "Price"} value={num(p.price)} onChange={P("price")} unit={cur} />
            {base === "sub" && <Unit label="Setup fee" value={num(p.setup)} onChange={P("setup")} unit={cur} />}
            {base === "sub" && <Unit label="Trial price" value={num(p.trialPrice)} onChange={P("trialPrice")} unit={cur} />}
            <Rate label="Discount" value={num(p.disc)} onChange={P("disc")} />
            <Rate label="Refund rate" value={num(p.refund)} onChange={P("refund")} />
          </>
        )}
        {tab === "style" && (
          <>
            <div className="fm-sbx-f">
              <span className="lbl">Colour</span>
              <div className="fm-sbx-sw" role="radiogroup" aria-label="Accent colour">
                {SWATCHES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={n.s?.accent === c} aria-label={c} style={{ background: c }} onClick={() => style({ accent: n.s?.accent === c ? undefined : c })} />
                ))}
              </div>
            </div>
            <div className="fm-sbx-f">
              <label className="lbl" htmlFor={`sbx-icon-${n.id}`}>
                Icon
              </label>
              <select id={`sbx-icon-${n.id}`} className="input" value={n.s?.icon ?? ""} onChange={(e) => style({ icon: e.target.value || undefined })}>
                <option value="">Default ({T.label})</option>
                {(Object.keys(ICONS) as IconName[]).sort().map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div className="fm-sbx-f">
              <span className="lbl">Numbers on this block</span>
              <Seg label="Numbers on this block" value={n.s?.hideNum ? "hide" : "show"} options={[["show", "Show"], ["hide", "Hide"]]} onChange={(v) => style({ hideNum: v === "hide" ? true : undefined })} />
            </div>
          </>
        )}
        {tab === "notes" && (
          <>
            <InternalNotes n={n} />
            <ChecklistEditor n={n} />
          </>
        )}
      </fieldset>
      <footer className="fm-sbx-foot">
        <button type="button" className="fm-sbx-ic" aria-label="Duplicate" title="Duplicate" disabled={ro} onClick={() => (selectNodes([n.id]), duplicateSelection(), closeSettingsBox())}>
          <Icon name="copy" size={16} />
        </button>
        <button type="button" className="fm-sbx-ic" aria-label={n.locked ? "Unlock" : "Lock"} aria-pressed={!!n.locked} title={n.locked ? "Unlock" : "Lock"} disabled={ro} onClick={() => setLocked(!n.locked, [n.id])}>
          <Icon name="lock" size={16} />
        </button>
        <button type="button" className="fm-sbx-ic danger" aria-label="Delete block" title="Delete (Ctrl Z brings it back)" disabled={ro || !!n.locked} onClick={() => (selectNodes([n.id]), closeSettingsBox(), deleteSelection())}>
          <Icon name="trash" size={16} />
        </button>
        <span className="flex-1" />
        <button
          type="button"
          className="fm-sbx-more"
          onClick={() => {
            closeSettingsBox();
            setOpt("hideInsp", false);
            document.querySelector(".fm-editor")?.classList.add("show-insp");
          }}
        >
          Open full panel ›
        </button>
      </footer>
    </div>
  );
}
