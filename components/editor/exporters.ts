"use client";
// Browser-side exports: file download, PNG (rasterised map SVG) and the one-page PDF client report.
import { money, nf, pct, ratio } from "@/lib/format";
import { stepRows, type FunnelResult } from "@/lib/funnel-math";
import type { FunnelEdge, FunnelNode } from "@/lib/graph";
import { mapSvg } from "@/lib/export";

export function download(name: string, data: Blob | string, type = "application/octet-stream") {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Image failed to load"));
    img.src = src;
  });
}

/** Rasterise an SVG string to a PNG data URL (scale × for crisp output, capped to keep canvases sane). */
export async function svgToPng(svg: string, scale = 2): Promise<{ url: string; width: number; height: number }> {
  const m = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
  const w = m ? Number(m[1]) : 1200,
    h = m ? Number(m[2]) : 800;
  const k = Math.min(scale, 8000 / Math.max(w, h));
  const img = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  const c = document.createElement("canvas");
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { url: c.toDataURL("image/png"), width: c.width, height: c.height };
}

async function dataUrlToBlob(url: string) {
  return (await fetch(url)).blob();
}

export async function downloadPng(name: string, svg: string) {
  const { url } = await svgToPng(svg, 2);
  download(name, await dataUrlToBlob(url));
}

/** Any image URL (incl. SVG logos) → PNG data URL + aspect ratio, or null if it can't be loaded (CORS etc.). */
async function logoPng(url: string | null | undefined) {
  if (!url) return null;
  try {
    const img = await loadImage(url);
    const c = document.createElement("canvas");
    const k = Math.min(1, 400 / Math.max(img.naturalWidth || 400, img.naturalHeight || 400));
    c.width = Math.max(1, Math.round((img.naturalWidth || 400) * k));
    c.height = Math.max(1, Math.round((img.naturalHeight || 400) * k));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return { url: c.toDataURL("image/png"), ratio: c.width / c.height };
  } catch {
    return null;
  }
}

export interface PdfInfo {
  funnelName: string;
  description?: string;
  clientName: string;
  clientLogo?: string | null;
  agencyName: string;
  agencyLogo?: string | null;
  currency: string;
  basis: "first" | "ltv";
  hideNumbers?: boolean;
}

