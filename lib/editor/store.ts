"use client";
// Editor state (Zustand). Holds the funnel graph + settings, selection, undo/redo history and view options.
// All maths comes from lib/funnel-math; this file only orchestrates state.
import { create } from "zustand";
import { blockH, DEFAULT_SIZE, defaultsFor, retypeTargets, FRAME_COLORS, isAnnot, nodeW, NH, portsFor, SIZED_TYPES, typeOf, canReceive, type NodeParams } from "../catalog";
import { compute, warnNodeIds, type FunnelResult } from "../funnel-math";
import type { ChecklistItem, FunnelEdge, FunnelGraph, FunnelNode, FunnelSettings, Viewport } from "../graph";
import { tidyLayout } from "../layout";
import { cleanStyle, type EdgeStyle, type NodeStyle } from "../style";

export type ReportTab = "math" | "steps" | "sources" | "plan" | "costs" | "scenarios" | "forecast" | "actuals";
export type SidePanel = "inspector" | "versions" | "comments" | "notes";
export type InspTab = "details" | "style" | "plan" | "analytics";
export type EditorMode = "map" | "reports";
export type ReportSection = "overview" | "data" | "sources" | "offers" | "expenses" | "scenarios" | "forecast" | "goals" | "mrr" | "monthly" | "reinvest" | "status";
export type SaveStatus = "saved" | "dirty" | "saving" | "offline" | "error" | "readonly";

export interface ViewOpts {
  /** Layers: numbers on blocks and connections. */
  nums: boolean;
  /** Layers: line thickness shows traffic (flow). */
  thick: boolean;
  /** Layers: sticky notes and internal-note badges. */
  notes: boolean;
  /** Layers: checklist elements and checklist badges. */
  checks: boolean;
  /** Forecast layer: numbers on the map per day / week / month / year (the funnel models a month). */
  period: "day" | "week" | "month" | "year";
  /** Background of exported map images (PNG / SVG). */
  bg: "light" | "dark" | "transparent";
  snap: boolean;
  mini: boolean;
  /** Desktop: block library / details panel collapsed so the canvas gets the space. */
  hideSide: boolean;
  hideInsp: boolean;
}

interface Snapshot {
  nodes: FunnelNode[];
  edges: FunnelEdge[];
  settings: FunnelSettings;
  name: string;
}

export interface StylePreset {
  id: string;
  name: string;
  style: NodeStyle;
}
/** A saved selection (blocks and the connections between them) that can be placed again in any funnel of the workspace. */
export interface WorkspaceBlock {
  id: string;
  name: string;
  nodes: FunnelNode[];
  edges: FunnelEdge[];
}

export interface ClientProduct {
  id: string;
  name: string;
  type: string;
  params: NodeParams;
}

/** Floating Quick Add: where it opened (screen px inside the canvas) and where the block goes (flow px). */
export interface QuickAddState {
  sx: number;
  sy: number;
  fx: number;
  fy: number;
  /** Opened by dragging a connection off a port into empty space: the new block lands at `fx/fy` (its in-port at that point) and is connected. */
  from?: { id: string; port: "main" | "alt" };
  /** Opened from "Insert step on line": the block goes onto this connection. */
  edge?: string;
}

/** Right-click / long-press menu. Coordinates are client px. */
export interface MenuState {
  kind: "block" | "edge" | "selection" | "pane";
  x: number;
  y: number;
  id?: string;
  /** Flow position under the pointer (pane menu: where "Add …" puts things). */
  fx?: number;
  fy?: number;
}

export interface EditorState {
  funnelId: string;
  clientId: string;
  name: string;
  nodes: FunnelNode[];
  edges: FunnelEdge[];
  view: Viewport;
  settings: FunnelSettings;
  R: FunnelResult;
  warnIds: Set<string>;
  /** The client's saved products (library "Client products" and Quick Add). */
  products: ClientProduct[];
  /** Left panel: block library, funnel outline or workspace blocks. */
  sideTab: "library" | "outline" | "blocks";
  /** Saved style presets and blocks of this workspace (table workspace_assets). */
  stylePresets: StylePreset[];
  workspaceBlocks: WorkspaceBlock[];
  /** Open context menu. */
  menu: MenuState | null;
  /** Copied style (Copy style / Paste style / eyedropper). */
  styleClip: NodeStyle | null;
  /** Eyedropper armed: the next block clicked receives this block's style. */
  eyedrop: string | null;
  /** A canvas drag is in progress (the floating toolbar hides). */
  dragging: boolean;
  /** Reports → Funnel data: step to highlight ("Open in Reports"). */
  reportFocus: string | null;
  /** Change-type picker: the block it is open for. */
  typePicker: string | null;
  /** Block whose name is being edited on the canvas. */
  renaming: string | null;
  /** Block losing the most people (Performance map badge). */
  keyLeak: string | null;
  /** Measured DOM sizes (notes and headings grow with text); used by React Flow, layout and frame wrapping. */
  dims: Record<string, { width: number; height: number }>;
  selNodes: string[];
  selEdge: string | null;
  tab: ReportTab;
  panel: SidePanel;
  /** Element inspector tab, remembered across selections. */
  inspTab: InspTab;
  opts: ViewOpts;
  readOnly: boolean;
  saveStatus: SaveStatus;
  /** Bumped on every content change (not view); the saver watches it. */
  rev: number;
  viewRev: number;
  clip: { nodes: FunnelNode[]; edges: FunnelEdge[] } | null;
  past: Snapshot[];
  future: Snapshot[];
  committed: Snapshot | null;
  toast: { text: string; id: number; action?: string; run?: () => void } | null;
  /** Presentation mode: the block in focus (others dim). */
  spot: string | null;
  /** Opened through a public share link (no account features: versions, actuals, products). */
  shared: boolean;
  /** Floating quick-add: where it opened (screen px inside the canvas) and the flow position blocks go to. */
  quick: QuickAddState | null;
  /** Workspace viewer: always read-only (the database refuses their writes too). */
  viewer: boolean;
  /** Map (canvas) or the full-width Reports view. */
  mode: EditorMode;
  section: ReportSection;
}

