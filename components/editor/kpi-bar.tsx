"use client";
import { useBand } from "@/lib/use-band";
import { useFocusBlock } from "./focus";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { money, nf, pct, ratio } from "@/lib/format";
import { healthChecks } from "@/lib/health";
import { setTab, clearSelection, useEditor } from "@/lib/editor/store";

/** Popover above the strip; closes on outside click and Escape. */
function Pop({ label, button, children, wide }: { label: string; button: (open: boolean) => React.ReactNode; children: (close: () => void) => React.ReactNode; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="fm-kpop" ref={ref}>
      <button type="button" className="fm-kbtn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {button(open)}
      </button>
      {open && (
        <div className={`fm-kpop-card${wide ? " wide" : ""}`} role="dialog" aria-label={label}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Bottom strip (V2 D2): checks chip, the six headline numbers, "+N more", and the unit the numbers are in. Every figure is the engine's `R`. */
export function KpiBar() {
  const band = useBand();
  const R = useEditor((s) => s.R);
  const cur = useEditor((s) => s.settings.currency);
  const basis = useEditor((s) => s.settings.basis);
  const nodes = useEditor((s) => s.nodes);
  const edges = useEditor((s) => s.edges);
  const warnIds = useEditor((s) => s.warnIds);
  const shared = useEditor((s) => s.shared);
  const focus = useFocusBlock();
  // checks are for the team, not for clients viewing a share link
  const checks = shared ? [] : healthChecks({ nodes, edges });
  const hasTraffic = nodes.some((n) => n.type !== "frame" && n.type !== "note" && n.type !== "label");
  const m = (v: number) => money(v, cur);
  const main: [string, React.ReactNode][] = [
    ["Traffic", nf(R.traffic)],
    ["Leads", nf(R.leads, 1)],
    ["Customers", nf(R.cust, 1)],
    [basis === "ltv" ? "Revenue (lifetime)" : "Revenue (first pay)", m(R.rev)],
    ["Profit", <span key="p" className={R.profit >= 0 ? "pos" : "neg"}>{m(R.profit)}</span>],
    ["ROAS", ratio(R.roas)],
  ];
  const more: [string, React.ReactNode][] = [
    ["Ad spend", m(R.spend)],
    ["ROI", pct(R.roi)],
    ["AOV", m(R.aov)],
    ["CPA", m(R.cpa)],
    ["CPL", m(R.cpl)],
    ["EPC", m(R.epc)],
    ["Conv. rate", pct(R.conv)],
    ["MRR", m(R.mrr)],
    ["LTV / customer", m(R.ltvc)],
  ];
  const named = nodes.filter((n) => warnIds.has(n.id));
  // bands: what the strip shows; everything else goes into "+N more" (phone: every figure, scrolling)
  const all = [...main, ...more];
  const SHOW: Record<string, string[] | "all"> = {
    xl: main.map(([k]) => k),
    lg: main.map(([k]) => k),
    md: ["Revenue (first pay)", "Revenue (lifetime)", "Profit", "ROAS", "Customers"],
    tablet: ["Revenue (first pay)", "Revenue (lifetime)", "Profit", "ROAS"],
    phone: "all",
  };
  const rule = SHOW[band];
  const strip = rule === "all" ? all : all.filter(([k]) => rule.includes(k));
  const rest = rule === "all" ? [] : all.filter(([k]) => !rule.includes(k));
  const compactChecks = band === "md" || band === "tablet" || band === "phone";
  return (
    <footer className="fm-kpis" aria-label="Funnel numbers" tabIndex={0}>
      {hasTraffic && !shared && (
        <Pop
          label="Funnel checks"
          button={() =>
            checks.length > 0 ? (
              <span className="fm-chk warn">
                <Icon name="alert" size={14} />
                {checks.length}
                {!compactChecks && (checks.length === 1 ? " check" : " checks")}
              </span>
            ) : (
              <span className="fm-chk ok">
                <Icon name="check" size={14} />
                Checks pass
              </span>
            )
          }
        >
          {(close) => (
            <>
              <h3>Funnel checks</h3>
              {checks.length === 0 ? (
                <p>Every block is connected and every Yes/No has both paths.</p>
              ) : (
                <>
                  <ul>
                    {checks.map((c) => (
                      <li key={c.id}>{c.text}</li>
                    ))}
                  </ul>
                  {named.length > 0 && (
                    <div className="fm-kgo">
                      {named.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            close();
                            focus(n.id);
                          }}
                        >
                          Show “{n.name}”
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="fm-klink"
                    onClick={() => {
                      close();
                      clearSelection();
                      setTab("math");
                      document.querySelector(".fm-editor")?.classList.add("show-insp");
                    }}
                  >
                    Open the Math tab
                  </button>
                </>
              )}
            </>
          )}
        </Pop>
      )}
      {strip.map(([a, b]) => (
        <div className="fm-kpi" key={a}>
          <div>{a}</div>
          <b>{b}</b>
        </div>
      ))}
      {rest.length > 0 && (
        <Pop
          label="More numbers"
          wide
          button={() => (
            <>
              <span className="fm-kmore">+{rest.length}{band === "md" || band === "tablet" ? "" : " more"}</span>
            </>
          )}
        >
          {() => (
            <dl className="fm-kgrid">
              {rest.map(([a, b]) => (
                <div key={a}>
                  <dt>{a}</dt>
                  <dd>{b}</dd>
                </div>
              ))}
            </dl>
          )}
        </Pop>
      )}
      <span className="fm-kunit">per month · {cur}</span>
    </footer>
  );
}
