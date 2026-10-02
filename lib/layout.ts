// Auto-layout ("Tidy up"). tidyLayout() is a pure port of the prototype's tidy(): a layered (Sugiyama-style)
// layout tuned for funnels: traffic on the left, converted paths straight across, "didn't convert" paths below.
// elkLayout() is an alternative using elkjs' layered algorithm with fixed port sides.
import { NH, isAnnot, nodeW, typeOf } from "./catalog";
import type { FunnelEdge, FunnelNode } from "./graph";

export interface LayoutOptions {
  /** Measured node heights (notes grow with text). Defaults to NH. */
  heightOf?: (n: FunnelNode) => number;
  /** Measured node widths (headings size to their text). Defaults to the catalog width. */
  widthOf?: (n: FunnelNode) => number;
  snap?: boolean;
}

/** Fallback annotation sizes when nothing was measured (matches the editor's defaults). */
const annotW = (n: FunnelNode) => n.w ?? (n.type === "label" ? 300 : nodeW(n.type));
const defaultH = (n: FunnelNode) => n.h ?? (n.type === "label" ? 40 : NH);

const GRID = 11;
const snapper = (on: boolean) => (v: number) => (on ? Math.round(v / GRID) * GRID : Math.round(v));

/**
 * Records where notes/headings/frames sit relative to flow blocks, then re-applies that after a layout moves the blocks.
 * Frames are refitted around the blocks inside them. Notes and headings are not part of the flow: each keeps its exact
 * offset from the nearest block (so text placed above, beside or below a step stays there), and is only nudged when the
 * new layout would make it overlap a block or another annotation.
 */
