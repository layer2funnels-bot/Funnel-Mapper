# Funnel Mapper Pro — Master Claude Code Handoff

FUNNEL MAPPER PRO

Master Claude Code Development Handoff

Finish the existing product — do not rebuild it

1. Operating Rules for Claude Code

This document is the master execution context. Treat it as the product minimum and operating contract. The repository already contains substantial working functionality. Inspect first, reuse working systems, and extend them. Do not restart from the old prototype build plan.

Professional Completeness + Controlled Autonomy

Requirements may intentionally describe only 70–90% of a desired feature. Claude Code must use professional product, UX, engineering, and QA judgment to implement the remaining clearly implied details.

If a missing piece is necessary or strongly implied for the requested feature to work professionally: implement it.

If it is a reasonable enhancement but not necessary: do not add it unless already documented in the roadmap.

If it is a new product capability or major architectural decision: stop and ask before implementing.

Automatically handle obvious validation, loading, empty, error, responsive, accessibility, persistence, compatibility, and edge-case states when implied.

Do not interpret missing detail as permission to implement only the literal bullets.

Do not use this autonomy rule to expand into unrelated product areas.

Budget-Conscious Engineering

Remaining Claude Code budget is approximately $50. Optimize for completion.

Inspect before coding. Reuse before extending. Extend before refactoring. Refactor before rebuilding.

Do not rebuild working canvas, math, database, auth, exports, or other systems without a concrete technical reason.

Avoid speculative abstractions, unnecessary dependencies, broad research, and unrelated improvements.

Prefer the smallest robust implementation that satisfies the requirement and its clearly implied needs.

Work in small, testable milestones.

Competitor reference rule

GERU and Funnelytics are capability references only. Do not copy proprietary UI, assets, branding, icons, wording, or visual identity. Use them to avoid missing important capabilities while keeping Funnel Mapper Pro's own design.

2. Current Product Baseline

3. Locked Architecture

Workspace

Clients

Funnels

Scenarios

Canvas / Mapping

Authoritative Math Engine

Reports / Insights

Forecasting / Goals

Templates

Sharing

Exports

Autosave / Version History

Auth / Roles / RLS

4. Access and Data Isolation

Main app should not expose a normal public signup link.

A separate private/unlisted signup URL may exist for independent users; the owner controls who receives it.

Owner-only internal functionality may create an independent account for a person.

RLS/database isolation is mandatory; UI hiding is not security.

Shared links are intentional exceptions and must expose only permitted data.

Test cross-tenant access attempts.

5. Locked Brand + UI/UX

Brand tokens

Category colors are semantic category colors, not alternate brand colors:

Traffic #60A5FA

Pages #A78BFA

Offers #FB923C

Actions #2DD4BF

Logic #FBBF24

Goals #84CC16

Notes #FDE68A

Visual direction

Professional + Editorial + Spatial + Minimal.

The canvas is the product; do not design it like a generic SaaS dashboard.

Avoid excessive cards, pills, gradients, purple/blue primary branding, and decorative UI.

Prefer typography, spacing, borders, restrained shadows, and clear spatial relationships.

Dark-first is acceptable and should remain consistent with the locked tokens.

Use progressive disclosure and contextual tools.

Workspace structure

Minimal top toolbar.

Left collapsible/resizable block library.

Large infinite center canvas.

Compact right tool rail/contextual panel.

Bottom KPI/status bar.

Right tools may include Inspector, Math, Forecast, Goals, Notes, Analytics, Scenarios, Actuals, Costs.

6. Canvas + Mapping Requirements

Complete the existing canvas; do not replace it.

Infinite canvas with subtle grid.

Searchable categorized library.

Sources, Pages, Offers, Actions, Logic, Communication, Sales/CRM, Annotation/Canvas.

Drag/drop and click-to-place.

Recent/favorites/custom assets where supported.

Floating quick-add/explorer.

Custom icons and uploaded images/logos.

Canvas text, shapes, frames/containers, sticky notes, checklists, goals, images.

Move, resize, duplicate, delete, lock/unlock, layer ordering.

Multi-select, copy/paste, align, snap, undo/redo, shortcuts, minimap, zoom, fit-to-screen.

