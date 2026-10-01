"use client";
import { money, nf, pct, ratio } from "@/lib/format";
import { setTab, clearSelection, useEditor } from "@/lib/editor/store";

export function KpiBar() {
  const R = useEditor((s) => s.R);
  const cur = useEditor((s) => s.settings.currency);
  const basis = useEditor((s) => s.settings.basis);
  // warnings are for the team, not for clients viewing a share link
  const warn = useEditor((s) => (s.shared ? 0 : s.warnIds.size));
  const hasTraffic = useEditor((s) => s.nodes.some((n) => n.type !== "frame" && n.type !== "note" && n.type !== "label"));
  const m = (v: number) => money(v, cur);
  const k: [string, React.ReactNode][] = [
    ["Traffic", nf(R.traffic)],
    ["Ad spend", m(R.spend)],
    ["Leads", nf(R.leads, 1)],
    ["Customers", nf(R.cust, 1)],
    [basis === "ltv" ? "Revenue (lifetime)" : "Revenue (first pay)", m(R.rev)],
    ["Profit", <span key="p" className={R.profit >= 0 ? "pos" : "neg"}>{m(R.profit)}</span>],
    ["ROI", pct(R.roi)],
    ["AOV", m(R.aov)],
    ["CPA", m(R.cpa)],
    ["CPL", m(R.cpl)],
    ["ROAS", ratio(R.roas)],
    ["EPC", m(R.epc)],
    ["Conv. rate", pct(R.conv)],
    ["MRR", m(R.mrr)],
    ["LTV / customer", m(R.ltvc)],
  ];
  return (
    <footer className="fm-kpis" aria-label="Funnel numbers" tabIndex={0}>
      {hasTraffic && warn > 0 && (
        <button
          type="button"
          className="fm-kpi text-left"
          style={{ background: "color-mix(in srgb, var(--bad) 9%, transparent)" }}
          onClick={() => {
            clearSelection();
            setTab("math");
            document.querySelector(".fm-editor")?.classList.add("show-insp");
          }}
        >
          <div>Warnings</div>
          <b className="neg">{warn}</b>
        </button>
      )}
      {k.map(([a, b]) => (
        <div className="fm-kpi" key={a}>
          <div>{a}</div>
          <b>{b}</b>
        </div>
      ))}
    </footer>
  );
}