const OPTS_KEY = "fm-editor-opts";
const loadOpts = (): ViewOpts => {
  const d: ViewOpts = { nums: true, thick: true, notes: true, checks: true, period: "month", bg: "light", snap: true, mini: true, hideSide: false, hideInsp: false };
  try {
    const saved = JSON.parse(localStorage.getItem(OPTS_KEY) || "{}");
    // V2: below 1440px the library starts collapsed to the rail (it opens as an overlay); a saved choice wins
    if (saved.hideSide === undefined && window.innerWidth <= 1439) d.hideSide = true;
    return { ...d, ...saved };
  } catch {
    return d;
  }
};

let uid = 1;
export const nid = () => "n" + Date.now().toString(36) + (uid++).toString(36);
const GRID = 11;

const blankResult = compute({ nodes: [], edges: [] }, { basis: "first", fixed: 0 });

export const useEditor = create<EditorState>(() => ({
  funnelId: "",
  clientId: "",
  name: "",
  nodes: [],
  edges: [],
  view: { x: 60, y: 40, k: 1 },
  settings: { basis: "first", fixed: 0, whatif: { traffic: 1, conv: 1, price: 1, cost: 1 }, target: 0, currency: "GBP", expenses: [], scenarios: [], projection: { months: 12, growth: 0 }, hideNumbers: false, goals: [], notes: { body: "", shared: false }, reinvest: { pct: 0, months: 12 } },
  R: blankResult,
  warnIds: new Set(),
  keyLeak: null,
  products: [],
  sideTab: "library",
  stylePresets: [],
  workspaceBlocks: [],
  menu: null,
  typePicker: null,
  styleClip: null,
  eyedrop: null,
  dragging: false,
  reportFocus: null,
  renaming: null,
  dims: {},
  selNodes: [],
  selEdge: null,
  tab: "math",
  panel: "inspector",
  inspTab: "details",
  opts: { nums: true, thick: true, notes: true, checks: true, period: "month", bg: "light", snap: true, mini: true, hideSide: false, hideInsp: false },
  readOnly: false,
  saveStatus: "saved",
  rev: 0,
  viewRev: 0,
  clip: null,
  past: [],
  future: [],
  committed: null,
  toast: null,
  spot: null,
  shared: false,
  quick: null,
  viewer: false,
  mode: "map",
  section: "overview",
}));

const get = () => useEditor.getState();
const set = useEditor.setState;

/* ---------------- internals ---------------- */
const snapshot = (s: EditorState = get()): Snapshot => ({ nodes: s.nodes, edges: s.edges, settings: s.settings, name: s.name });
/** The funnel's key leak: the page, offer or action that loses the most people (same ranking as lib/funnel-math leaks()). */
export function keyLeakOf(nodes: FunnelNode[], R: FunnelResult): string | null {
  let best: string | null = null,
    most = 0;
  for (const n of nodes) {
    if (!["page", "offer", "action"].includes(typeOf(n.type)?.cat)) continue;
    const r = R.N[n.id];
    if (r && r.inflow > 0 && r.non > most) {
      most = r.non;
      best = n.id;
    }
  }
  return best;
}
const recompute = (nodes: FunnelNode[], edges: FunnelEdge[], settings: FunnelSettings) => {
  const R = compute({ nodes, edges }, settings);
  return { R, warnIds: warnNodeIds({ nodes, edges }), keyLeak: keyLeakOf(nodes, R) };
};
export const snapV = (v: number) => (get().opts.snap ? Math.round(v / GRID) * GRID : Math.round(v));
export const heightOf = (n: FunnelNode) => (SIZED_TYPES.has(n.type) && n.h ? n.h : get().dims[n.id]?.height ?? (n.type === "label" ? 40 : isAnnot(n.type) ? NH : blockH(n.type)));
export const widthOf = (n: FunnelNode) => n.w ?? get().dims[n.id]?.width ?? (n.type === "label" ? 300 : nodeW(n.type));