Tidy Up must preserve annotations and avoid collisions with text/images/non-flow objects.

Clean Map and Performance Map views should be supported if the existing architecture allows them without a rewrite.

Complete professional block-library expectation

The existing library is a starting point, not an artificial limit. Audit and expand it using the existing architecture.

7. Element Style / Plan / Analytics

## Style  |  Plan  |  Analytics  |  •••

STYLE

Label/name; icon search/library; icon size; element size; position.

Fill/background; border color/width/style; radius; opacity; shadow where appropriate.

Font family/size/weight; text color; alignment; line height; letter spacing.

Bold/italic/underline/strikethrough.

Layer ordering; lock/unlock; duplicate/copy/delete.

Canvas Text Element

Font family.

Font Size (px) — rename existing 'Size (px)' label.

Weight: Regular / Medium / Semibold / Bold.

Line height and letter spacing.

Left / center / right alignment.

Text color.

Italic / underline / strikethrough.

Width / height / auto-height and padding.

Optional background, border and radius.

Resize/move, copy/paste, multi-select, undo/redo.

Export fidelity in PNG/PDF/SVG.

Tidy Up must preserve text placement.

PLAN

Notes

Checklist

Forecast

ANALYTICS

Numbers

Goal

Relevant performance/forecast data where supported

8. Connections + Layers

Connection styles

Straight, curved, and orthogonal/elbow where useful.

Normal flow, Indirect/Skip Steps, No Data.

Yes/No, Purchase, No Thanks, Retargeting where semantically useful.

Color, thickness, opacity, dashed/solid, arrow and arrow size.

Conversion %, people, revenue and labels.

Canvas layers/views

Map

Numbers

Forecast

Flow

Notes

Checklist

Optional Clean Map vs Performance Map

9. Forecasting, Goals, Notes, Checklists

Forecasting

Daily/weekly/monthly/custom periods where supported.

People, spend, cost per person, CPC, CPM, conversion, revenue.

Outputs: people, leads, purchases, revenue, expenses, profit, ROI, ROAS.

Conservative / Expected / Best / Custom scenarios.

Recurring models: active subscriptions, MRR, cumulative revenue, expenses and profit over time.

Goals

Goal name, value and type.

Associated funnel step.

Revenue/customer/conversion target.

Goal seek / required-number calculations where supported.

Notes

Canvas-level and element-level notes.

Rich text: headings, bold, italic, underline/strikethrough, lists, links, alignment.

Images/video URLs where supported.

Internal notes remain hidden from client share views unless intentionally shared.

Checklists

Canvas-level and element-level.

Complete/incomplete, reorder, indentation and basic formatting.

Owner/due-date/categories only if already supported without unnecessary scope expansion.

10. Clients, Funnels, Scenarios

Client model

Client portfolio with multiple funnels.

Search, status, tags, archive/past clients.

Business, niche, contact, website, country, currency.

Client logo upload and preview.

Autosaved notes, key numbers, saved products.

Relationship Status is separate from Pricing Model.

Pricing Model

Fixed Project

One-Time

Hourly

Commission / Revenue Share

Monthly Retainer

Other

Dynamic fields should show relevant amount/frequency/project-date inputs. Preserve existing monthly-retainer clients.

Scenarios

Multiple scenarios per funnel.

Duplicate scenario.

Conservative / Expected / Best / Custom naming as appropriate.

Side-by-side comparison.

Scenario snapshots feed reports and exports.

Do not create a separate calculation system for scenarios.

11. Reports / Insights — First-Class Product Area

GERU research/screenshots showed reports including project summary, traffic reinvestment, scenario comparison, dream-profit goals, published status, MRR forecast, list/data view, month-to-month analysis, charts, KPI cards, product revenue, traffic-source mix and expenses. Funnel Mapper Pro should cover the important capability set with its own UI.

Report navigation

Overview / Project Summary

Funnel Data / List View

Traffic Sources

Offer / Product Revenue

Expenses

Scenario Comparison

Revenue & Profit Forecast

Goal / Required Numbers

MRR Forecast

Month-to-Month

Traffic Reinvestment

Published / Completion Status

Project Summary KPIs

Monthly/yearly traffic and leads.

