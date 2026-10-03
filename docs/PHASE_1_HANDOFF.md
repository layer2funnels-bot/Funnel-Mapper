# Phase 1 Handoff: foundations, 169-block visual system, D1 shell, D2 editor chrome

Read with `docs/PHASE_0_HANDOFF.md` (map and constraints) and `reference/DESIGN_V2_HANDOFF.md` (spec).
Math, database, RLS, auth, roles, reports, exports and every block type key are unchanged.

## 1. Baseline and results

Environment notes (not in the repo): the cloud container has Docker but no running daemon. `dockerd &` starts it,
then `npx supabase start` (about 2 minutes, applies all 13 migrations and the seed). `.env.local` (gitignored) holds
the local URL and the anon / service-role keys printed by `supabase start`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
and any 8+ character `INDEPENDENT_SIGNUP_CODE`. E2E: `npm run build && E2E_PROD=1 npx playwright test` with
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`. After a rebuild, stop the old `next start` before starting it again,
otherwise the old process keeps serving stale chunks.

| Check | Before UI changes | After Phase 1 |
|---|---|---|
| Unit (Vitest) | 139/139 | 143/143 (+4 `tests/unit/block-visuals.test.ts`) |
| DB / RLS | 48/48 | 48/48 |
| E2E (Playwright, prod build) | 87/88: "client details, notes and products" failed once in the full run (phone not saved before reload), passed 2/2 when run alone | 88/88: full run 86 passed; the 2 failures were tests clicking the canvas at (20,20), now covered by the Clean / Performance switch, so those two clicks moved to (420,20) and both pass |
| Typecheck (`next typegen` first), lint, build | clean | clean |

## 2. Tokens

`app/globals.css`: `--lost` (#F97316; #C2410C on light) and `--attention` (#FBBF24; #B45309 on light), plus Tailwind
colours `lost` and `attention`. `--lost` is used by the logic split bar; `--attention` by the status dot and the checks chip.

## 3. The 169-block visual system

One definition, one renderer. **The block library still comes from `lib/catalog.ts`** (169 items = 152 flow blocks +
17 annotation presets); nothing was renamed, removed or merged.

| File | Role |
|---|---|
| `lib/block-visuals.ts` | **The data the final Figma library replaces.** `visualOf(typeKey)` returns `{ family, wireframe?, brand? }`. `FAMILIES` (strip / price tab per family), `PAGE_WF` and `OFFER_WF` (type -> wireframe), `BRAND` (tint), `WIREFRAMES` (13 page wireframes as shape data on a 174x30 viewBox). |
| `components/editor/block-visual.tsx` | Shared renderers: `WireframeStrip`, `priceTab`, `offerSubtitle`, `StatusDot`, `SplitBar`, `BlockTile`. |
| `components/editor/nodes.tsx` `BlockNode` | The single card renderer (adds `fam-<family>`, strip, price tab, status dot, split bar). |
| `components/editor/palette.tsx`, `quick-add.tsx` | Library rows and Quick Add use `BlockTile`. |
| `components/editor/editor.css` | Geometry: `.fm-node.fam-*` (card shapes), `.pi.fam-*` (tiles), `.fm-wf`, `.fm-price`, `.fm-st`, `.fm-split`. |

Families: source (rounded entry), page (10px card + wireframe strip), offer (card + strip + price tab: `$37`, `↑ $297`,
`↓ $27`, `+ $9`, `$70 / mo`, `3 × $333`), message (Communication and Sales & CRM, capsule, circle tile), action
(Actions & events, capsule, diamond tile), logic (4px corners, hatched body, Yes/No or A/B split bar), goal (goal / end
capsule), note (layout elements, unchanged). Canvas, Performance map, Presentation and Shared view all render `BlockNode`,
so they match the library by construction.

**Replacing with the approved Figma library tomorrow:** edit the tables in `lib/block-visuals.ts` (families, wireframes,
brand tints) and the `.fam-*` geometry in `editor.css`. Block identities, node data, connections and maths are untouched.

Decisions to confirm:
- **Card footprint stays 210x96 (logic 170).** The design's 200x76 / 114 is not applied because Tidy Up, the map export,
  dashboard thumbnails and their tests all read `NH` / `nodeW` in `lib/catalog.ts`. Page and offer cards fit the 24px strip
  inside the 96px card instead of growing 38px. Changing it is one constant plus those consumers.
- **Brand tint only.** Recognised sources and WhatsApp use the brand colour on the icon tile with the block's own glyph.
  Real brand marks need a licensed icon set (the design names Simple Icons); not added.
- **Wireframes beyond the five in the boards** (optin, sales, video, webinar, app, calendar, thanks, members, up) are
  interim drawings in the same vocabulary; the Figma pass replaces them.
- Price tab and status dot: price tab hides on hide-numbers share links; status dot hides on all share views (internal).

Not done (stays with its later batch): goal progress bar (no target source on the block), zoom-level detail and the
Performance-map card anatomy (D5), semantic wireframes in the **map export** (`lib/export.ts` still draws its own cards,
so PNG / SVG / PDF cards do not yet show families), real page screenshots in the strip.

## 4. D1 app shell

`components/app-nav.tsx`, `workspace-switcher.tsx`, `top-strip.tsx`, `app/(app)/layout.tsx`.
- Sidebar 232px (xl and up); 64px icon rail 1024-1279 with tooltips; left drawer below 1024; bottom tab bar (Home,
  Clients, Templates, More) on phones. Workspace button with popover menu (switch, and create for admins; closes on
  outside click and Esc). Home, Clients, Templates, Settings, user row with role, theme toggle, sign out.
- Top strip: quick search (Ctrl/Cmd K) that opens the Clients list with the query (`/clients?q=`), plus the global
  New client and New funnel actions. Moved from the dashboard and clients headers; hidden for viewers; the client page keeps
  its own client-preselected New funnel.
- Not added, with reasons: **Funnels** nav item (the all-funnels page is D6), **pinned clients** (needs a pin model),
  nav counts (would change link names the tests rely on), a global command palette (only the clients search exists).

## 5. D2 editor chrome

`components/editor/editor.tsx`, `chrome.tsx`, `kpi-bar.tsx`, `palette.tsx`, `canvas.tsx`, `editor.css`, `lib/editor/store.ts`.
- Top bar: Client / funnel name, File, scenario pill (derived from the what-if values, opens the Scenarios tab),
  Map | Reports, undo / redo, Tidy up (Emerald tint), then status, View, saved, panel toggle, history, present, comments
  and Share (the only solid primary). Currency moved into the View menu.
- 48px left rail (library toggle, funnel notes, shortcuts) and the 256px library: search, category chips, Pinned (the
  favourites), the client's products with prices, single-column rows by category. Under 1440px the library starts collapsed
  to the rail and opens as an overlay (closes on Esc or when you work on the canvas); a saved choice wins. Inspector is 320px.
- Canvas: Clean | Performance switch top-left (the View menu's presets), minimap toggle with zoom and Fit.
- KPI strip: checks chip (opens a list; each flagged block can be selected and zoomed to), Traffic, Leads, Customers,
  Revenue, Profit, ROAS, "+9 more" popover (Ad spend, ROI, AOV, CPA, CPL, EPC, Conv. rate, MRR, LTV), unit label
  "per month · GBP". Every figure is the engine's result.

Pending in D2 territory: React Flow attribution removal (licence decision), avatar in the bar, the "…" overflow and
floating inspector at 1024-1279 (the bar wraps to two rows there), tablet and phone editor bands (bottom sheet, action
bar), rail Outline and Workspace blocks (do not exist yet), Layers button on the canvas.

## 6. Protected

`lib/funnel-math.ts`, reports and forecast math, scenarios, goals, exports, the database and RLS, auth and roles,
workspace isolation, save and version behaviour. Golden funnel unchanged (89.1 customers, 6,032.11 revenue, 5,582.11 profit,
13.40x ROAS), checked live in the KPI strip (`exports.spec.ts`).