let histTimer: ReturnType<typeof setTimeout> | undefined;
function commitHistory() {
  clearTimeout(histTimer);
  histTimer = undefined;
  const s = get();
  const cur = snapshot(s);
  const c = s.committed;
  if (c && c.nodes === cur.nodes && c.edges === cur.edges && c.settings === cur.settings && c.name === cur.name) return;
  const past = c ? [...s.past, c].slice(-120) : s.past;
  set({ past, future: [], committed: cur });
}
/** Record a content change: bumps rev (autosave) and schedules a history commit (coalesces rapid edits, like typing). */
function touched() {
  set((s) => ({ rev: s.rev + 1, saveStatus: s.readOnly ? s.saveStatus : "dirty" }));
  clearTimeout(histTimer);
  histTimer = setTimeout(commitHistory, 350);
}

/**
 * Apply a content change. Continuous edits (typing, dragging) coalesce into one undo step after 350 ms of quiet;
 * `discrete` actions (add, delete, paste, connect, align, layout…) always get their own undo step.
 */
function apply(patch: Partial<Pick<EditorState, "nodes" | "edges" | "settings" | "name">>, opts: { math?: boolean; discrete?: boolean } = {}) {
  if (get().readOnly) return;
  if (opts.discrete) commitHistory();
  const s = get();
  const nodes = patch.nodes ?? s.nodes,
    edges = patch.edges ?? s.edges,
    settings = patch.settings ?? s.settings;
  const math = opts.math ?? true;
  set({ ...patch, ...(math ? recompute(nodes, edges, settings) : {}) });
  touched();
  if (opts.discrete) commitHistory();
}

export function showToast(text: string, action?: string, run?: () => void) {
  set({ toast: { text, id: Date.now(), ...(action && run ? { action, run } : {}) } });
}

/* ---------------- lifecycle ---------------- */
export function initEditor(p: { funnelId: string; clientId: string; name: string; graph: FunnelGraph; settings: FunnelSettings; readOnly?: boolean; shared?: boolean; viewer?: boolean }) {
  clearTimeout(histTimer);
  const snap = { nodes: p.graph.nodes, edges: p.graph.edges, settings: p.settings, name: p.name };
  set({
    funnelId: p.funnelId,
    clientId: p.clientId,
    name: p.name,
    nodes: p.graph.nodes,
    edges: p.graph.edges,
    view: p.graph.view,
    settings: p.settings,
    ...recompute(p.graph.nodes, p.graph.edges, p.settings),
    selNodes: [],
    selEdge: null,
    past: [],
    future: [],
    committed: snap,
    rev: 0,
    viewRev: 0,
    readOnly: !!p.readOnly || !!p.viewer,
    shared: !!p.shared,
    viewer: !!p.viewer,
    spot: null,
    saveStatus: p.readOnly ? "readonly" : "saved",
    opts: loadOpts(),
    dims: {},
    mode: "map",
  });
}

/** Replace the whole graph/settings (version restore, import). Undoable. */
export function replaceContent(graph: Pick<FunnelGraph, "nodes" | "edges">, settings?: FunnelSettings, name?: string) {
  commitHistory();
  apply({ nodes: graph.nodes, edges: graph.edges, settings: settings ?? get().settings, ...(name != null ? { name } : {}) }, { discrete: true });
  set({ selNodes: [], selEdge: null });
  commitHistory();
}

/* ---------------- history ---------------- */
export function undo() {
  commitHistory();
  const s = get();
  if (!s.past.length || !s.committed) return;
  const prev = s.past[s.past.length - 1];
  set({ past: s.past.slice(0, -1), future: [s.committed, ...s.future], committed: prev, nodes: prev.nodes, edges: prev.edges, settings: prev.settings, name: prev.name, ...recompute(prev.nodes, prev.edges, prev.settings), selNodes: [], selEdge: null });
  set((x) => ({ rev: x.rev + 1, saveStatus: "dirty" }));
}
export function redo() {
  commitHistory();
  const s = get();
  if (!s.future.length) return;
  const next = s.future[0];
  set({ future: s.future.slice(1), past: s.committed ? [...s.past, s.committed] : s.past, committed: next, nodes: next.nodes, edges: next.edges, settings: next.settings, name: next.name, ...recompute(next.nodes, next.edges, next.settings), selNodes: [], selEdge: null });
  set((x) => ({ rev: x.rev + 1, saveStatus: "dirty" }));
}

