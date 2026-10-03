# Funnel Mapper Pro — Design v2 Handoff (for Claude Code)

This folder holds the approved UI redesign. Each `*.dc.html` file is one screen, written as static HTML with inline styles and a shared `<style>` block. **They are the visual spec, not code to paste.** Rebuild each screen with the app's existing Next.js + Tailwind + React Flow components, matching layout, spacing, type, colour and states as closely as practical.

Visual reference (owner can open it): https://claude.ai/artifact/TSKHZ8rB92RzTDezN5hMmC

## Ground rules

- **Re-skin and re-arrange only.** Do not change `lib/funnel-math.ts`, data models, RLS, exports or any PASS behaviour in `PROJECT_STATUS.md`. Every number on screen still comes from the existing engine.
- The numbers in the mockups are demo data. Never hard-code them.
- Locked tokens are unchanged: Emerald `#10B981` / `#059669` / `#047857` / `#34D399`, success `#22C55E`, canvas `#0B1220`, library `#0F172A`, chrome `#111827`, floating surfaces `#1E293B`, lines `#334155`, text `#E2E8F0` / `#94A3B8`, category colours from MASTER_HANDOFF. Bricolage Grotesque for numbers and titles, DM Sans for everything else.
- New in v2: **orange `#F97316` means "people lost"** (non-convert lines, key leak). Amber `#FBBF24` means "needs attention" (health checks).
- Borders before shadows. Only floating things (toolbars, menus, popovers, modals) get a shadow.
- Light theme stays as an option; derive it from the same tokens.
- Work in the batches below. After each batch: run the existing unit + e2e suites, fix any selectors the new UI breaks, update `PROJECT_STATUS.md`, and report.

## The system in one paragraph

What the user selects decides what they see. Every selection gets three surfaces: a **floating toolbar** above it (common actions), the **inspector** on the right (full detail) and a **right-click menu** (every action, with its shortcut). The inspector header always names its scope: "Funnel", a block name, or "4 blocks".

## Screen → file map

| Screen | File |
|---|---|
| Concept, tokens, scope table | `Main.dc.html` |
| Editor, nothing selected | `Editor-default.dc.html` |
| Editor, one block selected | `Editor-block.dc.html` |
| Editor, multi-select + Style tab | `Editor-selection-style.dc.html` |
| Editor, connection selected | `Editor-connection.dc.html` |
| Right-click menus (4) | `Context-menus.dc.html` |
| Performance map | `Performance-map.dc.html` |
| Inspector scopes (Model / Simulate / Track / block Analytics) | `Funnel-tools.dc.html` |
| Widgets + Trends | `Widgets.dc.html` |
| Block states, zoom levels, line types | `Blocks-and-lines.dc.html` |
| **Object families (block anatomy by purpose)** | `Object-system.dc.html` |
| Connection → empty space → Quick Add | `Connection-quick-add.dc.html` |
| Page URL → thumbnail states | `Page-thumbnail.dc.html` |
| Change page type | `Change-page-type.dc.html` |
| Wait / Delay object | `Wait-delay.dc.html` |
| **169 block master library** | `Library-169.dc.html` |
| Block inventory (data) | `block-inventory.json` |
| Editor at 1280 | `R-editor-1280.dc.html` |
| Editor at 1024 | `R-editor-1024.dc.html` |
| Editor at 768 (tablet portrait) | `R-editor-768.dc.html` |
| Phone editor (map + selected block) | `R-phone-editor.dc.html` |
| Phone Home + Clients | `R-phone-pages.dc.html` |
| Phone Reports + Share | `R-phone-reports-share.dc.html` |
| Home (dashboard) | `Home.dc.html` |
| Clients list + new-client sheet | `Clients.dc.html` |
| Client detail · funnels | `Client.dc.html` |
| Client detail · products | `Client-products.dc.html` |
| All funnels | `Funnels.dc.html` |
| Reports · overview | `Reports.dc.html` |
| Templates | `Templates.dc.html` |
| Settings · team | `Settings.dc.html` |
| Share modal | `Share.dc.html` |
| Client's shared view | `Shared-view.dc.html` |
| Presentation mode | `Present.dc.html` |

## Object families (applies to all 169 library blocks)

The library stays exactly as it is: every block, category and search keyword is kept. What changes is that each block is drawn with the anatomy of its **family**, so a checkout never looks like an email. Map every library item to one family with a lookup table (`lib/block-families.ts` or a `family` field on the existing block definitions); the block keeps its own icon, label, fields and maths.

