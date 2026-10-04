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

/** Block-library groups (presentation only; the maths uses `cat`). */
export type LibGroup = "traffic" | "page" | "offer" | "action" | "comms" | "sales" | "logic" | "annot";
export const LIB_GROUPS: Record<LibGroup, string> = {
  traffic: "Traffic sources",
  page: "Pages",
  offer: "Offers & checkout",
  action: "Actions & events",
  comms: "Communication",
  sales: "Sales & CRM",
  logic: "Logic & goals",
  annot: "Notes & layout",
};

/**
 * Behaviour a block type borrows from a built-in one, so new types reuse the existing maths instead of adding
 * formulas: "sub" (recurring billing), "plan" (instalments), "cond" (Yes/No share), "split" (A/B share),
 * "goal" (counts completions), "exit" (end of the journey: no way out).
 */
export type BaseKind = "sub" | "plan" | "cond" | "split" | "goal" | "exit";

export interface BlockType {
  cat: Category;
  label: string;
  icon: IconName;
  /** Library group when it differs from the maths category. */
  lib?: LibGroup;
  /** Behaviour borrowed from a built-in type (see BaseKind). */
  base?: BaseKind;
  /** Port labels for share-based logic (Yes/No, A/B…). */
  ports?: [string, string];
  /** Extra search words for the library. */
  kw?: string;
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
  bingads: { cat: "traffic", label: "Bing / Microsoft ads", icon: "search", d: { ...PAID, model: "cpc", cpc: 0.9, clicks: 600 } },
  redditads: { cat: "traffic", label: "Reddit ads", icon: "chat", d: { ...PAID, model: "cpm", cpm: 5, ctr: 0.6 } },
  display: { cat: "traffic", label: "Display ads", icon: "window", d: { ...PAID, model: "cpm", cpm: 3, ctr: 0.3 } },
  native: { cat: "traffic", label: "Native ads", icon: "page", d: { ...PAID, model: "cpc", cpc: 0.4, clicks: 1200 } },
  liorg: { cat: "traffic", label: "LinkedIn posts", icon: "brief", d: FREE },
  partner: { cat: "traffic", label: "Partner", icon: "handshake", d: { ...FREE, visitors: 200 } },
  push: { cat: "traffic", label: "Push notifications", icon: "bell", d: { ...FREE, visitors: 150 } },
  commsrc: { cat: "traffic", label: "Community", icon: "users", d: { ...FREE, visitors: 120 } },
  existing: { cat: "traffic", label: "Existing customers", icon: "star", kw: "customer list repeat", d: { ...FREE, visitors: 250 } },
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
  squeeze: { cat: "page", label: "Squeeze page", icon: "form", kw: "opt-in lead magnet", d: { cr: 40, lead: true } },
  leadmag: { cat: "page", label: "Lead magnet page", icon: "gift", d: { cr: 35, lead: true } },
  content: { cat: "page", label: "Content page", icon: "book", d: { cr: 15, lead: false } },
  webreg: { cat: "page", label: "Webinar registration", icon: "form", d: { cr: 35, lead: true } },
  productp: { cat: "page", label: "Product page", icon: "box", d: { cr: 25, lead: false } },
  orderp: { cat: "page", label: "Order form", icon: "card", d: { cr: 60, lead: false } },
  cartp: { cat: "page", label: "Cart", icon: "cart", d: { cr: 50, lead: false } },
  qualify: { cat: "page", label: "Qualification form", icon: "quiz", d: { cr: 50, lead: true } },
  callconf: { cat: "page", label: "Call confirmation", icon: "phone", d: { cr: 100, lead: false } },
  proposalp: { cat: "page", label: "Proposal page", icon: "page", d: { cr: 40, lead: false } },
  contract: { cat: "page", label: "Contract / e-sign", icon: "edit", d: { cr: 80, lead: false } },
  login: { cat: "page", label: "Login page", icon: "lock", d: { cr: 90, lead: false } },
  course: { cat: "page", label: "Course", icon: "book", d: { cr: 70, lead: false } },
  lesson: { cat: "page", label: "Lesson", icon: "play", d: { cr: 80, lead: false } },
  upsellp: { cat: "page", label: "Upsell page", icon: "up", kw: "oto one-time offer", d: { cr: 100, lead: false } },
  downsellp: { cat: "page", label: "Downsell page", icon: "down", d: { cr: 100, lead: false } },
  modal: { cat: "page", label: "Modal", icon: "window", d: { cr: 8, lead: true } },
  external: { cat: "page", label: "External website", icon: "globe", d: { cr: 20, lead: false } },
  custompage: { cat: "page", label: "Custom page", icon: "page", d: { cr: 50, lead: false } },

