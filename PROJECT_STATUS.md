# Funnel Mapper Pro: Project Status

Phase 1 audit against `docs/MASTER_HANDOFF.md`, verified on the repository at `0677a63` (main), 2 Oct 2026.
**Updated after the final V1 completion, 3 Oct 2026** (see "Final V1 completion" at the end; the tables reflect it). Before that: multiple workspaces, the Batch 4 demo access fix, Batch 4 (workspaces, team, editor panels). Before that, Batch 3 (client-facing exports). Before that, Batch 2 (Emerald reskin + canvas completeness). Earlier: **Batch 1 (core correctness + P0 fixes):** modal centring, golden maths test, a reliable password-reset test,
client pricing model and Tidy Up annotations are done. See "Batch 1" below; the tables reflect the new state.
Status keys: **PASS** works and is tested · **PARTIAL** exists but falls short of the handoff · **FAIL** missing or broken · **UNKNOWN** not verifiable here.

## Deployment status (7 Oct 2026)

- Production (`main` at `6be54f7`, Phase 2 reporting) deployed successfully on Vercel and serves `/login` on `funnel-mapper-demo.vercel.app` and `mapper.layer2funnels.com`.
- Earlier failures (`2cc505e`, `acfff14`) were corrupted files in Codex's Phase 2 commits, not a Vercel setting. Details and the agent workflow are in `docs/deployment.md`.
- Added: `npm run check:files` (CI), public `/api/version` (checked by the Preview smoke test), LF line endings via `.gitattributes`.
- Not changed: Vercel settings, domains, Supabase projects, migrations. `workspace_assets` is still unapplied on Demo per the 7 Oct inspection; verify before any migration.

## Deployment status (8 Oct 2026)

- Production (`mapper.layer2funnels.com`, `/api/version`) serves `main` after PRs #20, #21 and #22: the V2 design conversion, the block-delete crash fix, light-theme contrast, unique form ids and the funnel-name focus ring.
- Migrations applied to the production Supabase project `arwedmqmxrxllytzriat` on 8 Oct with the owner's approval, all additive (no drops, no data deleted): `signup_cleanup`, `workspace_assets`, `trash`, `actuals_source`, `image_limit`. Verified afterwards: `deleted_at` on clients and funnels, `funnel_actuals.source`, `workspace_assets`, and the 100 KB limit on the logos / screenshots / thumbnails buckets.
- Vercel is Git-connected (project `funnel-mapper-demo`); previews build per push. No second Vercel or Supabase project was created. The empty project `kyhlhacbmlbkiibvpsel` is untouched.
- Not verified on production: signed-in flows (no production credentials are available to the agent). Signed-in behaviour was verified locally against a production build.

## V2 design conversion (8 Oct 2026)

Converted against `reference/ project/*.dc.html` (boards are visual specs, rendered at 1440 wide).

