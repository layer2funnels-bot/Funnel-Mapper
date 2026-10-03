# Funnel Mapper Pro — V2 Complete Design Package

This is the **complete, current** Funnel Mapper Pro V2 design reference, assembled for the GitHub implementation work. It contains the previously approved V2 package **plus** the four functional-interaction flows completed in this final pass. Nothing needs to be collected from earlier chats.

## What this is

A set of `project/*.dc.html` design boards — one screen each — laid out on an infinite canvas (`project/canvas.json`). Each file is a **visual spec**, not code to paste: rebuild each screen with the app's existing Next.js + Tailwind + React Flow components, matching layout, type, colour and states. The `artifact-type/` folder is the design-canvas runtime that renders the boards; `artifact-type/reference/` holds the brand/token/craft references.

Open `index.html` to view the whole canvas. Source of truth for intent and constraints: `DESIGN_V2_HANDOFF.md`.

## What this final pass did

- **Preserved** the 28 approved V2 boards unchanged — object system, editor states, inspector scopes, context menus, floating toolbars, performance map, widgets, all pages (Home, Clients, Client, Products, Funnels, Reports, Templates, Settings), Share, Shared view, Presentation, and the six responsive boards (1280 / 1024 / 768 / phone×3).
- **Added** four boards for the interaction flows that had no home:
  - `Connection-quick-add.dc.html` — drag connection → empty space → Quick Add → created + connected, with cancel / invalid / undo states.
  - `Page-thumbnail.dc.html` — Page URL → real screenshot, all ten states, with the semantic wireframe as the first-class fallback.
  - `Change-page-type.dc.html` — transform a page in place, keeping id, position, connections, URL, thumbnail and analytics.
  - `Wait-delay.dc.html` — the Wait/Delay object: library, canvas, selected, inspector (duration + unit), and its field states. Math-neutral.
- **Redesigned:** nothing. No board was fundamentally wrong; the V2 system already reads as a purpose-built funnel tool, not an automation/node editor.

## Semantic Page system (already in V2 — preserved)

Each page type is drawn with its own miniature wireframe anatomy, so a sales page never looks like an opt-in or a checkout: opt-in, sales, VSL, webinar, quiz/survey, application, booking calendar, thank-you, members area, checkout, order form, order bump, upsell, downsell, subscription, membership. Spec lives in `project/Object-system.dc.html`.

## Semantic Icon system (already in V2 — preserved)

Every block carries a meaning-bearing icon (envelope, SMS, WhatsApp, clock-for-wait, phone-for-call, calendar, target-for-goal, branch-for-condition, etc.), and the six object families each have a distinct shape (source rounded-entry, page card + preview strip, offer card + price tab, message/action capsule, logic square + hatched body, goal capsule + progress). Same family lookup in `Object-system.dc.html`.

## Style Panel, Quick Styles, Copy/Paste Style, Multi-select

Covered in `Editor-block.dc.html`, `Editor-selection-style.dc.html` and `Context-menus.dc.html`: Style / Plan / Analytics architecture, quick-styles row, copy/paste-style (paint-bucket) + eyedropper, and the floating multi-select toolbar with align / distribute / frame / lock / duplicate / delete.

## Responsive coverage

1536 (primary) and 1440 (reference) in the main boards; dedicated boards at 1280, 1024, 768 and phone (390–430). Rules in `DESIGN_V2_HANDOFF.md` → *Responsive rules*.

## Competitor / reference rule

GERU, Funnelytics, n8n and the attached page/icon screenshots are **usability reference only**. No branding, colours, typography, layouts, icon geometry or page artwork were copied. Borrow the usability idea; the solution is Funnel Mapper Pro's own.

## Technical foundation — untouched

Design only. No change to funnel maths, the authoritative engine, data model, RLS, auth, permissions, reports architecture, scenarios, exports or autosave. No migrations.

## Zero library reduction

**Library items removed: 0. Merged/reduced: 0.** All 169 blocks, every category and every search keyword are retained.

## File map

- `README.md`, `DESIGN_V2_HANDOFF.md` — docs
- `index.html` — canvas entry
- `project/*.dc.html` — 32 screen boards; `project/canvas.json` — canvas layout
- `artifact-type/` — design-canvas runtime + `reference/` brand & craft docs

## 169-block system (final pass)

- `project/block-inventory.json` — the canonical, data-driven inventory every block renders from (name, category, family, shape, colour, page wireframe). Implementation maps blocks from this file; no block is a bespoke design.
- `project/Library-169.dc.html` — the master library board: all blocks by category, each with its family-shaped, brand-coloured tile, with per-category counts.
- Canonical dimensions and the preserved +38px page/offer rule and centre-align rule are in `DESIGN_V2_HANDOFF.md`.
- **Honest status:** inventory holds 149 blocks (Pages 19/19) labelled *target 169*; reconcile against the app's authoritative block-definitions to lock the exact count. Removed 0, merged 0.
- **Not done this pass:** propagating the brand-icon/thumbnail skin into the Editor / Performance / Presentation / Shared-view / responsive boards (they reuse the same node markup; next focused step).
