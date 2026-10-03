// Pure export generators: CSV step report and SVG map (the PNG and the PDF map are rasterised from the SVG).
import { baseOf, CATDARK, CATHEX, NH, blockH, isAnnot, nodeW, typeOf, type ColorKey } from "./catalog";
import { money, nf } from "./format";
import { num, stepRows, type FunnelResult } from "./funnel-math";
import type { FunnelEdge, FunnelNode, Goal } from "./graph";
import { ICONS, type IconName } from "./icons";
import { edgeConversion, edgePath, edgeRevenue, edgeTag, nodeStats, offerSubtitle, perfLine, priceTab, subLabel } from "./editor/labels";
import { CARD, FAMILIES, FAMILY_GEOM, hasSplitBar, visualOf, WF_SIZE, WIREFRAMES, type WfPaint, type Wireframe } from "./block-visuals";
import { DASH, FONT_FAMILIES, edgeLook, shapeGeom } from "./style";
import { hostOf, isVideoUrl, richToPlain } from "./rich-text";
import { goalCurrent } from "./report-data";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const csvq = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;

export const fileName = (name: string, ext: string) =>
  (name || "funnel")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() + `.${ext}`;

/**
 * Step report CSV: every step, the funnel totals, then (optional) a scenario comparison with one column per
 * scenario. `scenarios` are results from compute / computeScenario (lib/report-data.ts `scenarios`).
 */
export function stepsCsv(g: { nodes: FunnelNode[]; edges: FunnelEdge[] }, R: FunnelResult, scenarios: { name: string; R: FunnelResult }[] = []): string {
  const rows: unknown[][] = [["Step", "Type", "In", "Out", "Not converting", "Conversion %", "Revenue", "Cost"]];
  stepRows(g, R).forEach((r) => rows.push([r.name, r.label, r.inn.toFixed(1), r.out.toFixed(1), r.non.toFixed(1), r.inn ? ((r.out / r.inn) * 100).toFixed(1) : "", r.rev.toFixed(2), r.cost.toFixed(2)]));
  rows.push([]);
  (
    [
      ["Traffic", R.traffic],
      ["Ad spend", R.spend],
      ["Leads", R.leads],
      ["Customers", R.cust],
      ["Revenue", R.rev],
      ["Profit", R.profit],
      ["ROI", R.roi],
      ["AOV", R.aov],
      ["CPA", R.cpa],
      ["CPL", R.cpl],
      ["CPC", R.cpc],
      ["ROAS", R.roas],
      ["Break-even ROAS", R.beroas],
      ["Break-even CPA", R.becpa],
      ["EPC", R.epc],
      ["Conversion rate", R.conv],
      ["MRR", R.mrr],
      ["LTV per customer", R.ltvc],
    ] as [string, number][]
  ).forEach(([a, b]) => rows.push([a, Number.isFinite(b) ? b.toFixed(2) : ""]));
  if (scenarios.length) {
    rows.push([]);
    rows.push(["Scenario comparison", ...scenarios.map((x) => x.name)]);
    const f = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "");
    (
      [
        ["Traffic", (r) => r.traffic],
        ["Leads", (r) => r.leads],
        ["Customers", (r) => r.cust],
        ["Revenue", (r) => r.rev],
        ["Ad spend", (r) => r.spend],
        ["Profit", (r) => r.profit],
        ["ROAS", (r) => r.roas],
        ["ROI", (r) => r.roi],
        ["CPA", (r) => r.cpa],
        ["CPL", (r) => r.cpl],
        ["AOV", (r) => r.aov],
        ["LTV per customer", (r) => r.ltvc],
        ["MRR", (r) => r.mrr],
      ] as [string, (r: FunnelResult) => number][]
    ).forEach(([label, get]) => rows.push([label, ...scenarios.map((x) => f(get(x.R)))]));
  }
  return rows.map((r) => r.map(csvq).join(",")).join("\n");
}


/* ---------------- map image (SVG; PNG and the PDF map are rasterised from it) ---------------- */

export interface SvgPalette {
  bg: string;
  panel: string;
  panel2: string;
  line: string;
  ink: string;
  muted: string;
  edge: string;
  alt: string;
  good: string;
  brand: string;
  catInk: string;
  cat: Record<ColorKey, string>;
}
/** Light theme tokens (app/globals.css [data-theme="light"]): client exports are printed on white. */
export const LIGHT_PALETTE: SvgPalette = { bg: "#F8FAFC", panel: "#FFFFFF", panel2: "#F1F5F9", line: "#DBE2EA", ink: "#0F172A", muted: "#475569", edge: "#94A3B8", alt: "#C2410C", good: "#15803D", brand: "#047857", catInk: "#FFFFFF", cat: CATHEX };

/** Dark theme tokens (the locked dark-first palette): for slides and dark documents. */
export const DARK_PALETTE: SvgPalette = { bg: "#0B1220", panel: "#111827", panel2: "#1E293B", line: "#334155", ink: "#E2E8F0", muted: "#94A3B8", edge: "#64748B", alt: "#FB923C", good: "#22C55E", brand: "#34D399", catInk: "#0B1220", cat: CATDARK };
export type ImageBackground = "light" | "dark" | "transparent";
/** Palette for a map image background ("transparent" = light elements on no background). */
export const paletteFor = (bg: ImageBackground): SvgPalette => (bg === "dark" ? DARK_PALETTE : bg === "transparent" ? { ...LIGHT_PALETTE, bg: "none" } : LIGHT_PALETTE);

