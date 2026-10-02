// Block catalog: every block type the editor knows, its category, icon and default parameters.
// Ported 1:1 from the prototype (reference/funnel-mapper.html, "catalog" section).
import type { IconName } from "./icons";

export type Category = "traffic" | "page" | "offer" | "action" | "logic" | "annot";
export type ColorKey = Category | "goal";

export const CATS: Record<Category, string> = {
  traffic: "Traffic sources",
  page: "Pages",
  offer: "Offers & checkout",
  action: "Actions & follow-up",
  logic: "Logic & goals",
  annot: "Notes & layout",
};

/** CSS variable per category colour (defined in app/globals.css). */
export const CATCOLOR: Record<ColorKey, string> = {
  traffic: "var(--c-traffic)",
  page: "var(--c-page)",
  offer: "var(--c-offer)",
  action: "var(--c-action)",
  logic: "var(--c-logic)",
  goal: "var(--c-goal)",
  annot: "var(--c-note)",
};

/** Locked category hex values for dark surfaces (minimap). */
export const CATDARK: Record<ColorKey, string> = {
  traffic: "#60A5FA",
  page: "#A78BFA",
  offer: "#FB923C",
  action: "#2DD4BF",
  logic: "#FBBF24",
  goal: "#84CC16",
  annot: "#FDE68A",
};

/** Light-mode hex values, used where CSS variables are unavailable (PDF, PNG export on white). */
export const CATHEX: Record<ColorKey, string> = {
  traffic: "#2563EB",
  page: "#6D3FD9",
  offer: "#C2410C",
  action: "#0F766E",
  logic: "#B45309",
  goal: "#15803D",
  annot: "#A16207",
};

export type TrafficModel = "budget" | "cpc" | "cpm";
export type Interval = "weekly" | "monthly" | "quarterly" | "yearly";

/** Union of every parameter any block may carry. All optional; defaults come from TYPES[type].d. */
export interface NodeParams {
  // traffic
  model?: TrafficModel;
  visitors?: number;
  spend?: number;
  clicks?: number;
  cpc?: number;
  impr?: number;
  cpm?: number;
  ctr?: number;
  // pages / actions / offers
  cr?: number;
  lead?: boolean;
  // offers
  price?: number;
  newc?: boolean;
  disc?: number;
  refund?: number;
  fulfil?: number;
  aff?: number;
  interval?: Interval;
  trialDays?: number;
  trialPrice?: number;
  setup?: number;
  life?: number;
  pays?: number;
  // actions
  costPer?: number;
  count?: number;
  days?: number;
  // logic
  pct?: number;
  // annotations
  text?: string;
  size?: number;
  color?: string;
  [k: string]: unknown;
}

export interface BlockType {
  cat: Category;
  label: string;
  icon: IconName;
  /** Overrides the category colour (goal / exit). */
  color?: ColorKey;
  /** Label for the conversion-rate field on action blocks. */
  crl?: string;
  /** Default parameters. */
  d: NodeParams;
}

const PAID: NodeParams = { model: "budget", visitors: 1000, spend: 500, clicks: 1000, cpc: 0.5, impr: 50000, cpm: 8, ctr: 1.5 };
const FREE: NodeParams = { model: "budget", visitors: 500, spend: 0, clicks: 500, cpc: 0, impr: 20000, cpm: 0, ctr: 2.5 };
const OFF: NodeParams = { cr: 10, price: 37, newc: false, disc: 0, refund: 0, fulfil: 0, aff: 0 };

