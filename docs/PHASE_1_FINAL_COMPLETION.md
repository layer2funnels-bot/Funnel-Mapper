# Phase 1 final completion pass: checkpoint (usage-controlled)

Branch `claude/festive-knuth-mng1g3`. Maths (`lib/funnel-math.ts`), RLS, auth, roles, scenarios and every block type key are
unchanged. Golden funnel unchanged (89.1 customers, 6,032.11 revenue, 5,582.11 profit, 13.40x ROAS; `golden.test.ts`, `widgets.test.ts`).
This is a checkpoint, not the end of the V2 scope: see "Remaining" below.

## Test status at this checkpoint

| Check | Result |
|---|---|
| Typecheck, ESLint, `next build` | clean |
| Unit (Vitest) | 194/194 (was 143) |
| DB / RLS | 52/52 (was 48; +4 `assets.test.ts`) |
| E2E (Playwright, prod build) | 103/103 (includes 16 `v2.spec.ts` tests: the V2 interactions plus the 4 finishing-pass tests) |

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

## Remaining
Light-theme and 1536 / 1280 / 430 / 414 viewport pass for the new components; migrations (workspace_assets and the earlier pending ones) must be applied to the
demo / production databases by the owner; `CAPTURE_URL_TEMPLATE` for automatic page screenshots; final Figma 169 library visuals (swap data in
`lib/block-visuals.ts` and the `.fam-*` CSS only). Month-to-month Actual vs Plan is not in the PDF report yet.
