# Phase 1 final completion pass: checkpoint (usage-controlled)

Branch `claude/festive-knuth-mng1g3`. Maths (`lib/funnel-math.ts`), RLS, auth, roles, scenarios and every block type key are
unchanged. Golden funnel unchanged (89.1 customers, 6,032.11 revenue, 5,582.11 profit, 13.40x ROAS; `golden.test.ts`, `widgets.test.ts`).
This is a checkpoint, not the end of the V2 scope: see "Remaining" below.

## Test status at this checkpoint

| Check | Result |
|---|---|
| Typecheck, ESLint, `next build` | clean |
| Unit (Vitest) | 204/204 (was 143) |
| DB / RLS | 52/52 (was 48; +4 `assets.test.ts`) |
| E2E (Playwright, prod build) | 112/112 (includes 23 `v2.spec.ts` tests: 3 Simulate, 5 QA regressions; 2 axe scans of Simulate; the PDF Actual-vs-Plan page in `exports.spec.ts`) |

## Built in this run (reused systems named)

**Object system and canvas** (`lib/block-visuals.ts`, `components/editor/block-visual.tsx`, `nodes.tsx`, `editor.css`)
- One canonical footprint: 200 wide, 76 tall, page and offer 114 (`lib/catalog.ts` `nodeW` / `NH` / `blockH`). Tidy Up, exports, thumbnails and
  the canvas read it; rows are centre-aligned (`lib/layout.ts`, `layoutMetrics`). Prototype-parity tests keep the old geometry via `PROTO`.
