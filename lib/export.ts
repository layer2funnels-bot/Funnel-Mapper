// Pure export generators: CSV step report and SVG map (ported from the prototype's csv() / exportSVG()).
import { CATHEX, NH, nodeW, typeOf, type ColorKey } from "./catalog";
import { nf } from "./format";
import { stepRows, type FunnelResult } from "./funnel-math";
import type { FunnelEdge, FunnelNode } from "./graph";
import { curve, nodeStats, segText, subLabel } from "./editor/labels";
import { DASH, edgeLook } from "./style";

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

export interface SvgPalette {
  bg: string;
  panel: string;
  line: string;
  ink: string;
  muted: string;
  edge: string;
  alt: string;
  cat: Record<ColorKey, string>;
}
export const LIGHT_PALETTE: SvgPalette = { bg: "#F7F5FC", panel: "#FFFFFF", line: "#E4DEF1", ink: "#1E1631", muted: "#5E5577", edge: "#8B80A8", alt: "#C2410C", cat: CATHEX };

export function bounds(nodes: FunnelNode[], heightOf: (n: FunnelNode) => number = () => NH) {
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  nodes.forEach((n) => {
    const w = n.w ?? nodeW(n.type),
      h = n.h ?? heightOf(n);
    x0 = Math.min(x0, n.x);
    y0 = Math.min(y0, n.y);
    x1 = Math.max(x1, n.x + w);
    y1 = Math.max(y1, n.y + h + 20);
  });
  return nodes.length ? [x0, y0, x1, y1] : [0, 0, 400, 300];
}

