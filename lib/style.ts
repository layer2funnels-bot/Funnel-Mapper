// Visual styling for canvas elements and connections. Purely presentational: nothing here affects the maths.
import type { CSSProperties } from "react";

export const FONT_FAMILIES = {
  sans: { label: "Sans (DM Sans)", css: "var(--font-sans)" },
  display: { label: "Display (Bricolage)", css: "var(--font-display)" },
  serif: { label: "Serif", css: "Georgia, 'Times New Roman', serif" },
  mono: { label: "Mono", css: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" },
} as const;
export type FontFamily = keyof typeof FONT_FAMILIES;

export const FONT_WEIGHTS: [number, string][] = [
  [400, "Regular"],
  [500, "Medium"],
  [600, "Semibold"],
  [700, "Bold"],
];

export type ShadowKind = "none" | "soft" | "strong";
export type BorderStyle = "solid" | "dashed" | "dotted";
export type TextAlign = "left" | "center" | "right";

/** Per-element style (stored on the node as `s`). Every field is optional; unset = the element's default look. */
export interface NodeStyle {
  fill?: string;
  border?: string;
  borderW?: number;
  borderStyle?: BorderStyle;
  radius?: number;
  opacity?: number; // 0.1–1
  shadow?: ShadowKind;
  font?: FontFamily;
  fontSize?: number;
  weight?: number;
  lh?: number; // line height multiplier
  ls?: number; // letter spacing, px
  color?: string;
  align?: TextAlign;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  pad?: number;
  /** Block icon override (key of lib/icons ICONS). */
  icon?: string;
}

export type EdgePath = "curve" | "straight" | "elbow";
export type EdgeDash = "solid" | "dashed" | "dotted";
export type EdgeArrow = "none" | "end" | "both";
export type EdgeKind = "flow" | "skip" | "nodata";

/** Per-connection style (stored on the edge as `s`). Presentation only: share %, port and flow maths are unchanged. */
export interface EdgeStyle {
  path?: EdgePath;
  dash?: EdgeDash;
  color?: string;
  width?: number;
  arrow?: EdgeArrow;
  arrowSize?: "sm" | "md" | "lg";
  /** skip = an indirect / skipped step (drawn dashed); nodata = no tracking data (numbers hidden on the line). */
  kind?: EdgeKind;
  label?: string;
}

const SHADOWS: Record<ShadowKind, string> = {
  none: "none",
  soft: "0 1px 2px rgba(0,0,0,.25), 0 4px 12px rgba(0,0,0,.18)",
  strong: "0 2px 4px rgba(0,0,0,.3), 0 12px 28px rgba(0,0,0,.35)",
};

/** CSS for the element's box (fill, border, radius, opacity, shadow). */
export function boxCss(s: NodeStyle | undefined): CSSProperties {
  if (!s) return {};
  const c: CSSProperties = {};
  if (s.fill) c.background = s.fill;
  if (s.border || s.borderW != null || s.borderStyle) {
    if (s.border) c.borderColor = s.border;
    if (s.borderW != null) c.borderWidth = s.borderW;
    if (s.borderStyle) c.borderStyle = s.borderStyle;
  }
  if (s.radius != null) c.borderRadius = s.radius;
  if (s.opacity != null && s.opacity < 1) c.opacity = Math.max(0.1, s.opacity);
  if (s.shadow) c.boxShadow = SHADOWS[s.shadow];
  if (s.pad != null) c.padding = s.pad;
  return c;
}

/** CSS for the element's text. `defaultSize` is used when no font size is set. */
export function textCss(s: NodeStyle | undefined, size?: number): CSSProperties {
  const c: CSSProperties = {};
  const fs = s?.fontSize ?? size;
  if (fs) c.fontSize = fs;
  if (!s) return c;
  if (s.font) c.fontFamily = FONT_FAMILIES[s.font]?.css;
  if (s.weight) c.fontWeight = s.weight;
  if (s.lh) c.lineHeight = s.lh;
  if (s.ls != null) c.letterSpacing = `${s.ls}px`;
  if (s.color) c.color = s.color;
  if (s.align) c.textAlign = s.align;
  if (s.italic) c.fontStyle = "italic";
  const deco = [s.underline && "underline", s.strike && "line-through"].filter(Boolean).join(" ");
  if (deco) c.textDecoration = deco;
  return c;
}

export const DASH: Record<EdgeDash, string | undefined> = { solid: undefined, dashed: "8 6", dotted: "2 5" };
export const ARROW_SIZE = { sm: 6, md: 9, lg: 13 } as const;

/** Effective edge look: explicit style wins; "skip" defaults to dashed and "nodata" to dotted. */
export function edgeLook(s: EdgeStyle | undefined) {
  const kind = s?.kind ?? "flow";
  const dash = s?.dash ?? (kind === "skip" ? "dashed" : kind === "nodata" ? "dotted" : undefined);
  return { kind, path: s?.path ?? "curve", dash, color: s?.color, width: s?.width, arrow: s?.arrow ?? "none", arrowSize: ARROW_SIZE[s?.arrowSize ?? "md"], label: s?.label?.trim() || "" };
}

/** Drop keys whose value is undefined/empty so stored styles stay small (and "reset" really resets). */
export function cleanStyle<T extends object>(s: T): T | undefined {
  const out = Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== "" && v !== null)) as T;
  return Object.keys(out).length ? out : undefined;
}