function captureAnnotations(nodes: FunnelNode[], flow: FunnelNode[], B: Record<string, FunnelNode>, nodeH: (n: FunnelNode) => number, widthOf: (n: FunnelNode) => number) {
  const W = (n: FunnelNode) => (isAnnot(n.type) ? widthOf(n) : nodeW(n.type));
  const center = (n: FunnelNode): [number, number] => [n.x + W(n) / 2, n.y + nodeH(n) / 2];
  const frames = nodes
    .filter((n) => n.type === "frame")
    .map((f) => ({
      f: B[f.id],
      members: flow
        .filter((n) => {
          const [cx, cy] = center(n);
          return cx > f.x && cx < f.x + (f.w ?? 0) && cy > f.y && cy < f.y + (f.h ?? 0);
        })
        .map((n) => n.id),
    }));
  const anchors = nodes
    .filter((n) => isAnnot(n.type) && n.type !== "frame")
    .sort((p, q) => p.y - q.y || p.x - q.x)
    .map((a) => {
      const [ax, ay] = center(a);
      let best: FunnelNode | null = null,
        bd = Infinity;
      for (const n of flow) {
        const [cx, cy] = center(n),
          d = (cx - ax) ** 2 + (cy - ay) ** 2;
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
      return { a: B[a.id], to: best?.id, dx: best ? a.x - best.x : 0, dy: best ? a.y - best.y : 0 };
    });
  return () => {
    type Box = { x: number; y: number; w: number; h: number };
    const box = (n: FunnelNode, pad = 0): Box => ({ x: n.x - pad, y: n.y - pad, w: W(n) + 2 * pad, h: nodeH(n) + 2 * pad });
    const hits = (p: Box, q: Box) => p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y;
    const blocks = flow.map((n) => box(B[n.id], 12));
    const placed: Box[] = [];
    // annotations keep 8px apart from each other and 12px from blocks
    const free = (a: FunnelNode) => {
      const r = box(a, 8);
      return !blocks.some((q) => hits(box(a), q)) && !placed.some((q) => hits(r, q));
    };
    anchors.forEach(({ a, to, dx, dy }) => {
      if (to) {
        a.x = B[to].x + dx;
        a.y = B[to].y + dy;
      }
      if (!free(a)) {
        // nearest free spot: try small vertical shifts first (alternating down/up), then sideways
        const x0 = a.x,
          y0 = a.y;
        let found = false;
        for (let k = 1; k <= 60 && !found; k++) {
          const d = Math.ceil(k / 2) * 16 * (k % 2 ? 1 : -1);
          for (const [ox, oy] of [[0, d], [d, 0]]) {
            a.x = x0 + ox;
            a.y = y0 + oy;
            if (free(a)) {
              found = true;
              break;
            }
          }
        }
        if (!found) Object.assign(a, { x: x0, y: y0 });
      }
      placed.push(box(a));
    });
    frames.forEach(({ f, members }) => {
      const ms = members.map((i) => B[i]).filter(Boolean);
      if (!ms.length) return;
      const x0 = Math.min(...ms.map((n) => n.x)) - 30,
        y0 = Math.min(...ms.map((n) => n.y)) - 44,
        x1 = Math.max(...ms.map((n) => n.x + nodeW(n.type))) + 30,
        y1 = Math.max(...ms.map((n) => n.y + nodeH(n))) + 40;
      Object.assign(f, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    });
  };
}

/** Returns a new node list with flow blocks re-positioned and notes / headings / frames carried along. */
export function tidyLayout(nodes: FunnelNode[], edges: FunnelEdge[], opts: LayoutOptions = {}): FunnelNode[] {
  const nodeH = opts.heightOf ?? defaultH;
  const widthOf = opts.widthOf ?? annotW;
  const snap = snapper(opts.snap ?? true);
  const flow = nodes.filter((n) => !isAnnot(n.type));
  if (!flow.length) return nodes;
  const B: Record<string, FunnelNode> = Object.fromEntries(nodes.map((n) => [n.id, { ...n }]));
  const ids = new Set(flow.map((n) => n.id));
  const E = edges.filter((e) => ids.has(e.from) && ids.has(e.to));

  // remember annotations: frames by membership, notes/labels by their offset from the nearest block
  const carryAnnotations = captureAnnotations(nodes, flow, B, nodeH, widthOf);

  // 1. break cycles (DFS, traffic first, main paths before alt)
  const out: Record<string, FunnelEdge[]> = {},
    inn: Record<string, FunnelEdge[]> = {};
  flow.forEach((n) => {
    out[n.id] = [];
    inn[n.id] = [];
  });
  const sortE = (a: FunnelEdge, b: FunnelEdge) => Number(a.port === "alt") - Number(b.port === "alt");
  E.slice()
    .sort(sortE)
    .forEach((e) => out[e.from].push(e));
  const isTraffic = (n: FunnelNode) => Number(typeOf(n.type).cat === "traffic");
  const startOrder = flow.slice().sort((a, b) => isTraffic(b) - isTraffic(a) || a.y - b.y);
  const state: Record<string, number> = {},
    back = new Set<string>(),
    dfsIdx: Record<string, number> = {};
  let k = 0;
  const visit = (id: string) => {
    state[id] = 1;
    dfsIdx[id] = k++;
    out[id].forEach((e) => {
      if (state[e.to] === 1) back.add(e.id);
      else if (!state[e.to]) visit(e.to);
    });
    state[id] = 2;
  };
  startOrder
    .filter((n) => !E.some((e) => e.to === n.id))
    .forEach((n) => {
      if (!state[n.id]) visit(n.id);
    });
  startOrder.forEach((n) => {
    if (!state[n.id]) visit(n.id);
  });
  const D = E.filter((e) => !back.has(e.id));
  D.forEach((e) => inn[e.to].push(e));

  // 2. ranks = longest path from sources
  const rank: Record<string, number> = {},
    topo: string[] = [],
    indeg: Record<string, number> = {};
  flow.forEach((n) => (indeg[n.id] = inn[n.id].length));
  const q = flow.filter((n) => !indeg[n.id]).map((n) => n.id);
  while (q.length) {
    const id = q.shift()!;
    topo.push(id);
    D.filter((e) => e.from === id).forEach((e) => {
      if (--indeg[e.to] === 0) q.push(e.to);
    });
  }
  topo.forEach((id) => (rank[id] = inn[id].length ? Math.max(...inn[id].map((e) => rank[e.from] + 1)) : 0));
  // pull sources right, next to their first child
  topo
    .slice()
    .reverse()
    .forEach((id) => {
      if (inn[id].length) return;
      const ch = D.filter((e) => e.from === id).map((e) => rank[e.to]);
      if (ch.length) rank[id] = Math.min(...ch) - 1;
    });
  const minR = Math.min(...topo.map((id) => rank[id]));
  topo.forEach((id) => (rank[id] -= minR));

  // 3. ordering within columns (barycenter sweeps)
  const cols: string[][] = [];
  topo.forEach((id) => (cols[rank[id]] ??= []).push(id));
  for (let i = 0; i < cols.length; i++) cols[i] ??= [];
  cols.forEach((c) => c.sort((a, b) => dfsIdx[a] - dfsIdx[b]));
  const pos: Record<string, number> = {};
  const setPos = () => cols.forEach((c) => c.forEach((id, i) => (pos[id] = i)));
  setPos();
  for (let it = 0; it < 6; it++) {
    const fwd = it % 2 === 0,
      range = fwd ? cols.map((_, i) => i).slice(1) : cols.map((_, i) => i).reverse().slice(1);
    range.forEach((r) => {
      const key: Record<string, number> = {};
      cols[r].forEach((id) => {
        const nb: [number, number][] = fwd
          ? inn[id].map((e) => [pos[e.from] + (e.port === "alt" ? 0.6 : 0), e.port === "alt" ? 1 : 2])
          : D.filter((e) => e.from === id).map((e) => [pos[e.to] - (e.port === "alt" ? 0.6 : 0), e.port === "alt" ? 1 : 2]);
        const w = nb.reduce((s, [, w]) => s + w, 0);
        key[id] = w ? nb.reduce((s, [p, w]) => s + p * w, 0) / w : pos[id];
      });
      cols[r].sort((a, b) => key[a] - key[b] || dfsIdx[a] - dfsIdx[b]);
      setPos();
    });
  }

  // 4. y positions: follow the main parent, alt children sit lower; isotonic fit keeps order + spacing
  const GAPY = 56,
    GAPX = 120,
    COLW = 210,
    y: Record<string, number> = {};
  const place = (c: string[], desired: number[]) => {
    const sp = c.map((id) => nodeH(B[id]) + GAPY),
      off = [0];
    for (let i = 1; i < c.length; i++) off[i] = off[i - 1] + sp[i - 1];
    // pool adjacent violators on z = y - off
    const blocks: { sum: number; n: number; start: number }[] = [];
    c.forEach((_, i) => {
      blocks.push({ sum: desired[i] - off[i], n: 1, start: i });
      while (blocks.length > 1 && blocks[blocks.length - 2].sum / blocks[blocks.length - 2].n > blocks[blocks.length - 1].sum / blocks[blocks.length - 1].n) {
        const b2 = blocks.pop()!,
          b1 = blocks[blocks.length - 1];
        b1.sum += b2.sum;
        b1.n += b2.n;
      }
    });
    blocks.forEach((b) => {
      for (let i = b.start; i < b.start + b.n; i++) y[c[i]] = b.sum / b.n + off[i];
    });
  };
  cols.forEach((c) => {
    const d = c.map((id, i) => {
      const ps = inn[id];
      if (!ps.length) return i * (NH + GAPY);
      const w = ps.map((e) => (e.port === "alt" ? 1 : 3)),
        t = w.reduce((a, b) => a + b, 0);
      return ps.reduce((s, e, j) => s + (y[e.from] + (e.port === "alt" ? NH + GAPY : 0)) * w[j], 0) / t;
    });
    place(c, d);
  });
  // backward pass: sources and fan-ins centre on their children
  for (let r = cols.length - 2; r >= 0; r--) {
    const c = cols[r];
    const d = c.map((id) => {
      const ch = D.filter((e) => e.from === id && e.port !== "alt");
      return inn[id].length || !ch.length ? y[id] : ch.reduce((s, e) => s + y[e.to], 0) / ch.length;
    });
    place(c, d);
  }
  const minY = Math.min(...topo.map((id) => y[id]));
  topo.forEach((id) => {
    const n = B[id];
    n.x = snap(80 + rank[id] * (COLW + GAPX) + (COLW - nodeW(n.type)) / 2);
    n.y = snap(80 + y[id] - minY);
  });

  // 5. carry annotations along
  carryAnnotations();

  return nodes.map((n) => B[n.id]);
}

/* ---------------- elkjs alternative ---------------- */
/**
 * ELK layered layout with ports: main output on the EAST side, alt output on the SOUTH side, input on WEST.
 * Async because elkjs runs its solver asynchronously. Annotations are carried along with the same rules as tidyLayout.
 */
export async function elkLayout(nodes: FunnelNode[], edges: FunnelEdge[], opts: LayoutOptions = {}): Promise<FunnelNode[]> {
  const nodeH = opts.heightOf ?? defaultH;
  const widthOf = opts.widthOf ?? annotW;
  const snap = snapper(opts.snap ?? true);
  const flow = nodes.filter((n) => !isAnnot(n.type));
  if (!flow.length) return nodes;
  const ids = new Set(flow.map((n) => n.id));
  const E = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  const { default: ELK } = await import("elkjs/lib/elk.bundled.js");
  const elk = new ELK();
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.nodeNode": "56",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.portConstraints": "FIXED_SIDE",
      "elk.layered.layering.strategy": "LONGEST_PATH",
    },
    children: flow.map((n) => ({
      id: n.id,
      width: nodeW(n.type),
      height: nodeH(n),
      layoutOptions: { "elk.portConstraints": "FIXED_SIDE" },
      ports: [
        { id: `${n.id}:in`, layoutOptions: { "elk.port.side": "WEST" } },
        { id: `${n.id}:main`, layoutOptions: { "elk.port.side": "EAST" } },
        { id: `${n.id}:alt`, layoutOptions: { "elk.port.side": "SOUTH" } },
      ],
    })),
    edges: E.map((e) => ({ id: e.id, sources: [`${e.from}:${e.port}`], targets: [`${e.to}:in`] })),
  };
  const res = await elk.layout(graph);
  const pos: Record<string, { x: number; y: number }> = {};
  res.children?.forEach((c) => (pos[c.id] = { x: c.x ?? 0, y: c.y ?? 0 }));

  const B: Record<string, FunnelNode> = Object.fromEntries(nodes.map((n) => [n.id, { ...n }]));
  const carryAnnotations = captureAnnotations(nodes, flow, B, nodeH, widthOf);
  flow.forEach((n) => {
    B[n.id].x = snap(80 + pos[n.id].x);
    B[n.id].y = snap(80 + pos[n.id].y);
  });
  carryAnnotations();
  return nodes.map((n) => B[n.id]);
}