Customers.

Revenue and profit.

ROAS and ROI.

CPC, CPL, CPA.

AOV, LTV, MRR where applicable.

Overall conversion rate.

Largest funnel drop-off / key leak.

Graphs

Revenue over time.

Profit over time.

Traffic over time.

Leads over time.

Revenue vs profit where useful.

Traffic-source performance.

Revenue by product/offer.

Expense breakdown.

Funnel drop-off / step performance.

MRR / active subscription growth.

Traffic reinvestment growth projection.

Charts need professional tooltips, legends where useful, correct currency/number formatting, responsive sizing, empty states, and consistent data with the scenario snapshot.

Funnel Data / List View

Step

Type

Visitors

Conversion

Customers/orders

Revenue

Cost/expense where applicable

Source/product context where applicable

Scenario Comparison

Primary/Baseline plus saved scenarios.

Revenue, profit, traffic, leads, CPA, CPL, AOV, LTV, ROAS.

Clearly show differences between scenarios.

Goal / Required Numbers

Given a target profit/revenue, calculate required daily, weekly, monthly and yearly numbers where supported: revenue, profit, traffic, traffic cost, leads and customers.

MRR Forecast

Period-by-period projection.

Active subscriptions and new customers.

MRR and cumulative revenue.

Traffic cost, business expenses and total profit.

Traffic Reinvestment

Reinvestment percentage of profit.

Monthly progression.

Traffic, revenue and profit growth.

Year-end summary.

Published Status

Planned vs completed steps

Completion percentage

Remaining steps

12. Export + Report PDF

Professional PDF

Cover/title with client, funnel and agency branding.

Funnel map.

Executive KPI summary.

Funnel performance/data table.

Scenario comparison.

Revenue/profit forecast chart(s).

Traffic-source performance.

Offer/product revenue.

Expenses.

Goals/required numbers where relevant.

PDF must use the same authoritative scenario snapshot and must visually preserve important editor/report positions, fonts, sizing and hierarchy. Fix the known scaling/position/title issues.

PNG / SVG

High-resolution export.

Correct bounds and no excessive whitespace.

Preserve text placement, fonts and visual hierarchy.

Light/dark/transparent options where existing architecture supports them.

CSV / JSON

CSV represents useful funnel/scenario data.

JSON preserves supported data for round-trip import/export.

Import does not silently discard supported elements/settings.

13. Known P0 Bugs

14. Golden Math Regression Test

15. Testing Strategy

Unit tests

Math formulas and edge cases.

Scenario calculations.

Revenue/cost/profit/ROAS/ROI/AOV/CPA/CPL/LTV/MRR.

Connection/branch behavior.

Goal and forecast calculations.

Browser/E2E

Auth.

Client → funnel → scenario creation.

Canvas editing and connections.

Style/text/image interactions.

Autosave/version restore.

Sharing.

Exports.

Reports.

Independent-user isolation where testable.

Responsive key workflows.

Security

Cross-tenant reads blocked.

Cross-tenant writes blocked.

Independent users cannot query internal Layer2Funnels records.

Shared links expose only intended records.

Frontend route hiding is never the security boundary.

Visual QA

No broken layouts or clipped text.

No inaccessible contrast.

No accidental blue/purple primary branding.

No modal positioning defects.

No export mismatch.

No annotation overlap after Tidy Up.

Desktop/tablet/phone key screens checked.

16. Definition of Done

The requested feature works through the real user workflow.

Existing functionality remains intact.

Data persists correctly.

Relevant edge cases are handled.

Loading, empty and error states are handled where applicable.

Responsive and accessibility requirements are acceptable.

The feature uses existing architecture and authoritative data.

Relevant automated tests pass.

Browser/manual testing is performed where appropriate.

Exports/report consumers are consistent.

Professional Completeness Audit is performed.

No unrelated scope is introduced.

17. Execution Plan for the Remaining Budget

18. Do NOT Spend the Remaining Budget On

AI assistant.

AI funnel generator.

Real-time multiplayer editing.

Tracking script/full analytics tracking infrastructure.

Deep Stripe/Shopify/Meta Ads/Google Ads/GHL integrations.

Zapier/integration marketplace.

Advanced benchmark database.

