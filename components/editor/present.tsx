"use client";
// Presentation (V2): the funnel one stage at a time. Stages are the map's frames, or Acquire / Convert / Finish
// (lib/present-stages.ts). Stage numbers are the frame totals; click a block for its own numbers. Clean | Numbers
// switches the same layer as the Performance map. Phone: one stage per screen, swipe between stages.
import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { typeOf } from "@/lib/catalog";
import { money, nf, pct, ratio } from "@/lib/format";
import { nodeStats, subLabel } from "@/lib/editor/labels";
import { presentStages } from "@/lib/present-stages";
import { clearSelection, setOpt, setSpot, useEditor } from "@/lib/editor/store";
import { periodFactor } from "@/lib/funnel-math";

export function Presenter({ onExit }: { onExit: () => void }) {
  const rf = useReactFlow();
  const nodes = useEditor((s) => s.nodes);
  const R = useEditor((s) => s.R);
  const cur = useEditor((s) => s.settings.currency);
  const hideNums = useEditor((s) => s.settings.hideNumbers);
  const showNums = useEditor((s) => s.opts.nums);
  const period = useEditor((s) => s.opts.period);
  const picked = useEditor((s) => (s.selNodes.length === 1 ? s.nodes.find((n) => n.id === s.selNodes[0]) : undefined));
  const nums = showNums && !hideNums;
  const stages = useMemo(() => presentStages(nodes, R, cur, periodFactor(period)), [nodes, R, cur, period]);
  const [i, setI] = useState(-1); // -1 = overview, stages.length = the result
  const at = useRef(-1);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (k: number) => {
      const j = Math.max(-1, Math.min(stages.length, k));
      at.current = j;
      setI(j);
      clearSelection();
      const st = j >= 0 && j < stages.length ? stages[j] : null;
      useEditor.setState({ stageIds: st ? st.ids : null });
      setSpot(null);
      if (st) rf.fitView({ nodes: st.ids.map((id) => ({ id })), padding: 0.35, duration: 500, maxZoom: 1.3 });
      else rf.fitView({ padding: 0.15, duration: 500, maxZoom: 1.2 });
    },
    [rf, stages],
  );

  useEffect(() => {
    rf.fitView({ padding: 0.15, duration: 400, maxZoom: 1.2 });
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        e.stopPropagation();
        go(at.current + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        e.stopPropagation();
        go(at.current - 1);
      }
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      useEditor.setState({ stageIds: null });
      setSpot(null);
    };
  }, [go, onExit, rf]);

  const st = i >= 0 && i < stages.length ? stages[i] : null;
  const done = i >= stages.length;
  const total = stages.length;
  const members = st ? new Set(st.ids) : null;
  const obj = picked && (!members || members.has(picked.id)) ? picked : null;
  return (
    <div
      className="fm-present-card"
      role="region"
      aria-label="Presentation"
      aria-live="polite"
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const s = touch.current;
        touch.current = null;
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x,
          dy = e.changedTouches[0].clientY - s.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(at.current + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="fp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.max(0, Math.min(total, i + 1))} aria-label="Presentation progress">
        <ol>
          {stages.map((s, k) => (
            <li key={s.key}>
              <button type="button" aria-current={i === k ? "step" : undefined} className={k < i ? "done" : undefined} onClick={() => go(k)}>
                <i aria-hidden="true" />
                <span>{s.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      {st ? (
        <>
          <div className="fp-kicker">
            Stage {i + 1} of {total}
          </div>
          <h2 className="fp-title">{st.name}</h2>
          {nums ? <div className="fp-numbers">{st.totals.text || "No data yet"}</div> : <div className="fp-numbers muted">{st.ids.length} {st.ids.length === 1 ? "step" : "steps"}</div>}
          {obj && (
            <div className="fp-obj">
              <b>{obj.name}</b> <span className="text-muted">· {typeOf(obj.type).label}</span>
              <div className="text-muted">{subLabel(obj, cur)}</div>
              {nums && <div>{nodeStats(obj, R, cur, periodFactor(period)).map((s, k) => (s.b ? <b key={k}>{s.t}</b> : <span key={k}>{s.t}</span>))}</div>}
            </div>
          )}
          {!obj && <p className="fp-hint">Click a block to see its own numbers.</p>}
        </>
      ) : done ? (
        <>
          <div className="fp-kicker">The result</div>
          <h2 className="fp-title">{nums ? `${money(R.rev, cur)} revenue · ${money(R.profit, cur)} profit` : "That’s the whole journey"}</h2>
          {nums && (
            <div className="fp-numbers">
              {nf(R.traffic)} visitors → {nf(R.cust, 1)} customers ({pct(R.conv)}) · ROAS {ratio(R.roas)}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="fp-kicker">Overview</div>
          <h2 className="fp-title">The funnel at a glance</h2>
          <div className="fp-numbers muted">
            {total} {total === 1 ? "stage" : "stages"}: {stages.map((s) => s.name).join(" → ")}. Use → / ← or swipe.
          </div>
        </>
      )}
      <div className="fp-actions">
        <button type="button" className="btn" onClick={() => go(i - 1)} disabled={i < 0} aria-label="Previous stage" title="Previous stage">
          <Icon name="chevronLeft" />
        </button>
        <button type="button" className="btn primary" onClick={() => go(i + 1)} disabled={done} aria-label="Next stage" title="Next stage">
          Next <Icon name="chevronRight" />
        </button>
        <span className="flex-1" />
        {!hideNums && (
          <div className="seg" role="group" aria-label="Map detail">
            <button type="button" aria-pressed={!showNums} onClick={() => (setOpt("nums", false), setOpt("thick", false))}>
              Clean
            </button>
            <button type="button" aria-pressed={showNums} onClick={() => (setOpt("nums", true), setOpt("thick", true))}>
              Numbers
            </button>
          </div>
        )}
        <button type="button" className="btn" onClick={onExit}>
          Exit
        </button>
      </div>
    </div>
  );
}