/* ---------------- selection ---------------- */
export function selectNodes(ids: string[]) {
  set({ selNodes: ids, selEdge: null });
}
export function selectEdge(id: string | null) {
  set({ selEdge: id, selNodes: [] });
}
export function clearSelection() {
  set({ selNodes: [], selEdge: null });
}
export function setTab(tab: ReportTab) {
  set({ tab, panel: "inspector", mode: "map", selNodes: [], selEdge: null });
}
export function openQuickAdd(q: EditorState["quick"]) {
  if (get().readOnly) return;
  set({ quick: q });
}
export function closeQuickAdd() {
  set({ quick: null });
}
export function setSideTab(sideTab: EditorState["sideTab"]) {
  set({ sideTab });
  setOpt("hideSide", false);
}
export function setAssets(a: { stylePresets?: StylePreset[]; workspaceBlocks?: WorkspaceBlock[] }) {
  set(a);
}
/** Place a saved group of blocks (workspace block) with fresh ids, its top-left at (x, y). One undo step; the copy is selected. */
export function insertSnippet(snip: { nodes: FunnelNode[]; edges: FunnelEdge[] }, x: number, y: number) {
  if (get().readOnly || !snip.nodes.length) return;
  const ox = Math.min(...snip.nodes.map((n) => n.x)),
    oy = Math.min(...snip.nodes.map((n) => n.y));
  const c = cloneSet(
    snip.nodes.map((n) => n.id),
    snapV(x) - ox,
    snapV(y) - oy,
    snip,
  );
  apply({ nodes: [...get().nodes, ...c.nodes], edges: [...get().edges, ...c.edges] }, { discrete: true });
  selectNodes(c.nodes.map((n) => n.id));
}
export function setProducts(products: ClientProduct[]) {
  set({ products });
}
/** Switch the block and close the picker, with a toast that offers Undo (one undo step). */
export function closeTypePickerAndRetype(id: string, type: string) {
  const ok = retypeNode(id, type);
  set({ typePicker: null });
  if (ok) showToast(`Changed to ${typeOf(type).label}`, "Undo", undo);
}
export function openTypePicker(typePicker: string | null) {
  set({ typePicker });
}
/** Tidy only the selected flow blocks among themselves; the group keeps its top-left corner. One undo step. */
export function tidySelection() {
  const s = get();
  const ids = new Set(s.selNodes);
  const sel = s.nodes.filter((n) => ids.has(n.id) && !n.locked && !isAnnot(n.type));
  if (sel.length < 2 || s.readOnly) return showToast("Select two or more blocks to tidy");
  const laid = tidyLayout(sel, s.edges.filter((e) => ids.has(e.from) && ids.has(e.to)), { heightOf, widthOf, snap: s.opts.snap });
  const ox = Math.min(...sel.map((n) => n.x)) - Math.min(...laid.map((n) => n.x));
  const oy = Math.min(...sel.map((n) => n.y)) - Math.min(...laid.map((n) => n.y));
  moveNodes(Object.fromEntries(laid.map((n) => [n.id, { x: snapV(n.x + ox), y: snapV(n.y + oy) }])), { discrete: true });
}
export function openMenu(menu: MenuState | null) {
  set({ menu });
}
export function setDragging(dragging: boolean) {
  if (get().dragging !== dragging) set({ dragging });
}
export function setReportFocus(reportFocus: string | null) {
  set({ reportFocus });
}
export function startRename(id: string | null) {
  if (id && (get().readOnly || get().nodes.find((n) => n.id === id)?.locked)) return;
  set({ renaming: id });
}
export function setMode(mode: EditorMode) {
  set({ mode });
}
export function setSection(section: ReportSection) {
  set({ section, mode: "reports" });
}
export function setPanel(panel: SidePanel) {
  set({ panel });
}
export function setInspTab(inspTab: InspTab) {
  set({ inspTab });
}

/* ---------------- nodes ---------------- */
export function addNode(type: string, x: number, y: number, extra: { p?: NodeParams; name?: string; desc?: string; w?: number; h?: number } = {}) {
  const T = typeOf(type);
  if (!T) return null;
  const n: FunnelNode = { id: nid(), type, name: extra.name ?? T.label, x: snapV(x), y: snapV(y), p: { ...defaultsFor(type), ...(extra.p ?? {}) }, ...(extra.desc ? { desc: extra.desc } : {}) };
  if (type === "frame") n.name = "Stage";
  const size = DEFAULT_SIZE[type];
  if (size) Object.assign(n, size);
  if (typeof extra.w === "number" && extra.w > 0) n.w = extra.w;
  if (typeof extra.h === "number" && extra.h > 0 && SIZED_TYPES.has(type)) n.h = extra.h;
  if (type === "checklist" && !extra.p?.items) n.p.items = [{ id: nid(), text: "First task", done: false }];
  // frames render below everything else
  apply({ nodes: type === "frame" ? [n, ...get().nodes] : [...get().nodes, n] }, { discrete: true });
  selectNodes([n.id]);
  return n;
}

export function updateNode(id: string, patch: Partial<Omit<FunnelNode, "id" | "p">>) {
  const isMath = "type" in patch;
  apply({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }, { math: isMath || "name" in patch });
}

export function updateParams(id: string, patch: NodeParams) {
  const node = get().nodes.find((n) => n.id === id);
  if (!node) return;
  apply({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, p: { ...n.p, ...patch } } : n)) }, { math: !isAnnot(node.type) });
}