Speculative enterprise features.

Large template expansion unless needed for product completeness.

Unnecessary client-portal/white-label complexity.

The core product loop is: Map → Model → Simulate → Analyze → Forecast → Present.

19. Capability Completeness Check

Use these as capability checks from GERU/Funnelytics research; do not clone their UI/assets.

Searchable source/page/action libraries.

Rich step types and custom/offline icons.

Floating element controls and contextual styling.

Canvas layers for numbers, flow, forecast, notes and checklists.

Connection styles including skip/indirect and no-data.

Goals and forecast inputs.

Notes/checklists.

Tags/organization.

Share links with view/edit/duplicate behavior.

Version history.

Scenario comparison.

Project summary reports.

Traffic reinvestment.

Goal/dream-profit calculations.

MRR forecast.

List/data view.

Month-to-month reporting.

Graphs and KPI summaries.

Product/offer revenue and traffic-source reporting.

Expense reporting.

Professional PDF/report exports.

20. Claude Code Working Protocol

Read this handoff and any CLAUDE.md/PROJECT_STATUS.md in the repository.

Inspect the actual implementation before proposing changes.

Identify what works and must be preserved.

Create/update PROJECT_STATUS.md with current state and gaps.

Execute only the current milestone; do not silently jump ahead.

Perform a completeness audit before coding each meaningful task.

Implement clearly implied professional requirements automatically.

Do not implement unrelated enhancements.

Run targeted tests after meaningful changes.

Update PROJECT_STATUS.md after each milestone.

At milestone completion, report changed files, tests/results, remaining issues and the next milestone.

If a major architecture rewrite appears necessary, stop and ask before spending budget.

21. First Claude Code Message

22. Final Product Philosophy

Funnel Mapper Pro is not intended to become Google Analytics, a generic CRM, or an AI toy. Its core value is helping an agency visually map a funnel/customer journey, model the economics, compare scenarios, identify leaks, forecast outcomes, create professional reports, and present strategy to clients.

Appendix A — Reference Material

Capability references used during planning:

GERU: https://www.geru.com/

GERU support: https://support.geru.com/

Funnelytics mapping: https://funnelytics.io/mapping

Funnelytics Mapping Fundamentals: https://help.funnelytics.io/en/articles/15811672-mapping-fundamentals

Funnelytics Canvas Overview: https://help.funnelytics.io/en/articles/15805638-canvas-overview

Funnelytics Checklists: https://help.funnelytics.io/en/articles/15826759-checklists

Funnelytics Notes: https://help.funnelytics.io/en/articles/15811855-notes

Funnelytics Canvas Tags: https://help.funnelytics.io/en/articles/15827078-canvas-tags

Funnelytics Share Links: https://help.funnelytics.io/en/articles/15826799-share-links

Funnelytics Template Library: https://help.funnelytics.io/en/articles/15811722-funnel-strategy-templates

Funnelytics Dashboard: https://help.funnelytics.io/en/articles/10788139-navigating-the-funnelytics-dashboard-a-quick-tour

Funnelytics KPI Targets: https://help.funnelytics.io/en/articles/10845935-how-to-set-targets-for-your-kpis-in-funnelytics

END OF MASTER HANDOFF



| PRIMARY OBJECTIVE Turn the existing Funnel Mapper Pro demo/repository into a reliable, professional, production-ready agency funnel mapping and modeling tool. The remaining Claude Code budget is limited, so optimize for completion, correctness, reuse, and testing—not exploration or rewrites. |





| Area | Known baseline |

| Repository | layer2funnels-bot / Funnel-Mapper, private, main branch |

| Frontend | Next.js App Router + TypeScript + Tailwind; React Flow canvas |

| Backend | Supabase Postgres/Auth/Storage/RLS architecture |

| Canvas | Nodes/ports, connections, inspector, KPI bar, Tidy Up, minimap, zoom, undo/redo, copy/paste, alignment, frames, shortcuts |

| Math | Existing engine and KPI/report/export paths; live-vs-export discrepancy is a confirmed bug |

| Clients | Client pages, funnels, notes, metrics and saved products exist; pricing model needs expansion |