export const TYPES = {
  fbads: { cat: "traffic", label: "Facebook ads", icon: "megaphone", d: PAID },
  igads: { cat: "traffic", label: "Instagram ads", icon: "insta", d: PAID },
  gads: { cat: "traffic", label: "Google ads", icon: "search", d: { ...PAID, model: "cpc", cpc: 1.2, clicks: 800 } },
  ytads: { cat: "traffic", label: "YouTube ads", icon: "play", d: { ...PAID, model: "cpm", cpm: 10, ctr: 0.8 } },
  ttads: { cat: "traffic", label: "TikTok ads", icon: "music", d: { ...PAID, model: "cpm", cpm: 6, ctr: 1 } },
  liads: { cat: "traffic", label: "LinkedIn ads", icon: "brief", d: { ...PAID, model: "cpc", cpc: 4, clicks: 300 } },
  pinads: { cat: "traffic", label: "Pinterest ads", icon: "pin", d: PAID },
  xads: { cat: "traffic", label: "X (Twitter) ads", icon: "hash", d: PAID },
  retarget: { cat: "traffic", label: "Retargeting ads", icon: "target", d: { ...PAID, visitors: 300, spend: 150 } },
  igorg: { cat: "traffic", label: "Instagram posts", icon: "insta", d: FREE },
  fborg: { cat: "traffic", label: "Facebook posts", icon: "users", d: FREE },
  ytorg: { cat: "traffic", label: "YouTube videos", icon: "play", d: FREE },
  ttorg: { cat: "traffic", label: "TikTok videos", icon: "music", d: FREE },
  seo: { cat: "traffic", label: "SEO / blog", icon: "globe", d: FREE },
  podcast: { cat: "traffic", label: "Podcast", icon: "mic", d: { ...FREE, visitors: 200 } },
  email: { cat: "traffic", label: "Email list", icon: "mail", d: { ...FREE, visitors: 400 } },
  smsb: { cat: "traffic", label: "SMS blast", icon: "sms", d: { ...FREE, visitors: 200, spend: 20 } },
  wab: { cat: "traffic", label: "WhatsApp broadcast", icon: "chat", d: { ...FREE, visitors: 150 } },
  affiliate: { cat: "traffic", label: "Affiliates / JV", icon: "handshake", d: { ...FREE, visitors: 300 } },
  referral: { cat: "traffic", label: "Referrals", icon: "link", d: { ...FREE, visitors: 100 } },
  poster: { cat: "traffic", label: "Poster / QR", icon: "qr", d: { ...FREE, visitors: 200, spend: 50 } },
  event: { cat: "traffic", label: "Event / offline", icon: "cal", d: { ...FREE, visitors: 80, spend: 100 } },
  direct: { cat: "traffic", label: "Direct / word of mouth", icon: "users", d: { ...FREE, visitors: 100 } },
  customsrc: { cat: "traffic", label: "Custom source", icon: "zap", d: FREE },

  landing: { cat: "page", label: "Landing page", icon: "layout", d: { cr: 30, lead: false } },
  optin: { cat: "page", label: "Opt-in page", icon: "form", d: { cr: 35, lead: true } },
  quizp: { cat: "page", label: "Quiz", icon: "quiz", d: { cr: 45, lead: true } },
  survey: { cat: "page", label: "Survey", icon: "quiz", d: { cr: 50, lead: true } },
  apply: { cat: "page", label: "Application form", icon: "form", d: { cr: 25, lead: true } },
  vsl: { cat: "page", label: "Video sales letter", icon: "video", d: { cr: 20, lead: false } },
  sales: { cat: "page", label: "Sales page", icon: "page", d: { cr: 20, lead: false } },
  webinar: { cat: "page", label: "Live webinar", icon: "video", d: { cr: 40, lead: false } },
  replay: { cat: "page", label: "Webinar replay", icon: "rewind", d: { cr: 25, lead: false } },
  challenge: { cat: "page", label: "Challenge", icon: "flag", d: { cr: 50, lead: true } },
  booking: { cat: "page", label: "Booking calendar", icon: "cal", d: { cr: 30, lead: true } },
  confirm: { cat: "page", label: "Booking confirmation", icon: "check", d: { cr: 100, lead: false } },
  thanks: { cat: "page", label: "Thank-you page", icon: "check", d: { cr: 100, lead: false } },
  delivery: { cat: "page", label: "Lead magnet download", icon: "download", d: { cr: 100, lead: false } },
  blog: { cat: "page", label: "Blog article", icon: "book", d: { cr: 10, lead: false } },
  popup: { cat: "page", label: "Pop-up", icon: "window", d: { cr: 5, lead: true } },
  community: { cat: "page", label: "Community / group", icon: "users", d: { cr: 60, lead: false } },
  members: { cat: "page", label: "Members area", icon: "star", d: { cr: 100, lead: false } },
  custompage: { cat: "page", label: "Custom page", icon: "page", d: { cr: 50, lead: false } },

  checkout: { cat: "offer", label: "Checkout (front-end)", icon: "cart", d: { ...OFF, cr: 10, price: 37, newc: true } },
  product: { cat: "offer", label: "One-time product", icon: "box", d: { ...OFF, cr: 10, price: 47, newc: true } },
  bump: { cat: "offer", label: "Order bump", icon: "plus", d: { ...OFF, cr: 25, price: 9 } },
  upsell: { cat: "offer", label: "Upsell (OTO)", icon: "up", d: { ...OFF, cr: 20, price: 97 } },
  downsell: { cat: "offer", label: "Downsell", icon: "down", d: { ...OFF, cr: 15, price: 27 } },
  sub: { cat: "offer", label: "Subscription", icon: "repeat", d: { ...OFF, cr: 30, price: 69.99, interval: "monthly", trialDays: 0, trialPrice: 0, setup: 0, life: 6 } },
  trial: { cat: "offer", label: "Free / paid trial", icon: "gift", d: { ...OFF, cr: 30, price: 0, newc: false } },
  plan: { cat: "offer", label: "Payment plan", icon: "card", d: { ...OFF, cr: 10, price: 333, pays: 3, interval: "monthly", newc: true } },
  hightick: { cat: "offer", label: "High-ticket program", icon: "crown", d: { ...OFF, cr: 20, price: 3000, newc: true } },

  seq: { cat: "action", label: "Email sequence", icon: "mail", crl: "Click-through rate", d: { cr: 20, costPer: 0, count: 5 } },
  sms: { cat: "action", label: "SMS follow-up", icon: "sms", crl: "Click-through rate", d: { cr: 25, costPer: 0.04 } },
  follow: { cat: "action", label: "WhatsApp follow-up", icon: "chat", crl: "Reply rate", d: { cr: 40, costPer: 0 } },
  dm: { cat: "action", label: "DM automation", icon: "bot", crl: "Reply / click rate", d: { cr: 60, costPer: 0 } },
  call: { cat: "action", label: "Sales call", icon: "phone", crl: "Show-up rate", d: { cr: 70, costPer: 0 } },
  retaud: { cat: "action", label: "Retargeting audience", icon: "eye", crl: "Re-engage rate", d: { cr: 10, costPer: 0.3 } },
  wait: { cat: "action", label: "Wait / delay", icon: "clock", crl: "Still active after wait", d: { cr: 100, costPer: 0, days: 3 } },
  tagact: { cat: "action", label: "Add tag / CRM", icon: "tag", crl: "Pass-through", d: { cr: 100, costPer: 0 } },
  webhook: { cat: "action", label: "Zapier / webhook", icon: "zap", crl: "Pass-through", d: { cr: 100, costPer: 0 } },
  task: { cat: "action", label: "Manual task", icon: "task", crl: "Completed", d: { cr: 100, costPer: 0 } },

  cond: { cat: "logic", label: "Condition (Yes / No)", icon: "diamond", d: { pct: 50 } },
  split: { cat: "logic", label: "A/B split test", icon: "split", d: { pct: 50 } },
  goal: { cat: "logic", label: "Goal / conversion", icon: "goal", color: "goal", d: { cr: 100 } },
  exit: { cat: "logic", label: "Exit / drop-off", icon: "exit", color: "goal", d: { cr: 100 } },

  note: { cat: "annot", label: "Sticky note", icon: "note", d: { text: "Write a note…" } },
  label: { cat: "annot", label: "Heading text", icon: "text", d: { text: "Stage name", size: 28 } },
  frame: { cat: "annot", label: "Stage frame", icon: "frame", d: { color: "#10B981" } },
  shape: { cat: "annot", label: "Shape", icon: "shape", d: { shape: "rounded", text: "" } },
  image: { cat: "annot", label: "Image / logo", icon: "image", d: { src: "", alt: "", fit: "contain" } },
  checklist: { cat: "annot", label: "Checklist", icon: "task", d: { title: "Checklist", items: [] } },
} satisfies Record<string, BlockType>;

