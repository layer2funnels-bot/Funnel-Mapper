"use client";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { typeOf } from "@/lib/catalog";
import { money, nf, pct, ratio } from "@/lib/format";
import { nodeStats, subLabel } from "@/lib/editor/labels";
import { setSpot, useEditor } from "@/lib/editor/store";

/** Full-screen walkthrough for client calls: steps through the funnel in flow order, zooming to each block. */
export function Presenter({ onExit }: { onExit: () => void }) {
  const rf = useReactFlow();
  const nodes = useEditor((s) => s.nodes);
  const R = useEditor((s) => s.R);
  const cur = useEditor((s) => s.settings.currency);
  const nums = useEditor((s) => s.opts.nums && !s.settings.hideNumbers);
  const steps = useMemo(() => R.order.map((id) => nodes.find((n) => n.id === id)).filter((n) => n && typeOf(n.type)?.cat !== "annot") as typeof nodes, [R.order, nodes]);
  const [i, setI] = useState(-1); // -1 = overview
  const cur_i = useRef(-1);
  const go = useCallback(
    (k: number) => {
      const j = Math.max(-1, Math.min(steps.length, k));
      cur_i.current = j;
      setI(j);
      const n = j >= 0 && j < steps.length ? steps[j] : null;
      setSpot(n?.id ?? null);
      if (n) rf.fitView({ nodes: [{ id: n.id }], padding: 1.6, duration: 500, maxZoom: 1.4 });
      else rf.fitView({ padding: 0.15, duration: 500, maxZoom: 1.2 });
    },
    [rf, steps],
  );
  useEffect(() => {
    rf.fitView({ padding: 0.15, duration: 400, maxZoom: 1.2 });
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        e.stopPropagation();
        go(cur_i.current + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        e.stopPropagation();
        go(cur_i.current - 1);
      }
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      setSpot(null);
    };
  }, [go, onExit, rf]);
  const n = i >= 0 && i < steps.length ? steps[i] : null;
  const done = i >= steps.length;
  return (
    <div className="fm-present-card card p-5" role="region" aria-label="Presentation" aria-live="polite">
      {n ? (
        <>
          <div className="mb-1 text-xs font-bold text-muted">
            Step {i + 1} of {steps.length} · {typeOf(n.type).label}
          </div>
          <div className="font-display text-2xl font-bold">{n.name}</div>
          <div className="text-sm text-muted">{subLabel(n, cur)}</div>
          {nums && <div className="mt-2 text-[15px]">{nodeStats(n, R, cur).map((s, k) => (s.b ? <b key={k}>{s.t}</b> : <span key={k}>{s.t}</span>))}</div>}
        </>
      ) : done ? (
        <>
          <div className="mb-1 text-xs font-bold text-muted">The result</div>
          <div className="font-display text-2xl font-bold">{nums ? `${money(R.rev, cur)} revenue · ${money(R.profit, cur)} profit` : "That’s the whole journey"}</div>
          {nums && (
            <div className="mt-1 text-sm text-muted">
              {nf(R.traffic)} visitors → {nf(R.cust, 1)} customers ({pct(R.conv)}) · ROAS {ratio(R.roas)}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-1 text-xs font-bold text-muted">Overview</div>
          <div className="font-display text-2xl font-bold">The funnel at a glance</div>
          <div className="text-sm text-muted">Use → / ← or the buttons to walk through {steps.length} steps.</div>
        </>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button type="button" className="btn" onClick={() => go(i - 1)} disabled={i < 0} aria-label="Previous step">
          <Icon name="chevronLeft" />
        </button>
        <button type="button" className="btn primary" onClick={() => go(i + 1)} disabled={done} aria-label="Next step">
          Next <Icon name="chevronRight" />
        </button>
        <span className="flex-1" />
        <button type="button" className="btn" onClick={onExit}>
          Exit
        </button>
      </div>
    </div>
  );
}