| Scenarios | Scenario/what-if/forecast functionality exists; reports must use consistent scenario snapshots |

| Sharing | View-only/editable share-link direction exists |

| Exports | PNG/SVG/PDF/CSV/JSON exist; PNG/PDF visual fidelity needs correction |

| Templates | Existing built-in templates and save-as-template direction |

| Auth | Internal/team model exists; independent-user isolation is required |

| UI | Existing demo works but final UI must follow locked Emerald professional/editorial/spatial direction |





| IMPORTANT Do not follow the obsolete prototype plan that starts with scaffold/auth/editor from scratch. The current repository is much further along. Start with an audit of the actual implementation. |





| SINGLE SOURCE OF TRUTH Funnel inputs → authoritative Math Engine → Scenario Snapshot → Canvas KPIs + Dashboard + Reports + Charts + Forecast + Goal calculations + PDF/CSV/exports. No report, export, dashboard, or UI surface may independently reimplement funnel math. |





| World | Required behavior |

| Layer2Funnels internal team | Main internal workspace. Roles: Owner, Admin, Editor, Viewer. Access governed by role/workspace permissions. |

| Independent user | Separate account/workspace/data. Not a team member. Cannot access Layer2Funnels clients, funnels, files, templates, team, or other independent users. |





| Token | Value | Use |

| Primary Emerald | #10B981 | Primary brand, primary buttons, active states, focus, Tidy Up, primary links |

| Hover Emerald | #059669 | Hover/deeper interaction |

| Pressed Emerald | #047857 | Pressed/deeper interaction |

| Light Emerald | #34D399 | Links, icons, text and subtle highlights on dark surfaces; not primary button color |

| Success | #22C55E | Semantic success only |

| Canvas | #0B1220 | Dark canvas surface |

| Library | #0F172A | Left library surface |

| Top/Bottom | #111827 | Workspace chrome |

| Panels | #1E293B | Inspector/panel surfaces |

| Borders | #334155 | Borders/dividers |

| Primary text | #E2E8F0 | Primary text |

| Secondary text | #94A3B8 | Secondary text |





| Category | Representative coverage |

| Sources | Facebook/Instagram/Google/YouTube/TikTok/LinkedIn/Pinterest/X/Reddit/Bing Ads; Display/Native/Retargeting; Organic/SEO; Direct; Referral; Affiliate; Partner; QR/Offline/Event/Podcast; Email; SMS; WhatsApp; Push; Community; Existing Customer |

| Pages | Landing; Lead Magnet; Opt-in; Squeeze; Quiz; Survey; Content; Blog; Sales; VSL; Webinar Registration/Live/Replay; Product; Order; Checkout; Thank You; Confirmation; Application; Qualification; Booking; Calendar; Call Confirmation; Sales Call; Proposal; Contract; Login; Members Area; Course; Lesson; Community; Cart; Upsell; Downsell; OTO; Subscription; Popup; Modal; External Website; Custom |

| Actions | Lead; Form Submit; Opt-in; Purchase; Subscription; Add to Cart; Checkout Started; Payment; Trial; Upgrade; Renewal; Click; Link Click; Watch Video; Video Completed; Scroll; Download; Open; Reply; Share; Schedule Call; Appointment; Phone Call; Sales Call; Meeting; Demo; Application; Qualified Lead; Won/Lost; Email/SMS/WhatsApp/Call; Login; Course Started/Completed; Review; Referral; Repeat Purchase; Cancellation; Refund |

| Logic | Yes/No; A/B; Multivariate; Goal; Exit; End; Wait; Delay; Percentage/Random Split; Qualification; Branch; Merge |

| Offers / Money | Product; Service; Digital Product; Course; Coaching; Membership; Subscription; Trial; Payment Plan; One-Time Offer; Order Bump; Upsell; Downsell; OTO; Bundle; Discount; Coupon; Free Offer |

| Communication | Email; Email Sequence; SMS; WhatsApp; Phone Call; Sales Call; Follow-up; Retargeting; Nurture; Reminder; Notification |

| Sales / CRM | Lead; MQL; SQL; Qualified; Application; Appointment; No Show; Sales Call; Proposal; Negotiation; Won; Lost; Follow-up; Pipeline |

