# Funnel Mapper Pro: Project Status

Phase 1 audit against `docs/MASTER_HANDOFF.md`, verified on the repository at `0677a63` (main), 2 Oct 2026.
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
| Golden regression funnel | PASS | `tests/unit/funnel-math.test.ts` checks every built-in template (quiz included) node by node against `tests/fixtures/prototype-results.json` |
| Canvas: infinite canvas, grid, zoom, minimap, fit, snap, undo/redo | PASS | `canvas.tsx`, store `undo/redo/snapV`; e2e `editor.spec.ts` |
| Canvas: multi-select, copy/paste, duplicate, delete, align, nudge, frames | PASS | store `copySelection/paste/duplicateSelection/align/wrapInFrame`; e2e |
| Canvas: lock/unlock per element, layer ordering, resize of blocks | FAIL | only a global "View only" lock; no z-order controls |
| Canvas primitives: shapes, images/logos, checklists, callouts, video/link | FAIL | annotation types are only `note`, `label` (heading), `frame` |
| Block library (searchable, categorised, drag + tap) | PARTIAL | 69 blocks (24 traffic, 19 pages, 9 offers, 10 actions, 4 logic, 3 annotation); no Communication or Sales/CRM groups, no recents/favourites/custom icons |
| Element Style tab (fill, border, font, alignment, opacity…) | FAIL | inspector only has frame colour and heading "Size (px)" (`inspector.tsx:98`) |
| Plan / Analytics tabs per element | PARTIAL | per-block internal notes, "what counts as done", numbers; no per-element checklist, forecast or goal |
| Connections: main/alt port, share %, people labels | PASS | `flow-edge.tsx`, e2e "connect ports", "edit an edge" |
| Connection styles (straight/elbow, dashed, colour, arrows, skip/no-data, semantic types) | FAIL | one bezier style; only main/alt and a thickness option |
| Layers/views (Map/Numbers/Flow/Notes/Checklist; Clean vs Performance) | PARTIAL | View menu: "Show numbers on map", "Line thickness shows traffic", snap, minimap |
| Tidy Up | PARTIAL | `lib/layout.ts`: annotations are excluded from the flow layout (good), but notes and headings are **re-anchored below the nearest block** (original placement is not preserved), heading width is assumed to be 300px, and annotation-to-annotation collisions aren't checked |
| What-if, goal seek, revenue target | PASS | `report.tsx` "What-if" tab, `goalSeek`, `targetPlan` |
| Goals (name/type/step, required daily/weekly/monthly/yearly numbers) | PARTIAL | one revenue target plus goal seek, and a `goal` block counts conversions; no named goals and no period breakdown |
| Forecast | PARTIAL | `project()`: monthly, 1–60 months, growth %, active subs, MRR, cumulative; no daily/weekly/custom periods |
| Scenarios | PARTIAL | `settings.scenarios`: what-if multiplier sets, Conservative/Expected/Optimistic preset, side by side; no duplicate, and the PDF/CSV don't include scenarios |
| Expenses / Costs | PASS | Costs tab, `expenseTotals`, payback |
| Actuals (planned vs actual) | PASS | `actuals.tsx`, `planVsActual`, e2e |
| Notes (canvas-level and element-level, rich text) | PARTIAL | plain-text element notes and a funnel description; no rich text or canvas notes |
| Checklists | FAIL | none |
| Reports / Insights as a first-class area | PARTIAL | editor right-panel tabs (Math, Steps, Sources, What-if, Costs, Scenarios, Forecast, Actuals) and dashboard KPIs; no report navigation, traffic reinvestment, month-to-month report, published/completion status, or revenue-by-product and expense charts |
| Clients: portfolio, search, status, tags, details, logo, autosaved notes, products | PASS | `app/(app)/clients/*`, `logo-upload.tsx`, `products.tsx`; logo upload has no e2e test |
| Client pricing model (Fixed/One-time/Hourly/Commission/Retainer/Other) | FAIL | only `monthly_retainer` (`lib/schemas.ts:47`) |
| Archive / past clients | PARTIAL | `past` status filter; no archive action |
| Templates (5 built-in plus save as template) | PASS | `lib/templates.ts`, e2e |
| Autosave, offline draft, version history and restore | PASS | `lib/editor/saver.ts`, `versions.tsx`, e2e |
| Sharing (view/edit links, hide numbers, expiry, comments, notes never shared) | PASS | `share_safe_graph` RPC, e2e `privacy.spec.ts`, DB tests |
| Share modal centred | FAIL | measured box at (0,0) with `margin: 0px` at 1440×900; the CSS reset overrides the native dialog centring for all `dialog.modal` elements |
| Presentation mode | PASS | `present.tsx` |
| Auth: invite-only, no public sign-up, password reset, magic link | PASS | `app/(auth)/*`, `access_hardening` migration, e2e `team.spec.ts` |
| Roles | PARTIAL | `admin` / `member` only; no Owner/Editor/Viewer |
| Independent users (separate workspace, private sign-up URL, owner-created accounts) | FAIL | single shared workspace model |
| RLS / data isolation | PASS (for the current model) | `is_team_member()` policies on every table, private storage; 22 DB tests cover anonymous, uninvited and deactivated users, self-promotion and share-link leakage. Cross-tenant tests are N/A until independent users exist |
| Exports: CSV / JSON / import round-trip | PASS | `lib/export.ts`, `lib/graph.ts` import/export, `tests/unit/import.test.ts`, e2e exports |
| Export: SVG / PNG | PARTIAL | the map is re-drawn as SVG (`lib/export.ts mapSvg`); web fonts aren't embedded (falls back to Arial in PNG), heading width is approximated; no light/dark/transparent choice. Visual fidelity not verified pixel by pixel (UNKNOWN) |
| Export: PDF report | PARTIAL | `exporters.ts pdfReport`: branded header, KPI cards, map image, steps table; **missing** scenario comparison, forecast chart, sources, products, expenses and goals |
| Locked Emerald UI direction | FAIL | `app/globals.css`: `--brand: #5b2fc9` (purple); category colours differ from the locked tokens; layout is card-heavy, not dark-first chrome |
| Responsive / accessibility | PASS | e2e tablet/phone checks and an axe scan pass |
| Deployment | PARTIAL | demo live at https://funnel-mapper-demo.vercel.app (demo Supabase `arwedmqmxrxllytzriat`, auto-deploys from main). Production Supabase `kyhlhacbmlbkiibvpsel` has only 3 of 5 migrations applied (paused at the user's request). Supabase's connector hangs on any SQL that contains `DROP`, so production migrations need the ALTER-based variant (as used for the demo) or the CLI |