/** Move nodes (drag, nudge, align, layout). Positions don't affect the maths, so no recompute. */
export function moveNodes(pos: Record<string, { x: number; y: number; w?: number; h?: number }>, opts: { discrete?: boolean } = {}) {
  apply({ nodes: get().nodes.map((n) => (pos[n.id] ? { ...n, ...pos[n.id] } : n)) }, { math: false, discrete: opts.discrete });
}

export function setDims(d: Record<string, { width: number; height: number }>) {
  // Only store real changes: React Flow re-reports sizes on re-render, and a fresh object each time would loop.
  const cur = get().dims;
  const changed = Object.entries(d).filter(([id, v]) => cur[id]?.width !== v.width || cur[id]?.height !== v.height);
  if (!changed.length) return;
  set({ dims: { ...cur, ...Object.fromEntries(changed) } });
}

export function deleteSelection() {
  const s = get();
  if (s.selNodes.length) {
    // locked elements stay put until they're unlocked
    const ids = new Set(s.selNodes.filter((id) => !s.nodes.find((n) => n.id === id)?.locked));
    if (!ids.size) return showToast("Locked: unlock it first to delete");
    if (ids.size < s.selNodes.length) showToast("Locked items were kept");
    apply({ nodes: s.nodes.filter((n) => !ids.has(n.id)), edges: s.edges.filter((e) => !ids.has(e.from) && !ids.has(e.to)) }, { discrete: true });
  } else if (s.selEdge) {
    apply({ edges: s.edges.filter((e) => e.id !== s.selEdge) }, { discrete: true });
  } else return;
  clearSelection();
}

function cloneSet(ids: string[], dx: number, dy: number, from: { nodes: FunnelNode[]; edges: FunnelEdge[] } = get()) {
  const B = Object.fromEntries(from.nodes.map((n) => [n.id, n]));
  const map: Record<string, string> = {};
  const nodes: FunnelNode[] = [];
  ids.forEach((i) => {
    const n = B[i];
    if (!n) return;
    const c = structuredClone(n);
    c.id = nid();
    c.x += dx;
    c.y += dy;
    delete c.locked; // copies start unlocked
    map[i] = c.id;
    nodes.push(c);
  });
  const edges = from.edges.filter((e) => map[e.from] && map[e.to]).map((e) => ({ ...e, id: "e" + nid(), from: map[e.from], to: map[e.to] }));
  return { nodes, edges };
}

export function duplicateSelection() {
  const ids = get().selNodes;
  if (!ids.length) return;
  const c = cloneSet(ids, 33, 33);
  apply({ nodes: [...get().nodes, ...c.nodes], edges: [...get().edges, ...c.edges] }, { discrete: true });
  selectNodes(c.nodes.map((n) => n.id));
}

export function copySelection() {
  const ids = get().selNodes;
  if (!ids.length) return false;
  set({ clip: cloneSet(ids, 0, 0) });
  return true;
}

export function paste() {
  const clip = get().clip;
  if (!clip) return;
  const c = cloneSet(
    clip.nodes.map((n) => n.id),
    44,
    44,
    clip,
  );
  apply({ nodes: [...get().nodes, ...c.nodes], edges: [...get().edges, ...c.edges] }, { discrete: true });
  set({ clip: c });
  selectNodes(c.nodes.map((n) => n.id));
}

export function nudge(dx: number, dy: number) {
  const ids = new Set(get().selNodes);
  if (!ids.size) return;
  moveNodes(Object.fromEntries(get().nodes.filter((n) => ids.has(n.id) && !n.locked).map((n) => [n.id, { x: n.x + dx, y: n.y + dy }])));
}

/* ---------------- lock / layer order / style ---------------- */
/** Lock or unlock the selection (locked: no moving, resizing or deleting). Toggles when `on` is omitted. */
export function setLocked(on?: boolean, ids: string[] = get().selNodes) {
  const sel = new Set(ids);
  const ns = get().nodes.filter((n) => sel.has(n.id));
  if (!ns.length) return;
  const v = on ?? !ns.every((n) => n.locked);
  const lock = (n: FunnelNode): FunnelNode => {
    if (v) return { ...n, locked: true };
    const c = { ...n };
    delete c.locked;
    return c;
  };
  apply({ nodes: get().nodes.map((n) => (sel.has(n.id) ? lock(n) : n)) }, { math: false, discrete: true });
}

/** Effective layer: stored z, else frames below everything. */
export const layerOf = (n: FunnelNode) => n.z ?? (n.type === "frame" ? -1 : 0);

export function reorder(kind: "front" | "forward" | "backward" | "back", ids: string[] = get().selNodes) {
  const sel = new Set(ids);
  const all = get().nodes;
  if (!all.some((n) => sel.has(n.id))) return;
  const others = all.filter((n) => !sel.has(n.id)).map(layerOf);
  const hi = Math.max(0, ...others),
    lo = Math.min(0, ...others);
  const z = (n: FunnelNode) => (kind === "front" ? hi + 1 : kind === "back" ? lo - 1 : layerOf(n) + (kind === "forward" ? 1 : -1));
  apply({ nodes: all.map((n) => (sel.has(n.id) ? { ...n, z: z(n) } : n)) }, { math: false, discrete: true });
}