  checkout: { cat: "offer", label: "Checkout (front-end)", icon: "cart", d: { ...OFF, cr: 10, price: 37, newc: true } },
  product: { cat: "offer", label: "One-time product", icon: "box", d: { ...OFF, cr: 10, price: 47, newc: true } },
  bump: { cat: "offer", label: "Order bump", icon: "plus", d: { ...OFF, cr: 25, price: 9 } },
  upsell: { cat: "offer", label: "Upsell (OTO)", icon: "up", d: { ...OFF, cr: 20, price: 97 } },
  downsell: { cat: "offer", label: "Downsell", icon: "down", d: { ...OFF, cr: 15, price: 27 } },
  sub: { cat: "offer", label: "Subscription", icon: "repeat", base: "sub", d: { ...OFF, cr: 30, price: 69.99, interval: "monthly", trialDays: 0, trialPrice: 0, setup: 0, life: 6 } },
  trial: { cat: "offer", label: "Free / paid trial", icon: "gift", d: { ...OFF, cr: 30, price: 0, newc: false } },
  plan: { cat: "offer", label: "Payment plan", icon: "card", base: "plan", d: { ...OFF, cr: 10, price: 333, pays: 3, interval: "monthly", newc: true } },
  hightick: { cat: "offer", label: "High-ticket program", icon: "crown", d: { ...OFF, cr: 20, price: 3000, newc: true } },
  service: { cat: "offer", label: "Service", icon: "brief", d: { ...OFF, cr: 20, price: 500, newc: true } },
  digital: { cat: "offer", label: "Digital product", icon: "download", d: { ...OFF, cr: 10, price: 27, newc: true } },
  coursep: { cat: "offer", label: "Online course", icon: "book", d: { ...OFF, cr: 8, price: 197, newc: true } },
  coaching: { cat: "offer", label: "Coaching", icon: "users", d: { ...OFF, cr: 15, price: 1500, newc: true } },
  membership: { cat: "offer", label: "Membership", icon: "star", base: "sub", d: { ...OFF, cr: 20, price: 39, newc: true, interval: "monthly", trialDays: 0, trialPrice: 0, setup: 0, life: 6 } },
  oto: { cat: "offer", label: "One-time offer (OTO)", icon: "zap", d: { ...OFF, cr: 15, price: 67 } },
  bundle: { cat: "offer", label: "Bundle", icon: "box", d: { ...OFF, cr: 12, price: 147, newc: true } },
  coupon: { cat: "offer", label: "Discount / coupon", icon: "tag", d: { ...OFF, cr: 18, price: 97, disc: 20, newc: true } },
  freeoffer: { cat: "offer", label: "Free offer", icon: "gift", kw: "free plus shipping", d: { ...OFF, cr: 30, price: 0 } },