- **Done:** editor chrome, library (170 blocks, 6 widgets, page/offer windows), objects at every zoom, right panel (Model / Simulate / Track, block tabs, connection, multi-select), floating toolbar and menus, Reports, Share, shared view, presentation, Home, Clients, Client, Funnels, Templates, Settings (one section at a time), New client sheet, light theme, phone top bar, touch targets (40px tablet, 44px phone).
- **Found and fixed by the E2E run:** editor crash when deleting a block (live on production until PR #21), invisible inline rename on pages and offers at the far zoom, no mouse control to collapse the right panel, Settings showing every section at once, duplicate DOM ids from a second client form, light-theme contrast (Emerald text, leak chips, toolbar, primary button hover), invalid `aria-pressed` on tabs.
- **Decision for the owner:** the shared client link has no details panel (matches the Shared-view board), so a client with numbers cannot open the Forecast tab. The E2E test was changed to match.
- **Known gaps:** action diamond shapes, message capsules and some goal-capsule details; the Trash page, States and V2-appearance picker boards were not compared; responsive pass done for 1280, 1024 and 390 only (768 and 430 not compared to the R-* boards); non-desktop Playwright projects were not run.
- **Tests:** unit 263 pass; lint, typecheck, build and file-integrity pass. Desktop E2E: many tests were updated for the V2 UI; see the latest run result in the pull request.

## A. Executive summary

**Final V1 completion (3 Oct 2026, branch `claude/funnel-mapper-v1-completion-5r8743`).** Every in-scope V1 requirement of
`docs/MASTER_HANDOFF.md` that was PARTIAL, FAIL or deferred is now implemented and tested. See table B and the
"Final V1 completion" section.

- **Product loop, end to end:** Map → Model → Simulate → Analyze → Forecast → Present.
  - Canvas, then the authoritative engine, then scenarios, reports and goals, then the forecast and reinvestment.
  - Then PDF / PNG / SVG / CSV / JSON, presentation and share links.
- **One maths engine:** `lib/funnel-math.ts` feeds the KPI bar, inspector, Reports, dashboard summaries, PDF, CSV and map exports.
  - The golden quiz funnel is unchanged: 89.1 customers, 6,032.11 revenue, 5,582.11 profit, 13.40x ROAS.
  - New engine functions are additive: itemised forecast rows, reinvestment, periods, goals, step-rate impact, leaks.
  - New block types reuse the existing formulas through `base`.
- **Access:** invite-only; independent users and multiple workspaces (merged from `main`).
  - Owner / Admin / Editor / Viewer per workspace, enforced in RLS.
  - Funnel notes stay internal unless shared on purpose, enforced in the share RPC.
- **Migrations (history):** the 3 new migrations were not applied when this was written. Superseded: applied to `arwedmqmxrxllytzriat` on 8 Oct (see "Deployment status (8 Oct 2026)" at the top); verified again on 9 Oct against the live migration list.
  - Production also still lacks migrations 4–9.
  - `docs/deployment.md` has the exact order. The deploy script now handles hand-migrated histories safely.

## B. Current status by area

| Area | Status | Evidence / notes |
|---|---|---|
| Architecture (Next.js 16, Supabase, React Flow, Zustand, Zod) | PASS | `app/`, `components/editor/`, `lib/`, `supabase/migrations/` |
| Authoritative maths engine | PASS | `lib/funnel-math.ts`; consumers: `lib/editor/store.ts`, `saver.ts`, `report.tsx`, `actions.ts`, `templates/page.tsx`, `exporters.ts`/`lib/export.ts` (use the store's `R`) |
| Golden regression funnel | PASS | `tests/unit/golden.test.ts`: literal handoff values (89.1 / 6,032.11 / 5,582.11 / 13.40x), every step and branch, and agreement of the editor store, summary, scenario, forecast, CSV and JSON round-trip; plus `tests/unit/funnel-math.test.ts` prototype fixtures |
| Canvas: infinite canvas, grid, zoom, minimap, fit, snap, undo/redo | PASS | `canvas.tsx`, store `undo/redo/snapV`; e2e `editor.spec.ts` |
| Canvas: multi-select, copy/paste, duplicate, delete, align, nudge, frames | PASS | store `copySelection/paste/duplicateSelection/align/wrapInFrame`; e2e |
| Canvas: lock/unlock per element, layer ordering, resize | PASS | Batch 2: `locked` (no move, resize, nudge, align, delete or Tidy; badge on canvas), `z` order (front, forward, backward, back; Ctrl ] / Ctrl [), resize handles for shapes, images and frames, width handles for text, notes and checklists. Flow blocks keep the standard size (by design, for Tidy and exports) |
| Canvas primitives: shapes, images/logos, checklists, link/video, callout, line/arrow | PASS | Batch 2: `shape` (rect, rounded, ellipse, diamond), `image`, `checklist`. Final V1: circle, callout, line and arrow shapes (geometry shared by canvas and export, `lib/style.ts shapeGeom`), `link` element (page / video card; YouTube, Vimeo, Loom, Wistia show as video), presets for canvas text, subheading, rectangle, screenshot |
| Block library (searchable, categorised, drag + tap, quick-add) | PASS | Final V1: 169 items in 8 groups (Traffic, Pages, Offers, Actions & events, **Communication**, **Sales & CRM**, Logic & goals, Notes & layout) covering the handoff table; new types reuse the existing maths through `base` (`membership` bills like `sub`, `qualifier`/`branch` split like `cond`, `multivar`/`randsplit` like `split`, `endp`/`lost` end like `exit`). Search over label, keywords and group; favourites (star) and recents (per device); floating quick-add (double-click the canvas or `/`). Custom icons per block (Style tab) and uploaded images. Tests: `tests/unit/reports.test.ts` (every type valid; reused maths equal), e2e `v1.spec.ts` library + quick-add |
| Element Style tab (fill, border, font, alignment, opacity…) | PASS | Batch 2 `components/editor/style-panel.tsx`: icon library with search (blocks), font family, Font Size, weight (Regular/Medium/Semibold/Bold), line height, letter spacing, alignment, italic/underline/strikethrough, text colour, fill, border colour/width/style, radius, opacity, shadow, padding, size/position, Arrange (lock, order, duplicate, copy, delete). Multi-select gets Arrange too |
| Plan / Analytics tabs per element | PASS | Details / Style / **Plan** (rich-text internal notes, checklist, per-period forecast for the step) / **Analytics** (numbers, share of visitors and revenue, a conversion goal for the step with its revenue and profit impact, per-period table). Tabs work read-only (viewers, view links); e2e `v1.spec.ts` |
| Connections: main/alt port, share %, people labels | PASS | `flow-edge.tsx`, e2e "connect ports", "edit an edge" |
| Connection styles | PASS | Final V1: label suggestions (Yes, No, Purchase, No thanks, Retargeting, Upsell, Downsell, Follow-up, Booked, No-show). Batch 2: curved/straight/elbow, solid/dashed/dotted, colour, thickness, arrow none/end/both with size, label, "Skip step" and "No data" types. Presentation only: port, share % and flow maths are unchanged (unit-tested). The map export draws path, colour and dash |
| Layers/views (Numbers/Flow/Forecast/Notes/Checklist; Clean vs Performance) | PASS | View → Layers: Clean map / Performance map presets, Numbers, Flow (thickness), Notes (sticky notes and note badges), Checklists, Forecast (numbers per day/week/month/year on blocks and connections, with an on-canvas badge). Map images follow hidden layers. e2e `v1.spec.ts` |
| Tidy Up | PASS | `lib/layout.ts`: flow blocks are laid out exactly as the prototype does; notes and headings keep their exact offset from their nearest block, use measured sizes (`widthOf`/`heightOf`), and are nudged only to avoid overlapping blocks or each other; frames refit around their blocks. Tests: `tests/unit/layout.test.ts` and e2e "Tidy up keeps notes and headings…" |
| What-if, goal seek, revenue target | PASS | `report.tsx` "What-if" tab, `goalSeek`, `targetPlan` |
| Goals (name/type/step, required daily/weekly/monthly/yearly numbers) | PASS | `settings.goals`: named goals of type revenue, profit, customers, leads, people completing a step, or a step's conversion rate. `goalPlan()` (traffic scaled, goal seek for profit) gives required revenue, profit, traffic, traffic cost, leads and customers per day/week/month/year; conversion goals show the revenue/profit impact (`withStepRate`). Reports → Goals, element Analytics tab, PDF. The legacy revenue target is kept. Unit + e2e |
| Forecast | PASS | `project()` itemised (ad spend, follow-up, delivery, expenses, leads, orders, cumulative revenue) and unchanged in its totals (golden test). Periods: day/week/month/quarter/year/custom days (`periodNumbers`); people, leads, purchases, revenue, ad spend, other costs, profit, ROI, ROAS. Forecast for any scenario via the Reports scenario picker. Recurring: active subscriptions, MRR, cumulative revenue and profit |
| Scenarios | PASS | Conservative / Expected / Best case / Custom kinds, duplicate, show on map; Reports → Scenario comparison with differences against the baseline for traffic, leads, customers, revenue, ad spend, profit, ROAS, ROI, CPA, CPL, AOV, LTV, MRR; scenario snapshots feed every report section, the PDF and the CSV (scenario comparison block). One engine: `computeScenario` |
| Expenses / Costs | PASS | Costs tab, `expenseTotals`, payback |
| Actuals (planned vs actual) | PASS | `actuals.tsx`, `planVsActual`, e2e |
| Notes (canvas-level and element-level, rich text) | PASS | `lib/rich-text.ts`: Markdown-style source parsed to a tree and rendered as React elements (never HTML): headings, bold, italic, underline, strikethrough, bullets, numbers, to-dos, indentation, links (http/https/mailto only), images and video links, alignment; toolbar with Ctrl B/I/U and preview. Used by sticky notes, element internal notes and **funnel notes** (toolbar → Notes). Funnel notes are internal unless "Show on client share links" is on: stripped by `get_shared_funnel` (migration `20261010000000_share_notes.sql`) and preserved on client saves. Exports print notes as plain text. Unit + DB + e2e |
| Checklists | PASS | Batch 2: canvas checklist element (toggle on the canvas) and element-level checklists (Plan tab; ✓ n/m badge on the block): add, edit, complete, reorder, indent. Element checklists are internal: stripped from share links by `share_safe_graph` (migration `20261006000000`) and preserved when a client saves |
| Reports / Insights as a first-class area | PASS | Map \| Reports switch in the editor toolbar, deep links `?view=reports&section=…`, "Reports" on every funnel card. 12 sections: Overview (project summary KPIs month + year, key leak with the gain of converting 10% better, revenue/profit chart, drop-off chart), Funnel data (step, type, visitors, conversion, customers/orders, revenue, cost, sources, status), Traffic sources, Offers & products, Expenses, Scenario comparison, Revenue & profit forecast, Goals & required numbers, MRR forecast, Month-to-month, Traffic reinvestment, Published status. Every figure from `lib/report-data.ts` (assembles engine results only); charts with tooltips, legends, validated palette, tables for every chart, empty states, responsive (section picker on narrow screens) |
| Clients: portfolio, search, status, tags, details, logo, autosaved notes, products | PASS | `app/(app)/clients/*`, `logo-upload.tsx`, `products.tsx` (products can use every offer type); logo upload, preview, persist and remove covered by e2e `v1.spec.ts` |
| Client pricing model (Fixed/One-time/Hourly/Commission/Retainer/Other) | PASS | migration `20261005000000_client_pricing.sql`; `lib/pricing.ts`; dynamic fields in `components/client-form.tsx`; shown on client page, list and dashboard (Agency MRR counts retainer, hourly, commission base fee and recurring "other"); existing clients read as retainers unchanged. Tests: `tests/unit/pricing.test.ts`, e2e "client pricing model…" |
| Archive / past clients | PASS | `past` relationship status, plus Archive / Restore (`clients.archived_at`, migration `20261012000000_client_archive.sql`): archived clients leave the client list (Archived filter), dashboard and agency MRR; nothing is deleted. e2e |
| Templates (5 built-in plus save as template) | PASS | `lib/templates.ts`, e2e |
| Autosave, offline draft, version history and restore | PASS | `lib/editor/saver.ts`, `versions.tsx`, e2e |
| Sharing (view/edit links, hide numbers, expiry, comments, notes never shared) | PASS | `share_safe_graph` RPC, e2e `privacy.spec.ts`, DB tests |
| Share modal / all modals centred | PASS | `app/globals.css` `dialog.modal { margin: auto; max-height; overflow }` restores native centring that Tailwind's reset removed; e2e "dialogs open centred and inside the viewport" (1440×900 and 390×640) |
| Presentation mode | PASS | `present.tsx` |
| Auth: invite-only, no public sign-up, password reset, magic link | PASS | `app/(auth)/*`, `access_hardening` migration, e2e `team.spec.ts`. Team invites from Settings → Team (team admins) land in the team workspace |
| Editor panel collapse (block library / details panel) | PASS | Batch 4: desktop toolbar toggles; the canvas takes the space; remembered in the editor view options; tablet and phone keep their drawers. e2e `workspaces.spec.ts` "editor panels" |
| Roles (Owner / Admin / Editor / Viewer) | PASS | Per workspace membership (`workspace_members.role`), migration `20261011000000_roles.sql`; RLS: `can_write()` on every data policy, read policies for all members; protected owner, ownership handover, creators own workspaces; invite with a role; read-only UI for viewers on every write path. `docs/concepts/roles.md`; DB `roles.test.ts`, e2e `v1.spec.ts` |
| Independent users (separate workspace, private sign-up URL, owner-created accounts) | PASS | Batch 4: `workspaces` table (team + personal), `workspace_id` on every data table; created from Settings → Independent accounts (team admins) or the private `/join/<INDEPENDENT_SIGNUP_CODE>` URL (404 otherwise). Tests: `tests/integration/workspaces.test.ts`, e2e `workspaces.spec.ts` |
| RLS / data isolation | PASS | Batch 4: every policy is `workspace_id = current_workspace_id()`. Child rows inherit their parent's workspace via trigger. Storage is scoped by owner folder and thumbnail funnel. 37 DB tests, including cross-tenant reads, writes, attach and move attempts, storage, share links and templates |
| Exports: CSV / JSON / import round-trip | PASS | CSV now ends with a scenario comparison when scenarios exist; JSON round-trips goals, notes, reinvestment, step status and the new elements (all in the graph/settings schema). Unit-tested |
| Export: SVG / PNG | PASS | Batch 3 fidelity work, plus final V1: new shapes and link cards drawn, rich notes as plain text, hidden layers left out, and Light / Dark / Transparent background (File → Export → Image background). Unit + checked visually |
| Export: PDF report | PASS | Batch 3 sections plus final V1: Executive summary (year at today's rates, key leak), named goals with required numbers or conversion impact, MRR forecast, traffic reinvestment (only when a rate is chosen), build status. Every figure from `lib/report-data.ts`; checked visually |
| Locked Emerald UI direction | PASS | Batch 2 `app/globals.css`: dark-first locked tokens (canvas #0B1220, library #0F172A, chrome #111827, panels #1E293B, borders #334155, text #E2E8F0/#94A3B8, Emerald #10B981/#059669/#047857/#34D399, semantic category colours); light theme kept as an option. Layout unchanged |
| Responsive / accessibility | PASS | e2e tablet/phone checks and an axe scan pass |
| Deployment | READY (not applied) | `npm run deploy` now matches hand-migrated histories by name and refuses gaps (`MIGRATIONS_BASELINE`), unit-tested. Demo (`arwedmqmxrxllytzriat`) has everything up to `20261009000000_workspace_members`; production (`kyhlhacbmlbkiibvpsel`) has 3 of 12. Superseded: every migration is applied to `arwedmqmxrxllytzriat` (see the 8 Oct deployment status); `kyhlhacbmlbkiibvpsel` is unused by the deployed domains |

## C. Gap matrix

| Bucket | Items |
|---|---|
| 1. Working, preserve | everything in B marked PASS, including: maths engine and tests; canvas core (drag, connect, select, copy/paste, align, frames, undo, minimap, snap); inspector numbers; KPI bar; report tabs; what-if/goal seek; costs; actuals; forecast; templates; autosave/offline/versions; sharing/comments/privacy; auth/invite/RLS/private storage; CSV/JSON import/export; presentation mode; dashboard; clients/products/logo |
| 2. Complete enough | Tidy Up for flow blocks (flow blocks keep a standard size); editorial pass on dashboard/list pages (Emerald tokens applied, layouts kept) |
| 3. Broken | none known |
| 4. Partially implemented | none of the in-scope V1 requirements (see the known limits below) |
| 5. Missing but required | none |
| 6. Missing but clearly implied | none known; small follow-ups are listed under "Known limits" |
| 7. Out of scope (handoff §18) | AI features, multiplayer, tracking scripts, deep ad/CRM integrations, marketplace, benchmark DB, white-label portal |

## D. Test status

| Suite | Audit | After Batch 1 | After Batch 2 | After Batch 3 | After Batch 4 | **Final V1** |
|---|---|---|---|---|---|---|
| Unit (Vitest) | 73/73 | 91/91 | 102/102 | 115/115 (+13 `tests/unit/export-report.test.ts`: report data equals the engine on the golden funnel, map SVG keeps elements/styles/bounds, text wrap) | **115/115** (maths unchanged) | **139/139** (+ `reports.test.ts`, `rich-text.test.ts`, `deploy-migrations.test.ts`, V1 export/report cases; golden values unchanged) |
| Database/RLS | 22/22 | 22/22 | 22/22 | 22/22 | **37/37** (+15 `tests/integration/workspaces.test.ts`) | **48/48** (+ `roles.test.ts`, share-notes case; main's workspace tests), files run in sequence, stable over repeated runs |
| E2E (Playwright, production build, fresh `db reset`) | 58/59 | 62/62 | 67/67 | 68/68 (+ `exports.spec.ts`: PDF sections and values vs the engine, SVG elements and embedded fonts, PNG size, KPIs unchanged) | **73/74** (+6 `workspaces.spec.ts`). The 1 failure is the pre-existing intermittent "Tidy up keeps notes…" overlap: it also fails on the Batch 3 editor code (1 of 5 runs) | **88/88** (+ `v1.spec.ts`: reports, goals, status, scenarios, reinvestment, notes and share privacy, layers, Analytics, library and quick-add, viewer, roles, archive, logo upload). The Tidy test now reads boxes in one frame: 16/16 repeats |
| Typecheck / ESLint / `next build` | clean | clean | clean | clean | clean | clean |

E2E needs the local stack (`npx supabase start && npx supabase db reset`), `SUPABASE_SERVICE_ROLE_KEY` and an `INDEPENDENT_SIGNUP_CODE` (8+ characters) in `.env.local`, then `npm run build && E2E_PROD=1 npx playwright test`.

## E. Maths status: PASS

Golden quiz funnel, from the engine (`compute`) and confirmed in the live editor KPI bar:

- traffic 2,500
- quiz 1,000
- trial 150
- paid 60
- No path 90
- call 54
- after-call 18.9
- discounted 10.2
- customers 89.1
- revenue 6,032.11 (made up of 4,199.40 + 1,322.81 + 509.90)
- spend 450
- profit 5,582.11
- ROAS 13.40x

The editor, reports, saved summaries (dashboard, client page) and exports all use `lib/funnel-math.ts`; no surface reimplements the formulas. Scenarios reuse `compute` with what-if multipliers (`computeScenario`).

## F. Known-bug status (handoff §13)

| Bug | Current status |
|---|---|
| Maths discrepancy (70.2 / 4,709) | **Not reproducible.** The engine and the editor show 89.1 / 6,032 |
| Tidy Up and canvas text | **FIXED** in Batch 1 (placement preserved, measured sizes, no overlaps). The intermittent e2e failure was the test reading boxes across zoom-animation frames, not the layout (positions are deterministic); the test now reads all boxes in one frame and passed 16/16 repeats |
| PNG export fidelity | **FIXED** in Batch 3 (embedded fonts, true bounds, styles; compared visually with the canvas) |
| PDF export fidelity and composition | **FIXED** in Batch 3 (all report sections, Emerald branding, page numbers) |
| Share modal centring | **FIXED** in Batch 1 (shared `dialog.modal` rule) |
| Client pricing model | **DONE** in Batch 1 |
| Client logo | **PASS** (upload, preview, persist, remove; e2e `v1.spec.ts`) |
| Import/export round-trip | **PASS** (unit-tested) |
| Auth/RLS cross-tenant | **PASS**: independent users, multiple workspaces and per-workspace roles, with cross-tenant and viewer write tests |
| Autosave / versioning | **PASS** (e2e) |

## G. Security / auth / RLS: PASS for the current model

- Every internal route requires a session (`proxy.ts` plus `requireUser`).
- There is no public sign-up, and self-created accounts start with no access.
- RLS uses SECURITY DEFINER membership checks.
- Members can't change roles or activate themselves.
- Screenshots and thumbnails are private.
- Share links go through RPCs that strip internal notes and screenshots, and hidden-number links strip all figures.
- Independent users have isolated workspaces (Batch 4), covered by cross-tenant DB tests. The private sign-up URL is `/join/<code>`.
- Owner / Admin / Editor / Viewer per workspace: viewers can read but every write is refused by RLS (tables and storage); the owner can't be demoted, deactivated or removed except by their own handover.
- Funnel-level notes are stripped from share links unless shared on purpose, and a client's edit link can't change them.
- Rich text never renders HTML; links are limited to http(s)/mailto.

## H. UI/UX status: PASS for the locked Emerald tokens (Batch 2)

- The locked Emerald tokens are applied, dark-first (light theme kept as an option). Fonts: Bricolage (display) and DM Sans.
- Reports use an editorial layout (typography, rules and spacing, no card stacks), and the chart palette is validated for colour-blind separation and contrast in both themes (`--chart-1..4`).
- Kept as is: the card-based dashboard and client lists (working, tested; a visual restyle isn't a V1 requirement).
- The layout follows the required structure:
  - top toolbar
  - left library (drawer on small screens)
  - canvas
  - right report/inspector panel
  - bottom KPI bar
- Accessible and responsive, with e2e and axe checks passing.

## Batch 1 (done)

- **Modals:** shared `dialog.modal` CSS restores centring (Tailwind's reset set `margin: 0`), and tall dialogs scroll inside the viewport.
- **Golden maths test:** `tests/unit/golden.test.ts`, with no formula changes.
- **Password-reset e2e:** uses its own throwaway account per run (created and removed with the service role on the local stack) and ignores emails sent before the request. The app's reset flow and Supabase rate limits are unchanged. Also checks that the new password works and the old one doesn't. The magic-link test got the same "fresh email only" filter.
- **Client pricing model:** the six models above, with their fields. Additive migration; legacy rows read as retainers; switching model clears the old model's fields on save; end-before-start dates are rejected (form and database).
- **Tidy Up:** see table.
- **Also fixed:** the share edit-link e2e now checks that internal notes survive a client edit in the stored funnel, instead of clicking a block that the client's new block could land on.

## Batch 2 (done)

- **Emerald reskin:** `app/globals.css` tokens (dark-first, light option), `components/theme-toggle.tsx`, `components/app-nav.tsx` active marker, `components/editor/editor.css` (inspector on panel colour, note paper, frame titles, icon contrast).
- **Data model** (additive, optional; old funnels unchanged): node `s` style, `locked`, `z`, `checklist`; edge `s` style (`lib/graph.ts`, `lib/style.ts`). New annotation types in `lib/catalog.ts`: `shape`, `image`, `checklist`.
- **Store** (`lib/editor/store.ts`): `setLocked`, `reorder`, `layerOf`, `setNodeStyle`, `setEdgeStyle`, `setChecklist`. Lock-aware delete, nudge and align; copies start unlocked; inspector tab remembered.
- **Canvas** (`canvas.tsx`, `nodes.tsx`, `flow-edge.tsx`): styled rendering, new node types, z-order, lock (non-draggable, non-deletable), resizing. Edges: path, dash, colour, width, arrows, skip/no-data.
- **Inspector** (`inspector.tsx`, new `style-panel.tsx`): Details / Style / Plan tabs; "Size (px)" renamed "Font Size"; connection Line style section; multi-select Arrange.
- **Tidy Up:** carries shapes, images and checklists like notes. Locked elements stay put. Waits for web fonts and one re-measure before laying out, which fixed an intermittent note overlap.
- **Shortcuts:** Ctrl ] / Ctrl [ (with Shift: to front / to back), Ctrl Shift K lock.
- **Share privacy:** migration `20261006000000_canvas_elements_share.sql` (functions replaced in place, no drops).
- **Map export:** basic drawing of shapes, images, checklists and connection styles (no export redesign).

**Known limits:**
- flow blocks can't be resized (standard size keeps Tidy and exports aligned)
- no rich-text notes yet
- no per-element Analytics tab
- PDF/PNG don't apply block fill/border styles
- the built-in "PT tripwire" template still has a purple stage frame (template content)

## Batch 3 (done): client-facing exports

- **New** `lib/report-data.ts`: report sections assembled from the engine (no formulas of its own).
- `lib/export.ts`: `mapSvg` rewritten in place (same signature plus optional `widthOf`, `thick`, `fonts`, `measure`), `mapBounds`, `wrapText`; light palette moved to the locked slate/Emerald tokens.
- `lib/editor/labels.ts`: `edgePath` moved here from `flow-edge.tsx` so the canvas and the export draw identical connections.
- `components/editor/exporters.ts`: `renderMapSvg` (fonts, measuring, image inlining), multi-page `pdfReport`; `editor.tsx` passes settings and measured sizes.

**Known export limits:**
- jsPDF's built-in Helvetica covers Windows-1252 only: other characters in names (e.g. emoji, non-Latin scripts) print as "?"; ₹ prints as "Rs".
- Block shadows are not drawn in the SVG/PNG; light background only (no dark/transparent option).
- Text wrapping in the export is computed, so a line can occasionally break one word differently from the canvas.
- Remote images that block cross-origin requests can't be inlined: they show in the .svg file but not in the PNG/PDF.
- The required-numbers table covers the revenue target (`targetPlan`); goal-seek inputs are not saved, so they aren't in the PDF.

## Batch 4 (done): workspaces, team, editor panels

- **Concept:** `docs/concepts/workspaces-and-team.md`.
- **Migration** `20261007000000_workspaces.sql` (additive; no DROP; applied cleanly over the seeded data before a fresh reset, and every existing row was backfilled to the team workspace):
  - new `workspaces` (one `team`, many `personal`) and `workspace_signups` (service-role only);
  - `profiles.workspace_id` (membership = profile: one workspace per account, next to role/active);
  - `workspace_id` on clients, funnels, versions, actuals, share links, comments, products and templates (built-ins stay global);
  - inherit-from-parent triggers;
  - `current_workspace_id()`, with all policies changed via `ALTER POLICY`;
  - storage policies scoped by workspace;
  - share pages branded from the funnel's workspace;
  - `handle_new_user()` creates a personal workspace for pending independent sign-ups;
  - profile guard: nobody but the service role changes an account's workspace, and last admin is checked per workspace.
  - The legacy single-row `workspace` table is kept, frozen and team-only.
- **App:**
  - `requireUser()` returns `workspace` (from `workspaces`) and `isTeam`. Branding and logo actions update the caller's workspace.
  - Team invites are restricted to the team workspace.
  - `lib/independent.ts` (server-only) handles independent account creation.
  - Settings → Independent accounts: form plus the private link.
  - `/join/[code]` private sign-up, which is public in the proxy and returns 404 without the code.
  - Personal workspaces see "Private workspace" and "Your templates".
  - Neutral sign-in and magic-link copy; invite email has personal wording; email buttons are Emerald.
- **Editor:** desktop toggles to collapse/expand the block library and the details panel. They are stored in `ViewOpts` (`hideSide`/`hideInsp`, `fm-editor-opts`). Version history and comments re-open the right panel.
- **Seed:** `solo@independent.test` and `solo2@independent.test` with private workspaces, a client, a funnel, a share link and a product.
- **Deploy notes:**
  - Apply the migration to production (no `DROP`, so the Supabase connector can run it).
  - Paste the updated `supabase/templates/invite.html`.
  - Optionally set `INDEPENDENT_SIGNUP_CODE`.
- **Known/deferred:**
  - Owner/Editor/Viewer roles.
  - No in-app list or deletion of independent accounts (use the Supabase dashboard).
  - A person can't belong to two workspaces.
  - Pre-existing intermittent Tidy Up note overlap (e2e "Tidy up keeps notes…", reproduced on the Batch 3 code; likely a measurement race in `lib/layout.ts` collision avoidance). Not touched, per the scope rules.

## Batch 4 follow-up (done): demo access fix

- **Symptom:** on the live demo, the existing demo account was signed out with "Your access to this workspace has been removed".
- **Root cause:**
  - PR #3 (Batch 4 code) auto-deployed, but its migration `20261007000000_workspaces.sql` had never been applied to the demo database (`arwedmqmxrxllytzriat`): there was no `workspaces` table and no `profiles.workspace_id`.
  - The new `requireUser()` profile+workspace query therefore failed, and the failure was treated like a removed member.
- **Fix:**
  1. **Demo database:** the workspaces migration is now applied, in chunks: `workspaces_1_membership`, `_2_data_columns`, `_3_table_policies`, `_4a_guard_share`, `_4b_signups`, `_5_storage`. This is the same SQL as the repo migrations 20261007 + 20261008.
     - All existing users, clients (4) and funnels (11) are in the Layer2Funnels team workspace.
     - 20 policies are workspace-scoped.
     - A signed-in non-member sees nothing.
  2. **Migration tooling:**
     - The Supabase connector hangs on SQL containing destructive statements (`DROP`, `DELETE`): it waits for a confirmation that can't be given.
     - New migration `20261008000000_signup_cleanup.sql` therefore moves the pending sign-up clean-up out of `handle_new_user()` and into `lib/independent.ts` (service role, right after the invite).
     - Behaviour is unchanged. A leftover row can only make a future account with that email private, never grant team access.
     - The 20261007 header comment no longer contains the word DROP.
  3. **`requireUser()`:** a failed query now raises an error instead of redirecting to "access removed". Infrastructure problems no longer sign people out or look like a permissions decision.
- **Demo-only account:**
  - A dedicated **Demo Owner**, `demo-owner@layer2funnels.test`, is an active admin of the team workspace.
  - It was created directly in the demo database with a bcrypt hash computed locally; the password is not stored in the repository.
  - It was verified by signing in on https://funnel-mapper-demo.vercel.app: dashboard, clients and Settings → Team all load.
- **Existing `demo@layer2funnels.test`:** verified server-side as that user.
  - Profile active admin; team workspace; 4 clients; 11 funnels visible.
  - Its demo-environment password is not the local seed password, so a browser login was not re-run with it.
- **Tests:**
  - DB 37/37 and unit 115/115; typecheck, lint and build clean.
  - e2e `workspaces` + `team` + `privacy` 24/24.
- **Still to do:**
  - Superseded: the deployed domains run on `arwedmqmxrxllytzriat`, which has every migration. `kyhlhacbmlbkiibvpsel` (3 migrations) is not used by either domain and was left untouched.
  - Until this follow-up is deployed to the demo, an independent sign-up there leaves its (harmless) pending row behind.

## Workspace/auth completion pass (done)

- **Invite acceptance:**
  - Supabase's standard invite link returns the session in the URL fragment, which the server-side `/auth/callback` couldn't read. The invitee's account was created and activated in the team workspace, but they were bounced to "link invalid" and never got a session.
  - New `app/auth/accept/page.tsx` stores the fragment session and continues to choose-password. `/auth/callback` (no `code`) and `/login` (Site URL fallback) forward such links to it.
  - Invite redirects use the request's own address when `NEXT_PUBLIC_SITE_URL` isn't set.
- **Workspace identity:** Settings → Workspace says "You're in <name>" with a Layer2Funnels team workspace / Private workspace label. The sidebar footer shows "Team workspace" or "Private workspace". There's no switcher: one workspace per account.
- **Private sign-up:** `/join/<INDEPENDENT_SIGNUP_CODE>` is unchanged; it only needs configuration.
- **No migration.**
- **Tests:** e2e `workspaces` + `team` 15/15 (new: both standard-invite-link paths, workspace identity); DB 37/37.

## Multiple workspaces (done)

- **What:**
  - Admins create workspaces from the left menu. Each has its own clients, funnels, templates, files and teammates.
  - People switch between the workspaces they're active members of. Nobody can switch into one without access, which the database enforces.
  - The Settings team list, invites (existing accounts are added directly), roles, deactivate and remove all work per workspace.
- **Migration:** `20261009000000_workspace_members.sql` (additive; backfilled from profiles, so access is unchanged).
  - It's compatible with the previous app code, so it can be applied before the new code deploys.
  - It contains no DROP/DELETE statements, so the Supabase connector can apply it.
- **Tests:** database 38/38 (new: create/switch/membership/isolation between created workspaces); unit 115/115; full e2e 80/80 (new: create and switch from the left menu; members can't create).
- **Deferred:** an uploader's private screenshots are readable by every workspace they belong to (stored per user, not per workspace).

## Final V1 completion (done)

**Plan (from this file's remaining PARTIAL/FAIL/deferred rows), in dependency order:**
1. Engine and data model.
2. Block library.
3. Reports area with goals, forecast and scenarios.
4. Notes, layers and the Analytics tab.
5. Roles.
6. Client archive, exports, the Tidy flake, deployment readiness and final QA.

**What was built**
- **Engine** (`lib/funnel-math.ts`, additive):
  - `project()` rows itemised (ad spend, follow-up, delivery, expenses, leads, orders, cumulative revenue) plus optional reinvestment (paid traffic grows by the reinvested budget at today's cost per paid visitor; free traffic unchanged).
  - `periodNumbers`/`periodFactor`, `goalPlan`, `withStepRate`/`stepRate`, `leaks`.
  - `compute` accepts a `sources` filter.
  - Type checks go through `baseOf()`/`isShareLogic()` so new block types reuse existing formulas.
  - `lib/report-data.ts` assembles overview, leaks, reinvestment, goals and status.
- **Data model** (`lib/graph.ts`, all optional or defaulted, so old funnels parse unchanged):
  - `settings.goals`, `settings.notes {body, shared}`, `settings.reinvest {pct, months}` (opt-in, default 0%).
  - `scenario.kind`, `node.status`.
- **UI:**
  - `components/editor/reports-view.tsx` + `report-charts.tsx` (Reports).
  - `palette.tsx` (groups, favourites, recents), `quick-add.tsx`.
  - `components/rich-text.tsx` + `lib/rich-text.ts`, `canvas-notes.tsx`.
  - Layers in the View menu; Plan / Analytics tabs.
  - Link/video node and SVG shapes; scenario kinds and duplicate.
  - Client archive; role-aware settings, pages and editor.
- **Migrations** (after `main`'s `20261009000000_workspace_members.sql`):
  - `20261010000000_share_notes.sql`, `20261011000000_roles.sql`, `20261012000000_client_archive.sql`.
  - Seed: `viewer@layer2funnels.test` (password `demo-password`), a Viewer in the team workspace.
- **Merged `main`** (multiple workspaces, remove teammate): roles were rebuilt on `workspace_members`; my migrations were renumbered after it.
- **Deploy tooling:** `pendingMigrations()` matches dashboard-applied histories by name (including chunked names), refuses gaps, and supports `MIGRATIONS_BASELINE`. The old script would have re-applied `init` on the demo and production databases.
- **Bugs found and fixed on the way:**
  - Inspector tabs were disabled for read-only users: they sat inside a disabled `<fieldset>`.
  - Selecting a block while the funnel notes were open didn't show the block.
  - The flaky Tidy e2e (a test race, not a layout bug).
  - The DB test files ran in parallel against one database; they now run in sequence.

**Known limits (accepted for V1)**
- Reinvestment compounds: a very profitable funnel at a high rate grows to unrealistic numbers. That's the model (as in GERU-style tools). It's opt-in and starts from a prompt.
- Rich text is stored as Markdown-style text with a toolbar and preview, not a WYSIWYG editor: safe by construction, and it round-trips through JSON and exports.
- Recents and favourites are per device (browser storage).
- jsPDF's Helvetica covers Windows-1252 only (non-Latin characters print as "?"). Remote images that block CORS don't reach the PNG/PDF.
- Share-link recipients have no account (invite-only), so "duplicate from a share link" doesn't apply. Signed-in teammates use Duplicate funnel.
- `profiles.role` is legacy (roles live on `workspace_members`).
- `npm run gen:sql` also regenerates the already-applied built-in templates migration (its settings JSON gains the new default keys). Don't commit that file's diff.

**Deployment status:** see table B, row "Deployment", and `docs/deployment.md` → "Databases that were migrated by hand".

## Phase 1 (done): V2 foundations, 169-block visual system, D1 shell, D2 editor chrome

Details and decisions: `docs/PHASE_1_HANDOFF.md`. Maths, database, RLS, auth, roles, reports, exports and block type keys unchanged.

- **Baseline recorded before UI work** (local Supabase + production build): unit 139/139, DB 48/48, E2E 87/88 (the one failure, "client details, notes and products", is an intermittent save-before-reload race in the test: it passed 2/2 alone).
- **Tokens:** `--lost` (orange, people lost) and `--attention` (amber).
- **169-block visual system:** `lib/block-visuals.ts` (data) + `components/editor/block-visual.tsx` (renderers) + `BlockNode`; one card renderer for library, canvas, performance map, presentation and shared view. Interim baseline; the final Figma library replaces the data. Card footprint stays 210x96. Map export does not draw families yet.
- **D1:** 232px sidebar, 64px rail, drawer, phone tab bar, workspace popover, top strip (quick search, New client / New funnel).
- **D2:** V2 top bar, 48px rail, 256px library with categories, Clean | Performance switch, KPI strip with checks chip and "+9 more", mid-width overlay library.
- **Tests:** unit 143/143 (+4 block-visual tests), DB 48/48; E2E 88/88 (two tests clicked a canvas point now covered by the Clean / Performance switch; the click moved).

## V2 final completion pass (checkpoint)

See `docs/PHASE_1_FINAL_COMPLETION.md` for what was built, decisions and remaining work. DB 52/52, unit 209/209, E2E 151/151, typecheck / lint / build clean. Final QA pass: see "Final Phase 1 QA and completion pass" in the same file. Owner actions still open: apply pending migrations (docs/deployment.md), set CAPTURE_URL_TEMPLATE for automatic thumbnails; final Figma 169 visuals not available.
Migration `20261013000000_workspace_assets.sql` (style presets, workspace blocks): applied to `arwedmqmxrxllytzriat` on 8 Oct, together with trash, actuals_source and image_limit.

## 9 Oct overnight batch: phone / tablet layouts, desktop polish, Export step

Branch `claude/vibrant-hypatia-66sckx` (one PR). No maths, database, RLS or auth change; no migration in this batch.

- **Phone / tablet:** one-row app header, Clients filters behind a button, Templates search with compact cards and a drawer below 1280, Funnels table at 1024, tables stack as labelled rows on phone, Map | Reports toggle in the editor header, Blocks library as a bottom sheet on phone, 40px (tablet / touch) and 44px (phone) targets.
- **Desktop polish:** KPI strip counts the figures that fit its real width (the rest sit behind "+N more"), edge labels sit above blocks, frames are quiet, panel figures use a grid, light-theme shadows and contrast.
- **Export step** (`components/editor/export-dialog.tsx`, File menu > "Export options..."): choose the PDF sections (cover, map and key numbers always print), the map image format (PNG / SVG) and its background for that export, and the data files. The quick File menu items still export everything.
- **Shared client view:** the Funnel notes button now shows on desktop when the owner shares the notes (it was only reachable on small screens).
- **"/"** focuses the Blocks sidebar search (V2 design); help text and the empty-canvas context menu no longer call it quick add (double-click the canvas still opens quick add).
- **Tests:** unit 263/263, DB 55/55, E2E desktop 158/158 (the full run found three drifted legacy tests, now aligned with V2: KPI "more" popover for ROAS, "/" shortcut, quick-add search term), typecheck clean, lint 0 errors (9 existing warnings), production build clean.
- **Still open (design):** action diamonds, message capsules and goal capsule details, Trash / States / V2-appearance boards, 768 / 430 board comparisons, Present stage-tag overlap at the smallest widths, block labels at the default phone zoom, phone sheet header height, hatched logic blocks (left as is).
- **Deployment:** the Vercel preview for this PR is the place to look; production deploys from main when the owner merges. Pending migrations: see "V2 final completion pass" above.

## I. Recommended order (history)

1. ~~Quick P0 fixes~~ · 2. ~~Client pricing model~~ · 3. ~~Tidy Up~~ (Batch 1) · ~~Emerald reskin~~ · ~~Canvas completeness~~ (Batch 2)
4. ~~Exports~~ (Batch 3)
5. ~~Emerald re-skin~~ · 6. ~~Canvas completeness~~ (Batch 2). Follow-ups: rich-text notes, per-element Analytics tab, an editorial pass on card-heavy pages.
7. ~~**Reports area:**~~ (final V1 completion) a report view built from existing `compute`/`project` output, adding traffic reinvestment, MRR, month-to-month, published status and required numbers per period.
8. ~~Independent users / per-workspace tenancy~~ (Batch 4). ~~Roles~~ (final V1 completion).
9. ~~Final QA~~ (final V1 completion). **Deploy:** apply the pending migrations to the demo and production databases with the merge (owner's call: production was paused at the user's request), then `npm run live-check`.