/* ---------------- style clipboard / quick styles ---------------- */
export function copyStyle(id: string = get().selNodes[0]) {
  const n = get().nodes.find((x) => x.id === id);
  if (!n) return false;
  set({ styleClip: n.s ? { ...n.s } : {} });
  showToast("Style copied");
  return true;
}
/** Paste the copied style onto the selection (or `ids`). One undo step; the toast offers Undo. */
export function pasteStyle(ids: string[] = get().selNodes) {
  const clip = get().styleClip;
  const sel = new Set(ids);
  const targets = get().nodes.filter((n) => sel.has(n.id) && !n.locked);
  if (!clip || !targets.length || get().readOnly) {
    if (!clip) showToast("Copy a style first");
    return false;
  }
  const st = cleanStyle({ ...clip });
  apply({ nodes: get().nodes.map((n) => (sel.has(n.id) && !n.locked ? withStyle(n, st ? { ...st } : undefined) : n)) }, { math: false, discrete: true });
  showToast(`Style pasted on ${targets.length} ${targets.length === 1 ? "block" : "blocks"}`, "Undo", undo);
  return true;
}
/** Replace the style of the selection with a quick style (null = Default). */
export function applyQuickStyle(style: NodeStyle | null, ids: string[] = get().selNodes) {
  const sel = new Set(ids);
  if (get().readOnly) return;
  apply({ nodes: get().nodes.map((n) => (sel.has(n.id) && !n.locked ? withStyle(n, style ? { ...style } : undefined) : n)) }, { math: false, discrete: true });
}
/** Eyedropper: give `targetId` the style of the armed block, then disarm. */
export function applyEyedropper(targetId: string) {
  const src = get().eyedrop;
  if (!src || src === targetId) return;
  const from = get().nodes.find((n) => n.id === src);
  set({ eyedrop: null });
  if (!from) return;
  set({ styleClip: from.s ? { ...from.s } : {} });
  pasteStyle([targetId]);
}
export function armEyedropper(id: string | null) {
  set({ eyedrop: id });
  if (id) showToast("Click a block to give it this style. Esc cancels.");
}

/** Merge into an element's style; empty values reset that property. */
export function setNodeStyle(id: string, patch: Partial<NodeStyle>, ids: string[] = [id]) {
  const sel = new Set(ids);
  apply({ nodes: get().nodes.map((n) => (sel.has(n.id) ? withStyle(n, cleanStyle({ ...n.s, ...patch })) : n)) }, { math: false });
}
const withStyle = (n: FunnelNode, st: NodeStyle | undefined): FunnelNode => {
  const c = { ...n };
  if (st) c.s = st;
  else delete c.s;
  return c;
};
export function setEdgeStyle(id: string, patch: Partial<EdgeStyle>) {
  apply(
    {
      edges: get().edges.map((e) => {
        if (e.id !== id) return e;
        const st = cleanStyle({ ...e.s, ...patch });
        const c = { ...e };
        if (st) c.s = st;
        else delete c.s;
        return c;
      }),
    },
    { math: false },
  );
}

/* ---------------- checklists ---------------- */
/** Element checklist (`node.checklist`, internal) or a canvas checklist element's items (`p.items`). */
export function checklistOf(n: FunnelNode): ChecklistItem[] {
  return n.type === "checklist" ? ((n.p.items as ChecklistItem[] | undefined) ?? []) : (n.checklist ?? []);
}
export function setChecklist(id: string, items: ChecklistItem[], opts: { discrete?: boolean } = {}) {
  apply(
    {
      nodes: get().nodes.map((n) => {
        if (n.id !== id) return n;
        if (n.type === "checklist") return { ...n, p: { ...n.p, items } };
        const c = { ...n };
        if (items.length) c.checklist = items;
        else delete c.checklist;
        return c;
      }),
    },
    { math: false, discrete: opts.discrete },
  );
}
export const newChecklistItem = (text = ""): ChecklistItem => ({ id: nid(), text, done: false });

