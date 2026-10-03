# Phase 0 Handoff: development readiness + V2 design map

Inspection only. No application code, schema, math or dependency changed. Verified 3 Oct 2026 on `main` (`a8d3193`).
Read with `docs/MASTER_HANDOFF.md` (contract), `PROJECT_STATUS.md` (V1 state) and `reference/DESIGN_V2_HANDOFF.md` (V2 spec).

## 1. Current architecture

- **App:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind 4. Read `node_modules/next/dist/docs/` before touching routing or types (AGENTS.md).
- **Canvas:** `@xyflow/react` 12 + Zustand store (`lib/editor/store.ts`, immer). `elkjs` for Tidy Up, `html-to-image` + `jspdf` for exports, `recharts` for charts, `zod` for the graph schema.
- **Backend:** Supabase Postgres/Auth/Storage, 13 migrations, RLS via `workspace_members`. Vercel deploy scripts in `scripts/deploy/`.
- **Routes:** `app/(app)` (home, clients, templates, settings), `app/funnels/[id]` (editor), `app/s/[token]` (share), `app/(auth)` (login, invite, `/join/<code>` independent signup), `app/api/share`.
- **Tokens and fonts:** already V2-compatible. Emerald, canvas, chrome and category tokens are in `app/globals.css` (dark + light). Bricolage Grotesque and DM Sans load in `app/layout.tsx`. Missing: orange `#F97316` ("people lost") and a consistent amber "needs attention" token.

## 2. Existing systems confirmed

**VERIFIED (run in this session)**

| Check | Result |
|---|---|
| `npm ci` | OK |
| `npx tsc --noEmit` | Clean **after `npx next typegen`** (see section 7, not a blocker) |
| `npm run lint` | Clean |
| `npm test` (Vitest) | 139/139 pass, including the golden funnel (89.1 customers, 6,032.11 revenue, 5,582.11 profit, 13.40x ROAS) |
| `next build` (placeholder Supabase env vars) | Succeeds; all routes compile |
| Library count | **169 items** (152 block types + 17 annotation presets) in 8 groups; matches PROJECT_STATUS |

**EXISTING / REUSABLE (confirmed in code, not re-run)**

- One math engine, `lib/funnel-math.ts` (758 lines), feeding KPI bar, inspector, `lib/report-data.ts`, reports, exports. Do not edit.
- 12 report sections (`reports-view.tsx`, `report-charts.tsx`), scenarios, goals, forecast, MRR, reinvestment, presentation (`present.tsx`), share dialog + RPC privacy, versions/autosave (`lib/editor/saver.ts`).
- Auth, roles (Owner/Admin/Editor/Viewer), independent workspaces, RLS and its tests.
- Last recorded by the owner's V1 pass (needs a local Supabase stack to re-run): 48/48 DB tests, 88/88 Playwright.

## 3. V2 design source locations

- `reference/DESIGN_V2_HANDOFF.md`: spec, tokens, batches D1-D8, responsive bands, canonical block dimensions.
- `reference/README.md`: package summary. **It is stale in places** (see section 4 and the notes below).
- `reference/project/*.dc.html`: 32 boards, plus `canvas.json` (board layout) and `block-inventory.json` (data for blocks).
- `reference/DESIGN_V2_HANDOFF.md` screen -> file table is the lookup; do not re-derive it.

Reference-package inconsistencies (documented, not fixed):

- README says `index.html`, `artifact-type/` and `project/Library-169.dc.html` exist. None are in the repo (`Library-169` now lives under `reference/design-v2/169-block-library/BLOCK_LIBRARY_INCOMPLETE/`). The boards are viewable only as raw HTML; the hosted preview is the link in `DESIGN_V2_HANDOFF.md`.
- Git history shows `Client.dc.html` / `Clients.dc.html` were deleted and then re-uploaded; all three client boards (`Client`, `Clients`, `Client-products`) are present now. Confirm they are the final versions before D6.
- README and handoff call the package "complete" and the inventory "149 blocks, target 169". The app already has 169. The README's "complete" does **not** override the library STATUS below.