/** Text width in px. The browser passes a canvas-based measure with the real fonts; this fallback approximates. */
export type Measure = (text: string, size: number, weight: number, family: string) => number;
const approxMeasure: Measure = (t, size, weight) => t.length * size * (weight >= 700 ? 0.58 : 0.54);

export interface MapSvgOptions {
  currency: string;
  nums: boolean;
  palette?: SvgPalette;
  /** Rendered height/width of an element (the editor passes its measured sizes). */
  heightOf?: (n: FunnelNode) => number;
  widthOf?: (n: FunnelNode) => number;
  /** Line thickness follows traffic (View menu option). */
  thick?: boolean;
  /** Font families used on the canvas, plus @font-face CSS to embed (so PNG/PDF don't fall back to Arial). */
  fonts?: { sans: string; display: string; css?: string };
  measure?: Measure;
  /** Key-leak block (Performance map badge). */
  keyLeak?: string | null;
  /** Funnel goals: goal blocks draw their progress bar. */
  goals?: Goal[];
  /** Page screenshots as data URLs, by node id (drawn instead of the semantic wireframe). */
  shots?: Record<string, string>;
}

const DEFAULT_FONTS = { sans: "'DM Sans', Arial, sans-serif", display: "'Bricolage Grotesque', 'DM Sans', Arial, sans-serif" };
const BORDER_DASH = { solid: undefined, dashed: "6 4", dotted: "1.5 3" } as const;
const n2 = (v: number) => Math.round(v * 100) / 100;