| Annotation | Canvas Text; Heading; Subheading; Label; Rectangle; Rounded Rectangle; Circle; Ellipse; Line; Arrow; Diamond; Container; Stage Frame; Image; Logo; Screenshot; Video/embed; Link preview; Sticky Note; Note; Checklist; Goal; Callout |





| Issue | Required outcome |

| Math discrepancy | Live editor, dashboard, reports and exports use one authoritative engine and agree. |

| Tidy Up + Canvas Text | Text/annotation objects are not treated as connected flow nodes; placement is preserved and collisions avoided. |

| PNG export | Correct scale, bounds, positions, fonts and whitespace. |

| PDF export | Correct title, positions, scaling, page composition and fidelity. |

| Share modal | Centered, responsive modal. |

| Client pricing model | Fixed Project, One-Time, Hourly, Commission/Revenue Share, Monthly Retainer, Other; dynamic fields. |

| Client logo | Upload, preview and persist. |

| Import/export | Round-trip supported data without silent loss. |

| Auth/RLS | No cross-tenant data access. |

| Autosave/versioning | Reliable save state and restoration. |





| Metric | Expected |

| Traffic | 2,500 |

| Quiz | 40% → 1,000 |

| Trial | 15% → 150 |

| Paid | 40% → 60 |

| No path | 90 |

| Call | 60% → 54 |

| After-call | 35% → 18.9 |

| Discounted membership customers | 10.2 |

| Total customers | ≈ 89.1 |

| Paid membership revenue | ≈ $4,199 |

| Discounted membership revenue | ≈ $510 |

| After-call membership revenue | ≈ $1,323 |

| Total revenue | ≈ $6,032 |

| Ad spend | $450 |

| Profit | ≈ $5,582 |

| ROAS | ≈ 13.40x |





| CONFIRMED BUG HISTORY The live editor previously showed about 70.2 customers, $4,709 revenue, $4,259 profit and 10.47x ROAS while export showed the complete ~$6,032 revenue path. This is a confirmed discrepancy. Do not declare math/report work complete until every consumer agrees. |





| Phase | Goal | Budget behavior |

| 1. Audit | Inspect actual repo and produce gap matrix. | Very low spend. No major coding. |

| 2. Core correctness | Authoritative math engine + golden tests. | Highest priority. |

| 3. P0 bugs | Tidy Up, exports, modal, clients, auth/RLS, import/export. | High priority; preserve working systems. |

| 4. Product completeness | Canvas/library/style/notes/checklists/goals/connections/layers and workflows. | High priority; no unrelated scope. |

| 5. Reports/Insights | Overview, data view, charts, scenarios, forecast, goals, MRR, reinvestment, expenses, PDF. | High priority. |

| 6. UI/UX finish | Apply Emerald professional/editorial/spatial design. | Medium priority after functionality. |

| 7. Final QA/deploy | Unit/E2E/security/export/visual checks. | High priority; do not skip. |





| PASTE THIS FIRST You are taking over an existing Funnel Mapper Pro application. Do NOT rebuild it and do NOT start from the old prototype roadmap.  Read the master handoff and inspect the actual repository. Perform Phase 1 — AUDIT ONLY.  Do not make major code changes yet.  Inspect: - architecture and dependencies - pages/components - canvas and React Flow implementation - block library - styles/inspector - math engine and KPI consumers - clients/funnels/scenarios - reports/forecasting - exports - auth/RLS - autosave/versioning - sharing - tests - deployment configuration  Create a concise gap matrix: 1. Working and should be preserved 2. Complete enough 3. Broken 4. Partially implemented 5. Missing but required 6. Missing but clearly implied 7. Future/out of scope  Create/update PROJECT_STATUS.md with the findings.  Do not code major features until the audit is complete.  Remember: - The specification is the minimum, not an exhaustive checklist. - Use Professional Completeness + Controlled Autonomy. - Reuse > Extend > Refactor > Rebuild. - One authoritative math engine must feed every KPI, report, chart and export. - Emerald #10B981 is the locked primary brand. - The remaining budget is limited; optimize for completion and avoid unnecessary exploration. |





| PRODUCT LOOP Map → Model → Simulate → Analyze → Forecast → Present |