  seq: { cat: "action", lib: "comms", label: "Email sequence", icon: "mail", crl: "Click-through rate", d: { cr: 20, costPer: 0, count: 5 } },
  sms: { cat: "action", lib: "comms", label: "SMS follow-up", icon: "sms", crl: "Click-through rate", d: { cr: 25, costPer: 0.04 } },
  follow: { cat: "action", lib: "comms", label: "WhatsApp follow-up", icon: "chat", crl: "Reply rate", d: { cr: 40, costPer: 0 } },
  dm: { cat: "action", lib: "comms", label: "DM automation", icon: "bot", crl: "Reply / click rate", d: { cr: 60, costPer: 0 } },
  call: { cat: "action", lib: "sales", label: "Sales call", icon: "phone", crl: "Show-up rate", d: { cr: 70, costPer: 0 } },
  retaud: { cat: "action", lib: "comms", label: "Retargeting audience", icon: "eye", crl: "Re-engage rate", d: { cr: 10, costPer: 0.3 } },
  wait: { cat: "action", label: "Wait / delay", icon: "clock", crl: "Still active after wait", d: { cr: 100, costPer: 0, days: 3 } },
  tagact: { cat: "action", lib: "sales", label: "Add tag / CRM", icon: "tag", crl: "Pass-through", d: { cr: 100, costPer: 0 } },
  webhook: { cat: "action", label: "Zapier / webhook", icon: "zap", crl: "Pass-through", d: { cr: 100, costPer: 0 } },
  task: { cat: "action", label: "Manual task", icon: "task", crl: "Completed", d: { cr: 100, costPer: 0 } },
  leadact: { cat: "action", label: "Lead captured", icon: "users", crl: "Pass-through", d: { cr: 100, costPer: 0 } },
  formsub: { cat: "action", label: "Form submitted", icon: "form", crl: "Submit rate", d: { cr: 60, costPer: 0 } },
  optinact: { cat: "action", label: "Opt-in", icon: "check", crl: "Opt-in rate", d: { cr: 40, costPer: 0 } },
  addcart: { cat: "action", label: "Add to cart", icon: "cart", crl: "Add-to-cart rate", d: { cr: 20, costPer: 0 } },
  checkoutst: { cat: "action", label: "Checkout started", icon: "card", crl: "Started checkout", d: { cr: 50, costPer: 0 } },
  purchaseact: { cat: "action", label: "Purchase event", icon: "cart", crl: "Purchase rate", kw: "payment order", d: { cr: 100, costPer: 0 } },
  trialstart: { cat: "action", label: "Trial started", icon: "gift", crl: "Trial start rate", d: { cr: 30, costPer: 0 } },
  upgrade: { cat: "action", label: "Upgrade", icon: "up", crl: "Upgrade rate", d: { cr: 15, costPer: 0 } },
  renewal: { cat: "action", label: "Renewal", icon: "repeat", crl: "Renewal rate", d: { cr: 80, costPer: 0 } },
  clickact: { cat: "action", label: "Link click", icon: "link", crl: "Click rate", d: { cr: 10, costPer: 0 } },
  watch: { cat: "action", label: "Watch video", icon: "video", crl: "Watch rate", d: { cr: 50, costPer: 0 } },
  vidcomplete: { cat: "action", label: "Video completed", icon: "play", crl: "Completion rate", d: { cr: 30, costPer: 0 } },
  scroll: { cat: "action", label: "Scroll depth", icon: "down", crl: "Reached depth", d: { cr: 40, costPer: 0 } },
  downloadact: { cat: "action", label: "Download", icon: "download", crl: "Download rate", d: { cr: 60, costPer: 0 } },
  openact: { cat: "action", label: "Email opened", icon: "mail", crl: "Open rate", d: { cr: 35, costPer: 0 } },
  replyact: { cat: "action", label: "Reply", icon: "chat", crl: "Reply rate", d: { cr: 8, costPer: 0 } },
  shareact: { cat: "action", label: "Share", icon: "share", crl: "Share rate", d: { cr: 5, costPer: 0 } },
  loginact: { cat: "action", label: "Logged in", icon: "lock", crl: "Login rate", d: { cr: 80, costPer: 0 } },
  coursestart: { cat: "action", label: "Course started", icon: "book", crl: "Start rate", d: { cr: 70, costPer: 0 } },
  coursedone: { cat: "action", label: "Course completed", icon: "check", crl: "Completion rate", d: { cr: 35, costPer: 0 } },
  review: { cat: "action", label: "Review left", icon: "star", crl: "Review rate", d: { cr: 10, costPer: 0 } },
  referact: { cat: "action", label: "Referral made", icon: "handshake", crl: "Referral rate", d: { cr: 5, costPer: 0 } },
  repeat: { cat: "action", label: "Repeat purchase", icon: "repeat", crl: "Repeat rate", d: { cr: 20, costPer: 0 } },
  cancel: { cat: "action", label: "Cancellation", icon: "exit", crl: "Cancellation rate", d: { cr: 10, costPer: 0 } },
  refundact: { cat: "action", label: "Refund", icon: "down", crl: "Refund rate", d: { cr: 5, costPer: 0 } },

  emailone: { cat: "action", lib: "comms", label: "Email", icon: "mail", crl: "Click-through rate", d: { cr: 15, costPer: 0 } },
  phone: { cat: "action", lib: "comms", label: "Phone call", icon: "phone", crl: "Answer rate", d: { cr: 40, costPer: 1 } },
  followup: { cat: "action", lib: "comms", label: "Follow-up", icon: "repeat", crl: "Response rate", d: { cr: 20, costPer: 0 } },
  nurture: { cat: "action", lib: "comms", label: "Nurture sequence", icon: "mail", crl: "Re-engage rate", d: { cr: 10, costPer: 0, count: 7 } },
  reminder: { cat: "action", lib: "comms", label: "Reminder", icon: "clock", crl: "Show-up after reminder", d: { cr: 80, costPer: 0 } },
  notify: { cat: "action", lib: "comms", label: "Notification", icon: "bell", crl: "Click rate", d: { cr: 8, costPer: 0 } },

