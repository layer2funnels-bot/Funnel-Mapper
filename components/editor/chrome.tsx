"use client";
// Editor chrome pieces (V2 D2): scenario pill, Clean | Performance switch, left tool rail.
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { setActualView, setOpt, setSideTab, showToast, useEditor } from "@/lib/editor/store";
import { actualMonths } from "@/lib/actual-result";
import { ensureActuals } from "./assets";
import { BASELINE, scenarioLabel } from "@/lib/scenario-label";

/** Which scenario the map is showing, derived from the what-if multipliers (no new state). Opens the Scenarios tab. */
export function ScenarioPill({ onOpen }: { onOpen: () => void }) {
  const w = useEditor((s) => s.settings.whatif);
  const list = useEditor((s) => s.settings.scenarios);
  const label = scenarioLabel({ whatif: w, scenarios: list });
  return (
    <button type="button" className="fm-scen" onClick={onOpen} aria-label={`Scenario: ${label}${label !== BASELINE ? " vs Baseline" : ""}`} title="Choose a scenario">
      <i aria-hidden="true" />
      <span className="lbl">Scenario:</span> {label}
      {label !== BASELINE && <span className="vs"> vs Baseline</span>}
    </button>
  );
}

/**
 * Clean | Performance map (V2 "Editor-default"): Clean keeps the numbers on blocks and lines at one even weight; Performance
 * adds the headline figures, conversion bars, line weight by people and the key leak. "Names only" lives in Layers.
 */
export function ViewSwitch() {
  const nums = useEditor((s) => s.opts.nums);
  const thick = useEditor((s) => s.opts.thick);
  const set = (perf: boolean) => (setOpt("nums", true), setOpt("thick", perf));
  return (
    <div className="seg fm-viewswitch" role="group" aria-label="Map view">
      <button type="button" aria-pressed={!thick} onClick={() => set(false)} title="Numbers on blocks and lines, one even weight">
        Clean
      </button>
      <button type="button" aria-pressed={nums && thick} onClick={() => set(true)} title="Headline numbers, conversion bars, line thickness shows traffic, key leak">
        Performance
      </button>
    </div>
  );
}

const monthView = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  const start = `${m}-01`,
    end = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  const days = Number(end.slice(8));
  return { start, end, label: `${new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })} · ${days} days` };
};

