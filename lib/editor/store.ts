"use client";
// Editor state (Zustand). Holds the funnel graph + settings, selection, undo/redo history and view options.
// All maths comes from lib/funnel-math; this file only orchestrates state.
import { create } from "zustand";
import { defaultsFor, FRAME_COLORS, isAnnot, nodeW, NH, typeOf, canReceive, type NodeParams } from "../catalog";
import { compute, warnNodeIds, type FunnelResult } from "../funnel-math";
import type { FunnelEdge, FunnelGraph, FunnelNode, FunnelSettings, Viewport } from "../graph";

export type ReportTab = "math" | "steps" | "sources" | "plan" | "costs" | "scenarios" | "forecast" | "actuals";
export type SidePanel = "inspector" | "versions" | "comments";
export type SaveStatus = "saved" | "dirty" | "saving" | "offline" | "error" | "readonly";

export interface ViewOpts {
  nums: boolean;
  thick: boolean;
  snap: boolean;
  mini: boolean;
}

interface Snapshot {
  nodes: FunnelNode[];
  edges: FunnelEdge[];
  settings: FunnelSettings;
  name: string;
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
  /** Measured DOM heights (notes grow with text); used by layout and frame wrapping. */
  heights: Record<string, number>;
  selNodes: string[];
  selEdge: string | null;
  tab: ReportTab;
  panel: SidePanel;
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
  toast: { text: string; id: number } | null;
  /** Presentation mode: the block in focus (others dim). */
  spot: string | null;
  /** Opened through a public share link (no account features: versions, actuals, products). */
  shared: boolean;
}

const OPTS_KEY = "fm-editor-opts";
const loadOpts = (): ViewOpts => {
  const d = { nums: true, thick: true, snap: true, mini: true };
  try {
    return { ...d, ...JSON.parse(localStorage.getItem(OPTS_KEY) || "{}") };
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
  settings: { basis: "first", fixed: 0, whatif: { traffic: 1, conv: 1, price: 1, cost: 1 }, target: 0, currency: "GBP", expenses: [], scenarios: [], projection: { months: 12, growth: 0 }, hideNumbers: false },
  R: blankResult,
  warnIds: new Set(),
  heights: {},
  selNodes: [],
  selEdge: null,
  tab: "math",
  panel: "inspector",
  opts: { nums: true, thick: true, snap: true, mini: true },
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
}));

const get = () => useEditor.getState();
const set = useEditor.setState;

/* ---------------- internals ---------------- */
const snapshot = (s: EditorState = get()): Snapshot => ({ nodes: s.nodes, edges: s.edges, settings: s.settings, name: s.name });
const recompute = (nodes: FunnelNode[], edges: FunnelEdge[], settings: FunnelSettings) => ({ R: compute({ nodes, edges }, settings), warnIds: warnNodeIds({ nodes, edges }) });
export const snapV = (v: number) => (get().opts.snap ? Math.round(v / GRID) * GRID : Math.round(v));
export const heightOf = (n: FunnelNode) => get().heights[n.id] ?? (n.type === "label" ? 40 : NH);
export const widthOf = (n: FunnelNode) => n.w ?? (n.type === "label" ? 300 : nodeW(n.type));

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

function apply(patch: Partial<Pick<EditorState, "nodes" | "edges" | "settings" | "name">>, opts: { math?: boolean } = {}) {
  if (get().readOnly) return;
  const s = get();
  const nodes = patch.nodes ?? s.nodes,
    edges = patch.edges ?? s.edges,
    settings = patch.settings ?? s.settings;
  const math = opts.math ?? true;
  set({ ...patch, ...(math ? recompute(nodes, edges, settings) : {}) });
  touched();
}

export function showToast(text: string) {
  set({ toast: { text, id: Date.now() } });
}

/* ---------------- lifecycle ---------------- */
export function initEditor(p: { funnelId: string; clientId: string; name: string; graph: FunnelGraph; settings: FunnelSettings; readOnly?: boolean; shared?: boolean }) {
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
    readOnly: !!p.readOnly,
    shared: !!p.shared,
    spot: null,
    saveStatus: p.readOnly ? "readonly" : "saved",
    opts: loadOpts(),
    heights: {},
  });
}

/** Replace the whole graph/settings (version restore, import). Undoable. */
export function replaceContent(graph: Pick<FunnelGraph, "nodes" | "edges">, settings?: FunnelSettings, name?: string) {
  commitHistory();
  apply({ nodes: graph.nodes, edges: graph.edges, settings: settings ?? get().settings, ...(name != null ? { name } : {}) });
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
  set({ tab, panel: "inspector" });
}
export function setPanel(panel: SidePanel) {
  set({ panel });
}

/* ---------------- nodes ---------------- */
export function addNode(type: string, x: number, y: number, extra: { p?: NodeParams; name?: string; desc?: string } = {}) {
  const T = typeOf(type);
  if (!T) return null;
  const n: FunnelNode = { id: nid(), type, name: extra.name ?? T.label, x: snapV(x), y: snapV(y), p: { ...defaultsFor(type), ...(extra.p ?? {}) }, ...(extra.desc ? { desc: extra.desc } : {}) };
  if (type === "frame") {
    n.name = "Stage";
    n.w = 520;
    n.h = 300;
  }
  // frames render below everything else
  apply({ nodes: type === "frame" ? [n, ...get().nodes] : [...get().nodes, n] });
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
export function moveNodes(pos: Record<string, { x: number; y: number; w?: number; h?: number }>) {
  apply({ nodes: get().nodes.map((n) => (pos[n.id] ? { ...n, ...pos[n.id] } : n)) }, { math: false });
}

export function setHeights(h: Record<string, number>) {
  set((s) => ({ heights: { ...s.heights, ...h } }));
}

export function deleteSelection() {
  const s = get();
  if (s.selNodes.length) {
    const ids = new Set(s.selNodes);
    apply({ nodes: s.nodes.filter((n) => !ids.has(n.id)), edges: s.edges.filter((e) => !ids.has(e.from) && !ids.has(e.to)) });
  } else if (s.selEdge) {
    apply({ edges: s.edges.filter((e) => e.id !== s.selEdge) });
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
  apply({ nodes: [...get().nodes, ...c.nodes], edges: [...get().edges, ...c.edges] });
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
  apply({ nodes: [...get().nodes, ...c.nodes], edges: [...get().edges, ...c.edges] });
  set({ clip: c });
  selectNodes(c.nodes.map((n) => n.id));
}

export function nudge(dx: number, dy: number) {
  const ids = new Set(get().selNodes);
  if (!ids.size) return;
  moveNodes(Object.fromEntries(get().nodes.filter((n) => ids.has(n.id)).map((n) => [n.id, { x: n.x + dx, y: n.y + dy }])));
}

export function align(kind: "left" | "top" | "hdist" | "vdist" | "center" | "middle") {
  const ids = new Set(get().selNodes);
  const ns = get().nodes.filter((n) => ids.has(n.id));
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
  moveNodes(pos);
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
  apply({ nodes: [f, ...get().nodes] }, { math: false });
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
  apply({ edges: [...get().edges, e] });
  selectEdge(e.id);
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