export function align(kind: "left" | "top" | "hdist" | "vdist" | "center" | "middle") {
  const ids = new Set(get().selNodes);
  const ns = get().nodes.filter((n) => ids.has(n.id) && !n.locked);
  if (ns.length < 2) return;
  const pos: Record<string, { x: number; y: number }> = {};
  if (kind === "left") {
    const x = Math.min(...ns.map((n) => n.x));
    ns.forEach((n) => (pos[n.id] = { x, y: n.y }));
  }
  if (kind === "top") {
    const y = Math.min(...ns.map((n) => n.y));
    ns.forEach((n) => (pos[n.id] = { x: n.x, y }));
  }
  if (kind === "center") {
    const c = ns.reduce((a, n) => a + n.x + widthOf(n) / 2, 0) / ns.length;
    ns.forEach((n) => (pos[n.id] = { x: Math.round(c - widthOf(n) / 2), y: n.y }));
  }
  if (kind === "middle") {
    const c = ns.reduce((a, n) => a + n.y + heightOf(n) / 2, 0) / ns.length;
    ns.forEach((n) => (pos[n.id] = { x: n.x, y: Math.round(c - heightOf(n) / 2) }));
  }
  if (kind === "hdist" && ns.length > 2) {
    const s = [...ns].sort((a, b) => a.x - b.x),
      x0 = s[0].x,
      x1 = s[s.length - 1].x;
    s.forEach((n, i) => (pos[n.id] = { x: Math.round(x0 + ((x1 - x0) * i) / (s.length - 1)), y: n.y }));
  }
  if (kind === "vdist" && ns.length > 2) {
    const s = [...ns].sort((a, b) => a.y - b.y),
      y0 = s[0].y,
      y1 = s[s.length - 1].y;
    s.forEach((n, i) => (pos[n.id] = { x: n.x, y: Math.round(y0 + ((y1 - y0) * i) / (s.length - 1)) }));
  }
  moveNodes(pos, { discrete: true });
}

export function wrapInFrame() {
  const ids = new Set(get().selNodes);
  const ns = get().nodes.filter((n) => ids.has(n.id) && n.type !== "frame");
  if (!ns.length) return;
  const x0 = Math.min(...ns.map((n) => n.x)) - 30,
    y0 = Math.min(...ns.map((n) => n.y)) - 40,
    x1 = Math.max(...ns.map((n) => n.x + widthOf(n))) + 30,
    y1 = Math.max(...ns.map((n) => n.y + heightOf(n))) + 40;
  const f: FunnelNode = { id: nid(), type: "frame", name: "Stage", x: x0, y: y0, w: x1 - x0, h: y1 - y0, p: { color: FRAME_COLORS[0][0] } };
  apply({ nodes: [f, ...get().nodes] }, { math: false, discrete: true });
  selectNodes([f.id]);
}

/** Blocks whose centre sits inside a frame (they move with it). */
export function frameMembers(frameId: string): string[] {
  const nodes = get().nodes;
  const f = nodes.find((n) => n.id === frameId);
  if (!f || f.type !== "frame") return [];
  return nodes
    .filter((m) => {
      if (m.type === "frame") return false;
      const cx = m.x + widthOf(m) / 2,
        cy = m.y + heightOf(m) / 2;
      return cx > f.x && cx < f.x + (f.w ?? 0) && cy > f.y && cy < f.y + (f.h ?? 0);
    })
    .map((m) => m.id);
}

/* ---------------- edges ---------------- */
export function canConnect(from: string, to: string, port: "main" | "alt") {
  const s = get();
  if (from === to) return false;
  const tb = s.nodes.find((n) => n.id === to);
  if (!tb || !canReceive(tb.type)) return false;
  return !s.edges.some((e) => e.from === from && e.to === to && (e.port || "main") === port);
}
export function connect(from: string, port: "main" | "alt", to: string) {
  if (!canConnect(from, to, port)) return;
  const e: FunnelEdge = { id: "e" + nid(), from, to, share: 100, port };
  apply({ edges: [...get().edges, e] }, { discrete: true });
  selectEdge(e.id);
}
/**
 * Change a block's type in place (Change page type / block type). Keeps id, position, connections, URL, thumbnail,
 * status, notes and every parameter: values for fields the new type shares carry over, fields it doesn't show are kept
 * hidden so switching back restores them. Only types with the same maths are offered (retypeTargets), so the numbers
 * don't change. One undo step.
 */
export function retypeNode(id: string, type: string) {
  const n = get().nodes.find((x) => x.id === id);
  if (!n || get().readOnly || n.locked || !retypeTargets(n.type).includes(type)) return false;
  const was = typeOf(n.type),
    T = typeOf(type);
  const s = n.s && n.s.icon ? { ...n.s, icon: undefined } : n.s;
  apply({ nodes: get().nodes.map((x) => (x.id === id ? { ...x, type, name: x.name === was.label ? T.label : x.name, p: { ...defaultsFor(type), ...x.p }, ...(s ? { s: cleanStyle(s) } : {}) } : x)) }, { discrete: true });
  return true;
}

/** Block types that may follow a connection (they receive people): no traffic sources, no layout elements. */
export const canFollowType = (type: string) => canReceive(type);
/** Block types that may sit in the middle of a line (receive and pass people on). */
export const canInsertType = (type: string) => canReceive(type) && portsFor(type).hasOut;

/**
 * Add a block at the end of a dragged connection and connect it, as ONE change: one undo step, one autosave.
 * The block's in-port lands on (x, y); the new block is selected so the inspector follows.
 */