| Family | Library groups (examples) | Shape | Extra anatomy |
|---|---|---|---|
| Source | Traffic sources (all) | Left edge rounded 26px, right 10px | Visits + cost row |
| Page | Pages (opt-in, sales, VSL, webinar, survey/quiz, application, booking, thank-you, members area, …) | 10px card | **30px page-preview strip** whose wireframe depends on page type |
| Offer | Offers & checkout (checkout, order form, order bump, upsell, downsell, subscription, membership, …) | 10px card | Page-preview strip + **price tab** top-left (`$37`, `↑ $297`, `↓ £27`, `+ $9`, `$110 / mo`) |
| Message / action | Communication, Actions & events, Sales & CRM | 24px capsule | Channel and timing in the subtitle ("Email · immediately", "SMS · 1 h before") |
| Logic | Logic (condition, split, A/B, multivariate, merge) | 4px square corners, faint hatched body | Split bar with Yes/No or A/B shares instead of a single number |
| Goal | Goal / conversion, End | 24px capsule | Progress bar to target |
| Notes & layout | Sticky, text, frame, shapes, media | Unchanged | — |

Preview-strip wireframes to implement (SVG, category colour for the active element): `optin`, `sales`, `video` (VSL/video), `webinar`, `quiz` (quiz/survey), `app` (application/forms), `calendar` (booking), `thanks`, `order` (checkout/order form), `up` (upsell/bump), `down` (downsell), `sub` (subscription), `members`. Any page or offer without a specific wireframe uses `sales` (pages) or `order` (offers). Exact geometry is the inline SVG (`class="wf"`) inside `Object-system.dc.html`; copy it.

Rules: page and offer objects are 38px taller than the others; **align object centres on a row**, not tops, so lines stay straight. Library tiles echo the family shape (source tile rounded left, page/offer tile with a 3px top band, message tile rounded, logic tile square). Long names: one line with ellipsis on the canvas, full name in the inspector and on hover. Zero shows as `0` (never blank); missing data shows "No data yet" in muted text; negative money uses a true minus `−` and red `#FCA5A5`. Money keeps the funnel's own currency symbol and code where needed (`$`, `£`, `€`, `AED`); large numbers use thousands separators and never abbreviate on blocks (abbreviate only in KPI captions, e.g. `$89.8k a year`).

## Visual QA rules (final pass)