## C. Gap matrix

| Bucket | Items |
|---|---|
| 1. Working, preserve | maths engine and tests; canvas core (drag, connect, select, copy/paste, align, frames, undo, minimap, snap); inspector numbers; KPI bar; report tabs; what-if/goal seek; costs; actuals; forecast; templates; autosave/offline/versions; sharing/comments/privacy; auth/invite/RLS/private storage; CSV/JSON import/export; presentation mode; dashboard; clients/products/logo |
| 2. Complete enough | Tidy Up for flow blocks; scenario side-by-side; monthly forecast; responsive layouts |
| 3. Broken | Share/other modals not centred; Tidy Up repositions headings and notes instead of preserving them |
| 4. Partially implemented | block library breadth; layers/views; notes (plain text); goals (one target); scenarios (no duplicate, not in exports); PDF (missing sections); PNG/SVG fidelity; roles (admin/member); archive; reports area |
| 5. Missing but required | Emerald design system; Style tab and text styling; client pricing model; checklists; connection styles; canvas shapes/images; per-element lock and layer order; Reports navigation with reinvestment, MRR, month-to-month and published status; PDF scenario/forecast/sources/expenses sections; Owner/Admin/Editor/Viewer roles; independent-user isolation and cross-tenant tests |
| 6. Missing but clearly implied | literal golden-value test from the handoff (current coverage is via prototype fixtures); export/report consistency test; e2e for logo upload; recents/favourites in the library |
| 7. Out of scope (handoff §18) | AI features, multiplayer, tracking scripts, deep ad/CRM integrations, marketplace, benchmark DB, white-label portal |

## D. Test status (run 2 Oct 2026)

| Suite | Result |
|---|---|
| Unit (Vitest) | **73/73 pass** |
| Database/RLS (Vitest, local Supabase) | **22/22 pass** |
| E2E (Playwright, production build) | **58/59 pass**: "password reset by email" fails on Supabase's 60-second per-account email throttle (an earlier test emailed the same account); a test-ordering issue, not an app defect. It passed 59/59 earlier in the project |
| Typecheck / ESLint | clean |

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
| Tidy Up and canvas text | **PARTIAL.** Annotations aren't laid out as flow nodes, but they're re-anchored below the nearest block |
| PNG export fidelity | **PARTIAL / UNKNOWN.** Re-drawn SVG without embedded fonts |
| PDF export fidelity and composition | **PARTIAL.** Correct title and branding; missing report sections |
| Share modal centring | **CONFIRMED BUG** (affects all `dialog.modal`) |
| Client pricing model | **CONFIRMED MISSING** |
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
- Gaps: no Owner/Editor/Viewer roles, no independent-user workspaces and therefore no cross-tenant tests, and no private sign-up URL.

## H. UI/UX status: FAIL against the locked Emerald direction

- The current design is purple (`--brand #5b2fc9`), uses Bricolage/DM Sans, is light-first with a dark mode, and leans on cards.
- The layout follows the required structure:
  - top toolbar
  - left library (drawer on small screens)
  - canvas
  - right report/inspector panel
  - bottom KPI bar
- Accessible and responsive, with e2e and axe checks passing.

## I. Recommended order for the remaining budget

1. **Quick P0 fixes (small):**
   - centre all modals (one CSS rule)
   - add a literal golden-value test
   - make the password-reset test robust to the email throttle
2. **Client pricing model:** one migration plus schema, form and display; keep existing retainers.
3. **Tidy Up:** keep annotations at their original relative offsets, measure real sizes, and check annotation-to-annotation collisions.
4. **Exports:**
   - embed fonts and fix bounds in the SVG/PNG
   - add scenario comparison, forecast chart, sources and expenses to the PDF, all from the same `compute` results
5. **Emerald re-skin:** swap the tokens in `app/globals.css` and the category colours, keeping the components. Low risk, high visual impact.
6. **Canvas completeness:**
   - a Style tab (text: font size and weight, alignment, colour; fill and border for frames and notes)
   - connection styles (dashed, colour, arrow, skip/no-data)
   - per-element lock and layer order
   - checklists (canvas and element level)
   - image block
7. **Reports area:** a report view built from existing `compute`/`project` output, adding traffic reinvestment, MRR, month-to-month, published status and required numbers per period.
8. **Roles and independent users** (an architectural decision: confirm before building):
   - Owner/Admin/Editor/Viewer
   - per-workspace tenancy with cross-tenant RLS tests
9. **Final QA and deploy:** finish the production migrations, run the full test suites and the live check.