/** One-page A4 landscape client report: branding, the map, key numbers and the step table. */
export async function pdfReport(g: { nodes: FunnelNode[]; edges: FunnelEdge[] }, R: FunnelResult, info: PdfInfo, heightOf?: (n: FunnelNode) => number) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297,
    H = 210,
    M = 12;
  const brand: [number, number, number] = [91, 47, 201];
  const ink: [number, number, number] = [30, 22, 49];
  const muted: [number, number, number] = [94, 85, 119];
  const nums = !info.hideNumbers;
  const m = (v: number) => money(v, info.currency).replace("₹", "Rs ");

  // header band
  doc.setFillColor(36, 19, 63);
  doc.rect(0, 0, W, 24, "F");
  let hx = M;
  const agencyLogo = await logoPng(info.agencyLogo);
  if (agencyLogo) {
    const lh = 12,
      lw = Math.min(40, lh * agencyLogo.ratio);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(hx - 1, 5, lw + 2, lh + 2, 2, 2, "F");
    doc.addImage(agencyLogo.url, "PNG", hx, 6, lw, lh);
    hx += lw + 5;
  }
  doc.setTextColor(237, 231, 251);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(info.agencyName || "Funnel plan", hx, 12.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(184, 169, 221);
  doc.text(`Prepared for ${info.clientName} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, hx, 18);
  const clientLogo = await logoPng(info.clientLogo);
  if (clientLogo) {
    const lh = 14,
      lw = Math.min(46, lh * clientLogo.ratio);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W - M - lw - 1, 4, lw + 2, lh + 2, 2, 2, "F");
    doc.addImage(clientLogo.url, "PNG", W - M - lw, 5, lw, lh);
  }

  // title
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(info.funnelName, M, 35);
  if (info.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(doc.splitTextToSize(info.description, 180).slice(0, 2), M, 41);
  }

  // map
  const mapX = M,
    mapY = 47,
    mapW = nums ? 190 : W - 2 * M,
    mapH = 100;
  doc.setDrawColor(228, 222, 241);
  doc.setFillColor(247, 245, 252);
  doc.roundedRect(mapX, mapY, mapW, mapH, 3, 3, "FD");
  if (g.nodes.length) {
    const png = await svgToPng(mapSvg(g, R, { currency: info.currency, nums, heightOf }), 2);
    const k = Math.min((mapW - 4) / png.width, (mapH - 4) / png.height);
    const iw = png.width * k,
      ih = png.height * k;
    doc.addImage(png.url, "PNG", mapX + (mapW - iw) / 2, mapY + (mapH - ih) / 2, iw, ih);
  }

  if (nums) {
    // KPI grid
    const kx = mapX + mapW + 6,
      kw = W - M - kx;
    const kpis: [string, string][] = [
      [info.basis === "ltv" ? "Revenue (lifetime)" : "Revenue", m(R.rev)],
      ["Profit", m(R.profit)],
      ["Ad spend", m(R.spend)],
      ["ROAS", ratio(R.roas)],
      ["Traffic", nf(R.traffic)],
      ["Leads", nf(R.leads, 1)],
      ["Customers", nf(R.cust, 1)],
      ["CPA", m(R.cpa)],
      ["AOV", m(R.aov)],
      ["ROI", pct(R.roi)],
      ["Conversion", pct(R.conv)],
      ["MRR", m(R.mrr)],
    ];
    const cw = (kw - 3) / 2,
      ch = 15.6;
    kpis.forEach(([l, v], i) => {
      const x = kx + (i % 2) * (cw + 3),
        y = mapY + Math.floor(i / 2) * (ch + 1.3);
      doc.setFillColor(239, 233, 252);
      doc.roundedRect(x, y, cw, ch, 2, 2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(l, x + 3, y + 5.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      if (l === "Profit") doc.setTextColor(...((R.profit >= 0 ? [21, 128, 61] : [185, 28, 28]) as [number, number, number]));
      else doc.setTextColor(...ink);
      doc.text(v, x + 3, y + 12.2);
    });

    // step table
    const rows = stepRows(g, R);
    const ty = mapY + mapH + 8;
    const cols: [string, number, "left" | "right"][] = [
      ["Step", 70, "left"],
      ["Type", 50, "left"],
      ["In", 30, "right"],
      ["Out", 30, "right"],
      ["Conversion", 30, "right"],
      ["Revenue", 32, "right"],
      ["Cost", 31, "right"],
    ];
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...muted);
    let x = M;
    cols.forEach(([h, w, a]) => {
      doc.text(h, a === "right" ? x + w - 2 : x, ty, { align: a });
      x += w;
    });
    doc.setDrawColor(228, 222, 241);
    doc.line(M, ty + 1.5, W - M, ty + 1.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...ink);
    const maxRows = Math.floor((H - M - ty - 4) / 4.6);
    rows.slice(0, maxRows).forEach((r, i) => {
      const y = ty + 6 + i * 4.6;
      const vals = [r.name.slice(0, 40), r.label, nf(r.inn), nf(r.out, 1), r.cat === "traffic" ? "–" : pct(r.convPct), r.cat === "offer" ? m(r.rev) : "", r.cost ? m(r.cost) : ""];
      let cx = M;
      cols.forEach(([, w, a], j) => {
        doc.text(String(vals[j]), a === "right" ? cx + w - 2 : cx, y, { align: a });
        cx += w;
      });
    });
    if (rows.length > maxRows) {
      doc.setTextColor(...muted);
      doc.text(`+ ${rows.length - maxRows} more steps`, M, ty + 6 + maxRows * 4.6);
    }
  }

  // footer
  doc.setFontSize(7.5);
  doc.setTextColor(...muted);
  doc.text("Planned figures are estimates based on the assumptions in this funnel map.", M, H - 5);
  doc.setTextColor(...brand);
  doc.text(info.agencyName || "", W - M, H - 5, { align: "right" });
  return doc.output("blob");
}