- Port labels show only on **open** ports of a hovered or selected block; connected ports use the line's label.
- Copy style uses the paint-bucket icon everywhere (toolbar, Style tab, menus); Duplicate keeps the copy icon. Lock is `⌥⌘L` (Tidy up keeps `⇧⌘L`).
- Status dot sits in the block's top-right corner, outside the title flow, so titles get the full width.
- Inspector block header: title alone on the first line; type and the build-status pill on the second line.
- The inspector sub-nav (Overview / Steps / Sources / Costs) never wraps.
- Floating toolbars stay inside the canvas: when a centred toolbar would overflow, align it to the selection's right (or left) edge. Tooltips live inside the toolbar's own layer.
- Grid and flex children that hold inputs get `min-width: 0`; inputs with units fill their cell.
- Dialog, sheet and popover titles use Emerald `#10B981` (owner's choice), Bricolage 16–22px.
- Presentation stage numbers must equal the frame totals on the map.
- Charts: y-axis labels come from the real scale; plan is dashed slate, actual is solid Emerald.

## Responsive rules

The 1440px boards are the reference for **1536px** (primary desktop): extra width goes to the canvas in the editor, and page content keeps a max width of 1280px, centred. Never scale the desktop down: each band changes where panels live.

| Band | Editor | Pages (Home, Clients, Funnels, Templates, Settings, Reports) |
|---|---|---|
| **≥1440** (1536 primary) | Rail 48 + library 256 (open by default) + canvas + inspector 320. Full top bar. KPI strip: checks chip, 6 KPIs, "+6 more", unit label. | Sidebar 232 + content. Home: KPIs 4-up, recent 3-up, right column 340. Tables show all columns. |
| **1280–1439** | Library collapses to the rail by default (opens as a 256px overlay over the canvas, closes on drag start or Esc). Inspector stays 320 and docked. KPI strip drops the unit label below 1000px canvas width. | Sidebar 232. Home right column moves under the main column below 1360. Tables hide Tags and Updated first. |
| **1024–1279** | No docked panels: inspector becomes a floating 320px panel inset 8px over the canvas; **the canvas pans so the selection stays visible to the left of it**. Library opens from a "Library" button in the canvas toolbar. Top bar: funnel name + scenario pill; Map/Reports icon-only; Tidy up icon-only; comments, history and present move into "…"; Share keeps its label. KPI strip: checks chip (count only) + Revenue, Profit, ROAS, Customers + "+8". | Sidebar collapses to a 64px icon rail (labels in tooltips). Home KPIs 4-up, recent 2-up. Template preview panel becomes a right drawer. |
| **768–1023** (tablet) | No rail. Inspector is a **bottom sheet** (50% height, drag to 90%), tabs unchanged. Library is a full-height left drawer opened from a 52px "+" button bottom-left. Touch targets 40–44px: toolbars use the `touch` size (48px tall). Zoom +/- hidden (pinch), Fit and Layers top-right. Context menus open on long-press as the same menus, 44px rows. KPI strip: 3 KPIs + "+9". | Sidebar becomes a left drawer from a menu button. KPIs 2-up. Tables become two-line rows (name + key number, status, chevron); the rest goes into the row's detail page. Settings section nav becomes a select. |
| **390–430** (phone; 414 and 430 get the extra width as wider cards, one more KPI chip) | Map opens at fit zoom using the **far-zoom chips** (icon + short name, family shape kept). Top bar: back, funnel name + scenario, Reports, "…". KPI chips scroll horizontally above the home indicator; checks chip first. Selecting a block replaces the chips with a 68px **action bar** (Edit, Style, Next step, Duplicate, More) and opens a bottom sheet with the four tabs; fields 44px tall, 15px text. Multi-select: "Select" mode from "…", then tap blocks; the action bar shows Align, Frame, Style, Delete. Floating contextual toolbars and right-click menus are replaced by the action bar and action sheets. Widgets show as one column on the shared view and in Reports; on the editor map they render as S chips. | Bottom tab bar (Home, Clients, Funnels, Templates, More) replaces the sidebar; Settings lives in More. Lists, not tables. Report section picker is a full-width select; KPIs 2-up; charts full width with 4 x-axis labels; tables scroll inside their own box. Dialogs (Share, New client, Product) become full-height sheets with a grab handle; Share's live preview collapses into a "Preview what Sam sees" row. Presentation: one frame per screen, swipe to change stage, numbers under the title. |

Always: no horizontal page scroll at any width; only tables, KPI chip rows and the canvas may scroll sideways inside themselves. Truncate names with ellipsis and show the full text in the inspector/detail. Keep the same hierarchy at every size: map first, then the six KPIs, then funnel tools.

## Batches

**D1 — Tokens and app shell.** CSS variables for the tokens above. New left sidebar (232px): workspace switcher button, Home / Clients / Funnels / Templates, pinned clients, Settings and Help at the bottom, user row. Top strip with ⌘K search and New client / New funnel. Workspace creation moves into the switcher menu (no inline form in the sidebar).

**D2 — Editor chrome.**
- Top bar: Client / Funnel ▾ (File menu moves here) / Scenario pill · Map | Reports · undo/redo · Tidy up (Emerald tint) · comments, history, present · Share (only solid primary) · avatar. Currency moves to funnel settings.
- Left: 48px rail (Library, Outline, Workspace blocks, Notes, Shortcuts, Help) + collapsible 256px library: search with `/`, category chips, Pinned, the client's products with prices, then the categories as single-column rows.
- Canvas: Clean | Performance switch + Layers top-left; zoom, fit and minimap toggle bottom-right; minimap bottom-left. Remove the React Flow attribution (licence or allowed setting).
- KPI strip: checks chip (opens the health list) + Traffic, Leads, Customers, Revenue, Profit, ROAS + "+6 more" popover + "per month · USD".

**D3 — Inspector scopes.** Nothing selected = Funnel scope with three groups: **Model** (Overview = old Math, Steps, Sources, Costs), **Simulate** (What-if, Scenarios), **Track** (Forecast, Actuals). Overview leads with Health: each check is a button that selects and zooms to the block. One block = "← Funnel" back link, block header with status pill, tabs Details / Style / Plan / Analytics. Several = "N blocks", tabs Style / Arrange (Details only if same type). Connection = Flow / Style. Advanced fields collapse under "Advanced".

**D4 — Selection system.**
- Floating toolbar above the selection (hide while dragging): block, multi-select, connection and widget variants as drawn.
- Right-click menus for block, connection, selection and empty canvas, with shortcuts shown.
- Copy style ⌥⌘C / Paste style ⌥⌘V / eyedropper, reusing existing style fields only. Toast with Undo after paste.
- Quick styles row at the top of the Style tab. Built-in presets first; saved workspace presets need a small table — **ask the owner before adding a migration**.
- `?` opens a shortcuts sheet; hover tooltips show shortcuts.

**D5 — Object families, blocks, lines, Performance map.** Implement the family lookup and anatomy from `Object-system.dc.html` first (no library items removed). Block card per `Blocks-and-lines.dc.html`: category colour on the icon tile only, status dot, metric row. Selected = 1px Emerald ring + 4px halo; multi = ring only. Detail by zoom: under 40% icon + short name; 40–75% name + type; above 75% + key number. Performance map: headline number + caption + conversion bar, line weight by people, frame totals in the frame label, a single key-leak badge on the largest loss, legend top-right.

**D6 — Pages.** Home, Clients (table default, cards optional, 4-field new-client sheet), Client detail with Funnels / Products / Notes / Details tabs, Funnels list with Health column, Templates with preview panel, Settings with left section nav. Map thumbnails can reuse the existing thumbnail/SVG export.

**D7 — Reports, sharing, presenting.** Reports nav grouped Summary / Money / Planning; KPI caption links; key-leak "Show on map" and "Try in What-if"; clicking a drop-off bar selects that block on the map. Share modal with View / Comment / Edit, toggles and a live preview panel. Client shared view header with both logos. Presentation footer with stage progress and Clean / Numbers switch.

**D8 — Widgets (new feature, V1.1).** Canvas widget element with scope (whole funnel / frame / selection), up to 4 metrics, display Number / Number + trend / Chart, S / M / L sizes, shown in exports. Trends widget compares Actuals to plan when Actuals exist. **This needs a data-model addition: propose it and wait for approval before building.**

## Definition of done per batch

Matches the artboards at 1440 × 900 in dark theme and the responsive boards at their widths (check 1536, 1280, 1024, 768, 430, 414, 390), works in light theme, keyboard reachable with visible Emerald focus rings, tablet and phone still usable (panels become drawers), existing tests green, no change to any calculated number.


## Functional interactions (v2 final pass)

Four interaction flows named in the brief had no board; they are added here in the existing visual language. They extend D2/D4 (editor chrome + selection) and D5/D6 (object families + pages) — no new tokens, no data-model change, no library change.

- **Connection → empty space → Quick Add** (`Connection-quick-add.dc.html`). Drag off an open port, release on empty canvas → a Quick Add opens at the release point (the library, filtered to blocks valid from that port, Recents + client Pinned first). Choosing one spawns it already connected and moves selection + inspector to it. States: drag, endpoint ghost, popover, hover, created + completed edge, cancel (Esc / click-away discards the drag), invalid target (unsupported options dim, connector tip turns amber), release-on-existing-port (connects directly, skips Quick Add). One atomic undo removes block + edge; autosave fires once.
- **Page URL → thumbnail** (`Page-thumbnail.dc.html`). A Page shows its real screenshot once captured; until then it shows its semantic page-type wireframe (never a generic browser placeholder). Ten states: no preview, URL input, URL entered, loading, success, error, retry, replace/open/remove menu, removed→reverts, semantic fallback. The captured image travels to the canvas (all zooms), selected card, library recents, Presentation and PDF/PNG/SVG exports. Capture is display-only — it never touches maths or the data model.
- **Change page type** (`Change-page-type.dc.html`). Select a page → Change type (toolbar, right-click, or the inspector type pill) → pick from a type grid (each tile its own wireframe; current type ringed) → the node transforms in place. Kept: id, position, both connections, URL, thumbnail, build status, analytics. Changed: type, icon, wireframe, type-specific fields. Fields with no equivalent are preserved hidden so switching back restores them. One undo reverts; math-neutral.
- **Wait / Delay** (`Wait-delay.dc.html`). A time delay in the Messages & actions family (capsule, clock icon), reading as "Wait 2 days". Inspector Details: duration number + unit segmented control (Min / Hrs / Days / Wks), live canvas-label preview. States: default, editing (focus), saved, invalid (0 or blank). Analytics tab disabled — it is math-neutral, so everyone who arrives leaves and no total changes.

### Already delivered in v2 (no rebuild needed)
The two "feels like n8n" risks the brief flags are already solved in `Object-system.dc.html` and were left unchanged: the **semantic Page system** (distinct wireframes for opt-in, sales, VSL, webinar, quiz/survey, application, booking, thank-you, members, checkout, order form, order bump, upsell, downsell, subscription, membership) and the **semantic Icon system** (a meaning-carrying icon per block, 6 family shapes). The attached GERU/Funnelytics page + icon screenshots were used only as usability reference. **Library items removed: 0. Library items merged/reduced: 0.** All 169 blocks and every category and search keyword are retained.

### Object-system upgrade — brand icons + real page thumbnails (this pass)
`Object-system.dc.html` was rebuilt so the map reads as a funnel tool, not a node graph: (1) **shape per category** — source = circle, action/event = diamond, page/offer = page-card, logic = square, goal/wait = capsule; (2) **per-brand full-colour icons** — each traffic source, CRM and messaging tool keeps its real brand colour + mark (Facebook, Google, YouTube, Instagram, TikTok, LinkedIn, X, Pinterest, Reddit, Mailchimp, HubSpot, Salesforce, Slack, Telegram, Messenger, WhatsApp, …), not one family tint; (3) **realistic page thumbnails** — opt-in, sales, VSL, webinar, quiz, application, booking, thank-you, checkout, upsell, members each render as a distinct mini page (browser chrome + wireframe + CTA), replaced by the real screenshot when a URL is captured (see `Page-thumbnail.dc.html`). Implementation: add an `iconId` (brand mark + colour) alongside the existing `family` + page-type `wireframe`; **pull production marks from a licensed / CC0 brand-icon set (e.g. Simple Icons) and follow each platform's brand guidelines** — the mock uses brand colours + simplified glyphs to show the treatment. Still **0 library items removed**. The same node skin should be propagated to the editor, performance-map, present and shared-view boards next (they reuse the node markup).


## 169-block system, families and canonical dimensions (final pass)

**One system, not 169 designs.** Every block is rendered from `project/block-inventory.json`: each record has `name`, `category`, `family`, `shape`, `color` (brand where known) and, for pages, a `wireframe` key. Implementation reads this file and draws the block with its family template — so a new or renamed block is a data edit, never a new component. **No library reduction: removed 0, merged 0.**

**Honest status on the count.** The inventory currently holds **149** blocks across the eight real categories, with **Pages = 19/19** (matching the app). It is labelled *target 169* because the authoritative list lives in the app's block-definitions (not provided to this design pass). Reconcile `block-inventory.json` against that file to lock the exact 169; the board and templates don't change when you do.

**Canonical dimensions** (apply identically in Library, Canvas, Selected, Hover, Quick Add, Performance, Presentation, Shared view, Responsive):

| Property | Value |
|---|---|
| Outer width | 200px (all families) |
| Base outer height (Source / Message / Action / Logic / Goal) | 76px |
| Page / Offer outer height | 114px (**+38px** for the preview — the V2 rule, preserved) |
| Icon tile | 28×28px; radius by family (source/CRM/msg 50%, page/offer 6px, logic 4px, action rotated-6px, goal 12px) |
| Internal padding | 10px |
| Preview strip (on-canvas default) | 174×30px, horizontally centred, 8px below header |
| Rich thumbnail (library / object-system / hover) | 174×104px |
| Price tab (offers) | h20, pad-x 7, offset top −10 / left 12 |
| Port | 11px, centred on each side |
| Row alignment | objects on a row are **centre-aligned**, not top-aligned, so connection lines stay straight |

**Page previews (19/19)** use the semantic wireframe for their type — optin, sales, vsl, webinar, quiz, application, booking, thankyou, members, order/checkout, upsell, downsell, subscription, membership — replaced by the real screenshot when a URL is captured (`Page-thumbnail.dc.html`). The canonical geometry above fixes the earlier page alignment/spacing drift: all page cards share one width, padding, preview position and port position.

**Icons** are per-brand colour + mark (see `Object-system.dc.html`); production marks come from a licensed / CC0 set (Simple Icons) with brand guidelines. The library list uses brand colour + family-shaped tile; the canvas/object-system uses the full glyphs.

**Remaining propagation (next pass, not done here):** the Editor, Performance-map, Presentation, Shared-view and responsive boards still render the older monochrome node skin; they reuse the same node markup, so applying `block-inventory.json` + the brand-icon treatment to them is the next focused step. This is stated plainly so the handoff matches the actual state.
