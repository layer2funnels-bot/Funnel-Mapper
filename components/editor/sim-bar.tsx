"use client";
// The simulation bar (reference/SIMULATION_SPEC.md §3): a slim strip across the top of the canvas while simulating.
// Scenario · vs · what changed · period · playback and speed · walk-through · reset · save as scenario. Every number on
// the map and the strip is the engine's own; this bar only switches what is shown. Leaving with unsaved what-if
// changes asks once: keep as a scenario, or discard.
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { nf, people } from "@/lib/format";
import { healthChecks } from "@/lib/health";
import { assumptionChanges } from "@/lib/simulate";
import { BASELINE_LONG, NEUTRAL_WHATIF, scenarioLabel } from "@/lib/scenario-label";
import { discardSim, keepSimAsScenario, revertSim, selectNodes, setOpt, setSettings, setSideTab, setSimPlay, setSimSpeed, setSimVs, setSimWalk, simUnsaved, stopSim, useEditor } from "@/lib/editor/store";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { typeOf } from "@/lib/catalog";

const LEVERS: [keyof typeof NEUTRAL_WHATIF, string][] = [
  ["traffic", "Traffic"],
  ["conv", "Conversion"],
  ["price", "Price"],
  ["cost", "Ad cost"],
];

export function SimBar({ onOpenChecks }: { onOpenChecks: () => void }) {
  const base = useEditor((s) => s.simBase);
  const settings = useEditor((s) => s.settings);
  const nodes = useEditor((s) => s.nodes);
  const edges = useEditor((s) => s.edges);
  const R = useEditor((s) => s.R);
  const period = useEditor((s) => s.opts.period);
  const play = useEditor((s) => s.simPlay);
  const speed = useEditor((s) => s.simSpeed);
  const walk = useEditor((s) => s.simWalk);
  const ask = useEditor((s) => s.simAsk);
  const calm = useReducedMotion();
  const [open, setOpen] = useState<DOMRect | null>(null);
  const [name, setName] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const changes = useMemo(() => (base ? assumptionChanges(nodes, base.nodes) : []), [nodes, base]);
  // pause the people-flow while the tab is hidden
  useEffect(() => {
    const vis = () => document.hidden && setSimPlay(false);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !listRef.current?.contains(e.target as Node) && setOpen(null);
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open]);
  if (!base) return null;
  const w = settings.whatif;
  const leverChanges = LEVERS.filter(([k]) => Math.abs((Number(w[k]) || 1) - (Number(base.settings.whatif[k]) || 1)) > 1e-9).map(([k, l]) => {
    const d = ((Number(w[k]) || 1) / (Number(base.settings.whatif[k]) || 1) - 1) * 100;
    return `${l} ${d >= 0 ? "+" : "−"}${nf(Math.abs(d))}%`;
  });
  const blockChanges = changes.map((c) => `${c.name} ${c.label.toLowerCase()} ${nf(c.was, 2)} → ${nf(c.now, 2)}`);
  const all = [...leverChanges, ...blockChanges];
  const unsaved = simUnsaved({ simBase: base, settings });
  const scen = scenarioLabel(settings);
  const vsName = base.vs ? (settings.scenarios.find((x) => x.id === base.vs)?.name ?? "Scenario") : BASELINE_LONG;
  const checks = healthChecks({ nodes, edges });
  const noTraffic = !nodes.some((n) => typeOf(n.type)?.cat === "traffic");
  const order = R.order.filter((id) => nodes.some((n) => n.id === id && typeOf(n.type)?.cat !== "annot"));
  const step = walk != null ? nodes.find((n) => n.id === order[walk]) : undefined;
  const r = step ? R.N[step.id] : undefined;
  return (
    <>
      <div className="fm-simbar" role="toolbar" aria-label="Simulation">
        <label className="fm-sbchip">
          <span>Scenario:</span>
          <select
            aria-label="Scenario"
            value={settings.scenarios.find((sc) => scenarioLabel({ whatif: sc.whatif, scenarios: [sc] }) === scen && sc.name === scen)?.id ?? (scen === "Baseline" ? "" : "__what")}
            onChange={(e) => {
              const sc = settings.scenarios.find((x) => x.id === e.target.value);
              setSettings({ whatif: sc ? { ...sc.whatif } : { ...NEUTRAL_WHATIF } });
            }}
          >
            <option value="">Baseline</option>
            {settings.scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
            {scen === "What-if" && <option value="__what">What-if (unsaved)</option>}
          </select>
        </label>
        <label className="fm-sbchip vs" title={`Compared with ${vsName}`}>
          <span>vs</span>
          <select aria-label="Compared with" value={base.vs ?? ""} onChange={(e) => setSimVs(e.target.value || null)}>
            <option value="">{BASELINE_LONG}</option>
            {settings.scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </label>
        <div className="fm-simchanged" ref={listRef}>
          <button type="button" aria-expanded={!!open} onClick={(e) => setOpen(open ? null : e.currentTarget.getBoundingClientRect())} title="What you changed">
            {all.length === 0 ? "No changes yet" : `${all.length} ${all.length === 1 ? "change" : "changes"} · ${all.slice(0, 2).join(" · ")}${all.length > 2 ? " …" : ""}`}
          </button>
          {open && all.length > 0 && (
            <ul className="fm-simlist" style={{ left: open.left, top: open.bottom + 6 }}>
              {leverChanges.map((t) => (
                <li key={t}>{t}</li>
              ))}
              {changes.map((c) => (
                <li key={`${c.id}-${c.key}`}>
                  <button type="button" onClick={() => (selectNodes([c.id]), setOpen(null))}>
                    {c.name}: {c.label} {nf(c.was, 2)} → {nf(c.now, 2)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="seg fm-simperiod" role="group" aria-label="Period">
          {(["day", "week", "month", "year"] as const).map((p) => (
            <button key={p} type="button" aria-pressed={period === p} onClick={() => setOpt("period", p)}>
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <button type="button" className="btn sm" aria-pressed={play} disabled={calm} onClick={() => setSimPlay(!play)} title={calm ? "Reduced motion is on: line thickness and labels show the flow" : "Play or pause the people flow (Space)"}>
          <Icon name={play ? "pause" : "play"} size={14} /> {play ? "Pause" : "Play"}
        </button>
        <div className="seg fm-simspeed" role="group" aria-label="Speed">
          {([1, 2, 4] as const).map((x) => (
            <button key={x} type="button" aria-pressed={speed === x} onClick={() => setSimSpeed(x)}>
              {x}×
            </button>
          ))}
        </div>
        <button type="button" className="btn sm" aria-pressed={walk != null} onClick={() => setSimWalk(walk == null ? 0 : null)} title="Step through the funnel one stage at a time (← →)">
          Walk-through
        </button>
        <span className="flex-1" />
        <button type="button" className="btn sm ghost" disabled={all.length === 0} onClick={() => revertSim()}>
          Reset to baseline
        </button>
        {unsaved && (
          <button type="button" className="btn sm primary fm-simsave" onClick={() => keepSimAsScenario(name || leverChanges.join(", "))}>
            <span className="dot" aria-hidden="true" /> Save as scenario
          </button>
        )}
      </div>
      {checks.length > 0 && (
        <div className="fm-simwarn" role="status">
          <Icon name="alert" size={14} /> {checks.length} {checks.length === 1 ? "issue" : "issues"} may affect these numbers ·{" "}
          <button type="button" className="link" onClick={onOpenChecks}>
            View
          </button>
        </div>
      )}
      {noTraffic && (
        <div className="fm-simempty" role="status">
          <p>Add a traffic source to simulate.</p>
          <button type="button" className="btn primary" onClick={() => setSideTab("library")}>
            Add source
          </button>
        </div>
      )}
      {step && r && (
        <div className="fm-walkcap" role="status" aria-live="polite">
          <b>{step.name}</b> · {people(typeOf(step.type)?.cat === "traffic" ? r.out : r.inflow)} arrive · {people(r.out)} continue{r.inflow > 0 && typeOf(step.type)?.cat !== "traffic" ? ` · ${nf((r.non / r.inflow) * 100)}% leave` : ""}
          <span className="fm-walknav">
            <button type="button" className="btn icon sm" aria-label="Previous step" disabled={walk === 0} onClick={() => setSimWalk((walk ?? 0) - 1)}>
              <Icon name="chevronLeft" size={14} />
            </button>
            {walk! + 1} / {order.length}
            <button type="button" className="btn icon sm" aria-label="Next step" disabled={walk === order.length - 1} onClick={() => setSimWalk((walk ?? 0) + 1)}>
              <Icon name="chevronRight" size={14} />
            </button>
          </span>
        </div>
      )}
      {ask && <LeaveDialog name={name} setName={setName} suggestion={leverChanges.join(", ")} />}
    </>
  );
}

function LeaveDialog({ name, setName, suggestion }: { name: string; setName: (v: string) => void; suggestion: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const cancel = () => useEditor.setState({ simAsk: false });
  return (
    <dialog ref={ref} className="modal fm-confirm" aria-labelledby="sim-leave-t" onCancel={(e) => (e.preventDefault(), cancel())}>
      <h3 id="sim-leave-t">Keep these changes?</h3>
      <p className="text-sm">You changed the what-if while simulating. Keep it as a scenario to compare later, or discard it and go back to the baseline.</p>
      <label className="field mt-3">
        <span className="lbl">Scenario name</span>
        <input className="input" value={name} placeholder={suggestion || "Simulation"} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn" onClick={cancel}>
          Keep simulating
        </button>
        <button type="button" className="btn" onClick={discardSim}>
          Discard
        </button>
        <button type="button" className="btn primary" onClick={() => keepSimAsScenario(name || suggestion)}>
          Keep as a scenario
        </button>
      </div>
    </dialog>
  );
}

export { stopSim };
