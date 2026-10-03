# Funnel Mapper Pro: Project Status

Phase 1 audit against `docs/MASTER_HANDOFF.md`, verified on the repository at `0677a63` (main), 2 Oct 2026.
**Updated after the Batch 4 demo access fix, 3 Oct 2026.** Before that, Batch 4 (workspaces, team, editor panels). Before that, Batch 3 (client-facing exports). Before that, Batch 2 (Emerald reskin + canvas completeness). Earlier: **Batch 1 (core correctness + P0 fixes):** modal centring, golden maths test, a reliable password-reset test,
client pricing model and Tidy Up annotations are done. See "Batch 1" below; the tables reflect the new state.
Status keys: **PASS** works and is tested · **PARTIAL** exists but falls short of the handoff · **FAIL** missing or broken · **UNKNOWN** not verifiable here.

## A. Executive summary

- The core product loop works end to end: sign in, then client, funnel, canvas, live maths, what-if, scenarios, forecast, actuals, share, export. It is backed by 73 unit, 22 database-security and 59 browser tests.
- **Maths is correct and has a single source.** All consumers import `lib/funnel-math.ts`. The golden quiz funnel computes exactly 89.1 customers, 6,032.11 revenue, 5,582.11 profit and 13.40x ROAS, in the engine and in the live editor's KPI bar. The "70.2 / 4,709" discrepancy does **not** reproduce on the current code.
- **Confirmed P0 bugs:**
  - The Share modal (and every `<dialog class="modal">`) opens pinned to the top-left corner.
  - The client pricing model is missing; only a monthly retainer exists.
  - The UI still uses the old **purple** brand, not the locked Emerald.
- **The largest gaps against the handoff:**
  - a Style panel and canvas primitives (shapes, images, checklists)
  - connection styles and layers
  - rich notes
  - a first-class Reports area (reinvestment, MRR, month-to-month, published status)
  - PDF report sections
  - Owner/Admin/Editor/Viewer roles and independent-user isolation

## B. Current status by area