  mql: { cat: "action", lib: "sales", label: "MQL", icon: "users", crl: "Marketing qualified", kw: "marketing qualified lead", d: { cr: 40, costPer: 0 } },
  sqlq: { cat: "action", lib: "sales", label: "SQL", icon: "target", crl: "Sales qualified", kw: "sales qualified lead", d: { cr: 50, costPer: 0 } },
  qualified: { cat: "action", lib: "sales", label: "Qualified lead", icon: "check", crl: "Qualified", d: { cr: 50, costPer: 0 } },
  application: { cat: "action", lib: "sales", label: "Application review", icon: "form", crl: "Approved", d: { cr: 60, costPer: 0 } },
  appointment: { cat: "action", lib: "sales", label: "Appointment booked", icon: "cal", crl: "Booking rate", d: { cr: 30, costPer: 0 } },
  noshow: { cat: "action", lib: "sales", label: "No-show recovery", icon: "clock", crl: "Rebooked", d: { cr: 25, costPer: 0 } },
  demo: { cat: "action", lib: "sales", label: "Demo", icon: "video", crl: "Attended", d: { cr: 70, costPer: 0 } },
  meeting: { cat: "action", lib: "sales", label: "Meeting", icon: "users", crl: "Attended", d: { cr: 75, costPer: 0 } },
  proposal: { cat: "action", lib: "sales", label: "Proposal sent", icon: "page", crl: "Accepted", d: { cr: 40, costPer: 0 } },
  negotiation: { cat: "action", lib: "sales", label: "Negotiation", icon: "handshake", crl: "Agreed", d: { cr: 60, costPer: 0 } },
  won: { cat: "action", lib: "sales", label: "Deal won", icon: "crown", crl: "Pass-through", d: { cr: 100, costPer: 0 } },
  lost: { cat: "logic", lib: "sales", label: "Deal lost", icon: "exit", base: "exit", color: "goal", d: { cr: 100 } },
  pipeline: { cat: "action", lib: "sales", label: "Pipeline stage", icon: "layout", crl: "Moves on", d: { cr: 50, costPer: 0 } },

  cond: { cat: "logic", label: "Condition (Yes / No)", icon: "diamond", base: "cond", ports: ["Yes", "No"], d: { pct: 50 } },
  split: { cat: "logic", label: "A/B split test", icon: "split", base: "split", ports: ["A", "B"], d: { pct: 50 } },
  multivar: { cat: "logic", label: "Multivariate test", icon: "split", base: "split", ports: ["A", "Others"], kw: "split test variants", d: { pct: 34 } },
  randsplit: { cat: "logic", label: "Percentage split", icon: "split", base: "split", ports: ["Share", "Rest"], kw: "random split", d: { pct: 50 } },
  qualifier: { cat: "logic", label: "Qualification", icon: "diamond", base: "cond", ports: ["Qualified", "Not"], d: { pct: 40 } },
  branch: { cat: "logic", label: "Branch", icon: "diamond", base: "cond", ports: ["Path 1", "Path 2"], d: { pct: 50 } },
  merge: { cat: "logic", label: "Merge paths", icon: "merge", d: { cr: 100 } },
  goal: { cat: "logic", label: "Goal / conversion", icon: "goal", color: "goal", base: "goal", d: { cr: 100 } },
  exit: { cat: "logic", label: "Exit / drop-off", icon: "exit", color: "goal", base: "exit", d: { cr: 100 } },
  endp: { cat: "logic", label: "End", icon: "flag", color: "goal", base: "exit", d: { cr: 100 } },

  note: { cat: "annot", label: "Sticky note", icon: "note", d: { text: "Write a note…" } },
  label: { cat: "annot", label: "Heading text", icon: "text", d: { text: "Stage name", size: 28 } },
  frame: { cat: "annot", label: "Stage frame", icon: "frame", d: { color: "#10B981" } },
  shape: { cat: "annot", label: "Shape", icon: "shape", d: { shape: "rounded", text: "" } },
  image: { cat: "annot", label: "Image / logo", icon: "image", d: { src: "", alt: "", fit: "contain" } },
  checklist: { cat: "annot", label: "Checklist", icon: "task", d: { title: "Checklist", items: [] } },
  link: { cat: "annot", label: "Link / video", icon: "link", kw: "embed preview youtube loom url", d: { url: "", title: "" } },
  // Widget: live numbers on the map (scope, up to 4 metrics, display, size). Added from the canvas menus, not the 169-item library.
  widget: { cat: "annot", label: "Widget", icon: "chart", d: { scope: "funnel", display: "number", metrics: ["revenue"], wsize: "M" } },
} satisfies Record<string, BlockType>;