/** Model | Actual (F4): Actual draws the same map with the numbers entered or imported for a month. */
export function ActualSwitch() {
  const view = useEditor((s) => s.actualView);
  const rows = useEditor((s) => s.actuals);
  const months = actualMonths(rows ?? []);
  const toActual = async () => {
    await ensureActuals();
    const ms = actualMonths(useEditor.getState().actuals ?? []);
    if (!ms.length) return showToast("No actuals yet. Add them in the funnel panel: Track › Actuals.");
    setActualView(monthView(ms[0]));
  };
  return (
    <div className="seg fm-actswitch" role="group" aria-label="Plan or actual numbers">
      <button type="button" aria-pressed={!view} onClick={() => setActualView(null)} title="The modelled plan">
        Model
      </button>
      <button type="button" aria-pressed={!!view} onClick={toActual} title="Numbers you entered or imported">
        Actual
      </button>
      {view && months.length > 1 && (
        <select className="fm-actmonth" aria-label="Month of actuals" value={view.start.slice(0, 7)} onChange={(e) => setActualView(monthView(e.target.value))}>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthView(m).label.split(" · ")[0]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/** Performance map legend (top-right of the canvas): how to read line weight, orange lines and the conversion bar. */
export function PerfLegend() {
  return (
    <div className="fm-legend" role="note" aria-label="Reading this view">
      <b>Reading this view</b>
      <span>
        <i className="w" aria-hidden="true" /> Line weight = people
      </span>
      <span>
        <i className="lost" aria-hidden="true" /> Didn’t convert
      </span>
      <span>
        <i className="bar" aria-hidden="true" /> Conversion at the step
      </span>
    </div>
  );
}

/** 48px left rail: Library, Outline, Workspace blocks, Funnel notes, then Shortcuts and Help. */
export function EditorRail({ readOnly, sideCollapsed, onToggleSide, showNotes, notesActive, onNotes, onHelp, onShortcuts }: { readOnly: boolean; sideCollapsed: boolean; onToggleSide: () => void; showNotes: boolean; notesActive: boolean; onNotes: () => void; onHelp: () => void; onShortcuts: () => void }) {
  const what = readOnly ? "side panel" : "block library";
  const tab = useEditor((s) => s.sideTab);
  const shared = useEditor((s) => s.shared);
  // a tab button either shows its panel, or (when it already is showing) collapses the side panel
  const pick = (t: "library" | "outline" | "blocks" | "templates" | "math") => (tab === t && !sideCollapsed ? onToggleSide() : setSideTab(t));
  const on = (t: string) => tab === t && !sideCollapsed;
  return (
    <nav className="fm-rail" aria-label="Editor tools">
      <button type="button" className={on("library") ? "on" : ""} aria-label={`${on("library") ? "Collapse" : "Expand"} ${what}`} title={`${on("library") ? "Hide" : "Show"} ${what}`} aria-expanded={on("library")} aria-controls="fm-side" onClick={() => pick("library")}>
        <Icon name="panelLeft" />
      </button>
      {!readOnly && (
        <>
          <button type="button" className={on("outline") ? "on" : ""} aria-label="Outline" title="Outline: every object on the map" aria-pressed={on("outline")} aria-controls="fm-side" onClick={() => pick("outline")}>
            <Icon name="list" />
          </button>
          {!shared && (
            <button type="button" className={on("templates") ? "on" : ""} aria-label="Templates" title="Templates: add one of the 13 to this map" aria-pressed={on("templates")} aria-controls="fm-side" onClick={() => pick("templates")}>
              <Icon name="file" />
            </button>
          )}
          {!shared && (
            <button type="button" className={on("math") ? "on" : ""} aria-label="How the math works" title="How the math works: the selected step in words" aria-pressed={on("math")} aria-controls="fm-side" onClick={() => pick("math")}>
              <Icon name="calc" />
            </button>
          )}
          {!shared && (
            <button type="button" className={on("blocks") ? "on" : ""} aria-label="Workspace blocks" title="Workspace blocks: saved groups of blocks" aria-pressed={on("blocks")} aria-controls="fm-side" onClick={() => pick("blocks")}>
              <Icon name="layers" />
            </button>
          )}
        </>
      )}
      {showNotes && (
        <button type="button" className={notesActive ? "on" : ""} aria-label="Funnel notes" title="Funnel notes" aria-pressed={notesActive} onClick={onNotes}>
          <Icon name="note" />
        </button>
      )}
      <span className="flex-1" />
      <button type="button" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onClick={onShortcuts}>
        <Icon name="settings" />
      </button>
      <button type="button" aria-label="Help" title="Help" onClick={onHelp}>
        <Icon name="help" />
      </button>
    </nav>
  );
}

/** Layers: Map is always on; Numbers, Flow, Forecast, Notes and Checklist switch the same view options as the View menu. */
export function LayersMenu() {
  const nums = useEditor((s) => s.opts.nums);
  const thick = useEditor((s) => s.opts.thick);
  const notes = useEditor((s) => s.opts.notes);
  const checks = useEditor((s) => s.opts.checks);
  const period = useEditor((s) => s.opts.period);
  const hideNums = useEditor((s) => s.settings.hideNumbers);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="fm-layers" ref={ref}>
      <button type="button" className="btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="layers" size={15} /> Layers
      </button>
      {open && (
        <div className="fm-layers-pop" role="group" aria-label="Layers">
          <label>
            <input type="checkbox" checked disabled /> Map
          </label>
          {!hideNums && (
            <>
              <label>
                <input type="checkbox" checked={nums} onChange={(e) => setOpt("nums", e.target.checked)} /> Numbers
              </label>
              <label>
                <input type="checkbox" checked={period !== "month"} onChange={(e) => setOpt("period", e.target.checked ? "week" : "month")} /> Forecast (per week)
              </label>
            </>
          )}
          <label>
            <input type="checkbox" checked={thick} onChange={(e) => setOpt("thick", e.target.checked)} /> Flow (line weight)
          </label>
          <label>
            <input type="checkbox" checked={notes} onChange={(e) => setOpt("notes", e.target.checked)} /> Notes
          </label>
          <label>
            <input type="checkbox" checked={checks} onChange={(e) => setOpt("checks", e.target.checked)} /> Checklist
          </label>
        </div>
      )}
    </div>
  );
}