export type BlockTypeKey = keyof typeof TYPES;
export const BLOCK_TYPES = TYPES as Record<BlockTypeKey, BlockType>;

export const isBlockType = (t: string): t is BlockTypeKey => Object.prototype.hasOwnProperty.call(TYPES, t);
export const typeOf = (t: string): BlockType => BLOCK_TYPES[t as BlockTypeKey];
export const isAnnot = (t: string) => typeOf(t)?.cat === "annot";

export const PER_MONTH: Record<Interval, number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
export const INT_LABEL: Record<Interval, string> = { weekly: "week", monthly: "month", quarterly: "quarter", yearly: "year" };

/** Annotation types drawn at a stored size (w × h) and resizable in both directions. */
export const SIZED_TYPES = new Set(["frame", "shape", "image"]);
/** Annotation types with a stored width only (height follows the content). */
export const WIDTH_TYPES = new Set(["label", "note", "checklist"]);
export const DEFAULT_SIZE: Record<string, { w: number; h?: number }> = {
  frame: { w: 520, h: 300 },
  shape: { w: 200, h: 120 },
  image: { w: 320, h: 200 },
  checklist: { w: 260 },
};
export const SHAPES: [string, string][] = [
  ["rect", "Rectangle"],
  ["rounded", "Rounded"],
  ["ellipse", "Ellipse"],
  ["diamond", "Diamond"],
];

/** Default node height (px). Notes and headings can be taller; the editor uses measured heights when available. */
export const NH = 96;
export const nodeW = (type: string) => (typeOf(type)?.cat === "logic" ? 170 : 210);

/** Port rules: which handles a block shows. */
export function portsFor(type: string) {
  const T = typeOf(type);
  const hasIn = T.cat !== "traffic" && T.cat !== "annot";
  const hasOut = T.cat !== "annot" && type !== "exit";
  const hasAlt = ["page", "offer", "action"].includes(T.cat) || type === "cond" || type === "split";
  const labels: [string, string] | null = type === "cond" ? ["Yes", "No"] : type === "split" ? ["A", "B"] : null;
  return { hasIn, hasOut, hasAlt, labels };
}

/** Whether a block may be the target of a connection. */
export const canReceive = (type: string) => !["traffic", "annot"].includes(typeOf(type)?.cat);

export const FRAME_COLORS: [string, string][] = [
  ["#10B981", "Emerald"],
  ["#6D3FD9", "Purple"],
  ["#2563EB", "Blue"],
  ["#0F766E", "Teal"],
  ["#C2410C", "Orange"],
  ["#15803D", "Green"],
  ["#64748B", "Grey"],
];

/** Fresh deep copy of a type's default params. */
export const defaultsFor = (type: string): NodeParams => structuredClone(typeOf(type).d);