/* ---------------- layout quality metrics (used by tests and the comparison page) ---------------- */
export function layoutMetrics(nodes: FunnelNode[], edges: FunnelEdge[], heightOf: (n: FunnelNode) => number = () => NH) {
  const flow = nodes.filter((n) => !isAnnot(n.type));
  const B = Object.fromEntries(flow.map((n) => [n.id, n]));
  let overlaps = 0;
  for (let i = 0; i < flow.length; i++)
    for (let j = i + 1; j < flow.length; j++) {
      const a = flow[i],
        b = flow[j];
      if (a.x < b.x + nodeW(b.type) && a.x + nodeW(a.type) > b.x && a.y < b.y + heightOf(b) && a.y + heightOf(a) > b.y) overlaps++;
    }
  const segs = edges
    .filter((e) => B[e.from] && B[e.to])
    .map((e) => {
      const a = B[e.from],
        b = B[e.to];
      const p1 = e.port === "alt" ? [a.x + nodeW(a.type) / 2, a.y + heightOf(a)] : [a.x + nodeW(a.type), a.y + heightOf(a) / 2];
      const p2 = [b.x, b.y + heightOf(b) / 2];
      return { e, p1, p2 };
    });
  const cross = (p: number[], q: number[], r: number[], s: number[]) => {
    const d = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    return d(p, q, r) * d(p, q, s) < 0 && d(r, s, p) * d(r, s, q) < 0;
  };
  let crossings = 0;
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++) if (cross(segs[i].p1, segs[i].p2, segs[j].p1, segs[j].p2)) crossings++;
  const backward = segs.filter((s) => s.p2[0] < s.p1[0]).length;
  const length = segs.reduce((acc, s) => acc + Math.hypot(s.p2[0] - s.p1[0], s.p2[1] - s.p1[1]), 0);
  const xs = flow.flatMap((n) => [n.x, n.x + nodeW(n.type)]),
    ys = flow.flatMap((n) => [n.y, n.y + heightOf(n)]);
  const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  return { overlaps, crossings, backward, length: Math.round(length), area: Math.round(area) };
}