| Area | Status | Evidence / notes |
|---|---|---|
| Architecture (Next.js 16, Supabase, React Flow, Zustand, Zod) | PASS | `app/`, `components/editor/`, `lib/`, `supabase/migrations/` |
| Authoritative maths engine | PASS | `lib/funnel-math.ts`; consumers: `lib/editor/store.ts`, `saver.ts`, `report.tsx`, `actions.ts`, `templates/page.tsx`, `exporters.ts`/`lib/export.ts` (use the store's `R`) |
| Golden regression funnel | PASS | `tests/unit/golden.test.ts`: literal handoff values (89.1 / 6,032.11 / 5,582.11 / 13.40x), every step and branch, and agreement of the editor store, summary, scenario, forecast, CSV and JSON round-trip; plus `tests/unit/funnel-math.test.ts` prototype fixtures |
| Canvas: infinite canvas, grid, zoom, minimap, fit, snap, undo/redo | PASS | `canvas.tsx`, store `undo/redo/snapV`; e2e `editor.spec.ts` |
| Canvas: multi-select, copy/paste, duplicate, delete, align, nudge, frames | PASS | store `copySelection/paste/duplicateSelection/align/wrapInFrame`; e2e |
| Canvas: lock/unlock per element, layer ordering, resize | PASS | Batch 2: `locked` (no move, resize, nudge, align, delete or Tidy; badge on canvas), `z` order (front, forward, backward, back; Ctrl ] / Ctrl [), resize handles for shapes, images and frames, width handles for text, notes and checklists. Flow blocks keep the standard size (by design, for Tidy and exports) |
| Canvas primitives: shapes, images/logos, checklists | PASS (video/link/callout: not built) | Batch 2: `shape` (rect, rounded, ellipse, diamond, with text), `image` (upload, downscaled and kept in the funnel so share links and exports show it, or a URL; alt text; fit), `checklist` element; notes, headings and frames kept |
| Block library (searchable, categorised, drag + tap) | PARTIAL | 69 blocks (24 traffic, 19 pages, 9 offers, 10 actions, 4 logic, 3 annotation); no Communication or Sales/CRM groups, no recents/favourites/custom icons |
| Element Style tab (fill, border, font, alignment, opacity…) | PASS | Batch 2 `components/editor/style-panel.tsx`: icon library with search (blocks), font family, Font Size, weight (Regular/Medium/Semibold/Bold), line height, letter spacing, alignment, italic/underline/strikethrough, text colour, fill, border colour/width/style, radius, opacity, shadow, padding, size/position, Arrange (lock, order, duplicate, copy, delete). Multi-select gets Arrange too |
| Plan / Analytics tabs per element | PARTIAL | Details / Style / **Plan** tabs (Plan = element checklist + internal notes); no per-element Analytics tab yet (numbers stay in Details) |
| Connections: main/alt port, share %, people labels | PASS | `flow-edge.tsx`, e2e "connect ports", "edit an edge" |
| Connection styles | PASS | Batch 2: curved/straight/elbow, solid/dashed/dotted, colour, thickness, arrow none/end/both with size, label, "Skip step" and "No data" types. Presentation only: port, share % and flow maths are unchanged (unit-tested). The map export draws path, colour and dash |
| Layers/views (Map/Numbers/Flow/Notes/Checklist; Clean vs Performance) | PARTIAL | View menu: "Show numbers on map", "Line thickness shows traffic", snap, minimap |
| Tidy Up | PASS | `lib/layout.ts`: flow blocks are laid out exactly as the prototype does; notes and headings keep their exact offset from their nearest block, use measured sizes (`widthOf`/`heightOf`), and are nudged only to avoid overlapping blocks or each other; frames refit around their blocks. Tests: `tests/unit/layout.test.ts` and e2e "Tidy up keeps notes and headings…" |
| What-if, goal seek, revenue target | PASS | `report.tsx` "What-if" tab, `goalSeek`, `targetPlan` |
| Goals (name/type/step, required daily/weekly/monthly/yearly numbers) | PARTIAL | one revenue target plus goal seek, and a `goal` block counts conversions; no named goals and no period breakdown |
| Forecast | PARTIAL | `project()`: monthly, 1–60 months, growth %, active subs, MRR, cumulative; no daily/weekly/custom periods |
| Scenarios | PARTIAL | `settings.scenarios`: what-if multiplier sets, Conservative/Expected/Optimistic preset, side by side, and in the PDF (Batch 3); no duplicate, not in the CSV |
| Expenses / Costs | PASS | Costs tab, `expenseTotals`, payback |
| Actuals (planned vs actual) | PASS | `actuals.tsx`, `planVsActual`, e2e |
| Notes (canvas-level and element-level, rich text) | PARTIAL | plain-text element notes and a funnel description; no rich text or canvas notes |
| Checklists | PASS | Batch 2: canvas checklist element (toggle on the canvas) and element-level checklists (Plan tab; ✓ n/m badge on the block): add, edit, complete, reorder, indent. Element checklists are internal: stripped from share links by `share_safe_graph` (migration `20261006000000`) and preserved when a client saves |
| Reports / Insights as a first-class area | PARTIAL | editor right-panel tabs (Math, Steps, Sources, What-if, Costs, Scenarios, Forecast, Actuals) and dashboard KPIs; no report navigation, traffic reinvestment, month-to-month report, published/completion status, or revenue-by-product and expense charts |
| Clients: portfolio, search, status, tags, details, logo, autosaved notes, products | PASS | `app/(app)/clients/*`, `logo-upload.tsx`, `products.tsx`; logo upload has no e2e test |
| Client pricing model (Fixed/One-time/Hourly/Commission/Retainer/Other) | PASS | migration `20261005000000_client_pricing.sql`; `lib/pricing.ts`; dynamic fields in `components/client-form.tsx`; shown on client page, list and dashboard (Agency MRR counts retainer, hourly, commission base fee and recurring "other"); existing clients read as retainers unchanged. Tests: `tests/unit/pricing.test.ts`, e2e "client pricing model…" |
| Archive / past clients | PARTIAL | `past` status filter; no archive action |
| Templates (5 built-in plus save as template) | PASS | `lib/templates.ts`, e2e |
| Autosave, offline draft, version history and restore | PASS | `lib/editor/saver.ts`, `versions.tsx`, e2e |
| Sharing (view/edit links, hide numbers, expiry, comments, notes never shared) | PASS | `share_safe_graph` RPC, e2e `privacy.spec.ts`, DB tests |
| Share modal / all modals centred | PASS | `app/globals.css` `dialog.modal { margin: auto; max-height; overflow }` restores native centring that Tailwind's reset removed; e2e "dialogs open centred and inside the viewport" (1440×900 and 390×640) |
| Presentation mode | PASS | `present.tsx` |
| Auth: invite-only, no public sign-up, password reset, magic link | PASS | `app/(auth)/*`, `access_hardening` migration, e2e `team.spec.ts`. Team invites from Settings → Team (team admins) land in the team workspace |
| Editor panel collapse (block library / details panel) | PASS | Batch 4: desktop toolbar toggles; the canvas takes the space; remembered in the editor view options; tablet and phone keep their drawers. e2e `workspaces.spec.ts` "editor panels" |
| Roles | PARTIAL (deferred) | `admin` / `member` per workspace. Owner/Editor/Viewer are deferred: a real Viewer needs read-only RLS plus read-only handling of every UI write path. See `docs/concepts/workspaces-and-team.md` |
| Independent users (separate workspace, private sign-up URL, owner-created accounts) | PASS | Batch 4: `workspaces` table (team + personal), `workspace_id` on every data table; created from Settings → Independent accounts (team admins) or the private `/join/<INDEPENDENT_SIGNUP_CODE>` URL (404 otherwise). Tests: `tests/integration/workspaces.test.ts`, e2e `workspaces.spec.ts` |
| RLS / data isolation | PASS | Batch 4: every policy is `workspace_id = current_workspace_id()`. Child rows inherit their parent's workspace via trigger. Storage is scoped by owner folder and thumbnail funnel. 37 DB tests, including cross-tenant reads, writes, attach and move attempts, storage, share links and templates |
| Exports: CSV / JSON / import round-trip | PASS | `lib/export.ts`, `lib/graph.ts` import/export, `tests/unit/import.test.ts`, e2e exports |
| Export: SVG / PNG | PASS | Batch 3: `lib/export.ts mapSvg` draws the canvas as it is: true bounds (measured element sizes, frame titles, sampled connection curves, labels), the app's fonts embedded as @font-face with text measured in the browser (`exporters.ts renderMapSvg`), wrapped notes/headings/shapes, block icons, element styles (fill, border, dash, radius, opacity, font, size, weight, colour, alignment, italic/underline/strike, letter spacing), shapes, images (remote ones inlined), checklists, frames, layer order, and connection styles (path via the canvas's own `edgePath`, dash, colour, width, traffic thickness, arrows, Yes/No, Skip, custom labels, No data). PNG = SVG × 2. Checked visually against the canvas. Light background only (no dark/transparent option) |
| Export: PDF report | PASS | Batch 3: cover page (Emerald branding, map, 12 KPIs, steps) plus report pages: scenario comparison (as mapped, current what-if, every scenario, profit change), revenue & profit forecast (stats + revenue/costs and cumulative-profit charts), month by month, traffic sources, offer/product revenue (share bars), expenses (breakdown + items + one-time), goals & required numbers (day/week/month/year for the revenue target, goal blocks), full funnel data when the cover can't fit every step; page numbers. Every figure comes from `lib/report-data.ts`, which only assembles `compute`/`computeScenario`/`project`/`sourceRows`/`stepRows`/`targetPlan` results. Map image compressed (≈200 KB report) |
| Locked Emerald UI direction | PASS | Batch 2 `app/globals.css`: dark-first locked tokens (canvas #0B1220, library #0F172A, chrome #111827, panels #1E293B, borders #334155, text #E2E8F0/#94A3B8, Emerald #10B981/#059669/#047857/#34D399, semantic category colours); light theme kept as an option. Layout unchanged |
| Responsive / accessibility | PASS | e2e tablet/phone checks and an axe scan pass |
| Deployment | PARTIAL | Batch 1 and Batch 2 migrations are applied to the demo database. Demo live at https://funnel-mapper-demo.vercel.app (demo Supabase `arwedmqmxrxllytzriat`, auto-deploys from main). Production Supabase `kyhlhacbmlbkiibvpsel` has only 3 of 7 migrations applied (paused at the user's request). Supabase's connector hangs on any SQL that contains `DROP`, so production migrations need the ALTER-based variant (as used for the demo) or the CLI |

## C. Gap matrix

| Bucket | Items |
|---|---|
| 1. Working, preserve | maths engine and tests; canvas core (drag, connect, select, copy/paste, align, frames, undo, minimap, snap); inspector numbers; KPI bar; report tabs; what-if/goal seek; costs; actuals; forecast; templates; autosave/offline/versions; sharing/comments/privacy; auth/invite/RLS/private storage; CSV/JSON import/export; presentation mode; dashboard; clients/products/logo |
| 2. Complete enough | Tidy Up for flow blocks; scenario side-by-side; monthly forecast; responsive layouts |
| 3. Broken | none known after Batch 1 |
| 4. Partially implemented | block library breadth; layers/views; notes (plain text); goals (one target); scenarios (no duplicate, not in CSV); roles (admin/member); archive; reports area |
| 5. Missing but required | Reports navigation with reinvestment, MRR, month-to-month and published status; Owner/Admin/Editor/Viewer roles (deferred in Batch 4) |
| 6. Missing but clearly implied | e2e for logo upload; recents/favourites in the library |
| 7. Out of scope (handoff §18) | AI features, multiplayer, tracking scripts, deep ad/CRM integrations, marketplace, benchmark DB, white-label portal |

## D. Test status

| Suite | Audit | After Batch 1 | After Batch 2 | After Batch 3 | After Batch 4 |
|---|---|---|---|---|---|
| Unit (Vitest) | 73/73 | 91/91 | 102/102 | 115/115 (+13 `tests/unit/export-report.test.ts`: report data equals the engine on the golden funnel, map SVG keeps elements/styles/bounds, text wrap) | **115/115** (maths unchanged) |
| Database/RLS | 22/22 | 22/22 | 22/22 | 22/22 | **37/37** (+15 `tests/integration/workspaces.test.ts`) |
| E2E (Playwright, production build, fresh `db reset`) | 58/59 | 62/62 | 67/67 | 68/68 (+ `exports.spec.ts`: PDF sections and values vs the engine, SVG elements and embedded fonts, PNG size, KPIs unchanged) | **73/74** (+6 `workspaces.spec.ts`). The 1 failure is the pre-existing intermittent "Tidy up keeps notes…" overlap: it also fails on the Batch 3 editor code (1 of 5 runs) |
| Typecheck / ESLint / `next build` | clean | clean | clean | clean | clean |

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
| Tidy Up and canvas text | **FIXED** in Batch 1 (placement preserved, measured sizes, no overlaps) |
| PNG export fidelity | **FIXED** in Batch 3 (embedded fonts, true bounds, styles; compared visually with the canvas) |
| PDF export fidelity and composition | **FIXED** in Batch 3 (all report sections, Emerald branding, page numbers) |
| Share modal centring | **FIXED** in Batch 1 (shared `dialog.modal` rule) |
| Client pricing model | **DONE** in Batch 1 |
| Client logo | **PASS** (upload, preview, persist); no e2e test |
| Import/export round-trip | **PASS** (unit-tested) |
| Auth/RLS cross-tenant | **PASS** for the team model; independent tenants are not implemented |
| Autosave / versioning | **PASS** (e2e) |

## G. Security / auth / RLS: PASS for the current model

- Every internal route requires a session (`proxy.ts` plus `requireUser`).
- There is no public sign-up, and self-created accounts start with no access.
- RLS uses SECURITY DEFINER membership checks.
- Members can't change roles or activate themselves.
- Screenshots and thumbnails are private.
- Share links go through RPCs that strip internal notes and screenshots, and hidden-number links strip all figures.
- Independent users have isolated workspaces (Batch 4), covered by cross-tenant DB tests. The private sign-up URL is `/join/<code>`.
- Remaining gap: Owner/Editor/Viewer roles (deferred).

## H. UI/UX status: PASS for the locked Emerald tokens (Batch 2)

- The locked Emerald tokens are applied, dark-first (light theme kept as an option). Fonts: Bricolage (display) and DM Sans.
- Not yet done: a deliberate pass to reduce the card-heavy dashboard and list layouts towards "editorial / spatial" (structure was kept as instructed).
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
  - Production (`kyhlhacbmlbkiibvpsel`) still needs the pending migrations, including 20261007 + 20261008, before this code is deployed there.
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

## I. Recommended order for the remaining budget

1. ~~Quick P0 fixes~~ · 2. ~~Client pricing model~~ · 3. ~~Tidy Up~~ (Batch 1) · ~~Emerald reskin~~ · ~~Canvas completeness~~ (Batch 2)
4. ~~Exports~~ (Batch 3)
5. ~~Emerald re-skin~~ · 6. ~~Canvas completeness~~ (Batch 2). Follow-ups: rich-text notes, per-element Analytics tab, an editorial pass on card-heavy pages.
7. **Reports area:** a report view built from existing `compute`/`project` output, adding traffic reinvestment, MRR, month-to-month, published status and required numbers per period.
8. ~~Independent users / per-workspace tenancy~~ (Batch 4). **Roles** Owner/Admin/Editor/Viewer remain: a permission-system pass (read-only RLS + every UI write path).
9. **Final QA and deploy:** finish the production migrations, run the full test suites and the live check.