/** Page wireframe (lib/block-visuals.ts data) as SVG at (x, y); `paint` maps the wireframe paints to colours. */
export function wireframeSvg(kind: Wireframe, x: number, y: number, paint: Record<WfPaint, string>): string {
  const fill = (k: WfPaint) => (k === "o" || k === "ao" ? "none" : paint[k]);
  const stroke = (k: WfPaint) => (k === "o" || k === "ao" ? ` stroke="${paint[k]}" stroke-width="1"` : "");
  const body = WIREFRAMES[kind]
    .map((sh) => {
      if (sh[0] === "r") return `<rect x="${sh[1]}" y="${sh[2]}" width="${sh[3]}" height="${sh[4]}" rx="${sh[5]}" fill="${fill(sh[6])}"${stroke(sh[6])}/>`;
      if (sh[0] === "c") return `<circle cx="${sh[1]}" cy="${sh[2]}" r="${sh[3]}" fill="${fill(sh[4])}"${stroke(sh[4])}/>`;
      return `<path d="${sh[1]}" fill="none" stroke="${paint[sh[2]]}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
  return `<g transform="translate(${n2(x)},${n2(y)})">${body}</g>`;
}

/** Greedy word wrap (explicit newlines kept); words longer than the line are broken by character. */
export function wrapText(text: string, maxW: number, size: number, weight: number, family: string, measure: Measure = approxMeasure): string[] {
  const out: string[] = [];
  const fits = (t: string) => measure(t, size, weight, family) <= maxW + 0.5;
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/(?<=\s)/)) {
      if (fits(line + word.trimEnd()) || !line) {
        if (!fits(word.trimEnd()) && !line) {
          // a single over-long word: break it
          let w = word;
          while (w && !fits(w.trimEnd())) {
            let k = w.length - 1;
            while (k > 1 && !fits(w.slice(0, k))) k--;
            out.push(w.slice(0, k));
            w = w.slice(k);
          }
          line = w;
        } else line += word;
      } else {
        out.push(line.trimEnd());
        line = word;
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

/** Cut a single line to fit, with an ellipsis (CSS text-overflow). */
function ellipsis(t: string, maxW: number, size: number, weight: number, family: string, measure: Measure) {
  if (measure(t, size, weight, family) <= maxW) return t;
  let k = t.length;
  while (k > 0 && measure(t.slice(0, k) + "…", size, weight, family) > maxW) k--;
  return t.slice(0, k).trimEnd() + "…";
}

interface TextLook {
  size: number;
  /** line height in px */
  lh: number;
  weight: number;
  family: string;
  color: string;
  align: "left" | "center" | "right";
  italic?: boolean;
  deco?: string;
  ls?: number;
}
/** Baseline inside a CSS line box (ascent ≈ 0.99em, descent ≈ 0.31em for the app fonts). */
const baseline = (top: number, t: TextLook) => top + (t.lh - 1.3 * t.size) / 2 + 0.99 * t.size;

function textAttrs(t: TextLook) {
  return `font-size="${t.size}" font-weight="${t.weight}" font-family="${esc(t.family)}" fill="${esc(t.color)}"${t.italic ? ' font-style="italic"' : ""}${t.deco ? ` text-decoration="${t.deco}"` : ""}${t.ls ? ` letter-spacing="${t.ls}"` : ""}`;
}
/** Lines of text in a box [x, x+w], first line box at `top`. */
function textBlock(lines: string[], x: number, w: number, top: number, t: TextLook) {
  const ax = t.align === "center" ? x + w / 2 : t.align === "right" ? x + w : x;
  const anchor = t.align === "center" ? "middle" : t.align === "right" ? "end" : "start";
  return lines.map((l, i) => `<text x="${n2(ax)}" y="${n2(baseline(top + i * t.lh, t))}" text-anchor="${anchor}" ${textAttrs(t)} xml:space="preserve">${esc(l)}</text>`).join("");
}

/** Union of everything drawn: element boxes, frame titles, connection paths and labels. */
export function mapBounds(boxes: [number, number, number, number][], paths: string[]): [number, number, number, number] {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  const add = (x: number, y: number) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  boxes.forEach(([x, y, w, h]) => {
    add(x, y);
    add(x + w, y + h);
  });
  paths.forEach((d) => {
    const v = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    if (/C/.test(d) && v.length === 8) {
      // cubic bezier: sample the curve (control points overshoot it)
      for (let i = 0; i <= 16; i++) {
        const t = i / 16,
          u = 1 - t;
        add(u * u * u * v[0] + 3 * u * u * t * v[2] + 3 * u * t * t * v[4] + t * t * t * v[6], u * u * u * v[1] + 3 * u * u * t * v[3] + 3 * u * t * t * v[5] + t * t * t * v[7]);
      }
    } else for (let i = 0; i + 1 < v.length; i += 2) add(v[i], v[i + 1]);
  });
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : [0, 0, 400, 300];
}

/** Legacy helper: element boxes only. */
export function bounds(nodes: FunnelNode[], heightOf: (n: FunnelNode) => number = (n) => (isAnnot(n.type) ? NH : blockH(n.type))) {
  return mapBounds(
    nodes.map((n) => [n.x, n.y, n.w ?? nodeW(n.type), n.h ?? heightOf(n)]),
    [],
  );
}

/**
 * Vector map of the funnel, drawn to match the canvas: element styles (fill, border, radius, opacity, fonts, text
 * styling), wrapped text, shapes, images, checklists, frames, connection styles (path, dash, colour, width, arrows,
 * skip / no-data, labels) and layer order. `nums` = show traffic counts and block stats.
 */
export function mapSvg(g: { nodes: FunnelNode[]; edges: FunnelEdge[] }, R: FunnelResult, opts: MapSvgOptions): string {
  const P = opts.palette ?? LIGHT_PALETTE;
  const H0 = opts.heightOf ?? ((n: FunnelNode) => (n.type === "label" ? 40 : isAnnot(n.type) ? NH : blockH(n.type)));
  const W0 = opts.widthOf ?? ((n: FunnelNode) => n.w ?? (n.type === "label" ? 300 : nodeW(n.type)));
  const F = { ...DEFAULT_FONTS, ...opts.fonts };
  const measure = opts.measure ?? approxMeasure;
  const fam = (s: FunnelNode["s"], fallback: string) => (s?.font === "sans" ? F.sans : s?.font === "display" ? F.display : s?.font ? FONT_FAMILIES[s.font].css : fallback);
  /** `rel`: the CSS line height is relative (1.15 / normal) rather than a fixed px value. */
  const look = (s: FunnelNode["s"], d: Partial<TextLook> & { size: number; lh: number; rel?: boolean }): TextLook => {
    const size = s?.fontSize ?? d.size;
    return {
      size,
      lh: s?.lh ? size * s.lh : d.rel ? d.lh * (size / d.size) : d.lh,
      weight: s?.weight ?? d.weight ?? 400,
      family: fam(s, d.family ?? F.sans),
      color: s?.color ?? d.color ?? P.ink,
      align: s?.align ?? d.align ?? "left",
      italic: s?.italic,
      deco: [s?.underline && "underline", s?.strike && "line-through"].filter(Boolean).join(" ") || d.deco,
      ls: s?.ls,
    };
  };
  const box = (x: number, y: number, w: number, h: number, s: FunnelNode["s"], d: { fill: string; stroke: string; sw: number; r: number; dash?: string }) => {
    const sw = s?.borderW ?? d.sw;
    const dash = s?.borderStyle ? BORDER_DASH[s.borderStyle] : d.dash;
    // CSS borders sit inside the box; SVG strokes are centred on the path
    return `<rect x="${n2(x + sw / 2)}" y="${n2(y + sw / 2)}" width="${n2(Math.max(0, w - sw))}" height="${n2(Math.max(0, h - sw))}" rx="${Math.max(0, (s?.radius ?? d.r) - sw / 2)}" fill="${esc(s?.fill ?? d.fill)}"${sw ? ` stroke="${esc(s?.border ?? d.stroke)}" stroke-width="${sw}"` : ""}${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  };
  const group = (s: FunnelNode["s"], body: string) => (s?.opacity != null && s.opacity < 1 ? `<g opacity="${Math.max(0.1, s.opacity)}">${body}</g>` : body);

  const B = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
  const boxes: [number, number, number, number][] = [];
  const paths: string[] = [];
  let defs = "";

  /* frames: always behind everything (as on the canvas) */
  let frames = "";
  g.nodes
    .filter((f) => f.type === "frame")
    .forEach((f) => {
      const c = String(f.p.color ?? "#10B981");
      const w = f.w ?? 400,
        h = f.h ?? 300;
      const t = look(f.s, { size: 13, lh: 17, weight: 700, rel: true });
      const tw = measure(f.name, t.size, t.weight, t.family) + 20 + 3;
      const th = t.lh + 4 + 3;
      frames += group(
        f.s,
        box(f.x, f.y, w, h, f.s, { fill: c, stroke: c, sw: 2, r: 18, dash: "8 6" }).replace(/fill="([^"]+)"/, f.s?.fill ? 'fill="$1"' : 'fill="$1" fill-opacity=".07"') +
          `<rect x="${f.x + 14.75}" y="${f.y - 13.25}" width="${n2(tw - 1.5)}" height="${n2(th - 1.5)}" rx="8" fill="${P.panel}" stroke="${esc(f.s?.border ?? c)}" stroke-width="1.5"/>` +
          textBlock([f.name], f.x + 14 + 11.5, tw - 23, f.y - 14 + 3.5, { ...t, align: "left" }),
      );
      boxes.push([f.x, f.y - 14, Math.max(w, tw + 14), h + 14]);
    });

  /* connections (React Flow draws them under the elements) */
  const maxF = Math.max(1, ...Object.values(R.flows));
  const portXY = (n: FunnelNode, port: "in" | "out" | "alt"): [number, number] => {
    // handle centres sit 9px outside the block edge (editor.css .fm-port), React Flow anchors on the outer side
    const w = nodeW(n.type),
      h = blockH(n.type);
    if (port === "in") return [n.x - 9, n.y + h / 2];
    if (port === "alt") return [n.x + w / 2, n.y + h + 9];
    return [n.x + w + 9, n.y + h / 2];
  };
  let edges = "",
    labels = "";
  g.edges.forEach((e, i) => {
    const a = B[e.from],
      b = B[e.to];
    if (!a || !b) return;
    const port = e.port === "alt" ? "alt" : "main";
    const [sx, sy] = portXY(a, port === "alt" ? "alt" : "out"),
      [tx, ty] = portXY(b, "in");
    const L = edgeLook(e.s);
    const [d, mx, my] = edgePath(L, port, sx, sy, tx, ty);
    const flow = R.flows[e.id] || 0;
    const w = L.width ?? (opts.thick ? 2 + 6 * Math.sqrt(flow / maxF) : 2);
    const color = L.color ?? (L.kind === "nodata" ? P.muted : port === "alt" ? P.alt : P.edge);
    const dash = L.dash ? DASH[L.dash] : port === "alt" ? "7 6" : undefined;
    const op = L.kind === "nodata" ? 0.7 : port === "alt" ? 0.9 : 1;
    let marker = "";
    if (L.arrow !== "none") {
      const ms = L.arrowSize + w * 1.5;
      defs += `<marker id="fm-a${i}" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="${n2(ms)}" markerHeight="${n2(ms)}" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${esc(color)}"/></marker>`;
      marker = ` marker-end="url(#fm-a${i})"${L.arrow === "both" ? ` marker-start="url(#fm-a${i})"` : ""}`;
    }
    const opacity = L.opacity != null ? L.opacity : op;
    edges += `<path d="${d}" fill="none" stroke="${esc(color)}" stroke-width="${n2(w)}"${dash ? ` stroke-dasharray="${dash}"` : ""}${opacity < 1 ? ` opacity="${opacity}"` : ""}${marker}/>`;
    paths.push(d);

    // label pill: tags (Yes/No, A/B, Skip, custom) + people (· share %) or "No data"
    const tag = edgeTag(a.type, port);
    const segs: { t: string; c: string; w: number }[] = [];
    if (tag) segs.push({ t: tag.text, c: tag.alt ? P.alt : P.good, w: 700 });
    if (L.kind === "skip") segs.push({ t: "Skip", c: P.good, w: 700 });
    if (L.label) segs.push({ t: L.label, c: P.good, w: 700 });
    if (L.kind === "nodata") segs.push({ t: "No data", c: P.muted, w: 600 });
    else if (opts.nums) {
      const share = num(e.share ?? 100);
      segs.push({ t: `${nf(flow)}${share !== 100 ? ` · ${nf(share)}%` : ""}`, c: P.ink, w: 700 });
      const conv = L.showPct ? edgeConversion(e.from, flow, R) : null;
      if (conv != null) segs.push({ t: `${nf(conv * 100, 1)}% convert`, c: P.muted, w: 600 });
      const rv = L.showRev ? edgeRevenue(e.to, flow, R) : 0;
      if (rv > 0) segs.push({ t: money(rv, opts.currency), c: P.muted, w: 600 });
    }
    if (!segs.length) return;
    const t = { size: 12, lh: 16, family: F.sans };
    const widths = segs.map((s) => measure(s.t, t.size, s.w, t.family));
    const pw = widths.reduce((acc, x) => acc + x, 0) + (segs.length - 1) * 5 + 18 + 2,
      ph = t.lh + 4 + 2;
    const px = mx - pw / 2,
      py = my - ph / 2;
    labels += `<rect x="${n2(px + 0.5)}" y="${n2(py + 0.5)}" width="${n2(pw - 1)}" height="${n2(ph - 1)}" rx="${n2(ph / 2)}" fill="${P.panel}" stroke="${P.line}"/>`;
    let cx = px + 10;
    segs.forEach((s, k) => {
      labels += `<text x="${n2(cx)}" y="${n2(baseline(py + 3, { ...t, weight: s.w, color: s.c, align: "left" }))}" font-size="12" font-weight="${s.w}" font-family="${esc(F.sans)}" fill="${esc(s.c)}">${esc(s.t)}</text>`;
      cx += widths[k] + 5;
    });
    boxes.push([px, py, pw, ph]);
  });

  /* elements, in layer order (z), as React Flow stacks them */
  let body = "";
  const order = g.nodes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.type !== "frame" && typeOf(n.type))
    .sort((a, b) => (a.n.z ?? 0) - (b.n.z ?? 0) || a.i - b.i)
    .map(({ n }) => n);
  order.forEach((n, idx) => {
    const T = typeOf(n.type);
    const s = n.s;
    if (n.type === "shape") {
      const w = n.w ?? 160,
        h = n.h ?? 100,
        shape = String(n.p.shape ?? "rounded");
      const fill = esc(s?.fill ?? P.panel2),
        stroke = esc(s?.border ?? P.line),
        sw = s?.borderW ?? 1.5,
        dash = s?.borderStyle ? BORDER_DASH[s.borderStyle] : undefined;
      const st = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ""}`;
      const geom = shapeGeom(shape, w, h, String(n.p.dir ?? "h"), s?.borderW ?? 2);
      let o = geom
        ? geom.open
          ? `<g transform="translate(${n2(n.x)},${n2(n.y)})"><path d="${geom.d}" fill="none" stroke="${esc(s?.border ?? P.muted)}" stroke-width="${s?.borderW ?? 2}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>${geom.head ? `<polygon points="${geom.head}" fill="${esc(s?.border ?? P.muted)}"/>` : ""}</g>`
          : `<path transform="translate(${n2(n.x)},${n2(n.y)})" d="${geom.d}" ${st}/>`
        : shape === "ellipse" || shape === "circle"
          ? `<ellipse cx="${n.x + w / 2}" cy="${n.y + h / 2}" rx="${n2(w / 2 - sw / 2)}" ry="${n2(h / 2 - sw / 2)}" ${st}/>`
          : shape === "diamond"
            ? `<polygon points="${n2(n.x + w / 2)},${n2(n.y + h * 0.01)} ${n2(n.x + w * 0.99)},${n2(n.y + h / 2)} ${n2(n.x + w / 2)},${n2(n.y + h * 0.99)} ${n2(n.x + w * 0.01)},${n2(n.y + h / 2)}" ${st}/>`
            : box(n.x, n.y, w, h, s, { fill: P.panel2, stroke: P.line, sw: 1.5, r: shape === "rect" ? 0 : 16 });
      const text = String(n.p.text ?? "");
      if (text && !geom?.open) {
        const t = look(s, { size: 14, lh: 18.2, weight: 600, align: "center", rel: true });
        const pad = s?.pad ?? 0;
        const th = shape === "callout" ? h * 0.78 : h;
        const lines = wrapText(text, w - 24 - pad * 2, t.size, t.weight, t.family, measure);
        o += textBlock(lines, n.x + 12 + pad, w - 24 - pad * 2, n.y + (th - lines.length * t.lh) / 2, t);
      }
      body += group(s, o);
      boxes.push([n.x, n.y, w, h]);
      return;
    }
    if (n.type === "image") {
      const src = String(n.p.src ?? "");
      const w = n.w ?? 200,
        h = n.h ?? 140;
      if (!src) return; // the empty placeholder is editor-only
      const r = s?.radius ?? 10;
      defs += `<clipPath id="fm-c${idx}"><rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="${r}"/></clipPath>`;
      let o = s?.fill ? `<rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="${r}" fill="${esc(s.fill)}"/>` : "";
      o += `<image href="${esc(src)}" x="${n.x}" y="${n.y}" width="${w}" height="${h}" preserveAspectRatio="${n.p.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}" clip-path="url(#fm-c${idx})"/>`;
      if (s?.border || s?.borderW) o += box(n.x, n.y, w, h, { ...s, fill: "none" }, { fill: "none", stroke: P.line, sw: 1.5, r });
      body += group(s, o);
      boxes.push([n.x, n.y, w, h]);
      return;
    }
    if (n.type === "checklist") {
      const items = (n.p.items as { text: string; done: boolean; indent?: number }[] | undefined) ?? [];
      const w = W0(n);
      const px = (s?.pad ?? 12) + 1.5,
        py = (s?.pad ?? 10) + 1.5;
      const tt = look(s, { size: 14, lh: 18.2, weight: 700, rel: true });
      const it = look(s, { size: 13, lh: 18, weight: 400 });
      let y = n.y + py;
      let inner = textBlock([ellipsis(String(n.p.title ?? "Checklist"), w - px * 2 - 40, tt.size, tt.weight, tt.family, measure)], n.x + px, w - px * 2, y, { ...tt, align: "left" });
      inner += `<text x="${n2(n.x + w - px)}" y="${n2(baseline(y, tt))}" text-anchor="end" font-size="12" font-weight="600" font-family="${esc(F.sans)}" fill="${P.muted}">${items.filter((x) => x.done).length}/${items.length}</text>`;
      y += tt.lh + 6;
      items.forEach((x, k) => {
        const ix = n.x + px + (x.indent ?? 0) * 16;
        const lines = wrapText(x.text, n.x + w - px - (ix + 22), it.size, it.weight, it.family, measure);
        inner += x.done
          ? `<rect x="${n2(ix + 0.5)}" y="${n2(y + 2.5)}" width="14" height="14" rx="3" fill="${P.brand}"/><path d="M${n2(ix + 4)} ${n2(y + 9.5)} l3 3 l5 -6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
          : `<rect x="${n2(ix + 0.5)}" y="${n2(y + 2.5)}" width="14" height="14" rx="3" fill="${P.panel}" stroke="${P.muted}"/>`;
        inner += textBlock(lines, ix + 22, w, y, { ...it, align: "left", color: x.done ? P.muted : it.color, deco: x.done ? "line-through" : it.deco });
        y += lines.length * it.lh + (k < items.length - 1 ? 3 : 0);
      });
      const h = Math.max(H0(n), y + py - n.y);
      body += group(s, box(n.x, n.y, w, h, s, { fill: P.panel, stroke: P.line, sw: 1.5, r: 14 }) + inner);
      boxes.push([n.x, n.y, w, h]);
      return;
    }
    if (n.type === "note") {
      const w = n.w ?? 210;
      const px = (s?.pad ?? 12) + 1.5,
        py = (s?.pad ?? 10) + 1.5;
      const t = look(s, { size: 13, lh: 18, weight: 400, color: "#422006" });
      const lines = wrapText(richToPlain(String(n.p.text ?? "")), w - px * 2, t.size, t.weight, t.family, measure);
      const h = Math.max(96, H0(n), lines.length * t.lh + py * 2);
      body += group(s, box(n.x, n.y, w, h, s, { fill: "#FDE68A", stroke: "#FCD34D", sw: 1.5, r: 14 }) + textBlock(lines, n.x + px, w - px * 2, n.y + py, t));
      boxes.push([n.x, n.y, w, h]);
      return;
    }
    if (n.type === "link") {
      const url = String(n.p.url ?? "");
      if (!url) return; // an empty link card is editor-only
      const w = W0(n),
        h = Math.max(60, H0(n));
      const video = isVideoUrl(url);
      const tt = look(s, { size: 13.5, lh: 18, weight: 700 });
      const title = ellipsis(String(n.p.title ?? "") || hostOf(url), w - 76, tt.size, tt.weight, tt.family, measure);
      let o = box(n.x, n.y, w, h, s, { fill: P.panel, stroke: P.line, sw: 1.5, r: 14 });
      o += `<rect x="${n2(n.x + 12)}" y="${n2(n.y + (h - 40) / 2)}" width="40" height="40" rx="9" fill="${video ? "#FEE2E2" : P.panel2}"/>`;
      o += video
        ? `<path d="M${n2(n.x + 28)} ${n2(n.y + h / 2 - 7)} l10 7 l-10 7z" fill="#DC2626"/>`
        : `<g transform="translate(${n2(n.x + 23)},${n2(n.y + h / 2 - 9)}) scale(0.75)" fill="none" stroke="${P.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.link}</g>`;
      o += textBlock([title], n.x + 62, w - 74, n.y + h / 2 - 18, { ...tt, align: "left" });
      o += `<text x="${n2(n.x + 62)}" y="${n2(n.y + h / 2 + 14)}" font-size="12" font-family="${esc(F.sans)}" fill="${P.brand}">${esc(hostOf(url))}</text>`;
      body += group(s, o);
      boxes.push([n.x, n.y, w, h]);
      return;
    }
    if (n.type === "label") {
      const w = W0(n);
      const px = (s?.pad ?? 8) + 1,
        py = (s?.pad ?? 4) + 1;
      const size = s?.fontSize ?? (Number(n.p.size) || 28);
      const t = look(s, { size, lh: size * 1.15, weight: 800, family: F.display, rel: true });
      const lines = wrapText(String(n.p.text ?? ""), w - px * 2, t.size, t.weight, t.family, measure);
      const h = Math.max(H0(n), lines.length * t.lh + py * 2);
      const frame = s?.fill || s?.border || s?.borderW ? box(n.x, n.y, w, h, s, { fill: "none", stroke: "none", sw: 0, r: 0 }) : "";
      body += group(s, frame + textBlock(lines, n.x + px, w - px * 2, n.y + py, t));
      boxes.push([n.x, n.y, w, h]);
      return;
    }
    if (!T || isAnnot(n.type)) return;

    /* flow block: the same family anatomy as the canvas card (lib/block-visuals.ts FAMILY_GEOM / CARD) */
    const w = nodeW(n.type),
      h = blockH(n.type),
      c = P.cat[T.color ?? T.cat];
    const V = visualOf(n.type),
      G = FAMILY_GEOM[V.family],
      F2 = FAMILIES[V.family];
    const perf = !!opts.nums && !!opts.thick;
    // card outline with per-corner radii (a custom radius in the Style tab wins)
    const [rtl, rtr, rbr, rbl] = s?.radius != null ? [s.radius, s.radius, s.radius, s.radius] : G.radii;
    const bw = s?.borderW ?? CARD.border;
    const cardPath = (inset: number) => {
      const x = n.x + inset,
        y = n.y + inset,
        X = n.x + w - inset,
        Y = n.y + h - inset;
      const r = (v: number) => Math.max(0, Math.min(v - inset, (h - 2 * inset) / 2, (w - 2 * inset) / 2));
      const [a1, a2, a3, a4] = [r(rtl), r(rtr), r(rbr), r(rbl)];
      return `M${n2(x + a1)} ${n2(y)}H${n2(X - a2)}A${n2(a2)} ${n2(a2)} 0 0 1 ${n2(X)} ${n2(y + a2)}V${n2(Y - a3)}A${n2(a3)} ${n2(a3)} 0 0 1 ${n2(X - a3)} ${n2(Y)}H${n2(x + a4)}A${n2(a4)} ${n2(a4)} 0 0 1 ${n2(x)} ${n2(Y - a4)}V${n2(y + a1)}A${n2(a1)} ${n2(a1)} 0 0 1 ${n2(x + a1)} ${n2(y)}Z`;
    };
    const dash = s?.borderStyle ? BORDER_DASH[s.borderStyle] : undefined;
    const leak = perf && opts.keyLeak === n.id;
    let o = `<path d="${cardPath(bw / 2)}" fill="${esc(s?.fill ?? P.panel)}" stroke="${esc(s?.border ?? (leak ? P.alt : P.line))}" stroke-width="${bw}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
    if (G.hatch) {
      defs += `<pattern id="fm-hatch" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><rect width="10" height="20" fill="${P.muted}" fill-opacity=".09"/></pattern>`;
      o += `<path d="${cardPath(bw)}" fill="url(#fm-hatch)"/>`;
    }
    if (F2.strip) o += `<rect x="${n2(n.x + 12)}" y="${n2(n.y - 0.5)}" width="${w - 24}" height="3" rx="1.5" fill="${c}"/>`;
    const [padL, padR] = G.pad;
    const innerL = n.x + bw + padL,
      innerR = n.x + w - bw - padR,
      innerW = innerR - innerL;
    // stack: head, [strip], [bar], stats; free space is spread between them (flex space-between)
    const parts: { k: string; h: number }[] = [{ k: "head", h: CARD.head }];
    if (F2.strip && V.wireframe) parts.push({ k: "strip", h: CARD.strip });
    if (hasSplitBar(n.type)) parts.push({ k: "split", h: CARD.bar });
    const PL = perf ? perfLine(n, R, opts.currency) : null;
    if (PL && PL.ratio != null) parts.push({ k: "conv", h: CARD.bar });
    const goal = V.family === "goal" ? (opts.goals ?? []).find((g) => g.nodeId === n.id && g.value > 0) : undefined;
    if (goal) parts.push({ k: "goal", h: CARD.goalBar });
    const statsH = CARD.stats + (G.dashedStats ? CARD.dashedStats : 0);
    parts.push({ k: "stats", h: statsH });
    const inner = h - 2 * bw - 2 * CARD.padY;
    const gap = parts.length > 1 ? (inner - parts.reduce((a, q) => a + q.h, 0)) / (parts.length - 1) : 0;
    const top: Record<string, number> = {};
    let yy = n.y + bw + CARD.padY;
    parts.forEach((q) => {
      top[q.k] = yy;
      yy += q.h + gap;
    });
    // head: tile + title + sub-line
    const ts = G.tileSize,
      tcy = top.head + CARD.head / 2,
      tcx = innerL + ts / 2;
    const tint = V.brand ?? c;
    const ink = V.brand ? "#FFFFFF" : P.catInk;
    if (G.tile === "circle") o += `<circle cx="${n2(tcx)}" cy="${n2(tcy)}" r="${ts / 2}" fill="${tint}"/>`;
    else if (G.tile === "diamond") o += `<rect x="${n2(tcx - ts * 0.41)}" y="${n2(tcy - ts * 0.41)}" width="${n2(ts * 0.82)}" height="${n2(ts * 0.82)}" rx="${G.tileR}" fill="${tint}" transform="rotate(45 ${n2(tcx)} ${n2(tcy)})"/>`;
    else o += `<rect x="${n2(tcx - ts / 2)}" y="${n2(tcy - ts / 2)}" width="${ts}" height="${ts}" rx="${G.tileR}" fill="${tint}"/>`;
    const icon = ICONS[(s?.icon as IconName) || T.icon] ?? ICONS.page;
    o += `<svg x="${n2(tcx - 9)}" y="${n2(tcy - 9)}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
    const tx = innerL + ts + 10,
      tw = innerR - tx - 10;
    const tl = look(s, { size: 14, lh: 18, weight: 700 });
    o += textBlock([ellipsis(n.name, tw, tl.size, tl.weight, tl.family, measure)], tx, tw, top.head, { ...tl, align: "left" });
    const sub = { size: 11.5, lh: 15, weight: 500, family: F.sans, color: P.muted, align: "left" as const };
    if (PL) {
      const hlW = measure(PL.headline, 14, 700, F.display);
      o += `<text x="${n2(tx)}" y="${n2(baseline(top.head + 18, { ...sub, size: 14, lh: 15 }))}" font-size="14" font-weight="700" font-family="${esc(F.display)}" fill="${P.ink}">${esc(ellipsis(PL.headline, tw, 14, 700, F.display, measure))}</text>`;
      o += textBlock([ellipsis(" " + PL.caption, Math.max(0, tw - hlW), sub.size, sub.weight, sub.family, measure)], tx + hlW, Math.max(0, tw - hlW), top.head + 18, sub);
    } else {
      const subText = V.family === "offer" ? offerSubtitle(n) : subLabel(n, opts.currency);
      o += textBlock([ellipsis(subText, tw, sub.size, sub.weight, sub.family, measure)], tx, tw, top.head + 18, sub);
    }
    // price tab (offers; hidden with the numbers)
    if (F2.price && opts.nums) {
      const pt = priceTab(n, opts.currency);
      const pw = measure(pt, 10.5, 700, F.sans) + 14;
      o += `<rect x="${n2(n.x + 12.5)}" y="${n2(n.y - 9.5)}" width="${n2(pw - 1)}" height="19" rx="5" fill="${P.bg === "none" ? P.panel : P.bg}" stroke="${c}" stroke-opacity=".6"/>`;
      o += `<text x="${n2(n.x + 12 + 7)}" y="${n2(n.y + 0.5 + 3.7)}" font-size="10.5" font-weight="700" font-family="${esc(F.sans)}" fill="${c}">${esc(pt)}</text>`;
    }
    // preview strip: captured screenshot, else the semantic wireframe
    if (top.strip != null && V.wireframe) {
      const sx = innerL,
        sw = innerW;
      o += `<rect x="${n2(sx + 0.5)}" y="${n2(top.strip + 0.5)}" width="${n2(sw - 1)}" height="${CARD.strip - 1}" rx="5" fill="${P.bg === "none" ? P.panel2 : P.bg}" stroke="${P.line}"/>`;
      const shot = opts.shots?.[n.id];
      if (shot) {
        defs += `<clipPath id="fm-s${idx}"><rect x="${n2(sx + 1)}" y="${n2(top.strip + 1)}" width="${n2(sw - 2)}" height="${CARD.strip - 2}" rx="4"/></clipPath>`;
        o += `<image href="${esc(shot)}" x="${n2(sx + 1)}" y="${n2(top.strip + 1)}" width="${n2(sw - 2)}" height="${CARD.strip - 2}" preserveAspectRatio="xMidYMin slice" clip-path="url(#fm-s${idx})"/>`;
      } else o += wireframeSvg(V.wireframe, sx + (sw - WF_SIZE.w) / 2, top.strip + (CARD.strip - WF_SIZE.h) / 2, { o: P.line, d: P.line, m: P.edge, a: c, ao: c });
    }
    // split bar (Yes/No, A/B)
    if (top.split != null) {
      const a = Math.max(0, Math.min(100, Number(n.p.pct) || 0)),
        g2 = 2,
        avail = innerW - g2;
      o += `<rect x="${n2(innerL)}" y="${n2(top.split)}" width="${n2((avail * a) / 100)}" height="${CARD.bar}" rx="2" fill="${P.brand}"/>`;
      o += `<rect x="${n2(innerL + (avail * a) / 100 + g2)}" y="${n2(top.split)}" width="${n2((avail * (100 - a)) / 100)}" height="${CARD.bar}" rx="2" fill="${baseOf(n.type) === "split" ? P.edge : P.alt}"/>`;
    }
    // Performance map: share who move on (rest = people lost)
    if (top.conv != null && PL?.ratio != null) {
      o += `<rect x="${n2(innerL)}" y="${n2(top.conv)}" width="${n2(innerW)}" height="${CARD.bar}" rx="2" fill="${P.alt}"/><rect x="${n2(innerL)}" y="${n2(top.conv)}" width="${n2(innerW * PL.ratio)}" height="${CARD.bar}" rx="2" fill="${P.brand}"/>`;
    }
    // goal progress (target from the funnel's goals, never invented)
    if (top.goal != null && goal) {
      const cur = goalCurrent(g.nodes, R, goal);
      const p = Number.isFinite(cur) ? Math.max(0, Math.min(1, cur / goal.value)) : 0;
      o += `<rect x="${n2(innerL)}" y="${n2(top.goal)}" width="${n2(innerW)}" height="${CARD.goalBar}" rx="3" fill="${P.line}"/><rect x="${n2(innerL)}" y="${n2(top.goal)}" width="${n2(innerW * p)}" height="${CARD.goalBar}" rx="3" fill="${P.good}"/>`;
      o += `<text x="${n2(innerR)}" y="${n2(top.goal - 3)}" text-anchor="end" font-size="10" font-weight="700" font-family="${esc(F.sans)}" fill="${P.muted}">${nf(p * 100)}%</text>`;
    }
    // stats row
    if (opts.nums) {
      const st = { size: 12, lh: 16, weight: 400, family: F.sans, color: P.muted, align: "left" as const };
      let sy = top.stats;
      if (G.dashedStats) {
        o += `<line x1="${n2(innerL)}" y1="${n2(sy + 0.5)}" x2="${n2(innerR)}" y2="${n2(sy + 0.5)}" stroke="${P.line}" stroke-dasharray="3 3"/>`;
        sy += CARD.dashedStats;
      }
      const r0 = R.N[n.id];
      const nodata = !r0 || (T.cat !== "traffic" && r0.inflow === 0);
      if (nodata) o += `<text x="${n2(innerL)}" y="${n2(baseline(sy, st))}" font-size="12" font-style="italic" font-family="${esc(F.sans)}" fill="${P.muted}">No data yet</text>`;
      else {
        let full = "",
          tsp = "";
        for (const sg of nodeStats(n, R, opts.currency)) {
          const room = innerW - measure(full, 12, 400, F.sans);
          const t = measure(sg.t, 12, sg.b ? 700 : 400, F.sans) <= room ? sg.t : ellipsis(sg.t, room, 12, sg.b ? 700 : 400, F.sans, measure);
          full += t;
          tsp += `<tspan${sg.b ? ` font-weight="700" fill="${P.ink}"` : ""}>${esc(t)}</tspan>`;
          if (t !== sg.t) break;
        }
        o += `<text x="${n2(innerL)}" y="${n2(baseline(sy, st))}" ${textAttrs(st)} xml:space="preserve">${tsp}</text>`;
      }
    }
    if (leak) {
      const lw = measure("Key leak", 10.5, 800, F.sans) + 16;
      o += `<rect x="${n2(n.x + w - 10 - lw)}" y="${n2(n.y - 11)}" width="${n2(lw)}" height="20" rx="10" fill="${P.alt}"/><text x="${n2(n.x + w - 10 - lw / 2)}" y="${n2(n.y + 2.8)}" text-anchor="middle" font-size="10.5" font-weight="800" font-family="${esc(F.sans)}" fill="#fff">Key leak</text>`;
    }
    body += group(s, o);
    boxes.push([n.x, n.y - (F2.price || leak ? 11 : 0), w, h + (F2.price || leak ? 11 : 0)]);
  });

  const [x0, y0, x1, y1] = mapBounds(boxes, paths);
  const pad = 32,
    W = Math.ceil(x1 - x0 + pad * 2),
    H = Math.ceil(y1 - y0 + pad * 2);
  const style = opts.fonts?.css ? `<style>${opts.fonts.css}</style>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${esc(F.sans)}">` +
    `<defs>${style}${defs}</defs><rect width="100%" height="100%" fill="${P.bg}"/>` +
    `<g transform="translate(${n2(pad - x0)},${n2(pad - y0)})">${frames}${edges}${body}${labels}</g></svg>`
  );
}
