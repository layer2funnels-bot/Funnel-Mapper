// Pure export generators: CSV step report and SVG map (the PNG and the PDF map are rasterised from the SVG).
import { CATHEX, NH, isAnnot, nodeW, typeOf, type ColorKey } from "./catalog";
import { nf } from "./format";
import { num, stepRows, type FunnelResult } from "./funnel-math";
import type { FunnelEdge, FunnelNode } from "./graph";
import { ICONS, type IconName } from "./icons";
import { edgePath, edgeTag, nodeStats, subLabel } from "./editor/labels";
import { DASH, FONT_FAMILIES, edgeLook } from "./style";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const csvq = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;

export const fileName = (name: string, ext: string) =>
  (name || "funnel")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() + `.${ext}`;

export function stepsCsv(g: { nodes: FunnelNode[]; edges: FunnelEdge[] }, R: FunnelResult): string {
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
}

const DEFAULT_FONTS = { sans: "'DM Sans', Arial, sans-serif", display: "'Bricolage Grotesque', 'DM Sans', Arial, sans-serif" };
const BORDER_DASH = { solid: undefined, dashed: "6 4", dotted: "1.5 3" } as const;
const n2 = (v: number) => Math.round(v * 100) / 100;

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
export function bounds(nodes: FunnelNode[], heightOf: (n: FunnelNode) => number = () => NH) {
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
  const H0 = opts.heightOf ?? ((n: FunnelNode) => (n.type === "label" ? 40 : NH));
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
      h = NH;
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
    edges += `<path d="${d}" fill="none" stroke="${esc(color)}" stroke-width="${n2(w)}"${dash ? ` stroke-dasharray="${dash}"` : ""}${op < 1 ? ` opacity="${op}"` : ""}${marker}/>`;
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
      let o =
        shape === "ellipse"
          ? `<ellipse cx="${n.x + w / 2}" cy="${n.y + h / 2}" rx="${n2(w / 2 - sw / 2)}" ry="${n2(h / 2 - sw / 2)}" ${st}/>`
          : shape === "diamond"
            ? `<polygon points="${n2(n.x + w / 2)},${n2(n.y + h * 0.01)} ${n2(n.x + w * 0.99)},${n2(n.y + h / 2)} ${n2(n.x + w / 2)},${n2(n.y + h * 0.99)} ${n2(n.x + w * 0.01)},${n2(n.y + h / 2)}" ${st}/>`
            : box(n.x, n.y, w, h, s, { fill: P.panel2, stroke: P.line, sw: 1.5, r: shape === "rect" ? 0 : 16 });
      const text = String(n.p.text ?? "");
      if (text) {
        const t = look(s, { size: 14, lh: 18.2, weight: 600, align: "center", rel: true });
        const pad = s?.pad ?? 0;
        const lines = wrapText(text, w - 24 - pad * 2, t.size, t.weight, t.family, measure);
        o += textBlock(lines, n.x + 12 + pad, w - 24 - pad * 2, n.y + (h - lines.length * t.lh) / 2, t);
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
      const lines = wrapText(String(n.p.text ?? ""), w - px * 2, t.size, t.weight, t.family, measure);
      const h = Math.max(96, H0(n), lines.length * t.lh + py * 2);
      body += group(s, box(n.x, n.y, w, h, s, { fill: "#FDE68A", stroke: "#FCD34D", sw: 1.5, r: 14 }) + textBlock(lines, n.x + px, w - px * 2, n.y + py, t));
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

    /* flow block (fixed size, as on the canvas) */
    const w = nodeW(n.type),
      h = NH,
      c = P.cat[T.color ?? T.cat];
    let o = box(n.x, n.y, w, h, s, { fill: P.panel, stroke: P.line, sw: 1.5, r: 14 });
    o += `<rect x="${n.x + 12}" y="${n.y - 1.5}" width="${w - 24}" height="3" rx="1.5" fill="${c}"/>`;
    const logic = T.cat === "logic";
    const cx0 = n.x + 13.5,
      cy0 = n.y + 11.5; // content box: 1.5px border + 10px/12px padding
    const ic = cy0 + 16.5; // icon centre: the head row is 33px (title 18 + sub-label 15)
    const icx = cx0 + 16;
    o += logic
      ? `<rect x="${icx - 13}" y="${ic - 13}" width="26" height="26" rx="6" fill="${c}" transform="rotate(45 ${icx} ${n2(ic)})"/>`
      : `<rect x="${cx0}" y="${n2(ic - 16)}" width="32" height="32" rx="9" fill="${c}"/>`;
    const icon = ICONS[(s?.icon as IconName) || T.icon] ?? ICONS.page;
    o += `<svg x="${icx - 9}" y="${n2(ic - 9)}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${P.catInk}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
    const tx = cx0 + 32 + 10,
      tw = w - (tx - n.x) - 13.5;
    const tl = look(s, { size: 14, lh: 18, weight: 700 });
    o += textBlock([ellipsis(n.name, tw, tl.size, tl.weight, tl.family, measure)], tx, tw, ic - 16.5, { ...tl, align: "left" });
    const sub = { size: 11.5, lh: 15, weight: 500, family: F.sans, color: P.muted, align: "left" as const };
    o += textBlock([ellipsis(subLabel(n, opts.currency), tw, sub.size, sub.weight, sub.family, measure)], tx, tw, ic - 16.5 + tl.lh, sub);
    if (opts.nums) {
      const segs = nodeStats(n, R, opts.currency);
      const st = { size: 12, lh: 16, weight: 400, family: F.sans, color: P.muted, align: "left" as const };
      let full = "",
        tsp = "";
      const maxW = w - 27;
      for (const sg of segs) {
        const room = maxW - measure(full, 12, 400, F.sans);
        const t = measure(sg.t, 12, sg.b ? 700 : 400, F.sans) <= room ? sg.t : ellipsis(sg.t, room, 12, sg.b ? 700 : 400, F.sans, measure);
        full += t;
        tsp += `<tspan${sg.b ? ` font-weight="700" fill="${P.ink}"` : ""}>${esc(t)}</tspan>`;
        if (t !== sg.t) break;
      }
      o += `<text x="${cx0}" y="${n2(baseline(n.y + h - 11.5 - 16, st))}" ${textAttrs(st)} xml:space="preserve">${tsp}</text>`;
    }
    body += group(s, o);
    boxes.push([n.x, n.y, w, h]);
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