## 4. 169-block library status: PENDING

- Location: `reference/design-v2/169-block-library/BLOCK_LIBRARY_INCOMPLETE/` (`Library-169.dc.html`, `STATUS.md`).
- `STATUS.md` (authoritative): **INCOMPLETE / PENDING HUMAN REVIEW.** The final Figma design replaces it before Phase 2 UI implementation.
- Rules until then: do not implement its block visuals, do not invent block designs, do not reduce/merge/remove any app block, do not edit these files.
- `reference/project/block-inventory.json` (149 blocks, "target 169") is the data side of the same pending work. Treat it as **pending too**. Do not import it as the block source. The app's own `lib/catalog.ts` is the authoritative list (169).
- What *is* safe to plan now: the family concept (Source / Page / Offer / Message-action / Logic / Goal / Notes) and canonical dimensions in the handoff are structural, not visual. A `family` lookup keyed by existing block type keys can be built without any per-block artwork. Confirm with the owner whether to start this before the Figma lands.

## 5. Implementation map

Design -> existing code -> reusable -> future work. File names are under `components/editor/` unless noted.

| V2 area (design board) | Existing code | Reuse | Future work |
|---|---|---|---|
| App shell, sidebar, ⌘K (D1) | `app/(app)/layout.tsx`, `components/app-nav.tsx`, `workspace-switcher.tsx`, `page-header.tsx` | Nav, switcher, `theme-toggle`, tokens | 232px sidebar, top strip, ⌘K search; move workspace creation into switcher menu |
| Editor shell (Editor-default, D2) | `editor.tsx` (803 lines: top bar, View menu, panels), `kpi-bar.tsx`, `canvas.tsx` | All state and handlers | Re-arrange top bar; 48px rail + 256px library; Clean/Performance switch from View menu to canvas; KPI strip with checks chip and "+6 more". `attributionPosition` is set in `canvas.tsx`; V2 asks to remove the attribution (needs React Flow licence decision, see section 7) |
| Canvas (Blocks-and-lines) | `canvas.tsx`, `nodes.tsx` (`BlockNode`, `nodeTypes`), `flow-edge.tsx`, `lib/layout.ts` | Pan/zoom, snap, minimap, Tidy, undo, drag-drop | Zoom-level detail (icon / name / number), status dot, selected ring, orange "people lost" lines, key-leak badge |
| Block/object system + families (Object-system) | `lib/catalog.ts` (`TYPES`, `LIB_GROUPS`, `libOf`, `NH=96`, `nodeW` 210/170), `nodes.tsx` `BlockNode`, `lib/icons.ts` | Catalog is the single block list | Family lookup + family shell inside `BlockNode`. **Dimension conflict:** design wants 200x76 / 200x114; app uses 210x96 and Tidy, exports and `layout.ts` depend on `NH`/`nodeW`. Change in one place and re-verify Tidy and exports. Brand icons need `iconId` plus a licensed set (design says Simple Icons; no dependency added) |
| Page thumbnails (Page-thumbnail) | `NodeParams`/`nodeSchema.shot` + `url` (`lib/graph.ts`), manual upload in `inspector.tsx:285` (`LogoUpload`, private `screenshots` bucket) | Storage, `shot` field, `signed-image.tsx` | Semantic page-type wireframes (SVG per type, copy geometry from Object-system). **URL -> auto-capture does not exist** (new capability, ask first). **Share links strip screenshots** (`share_safe_graph`), but the design shows them in Shared view and exports: needs a privacy decision |
| Semantic icons | `lib/icons.ts`, style panel icon picker | Icon set and per-block `icon` override | Brand marks per source/CRM/messaging tool |
| Library / Quick Add (D2) | `palette.tsx` (`ITEMS`, favourites, recents), `quick-add.tsx` | Search, groups, favourites, recents | Collapsible 256px layout, Pinned + client products rows, single-column rows |
| Connection -> Quick Add (Connection-quick-add) | `canvas.tsx` `onConnectEnd` (connects only when released on a block), `openQuickAdd` in store, `canConnect` | Quick Add popover, `connect()` | Release on empty space opens Quick Add at the point filtered by `canConnect`, spawn connected, one undo step |
| Floating toolbar / right-click menus (D4, Context-menus) | **None** (`components/menu.tsx` is the top-bar dropdown only) | Store actions: duplicate, copy, lock, reorder, align, wrapInFrame, delete | New toolbar and context-menu components over existing store actions. Shortcuts already in `editor.tsx` keydown handler |
| Inspector scopes (Funnel-tools, D3) | `inspector.tsx` (Details/Style/Plan/Analytics, `NodeInspector`, `EdgeInspector`), `report.tsx` (Math/Steps/Sources/Plan/Costs/Scenarios/Forecast/Actuals via `ReportTab`) | All fields and tabs | Regroup funnel scope into Model / Simulate / Track; scope header; Health checks list (derive from `leaks`/`report-data`, no new math) |
| Style system, quick styles, copy/paste style | `style-panel.tsx` (`StylePanel`, `ArrangeBar`), `lib/style.ts` | Existing style fields | Quick-styles row (built-in presets only). **Saved workspace presets need a table: ask the owner before any migration** |
| Connection system (Editor-connection) | `flow-edge.tsx`, `EdgeInspector`, `EdgeStyleFields`, `store.setEdgeStyle` | Styles, labels, skip/no-data types | Flow/Style inspector split, orange non-convert styling |
| Change page type | no `retype` in store; `catalog.ts` has `base` mapping so types share maths | `updateNode`, undo | Store action that swaps `type`, keeps id/position/edges/`url`/`shot`/`status`, hides fields with no equivalent. Math-neutral only for types with the same `base`: **needs a rule for mixed `base`** |
| Wait / Delay (Wait-delay) | `wait` type exists in `catalog.ts` (clock icon, `days` param) | Block and its maths | Duration + unit (Min/Hrs/Days/Wks) UI. Current param is days only; unit change must stay math-neutral: confirm how `days` is used by `funnel-math` before adding units (report, do not edit math) |
| Performance map (Performance-map) | View menu presets "Clean map" / "Performance map" (`opts.nums`, `opts.thick`), line thickness in `flow-edge.tsx` | Both modes, numbers, thickness | Headline number + conversion bar per block, frame totals in label, key-leak badge, legend |
| Reports (Reports, D7) | `reports-view.tsx`, `report-charts.tsx`, `lib/report-data.ts` | 12 sections, charts, tables | Regroup nav Summary / Money / Planning; "Show on map" / "Try in What-if" links; drop-off bar -> select block |
| Presentation (Present) | `present.tsx` (97 lines) | Stage stepping | Stage progress footer, Clean/Numbers switch; stage totals must equal frame totals |
| Sharing (Share, Shared-view) | `share-dialog.tsx`, `app/s/[token]/page.tsx`, `lib/share/server.ts`, `app/api/share/*` | RPC privacy, comments, expiry, hide numbers | View / Comment / Edit modal, live preview, both logos in header |
| Pages: Home / Clients / Funnels / Templates / Settings (D6) | `app/(app)/*`, `clients-browser.tsx`, `graph-thumb.tsx` | All data and logic | Re-layout; Funnels list Health column; client detail tabs |
| Responsive (R-* boards) | CSS in `app/globals.css`, `editor.css` | Existing breakpoints | Five bands from the handoff. **E2E only runs at 1440x900** (`playwright.config.ts`); add 1280/1024/768/430 projects when responsive work starts |
| Widgets (D8) | none | none | **New data-model addition: propose and wait for approval** |