export function addConnectedNode(from: { id: string; port: "main" | "alt" }, type: string, x: number, y: number, extra: { p?: NodeParams; name?: string; w?: number; h?: number } = {}) {
  const T = typeOf(type);
  const src = get().nodes.find((n) => n.id === from.id);
  if (!T || !src || !canFollowType(type) || get().readOnly) return null;
  const n: FunnelNode = { id: nid(), type, name: extra.name ?? T.label, x: snapV(x), y: snapV(y - blockH(type) / 2), p: { ...defaultsFor(type), ...(extra.p ?? {}) } };
  const e: FunnelEdge = { id: "e" + nid(), from: from.id, to: n.id, share: 100, port: from.port };
  apply({ nodes: [...get().nodes, n], edges: [...get().edges, e] }, { discrete: true });
  selectNodes([n.id]);
  return n;
}

/** Put a new step in the middle of a connection: A→B becomes A→N→B (A→N keeps the line's port, share and style). One undo step. */
export function insertStepOnEdge(edgeId: string, type: string, extra: { p?: NodeParams; name?: string } = {}) {
  const s = get();
  const e = s.edges.find((x) => x.id === edgeId);
  const a = e && s.nodes.find((n) => n.id === e.from),
    b = e && s.nodes.find((n) => n.id === e.to);
  const T = typeOf(type);
  if (!e || !a || !b || !T || !canInsertType(type) || s.readOnly) return null;
  const ax = a.x + nodeW(a.type),
    ay = a.y + heightOf(a) / 2,
    by = b.y + heightOf(b) / 2;
  const mx = (ax + b.x) / 2,
    my = e.port === "alt" ? Math.max(a.y + heightOf(a) + 70, (ay + by) / 2) : (ay + by) / 2;
  const n: FunnelNode = { id: nid(), type, name: extra.name ?? T.label, x: snapV(mx - nodeW(type) / 2), y: snapV(my - blockH(type) / 2), p: { ...defaultsFor(type), ...(extra.p ?? {}) } };
  const first: FunnelEdge = { ...e, to: n.id };
  const second: FunnelEdge = { id: "e" + nid(), from: n.id, to: b.id, share: 100, port: "main" };
  apply({ nodes: [...s.nodes, n], edges: [...s.edges.filter((x) => x.id !== e.id), first, second] }, { discrete: true });
  selectNodes([n.id]);
  return n;
}

/** Reverse a connection's direction (B→A). Refused when the ends can't take the new roles. */
export function flipEdge(id: string) {
  const s = get();
  const e = s.edges.find((x) => x.id === id);
  if (!e || s.readOnly) return false;
  const a = s.nodes.find((n) => n.id === e.from),
    b = s.nodes.find((n) => n.id === e.to);
  if (!a || !b) return false;
  if (!canReceive(a.type) || !portsFor(b.type).hasOut) {
    showToast("Can’t flip: that block can’t take people from the other end");
    return false;
  }
  if (s.edges.some((x) => x.from === b.id && x.to === a.id && (x.port || "main") === "main")) {
    showToast("Can’t flip: there is already a connection that way");
    return false;
  }
  apply({ edges: s.edges.map((x) => (x.id === id ? { ...x, from: b.id, to: a.id, port: "main" } : x)) }, { discrete: true });
  selectEdge(id);
  return true;
}

export function updateEdge(id: string, patch: Partial<Omit<FunnelEdge, "id">>) {
  apply({ edges: get().edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
}

/* ---------------- funnel-level ---------------- */
export function setName(name: string) {
  apply({ name }, { math: false });
}
export function setSettings(patch: Partial<FunnelSettings>) {
  apply({ settings: { ...get().settings, ...patch } });
}
export function setView(view: Viewport) {
  set((s) => ({ view, viewRev: s.viewRev + 1 }));
}
export function setOpt<K extends keyof ViewOpts>(k: K, v: ViewOpts[K]) {
  const opts = { ...get().opts, [k]: v };
  set({ opts });
  try {
    localStorage.setItem(OPTS_KEY, JSON.stringify(opts));
  } catch {}
}
export function setReadOnly(readOnly: boolean) {
  if (!readOnly && get().viewer) return;
  set({ readOnly, saveStatus: readOnly ? "readonly" : get().rev ? "dirty" : "saved" });
}
export function setSaveStatus(saveStatus: SaveStatus) {
  if (get().readOnly && saveStatus !== "readonly") return;
  set({ saveStatus });
}
export const editorSnapshot = () => {
  const s = get();
  return { name: s.name, graph: { nodes: s.nodes, edges: s.edges, view: s.view }, settings: s.settings };
};

/** Set positions without recording history or triggering a save (animation frames). Finish with moveNodes(). */
export function setPositionsTransient(pos: Record<string, { x: number; y: number }>) {
  set((s) => ({ nodes: s.nodes.map((n) => (pos[n.id] ? { ...n, ...pos[n.id] } : n)) }));
}
export function setSpot(spot: string | null) {
  set({ spot });
}
/** Force a save of the current content (e.g. after restoring a local draft). */
export function markDirty() {
  set((s) => ({ rev: s.rev + 1, saveStatus: s.readOnly ? s.saveStatus : "dirty" }));
}
