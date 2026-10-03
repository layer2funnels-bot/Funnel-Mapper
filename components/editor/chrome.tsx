"use client";
// Editor chrome pieces (V2 D2): scenario pill, Clean | Performance switch, left tool rail.
import { Icon } from "@/components/icon";
import { setOpt, useEditor } from "@/lib/editor/store";

const sameWhatIf = (a: { traffic: number; conv: number; price: number; cost: number }, b: typeof a) => a.traffic === b.traffic && a.conv === b.conv && a.price === b.price && a.cost === b.cost;

/** Which scenario the map is showing, derived from the what-if multipliers (no new state). Opens the Scenarios tab. */
export function ScenarioPill({ onOpen }: { onOpen: () => void }) {
  const w = useEditor((s) => s.settings.whatif);
  const list = useEditor((s) => s.settings.scenarios);
  const label = sameWhatIf(w, { traffic: 1, conv: 1, price: 1, cost: 1 }) ? "Base case" : (list.find((sc) => sameWhatIf(sc.whatif, w))?.name ?? "What-if");
  return (
    <button type="button" className="fm-scen fm-hide-sm" onClick={onOpen} aria-label={`Scenario: ${label}`} title="Choose a scenario">
      <i aria-hidden="true" />
      {label}
    </button>
  );
}

/** Clean | Performance map: the two presets of the View menu's Layers, one click from the canvas. */
export function ViewSwitch() {
  const nums = useEditor((s) => s.opts.nums);
  const thick = useEditor((s) => s.opts.thick);
  const set = (v: boolean) => (setOpt("nums", v), setOpt("thick", v));
  return (
    <div className="seg fm-viewswitch" role="group" aria-label="Map view">
      <button type="button" aria-pressed={!nums && !thick} onClick={() => set(false)} title="Names only">
        Clean
      </button>
      <button type="button" aria-pressed={nums && thick} onClick={() => set(true)} title="Numbers on every block, line thickness shows traffic">
        Performance
      </button>
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

/** 48px left rail: block library, funnel notes and shortcuts. (Outline and workspace blocks join it when those exist.) */
export function EditorRail({ readOnly, sideCollapsed, onToggleSide, showNotes, notesActive, onNotes, onHelp }: { readOnly: boolean; sideCollapsed: boolean; onToggleSide: () => void; showNotes: boolean; notesActive: boolean; onNotes: () => void; onHelp: () => void }) {
  const what = readOnly ? "side panel" : "block library";
  return (
    <nav className="fm-rail" aria-label="Editor tools">
      <button type="button" className={sideCollapsed ? "" : "on"} aria-label={`${sideCollapsed ? "Expand" : "Collapse"} ${what}`} title={`${sideCollapsed ? "Show" : "Hide"} ${what}`} aria-expanded={!sideCollapsed} aria-controls="fm-side" onClick={onToggleSide}>
        <Icon name="panelLeft" />
      </button>
      {showNotes && (
        <button type="button" className={notesActive ? "on" : ""} aria-label="Funnel notes" title="Funnel notes" aria-pressed={notesActive} onClick={onNotes}>
          <Icon name="note" />
        </button>
      )}
      <span className="flex-1" />
      <button type="button" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onClick={onHelp}>
        <Icon name="help" />
      </button>
    </nav>
  );
}