export type BlockTypeKey = keyof typeof TYPES;
export const BLOCK_TYPES = TYPES as Record<BlockTypeKey, BlockType>;

export const isBlockType = (t: string): t is BlockTypeKey => Object.prototype.hasOwnProperty.call(TYPES, t);
export const typeOf = (t: string): BlockType => BLOCK_TYPES[t as BlockTypeKey];
export const isAnnot = (t: string) => typeOf(t)?.cat === "annot";
/** Built-in behaviour of a type: its `base`, else the type itself (so "cond" → "cond", "membership" → "sub"). */
export const baseOf = (t: string): string => typeOf(t)?.base ?? t;
/** Yes/No or A/B share logic (people split by a percentage instead of a conversion rate). */
export const isShareLogic = (t: string) => baseOf(t) === "cond" || baseOf(t) === "split";
/** Library group of a type. */
export const libOf = (t: string): LibGroup => typeOf(t)?.lib ?? typeOf(t)?.cat;

export const PER_MONTH: Record<Interval, number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
export const INT_LABEL: Record<Interval, string> = { weekly: "week", monthly: "month", quarterly: "quarter", yearly: "year" };

/** Annotation types drawn at a stored size (w × h) and resizable in both directions. */
export const SIZED_TYPES = new Set(["frame", "shape", "image"]);
/** Annotation types with a stored width only (height follows the content). */
export const WIDTH_TYPES = new Set(["label", "note", "checklist", "link"]);
/** Widgets are laid out by their size (S / M / L), not by a stored width. */
export const WIDGET_SIZES = { S: { w: 150, h: 64 }, M: { w: 230, h: 112 }, L: { w: 340, h: 196 } } as const;
export const DEFAULT_SIZE: Record<string, { w: number; h?: number }> = {
  frame: { w: 520, h: 300 },
  shape: { w: 200, h: 120 },
  image: { w: 320, h: 200 },
  checklist: { w: 260 },
  link: { w: 280 },
};
export const SHAPES: [string, string][] = [
  ["rect", "Rectangle"],
  ["rounded", "Rounded"],
  ["ellipse", "Ellipse"],
  ["diamond", "Diamond"],
  ["circle", "Circle"],
  ["callout", "Callout"],
  ["line", "Line"],
  ["arrow", "Arrow"],
];
/** Direction of line / arrow shapes inside their box. */
export const LINE_DIRS: [string, string][] = [
  ["h", "Horizontal"],
  ["v", "Vertical"],
  ["d1", "Diagonal ↘"],
  ["d2", "Diagonal ↗"],
];

/**
 * Canonical block footprint (V2 handoff, "Canonical dimensions"): every flow block is 200px wide; page and offer
 * blocks carry a preview strip and are 38px taller than the rest. Library, canvas, Performance map, Presentation,
 * Shared view, Tidy Up and every export read these three values. Layout only: it never touches the maths.
 */
export const NH = 76;
export const NH_TALL = 114;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so callers can stay per-type if a family ever differs
export const nodeW = (type?: string): number => 200;
/** Height of a flow block (px). Notes and headings can be taller; the editor uses measured heights when available. */
export const blockH = (type: string) => {
  const c = typeOf(type)?.cat;
  return c === "page" || c === "offer" ? NH_TALL : NH;
};

/**
 * Block types a block can be switched to without changing how its numbers are calculated: same maths category and the
 * same special behaviour (recurring billing, instalments, Yes/No, A/B, goal, exit). Wait only changes into itself.
 */
export function retypeTargets(type: string): string[] {
  const T = typeOf(type);
  if (!T || T.cat === "annot" || type === "wait") return [];
  const cls = (t: string) => {
    const b = baseOf(t);
    return ["sub", "plan", "cond", "split", "goal", "exit"].includes(b) ? b : "plain";
  };
  return (Object.keys(TYPES) as BlockTypeKey[]).filter((k) => k !== type && k !== "wait" && TYPES[k].cat === T.cat && cls(k) === cls(type) && (T.cat !== "logic" || BLOCK_TYPES[k].color === T.color));
}

/** Port rules: which handles a block shows. */
export function portsFor(type: string) {
  const T = typeOf(type);
  const hasIn = T.cat !== "traffic" && T.cat !== "annot";
  const hasOut = T.cat !== "annot" && baseOf(type) !== "exit";
  const hasAlt = ["page", "offer", "action"].includes(T.cat) || isShareLogic(type);
  const labels: [string, string] | null = T.ports ?? null;
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