## 6. Reusable existing components/systems (do not duplicate)

`lib/catalog.ts` (blocks), `palette.tsx` (library), `quick-add.tsx`, `nodes.tsx`, `flow-edge.tsx`, `style-panel.tsx`, `inspector.tsx`, `kpi-bar.tsx`, `reports-view.tsx`, `report-charts.tsx`, `present.tsx`, `share-dialog.tsx`, `graph-thumb.tsx`, `logo-upload.tsx`, `signed-image.tsx`, `menu.tsx`, `lib/export.ts` + `exporters.ts` (map SVG/PNG/PDF), `lib/layout.ts`, `lib/report-data.ts`. A new screen from the design board should be a re-skin or re-arrangement of one of these, not a parallel component.

## 7. Genuine blockers

**None for starting Phase 1.** Items below are environment/readiness notes, not blockers:

- **BLOCKED (verification only): local Supabase stack.** No `.env.local`; Docker CLI exists but the daemon is not running in this session; `SUPABASE_SERVICE_ROLE_KEY` and `INDEPENDENT_SIGNUP_CODE` are unavailable. So `npm run test:db` and Playwright E2E were **not run**. Needed before D1 ships (the handoff requires E2E after every batch): `npx supabase start && npx supabase db reset`, then fill `.env.local` per `.env.example`, then `npm run build && E2E_PROD=1 npx playwright test`. Chromium is present at `/opt/pw-browsers`.
- **Note: `tsc` needs generated route types.** `LayoutProps`/`PageProps`/`RouteContext` come from `npx next typegen` (or `next dev`/`next build`) and `.next/` is gitignored, so a bare `npm run typecheck` on a fresh clone fails with 15 TS2304 errors. Run `npx next typegen` first. I did not change `package.json`.
- **Owner decisions needed before the matching batch (not now):**
  1. React Flow attribution removal (D2): needs a Pro licence or an allowed-setting check.
  2. Saved workspace style presets (D4): needs a migration.
  3. Widgets (D8): needs a data-model addition.
  4. Page URL auto-capture (Page-thumbnail): new capability + service.
  5. Screenshots in share links/exports vs the existing privacy rule that strips them.
  6. Canonical block size 200x76/114 vs current 210x96 (affects Tidy and exports).
  7. Final versions of the Client boards, and whether the family lookup may start before the Figma library lands.