/** Vector map of the funnel. `nums` = show traffic counts and node stats. */
export function mapSvg(g: { nodes: FunnelNode[]; edges: FunnelEdge[] }, R: FunnelResult, opts: { currency: string; nums: boolean; palette?: SvgPalette; heightOf?: (n: FunnelNode) => number }): string {
  const P = opts.palette ?? LIGHT_PALETTE;
  const H0 = opts.heightOf ?? (() => NH);
  const [x0, y0, x1, y1] = bounds(g.nodes, H0),
    pad = 60,
    W = x1 - x0 + pad * 2,
    H = y1 - y0 + pad * 2,
    ox = pad - x0,
    oy = pad - y0;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="DM Sans, Arial, sans-serif"><rect width="100%" height="100%" fill="${P.bg}"/><g transform="translate(${ox},${oy})">`;
  g.nodes
    .filter((n) => n.type === "frame")
    .forEach((f) => {
      const c = esc(f.p.color ?? "#10B981");
      o += `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="18" fill="${c}" fill-opacity=".07" stroke="${c}" stroke-width="2" stroke-dasharray="8 6"/><text x="${f.x + 16}" y="${f.y - 8}" font-size="14" font-weight="700" fill="${c}">${esc(f.name)}</text>`;
    });
  const B = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
  const portXY = (n: FunnelNode, port: "in" | "out" | "alt"): [number, number] => {
    const w = nodeW(n.type),
      h = H0(n);
    if (port === "in") return [n.x - 1, n.y + h / 2];
    if (port === "alt") return [n.x + w / 2, n.y + h + 1];
    return [n.x + w + 1, n.y + h / 2];
  };
  g.edges.forEach((e) => {
    const a = B[e.from],
      b = B[e.to];
    if (!a || !b) return;
    const [sx, sy] = portXY(a, e.port === "alt" ? "alt" : "out"),
      [tx, ty] = portXY(b, "in");
    const look = edgeLook(e.s);
    let [d, [mx, my]] = curve(sx, sy, e.port, tx, ty);
    if (look.path === "straight") [d, mx, my] = [`M ${sx} ${sy} L ${tx} ${ty}`, (sx + tx) / 2, (sy + ty) / 2];
    if (look.path === "elbow") {
      const ex = e.port === "alt" ? sx : (sx + tx) / 2;
      [d, mx, my] = e.port === "alt" ? [`M ${sx} ${sy} L ${sx} ${ty} L ${tx} ${ty}`, (sx + tx) / 2, ty] : [`M ${sx} ${sy} L ${ex} ${sy} L ${ex} ${ty} L ${tx} ${ty}`, ex, (sy + ty) / 2];
    }
    const dash = look.dash ? DASH[look.dash] : e.port === "alt" ? "7 6" : undefined;
    o += `<path d="${d}" fill="none" stroke="${esc(look.color ?? (e.port === "alt" ? P.alt : P.edge))}" stroke-width="${look.width ?? 2}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
    if (look.kind === "nodata") return;
    if (opts.nums) o += `<text x="${mx}" y="${my + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="${P.ink}" stroke="${P.bg}" stroke-width="4" paint-order="stroke">${nf(R.flows[e.id] || 0)}</text>`;
  });
  g.nodes.forEach((n) => {
    const T = typeOf(n.type);
    if (!T || n.type === "frame") return;
    const w0 = n.w ?? nodeW(n.type),
      h0 = n.h ?? H0(n);
    if (n.type === "shape") {
      const fill = esc(n.s?.fill ?? P.panel),
        stroke = esc(n.s?.border ?? P.line),
        sw = n.s?.borderW ?? 1.5,
        shape = String(n.p.shape ?? "rounded");
      o +=
        shape === "ellipse"
          ? `<ellipse cx="${n.x + w0 / 2}" cy="${n.y + h0 / 2}" rx="${w0 / 2}" ry="${h0 / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
          : shape === "diamond"
            ? `<polygon points="${n.x + w0 / 2},${n.y} ${n.x + w0},${n.y + h0 / 2} ${n.x + w0 / 2},${n.y + h0} ${n.x},${n.y + h0 / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
            : `<rect x="${n.x}" y="${n.y}" width="${w0}" height="${h0}" rx="${n.s?.radius ?? (shape === "rect" ? 0 : 16)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
      String(n.p.text ?? "")
        .split("\n")
        .forEach((l, i, all) => (o += `<text x="${n.x + w0 / 2}" y="${n.y + h0 / 2 + (i - (all.length - 1) / 2) * 18 + 5}" text-anchor="middle" font-size="${n.s?.fontSize ?? 14}" font-weight="${n.s?.weight ?? 600}" fill="${esc(n.s?.color ?? P.ink)}">${esc(l)}</text>`));
      return;
    }
    if (n.type === "image") {
      const src = String(n.p.src ?? "");
      if (src) o += `<image href="${esc(src)}" x="${n.x}" y="${n.y}" width="${w0}" height="${h0}" preserveAspectRatio="${n.p.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}"/>`;
      return;
    }
    if (n.type === "checklist") {
      const items = (n.p.items as { text: string; done: boolean; indent?: number }[] | undefined) ?? [];
      const h = 40 + items.length * 20;
      o += `<rect x="${n.x}" y="${n.y}" width="${w0}" height="${h}" rx="14" fill="${P.panel}" stroke="${P.line}" stroke-width="1.5"/><text x="${n.x + 12}" y="${n.y + 24}" font-size="14" font-weight="700" fill="${P.ink}">${esc(String(n.p.title ?? "Checklist"))}</text>`;
      items.forEach((it, i) => (o += `<text x="${n.x + 12 + (it.indent ?? 0) * 16}" y="${n.y + 46 + i * 20}" font-size="13" fill="${it.done ? P.muted : P.ink}"${it.done ? ' text-decoration="line-through"' : ""}>${it.done ? "☑" : "☐"} ${esc(it.text)}</text>`));
      return;
    }
    if (n.type === "note" || n.type === "label") {
      const lines = String(n.p.text ?? "").split("\n");
      const fs = n.type === "label" ? Number(n.p.size) || 28 : 13;
      if (n.type === "note") o += `<rect x="${n.x}" y="${n.y}" width="${n.w ?? 210}" height="${Math.max(96, H0(n))}" rx="14" fill="#FDE68A" stroke="#FCD34D"/>`;
      lines.forEach((l, i) => (o += `<text x="${n.x + (n.type === "note" ? 12 : 8)}" y="${n.y + (n.type === "note" ? 24 : fs) + i * fs * 1.3}" font-size="${fs}" font-weight="${n.type === "label" ? 800 : 500}" fill="${n.type === "note" ? "#3D2E05" : P.ink}">${esc(l)}</text>`));
      return;
    }
    const w = nodeW(n.type),
      c = P.cat[T.color ?? T.cat];
    const stats = segText(nodeStats(n, R, opts.currency));
    o += `<rect x="${n.x}" y="${n.y}" width="${w}" height="${NH}" rx="14" fill="${P.panel}" stroke="${P.line}" stroke-width="1.5"/><rect x="${n.x + 12}" y="${n.y}" width="${w - 24}" height="3" rx="1.5" fill="${c}"/><rect x="${n.x + 12}" y="${n.y + 12}" width="30" height="30" rx="8" fill="${c}"/>
      <text x="${n.x + 52}" y="${n.y + 26}" font-size="14" font-weight="700" fill="${P.ink}">${esc(n.name.slice(0, 24))}</text><text x="${n.x + 52}" y="${n.y + 42}" font-size="11.5" fill="${P.muted}">${esc(subLabel(n, opts.currency).slice(0, 30))}</text>
      ${opts.nums ? `<text x="${n.x + 12}" y="${n.y + 78}" font-size="12" fill="${P.muted}">${esc(stats.slice(0, 38))}</text>` : ""}`;
  });
  return o + "</g></svg>";
}
