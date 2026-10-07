# Phase 2: intelligence-ready reporting checkpoint

## Scope

This pass extends the existing Funnel Mapper Pro architecture. `lib/funnel-math.ts` remains the source of truth for funnel results, leak calculations, goal seeking, and projections. No database migration was needed: goal periods default to month for existing saved goals, and actuals remain in the existing owner-scoped `funnel_actuals` table.

## Shipped in this pass

- **Separate health views.** Structural/setup warnings remain engine-aligned. Performance health separately ranks the largest absolute loss and weakest continuing step, then reports drop-off and the engine-projected monthly customer, revenue, and profit impact of a 10% relative conversion lift. Findings navigate to the corresponding block.
- **Period-aware goals.** Revenue, profit, traffic, customers, leads, and step-completion goals support day, week, month, and year. Existing goals parse as monthly. Required numbers use the same monthly engine and are displayed at the requested target period. Conversion-rate goals remain rate targets. Exported map goal progress uses the selected period too.
- **Dated actuals export.** The Actuals tab exports filtered actual rows to CSV with their original start/end dates. Rows are included only when their entire saved aggregation period fits inside the selected range; the UI explains when overlapping periods are omitted because their totals cannot be split accurately.
- **Focused regression coverage.** Tests cover health findings against engine leak math, no-traffic behavior, period-based traffic/revenue goals, and escaped/date-preserving actuals CSV output.

## Product research applied

The research focused on capabilities rather than copying competitor presentation:

- Journey-mapping products emphasize evidence, ownership/status, versioning, collaboration, and useful exports ([UXPressia](https://uxpressia.com/), [Smaply](https://www.smaply.com/tools/journey-maps), [Custellence](https://www.custellence.com/pricing/)). Funnel Mapper already has its own mapping, statuses, history, sharing, and exports, so this pass concentrated on making performance and historical data more decision-ready.
- Analytics products emphasize explicit funnel drop-off, breakdowns, conversion windows, and period comparisons ([Amplitude funnel analysis](https://amplitude.com/docs/analytics/charts/funnel-analysis/funnel-analysis-build), [Heap funnel analysis](https://help.heap.io/hc/en-us/articles/37271972717073-Funnel-analysis-overview), [Heap period comparisons](https://help.heap.io/hc/en-us/articles/37271997251089-Period-over-Period-Analysis)). This pass adds clear loss impact and date-preserving actuals output while reusing the current deterministic model.
- Marketing reporting products emphasize channel/source comparisons and conversion outcomes ([HubSpot marketing reports](https://knowledge.hubspot.com/reports/use-marketing-reports-in-the-marketing-analytics-suite?c=CA)). Existing source, offer, cost, scenario, and reinvestment reports were retained rather than duplicated.

## Verification

- Vitest: 213 tests passed across 20 files.
- ESLint: passed.
- TypeScript: passed with `tsc --noEmit` and in the production build.
- Next.js production build: passed.

## Deliberate boundaries

Actuals are entered as totals for a saved date interval. The app does not infer daily values inside a coarser interval; partially overlapping actual periods are excluded and called out. Funnel projections and period goals use the product's existing linear period scaling and forecast assumptions. New attribution integrations, AI recommendations, multi-user real-time mapping, and database changes remain outside this reporting pass.