- **Pending from V1 (owner action, outside this phase):** per `PROJECT_STATUS.md`, the 3 newest migrations are not applied to the demo/production databases (`docs/deployment.md`).
- **Noticed, not fixed:** a prototype `funnel-mapper.html` exists at the repo root and in `reference/`, and the master handoff `.docx` is at the root. Harmless.

## 8. Phase 1 starting point

Recommended: **D1 + D2 foundations, in this order, each as its own small commit with E2E run after**:

1. Stand up the local Supabase stack and run the full baseline once (DB 48/48, E2E 88/88). Record it. Without this there is no regression net for any UI batch.
2. Tokens only (`app/globals.css`): add orange "people lost" and amber "attention" tokens; no component changes.
3. D1 app shell (sidebar, top strip). Pure layout over existing pages, lowest risk, touches no canvas or math.
4. Then D2 editor chrome (top bar, rail, collapsible library) using the existing `Palette`, `KpiBar` and View-menu state.

Defer until their dependencies are cleared: D5 object families and block visuals (169-block Figma pending, dimension decision), D4 (toolbar and menus can start once D2 is in), Quick Add from connection and Change type (need the rules in section 5), D8 (approval).

## 9. Constraints that must not change

- `lib/funnel-math.ts` and every number it produces (golden test: 89.1 / 6,032.11 / 5,582.11 / 13.40x). Mockup numbers are demo data; never hard-code them.
- Database schema, RLS, auth, workspace isolation, roles, share RPC privacy (`share_safe_graph`, `get_shared_funnel`). No migration without owner approval.
- No removal, merge or reduction of any of the 169 library items.
- Do not implement or edit the pending 169-block visuals.
- Locked tokens and category colours; Emerald `#10B981` stays the only primary. Borders before shadows; shadows only on floating UI.
- Export fidelity paths (`lib/export.ts`, `exporters.ts`) and `NH`/`nodeW` sizing are shared by canvas, Tidy and exports; change them together or not at all.
- Existing tests stay green after each batch; update `PROJECT_STATUS.md` per batch.
- No new dependencies without a stated reason.