- Family cards from `FAMILY_GEOM` / `CARD`: source, page (wireframe strip, screenshot over it), offer (price tab), message / action capsules, logic
  (hatched, split bar), goal (progress bar from the funnel's own goals), notes. States: hover, selected (1px ring + 4px halo), multi (ring), locked,
  needs-attention (amber), invalid (red), key leak, live, no data ("No data yet"), rename in place (double-click / F2).
- Zoom detail (far = icon + name, mid = name + type, near = numbers). Performance map: headline + caption, conversion bar, frame totals,
  key-leak badge, legend. Negative money uses a true minus and `--neg` (#FCA5A5). Orange `--lost` for non-convert lines.
- Map export (SVG / PNG / PDF map) draws the same family cards, wireframes or captured screenshots, price tabs, split and goal bars, performance
  line, key leak, widgets (`lib/export.ts`).

**169 library**: `lib/library.ts` is the single list. `tests/unit/library-169.test.ts` verifies 169 items (152 flow + 17 presets), no duplicate keys,
8 groups, a visual definition for every item, wireframe fallbacks (pages -> sales, offers -> order), search coverage, and that every item can be
placed. The final Figma library replaces only the data in `lib/block-visuals.ts` and the `.fam-*` CSS.

**Connections**: presets (Yes, No, Purchase, No thanks, Retargeting), opacity, % and revenue on the line, flip direction, insert step on line,
Flow / Style inspector. Dragging a connection into empty space opens Quick Add at the endpoint (Pinned, Recent, client products, categories,
keyboard), places and connects the block as one undo step; amber connection tip over an invalid block; release on a block connects directly.

**Selection system**: floating toolbar (block, multi, connection, widget; hides while dragging; aligns to the selection edge), four context menus
with platform shortcuts and long-press, copy / paste style, eyedropper, quick styles, saved style presets and workspace blocks
(`workspace_assets`, migration `20261013000000`, RLS tested), Outline, Layers menu, Change block / page type (same-maths types only), Wait
duration + unit (`lib/wait.ts`, `days` kept in sync, math-neutral, Analytics disabled), page URL -> thumbnail lifecycle with a capture
provider adapter (`lib/capture.ts`, `/api/capture`, SSRF guard) and manual upload fallback.

**Inspector**: Funnel scope (Model / Simulate / Track, Health checks that select and zoom), block header (name, type + status pill), multi-select
Style / Arrange / Details, connection Flow / Style.

**Widgets** (no migration: a canvas element in the graph JSON): scope funnel / frame / selection, up to 4 metrics, Number / Trend / Chart, S / M / L,
MRR detail, Actual vs Plan from Actuals, shown on the map, in Reports (one column on phones), in exports, hidden when numbers are hidden.

**Surfaces**: Funnels page (status views, client filter, needs attention, health), Home (greeting, month / year, resume card, recent, needs
attention, pipeline), Clients (table default, pricing filter), Client detail tabs, Templates preview panel with Use for client, Settings section nav,
Reports grouped Summary / Money / Planning with Export PDF, KPI caption links, key-leak Show on map / Try in What-if, clickable drop-off bars,
Share V2 (View / Comment / Edit, numbers, notes, expiry, per-link permission, live preview), shared view with both logos, Presentation V2
(stages = frames or Acquire / Convert / Finish, totals from `frameTotals`, Clean / Numbers, swipe).

**Responsive**: bands in `lib/use-band.ts` and `editor.css` (1280 library overlay, 1024-1279 floating inspector + Library button + pan-to-clear,
768-1023 sheet with drag handle + drawer + 52px button, phone compact bar, KPI chips, 68px action bar, action sheets). KPI strip adapts per band.

**React Flow attribution**: kept (removal needs a Pro subscription per reactflow.dev); moved to bottom-centre.

## Decisions made autonomously
- Canonical size = V2 handoff (200 x 76 / 114) because no Figma was available and it outranks the old Tidy / export constraint.
- Phones open editable (no longer forced view-only) because the V2 phone design is an editing flow.
- Widgets are graph elements (no table); presets / workspace blocks use one small RLS table.
- Screenshots stay stripped from share links (privacy rule kept).
- Auto-capture needs a provider (`CAPTURE_URL_TEMPLATE`); without it the editor says so and offers upload.

## Finishing pass (P0/P1 close-out)
- **Month-to-month Actual vs Plan**: `monthlyPlanVsActual` (lib/report-data.ts) buckets entered Actuals by calendar month and takes the plan from
  `planVsActual` (the Actuals tab's own function, same days / 30.44 scale), so no new maths. Reports > Month-to-month shows a chart (Actual solid Emerald,
  Plan dashed slate), a Revenue / Ad spend switch, a table with variance (ad spend over plan reads red), and loading and empty states. Hidden on share links.
- **Shared view on a phone**: widgets leave the map (they were 150px chips) and stack in one full-width column behind a "Widgets · N" button above the
  KPI strip. Desktop and tablet keep them on the map. Reports cards on a phone are no longer trimmed to chips.
- **Brand marks**: `lib/brand-marks.ts` (Simple Icons, CC0) for Facebook, Instagram, Google Ads, YouTube, TikTok, Pinterest, X, Reddit and WhatsApp blocks, on
  the library tiles, the canvas card and SVG / PNG / PDF export. LinkedIn and Bing are not in the set and keep the tinted glyph. A user-chosen icon wins over the mark.
- **Hover / loading / tooltip states**: tooltips (`title`) on every remaining icon-only button; hover and press states for Quick Add rows and categories, the
  presentation progress, the FAB and toolbar / menu buttons; disabled styling; Workspace blocks loading, error (with retry) and empty states
  (`assetsStatus`); `role="status"` on the existing Loading lines.
- No change to `lib/funnel-math.ts`, the database or RLS. No migration was added or applied.

## Batch E: the visual Simulate experience
Simulate is a mode on the funnel canvas (stage bar **Simulate** button; on a phone, the ⋯ menu; also "Simulate on the map" at the top of Plan > What-if).
It turns the existing assumptions into something you can watch change:

- **How it stays one system.** Levers are the existing `settings.whatif` (traffic, conversion, price, traffic cost) and block edits are the same params the
  inspector edits, so the live `R`, the KPI strip, Reports (Current map with what-if), exports and the PDF all see them. `lib/simulate.ts` only subtracts one
  `FunnelResult` from another (the baseline run taken when Simulate started vs the live run). No formula was added to the UI or to a second engine;
  `tests/unit/simulate.test.ts` checks every delta against `compute()` and keeps the golden funnel as the baseline.
- **On the map.** Under each block that changed: people in (or visits) up or down, people lost at that step (+/-), and revenue; the block gets a green or red
  outline and pulses once; the conversion bar gets a tick where the rate was before; each connection keeps a dashed ghost of its old weight, is coloured
  by direction, and its label shows the change (`1,190 +190`). Line weight uses one scale for before and after, so thicker or thinner is a real change.
  Everything animates (off with reduced motion) and is also available as text (chip `aria-label`, panel lists).
- **KPI strip.** Traffic, Leads, Customers, Revenue, Profit, ROAS (and Ad spend, CPA under "+more") show their change under the number; ad spend is neutral, a lower CPA is good.
- **Panel.** Sticky Revenue / Profit / ROAS with changes; the other totals; the biggest leak and whether it moved; the four levers (with the % each is
  moved); try any saved scenario; **Change one block** (select a block: conversion or buy rate, price, discount, refund, spend, clicks/CPC/CPM, cost per
  person, Yes/No share, with -10% / +10% and a slider for percentages, and before -> now); **What moved** (click to jump to the block); **Your block
  changes** with a per-change undo; **Revert all** (levers + every block assumption, one undo step; layout and new blocks stay), **Use as new start**,
  **Save levers as scenario** (scenarios hold the four levers; block changes stay on the map and the panel says so), **Done** (keep the map as it is).
- **Where it is not.** Not on share links or view-only editors (locking the map ends Simulate); a presentation starts without the overlay; PNG/SVG/PDF export
  the numbers as simulated, without the chips.
- **Responsive.** >=1280 the panel is the right inspector; 1024-1279 it floats; tablet and phone use the details sheet and the map is fitted into the part left
  visible. Light and dark checked, axe scan passes with Simulate active in both themes.
- **Behaviour to know.** Lever and block edits are real edits (autosaved, undoable), the same as What-if before. The top-left "What-if" pill shows when levers are off neutral.

## Final QA sweep (Batches F to J)
A screenshot sweep of Home, Clients, Client, Funnels, Templates, Settings, the editor, Reports (Overview, Month-to-month), the Share dialog and the Shared view at
1536, 1280, 430 and 414, dark and light (88 images, reviewed as contact sheets), plus presentation at 1280 and 430. Defects found and fixed:

- **Hydration error on Funnels and Client pages (real bug).** "17 min ago" text was computed on the server and again in the browser; across a minute boundary
  React threw #418 and re-rendered the whole page, which also dropped the saved light theme (the page flipped to dark). `components/time-ago.tsx`
  (`suppressHydrationWarning`) now renders every relative time; the Clients view preference is read after mount instead of in the first render.
  Regression test: seven page loads, no React errors, light theme kept.
- **Share links no longer show the Actuals tab** (the team's real numbers are not fetched for a link, and the tab was an empty stub).
- **Phone:** Funnels list shows Funnel (client and status under the name), Revenue and a compact Health; Clients defaults to cards; Reports section picker no longer
  prints three empty group headings; the overflow menu no longer lists Present and Version history twice; helper text in the Share dialog uses the small help size.
- **Map zoom:** the minimum zoom is 0.08 (was 0.2) so Fit can show a wide funnel on a phone.
- **PDF:** a new "Actual vs plan by month" page (two charts and a table) printed from the same `monthlyPlanVsActual` rows as Reports; left out without actuals or when numbers are hidden.
- Not changed: Source cards repeat "visits · free" in the stats row in Performance view (the family anatomy always keeps that row).

## Remaining
Light-theme and 1536 / 1280 / 430 / 414 viewport pass for the new components; migrations (workspace_assets and the earlier pending ones) must be applied to the
demo / production databases by the owner; `CAPTURE_URL_TEMPLATE` for automatic page screenshots; final Figma 169 library visuals (swap data in
`lib/block-visuals.ts` and the `.fam-*` CSS only). The Simulate deltas are not in the PDF (the PDF is a client report of one snapshot).
