"use client";
import { useMemo, useState } from "react";
import { ThumbnailField } from "./thumbnail-field";
import { WaitField } from "./wait-field";
import { WidgetFields } from "./widget-fields";
import { baseOf, isAnnot, isShareLogic, FRAME_COLORS, INT_LABEL, LINE_DIRS, portsFor, SHAPES, typeOf, type Interval, type TrafficModel } from "@/lib/catalog";
import { money, nf, pct } from "@/lib/format";
import { Icon } from "@/components/icon";
import { RichTextField } from "@/components/rich-text";
import { num, offerVals, periodFactor, stepRate, withStepRate, type PeriodKey } from "@/lib/funnel-math";
import { STEP_STATUSES, type FunnelEdge, type FunnelNode, type StepStatus } from "@/lib/graph";
import { safeUrl } from "@/lib/rich-text";
import { sym } from "@/lib/format";
import { align, clearSelection, nid, setSection, tidySelection, setSettings, deleteSelection, flipEdge, selectNodes, duplicateSelection, setInspTab, setLocked, showToast, type InspTab, updateEdge, updateNode, updateParams, useEditor, wrapInFrame } from "@/lib/editor/store";
import { edgeConversion, edgeRevenue } from "@/lib/editor/labels";
import { openInsertStep } from "./quick-add";
import { ArrangeBar, ChecklistEditor, EdgeStyleFields, ImageFields, StylePanel } from "./style-panel";
import { Field, NumField, NumInput, Seg, StatBox, TextField } from "./fields";
import { Report } from "./report";

export function Inspector() {
  const hideAll = useEditor((s) => s.shared && s.settings.hideNumbers);
  if (hideAll) return <PublicInspector />;
  return <FullInspector />;
}

/** Share links with numbers hidden: the journey only (names, notes, page links, screenshots). */
function PublicInspector() {
  const node = useEditor((s) => (s.selNodes.length === 1 ? s.nodes.find((n) => n.id === s.selNodes[0]) : undefined));
  const order = useEditor((s) => s.R.order);
  const nodes = useEditor((s) => s.nodes);
  const steps = useMemo(() => order.map((id) => nodes.find((n) => n.id === id)).filter((n) => n && typeOf(n.type)?.cat !== "annot"), [order, nodes]);
  if (node && typeOf(node.type).cat !== "annot")
    return (
      <>
        <h3>{node.name}</h3>
        <p className="sub">{typeOf(node.type).label}</p>
        {node.url && (
          <p className="mb-3 text-sm">
            <a href={node.url} target="_blank" rel="noreferrer" className="text-brand underline">
              Open page
            </a>
          </p>
        )}
      </>
    );
  return (
    <>
      <h3>The journey</h3>
      <p className="sub">Every step in order. Select a block on the map for details.</p>
      <ol className="m-0 list-decimal pl-5 text-sm">
        {steps.map((n) => (
          <li key={n!.id} className="py-1">
            <button type="button" className="text-left hover:text-brand" onClick={() => selectNodes([n!.id])}>
              <b>{n!.name}</b> <span className="text-muted">· {typeOf(n!.type).label}</span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

function FullInspector() {
  const selNodes = useEditor((s) => s.selNodes);
  const selEdge = useEditor((s) => s.selEdge);
  const node = useEditor((s) => (s.selNodes.length === 1 ? s.nodes.find((n) => n.id === s.selNodes[0]) : undefined));
  const edge = useEditor((s) => (s.selEdge ? s.edges.find((e) => e.id === s.selEdge) : undefined));
  if (selNodes.length > 1) return <MultiInspector count={selNodes.length} />;
  if (node) return <NodeInspector key={node.id} n={node} />;
  if (selEdge && edge) return <EdgeInspector e={edge} />;
  return <Report />;
}

function Actions({ ro, n }: { ro: boolean; n: FunnelNode }) {
  if (ro) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn" onClick={duplicateSelection}>
        Duplicate
      </button>
      <button type="button" className="btn" onClick={() => setLocked(!n.locked, [n.id])} aria-pressed={!!n.locked}>
        {n.locked ? "Unlock" : "Lock"}
      </button>
      <button type="button" className="btn danger" onClick={deleteSelection} disabled={!!n.locked}>
        Delete
      </button>
    </div>
  );
}


const STATUS_PILL: Record<StepStatus, string> = { planned: "Planned", building: "In progress", done: "Live" };

/** Scope header: "← Funnel" back link, then the block's name alone on the first line, type + build status on the second. */
function ScopeHeader({ title, sub, status, locked }: { title: string; sub: string; status?: StepStatus; locked?: boolean }) {
  return (
    <header className="fm-scopehead">
      <button type="button" className="fm-back" onClick={clearSelection}>
        <Icon name="chevronLeft" size={14} /> Funnel
      </button>
      <h3 title={title}>{title}</h3>
      <p className="sub">
        <span>{sub}</span>
        {status && <span className={`fm-pill ${status}`}>{STATUS_PILL[status]}</span>}
        {locked && <span className="fm-pill lock">Locked</span>}
      </p>
    </header>
  );
}

function NodeInspector({ n }: { n: FunnelNode }) {
  const T = typeOf(n.type);
  const ro = useEditor((s) => s.readOnly);
  const shared = useEditor((s) => s.shared);
  const tab = useEditor((s) => s.inspTab);
  const flow = !isAnnot(n.type);
  // Wait is math-neutral: everyone who arrives leaves, so it has nothing to analyse
  const analytics = flow && n.type !== "wait";
  const tabs: [InspTab, string][] = [
    ["details", "Details"],
    ["style", "Style"],
    ...(!shared && n.type !== "checklist" ? ([["plan", "Plan"]] as [InspTab, string][]) : []),
    ...(analytics ? ([["analytics", "Analytics"]] as [InspTab, string][]) : []),
  ];
  const cur = tabs.some(([k]) => k === tab) ? tab : "details";
  const choose = setInspTab;
  return (
    <>
      <ScopeHeader title={n.name || T.label} sub={T.label} status={flow && !shared ? (n.status ?? "planned") : undefined} locked={n.locked} />
      <div className="fm-insp-tabs" role="tablist" aria-label="Element panels">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={cur === k} onClick={() => choose(k)}>
            {l}
          </button>
        ))}
        {flow && !analytics && (
          <button type="button" role="tab" aria-selected={false} aria-disabled="true" disabled title="Wait doesn’t change any numbers, so it has no analytics">
            Analytics
          </button>
        )}
      </div>
      <fieldset disabled={ro && cur !== "analytics"} className="m-0 min-w-0 border-0 p-0">
      {cur === "details" && <NodeDetails n={n} />}
      {cur === "style" && (
        <>
          <StylePanel n={n} />
          {!ro && <ArrangeBar ids={[n.id]} />}
        </>
      )}
      {cur === "plan" && (
        <>
          <InternalNotes n={n} />
          <ChecklistEditor n={n} />
          {flow && <PeriodForecast n={n} />}
          <p className="text-xs text-muted">The notes and checklist are internal: they never appear on client share links.</p>
        </>
      )}
      {cur === "analytics" && <NodeAnalytics n={n} />}
      </fieldset>
    </>
  );
}

function NodeDetails({ n }: { n: FunnelNode }) {
  const T = typeOf(n.type);
  const cur = useEditor((s) => s.settings.currency);
  const ro = useEditor((s) => s.readOnly);
  const shared = useEditor((s) => s.shared);
  const C = sym(cur).trim();
  const p = n.p;
  const P = (k: string) => (v: number | string | boolean) => updateParams(n.id, { [k]: v });
  return (
    <>
      {n.type === "widget" ? (
        <WidgetFields n={n} />
      ) : n.type === "note" ? (
        <RichTextField label="Note" value={String(p.text ?? "")} onChange={P("text")} rows={7} disabled={ro} help="Headings, bold, italic, lists, links and images. Shown on the map (and on share links)." />
      ) : n.type === "label" ? (
        <>
          <TextField label="Text" value={String(p.text ?? "")} onChange={P("text")} multiline />
          <NumField label="Font Size" value={num(p.size)} onChange={P("size")} min={8} max={160} />
          <p className="mb-3 text-xs text-muted">Font, weight, spacing, colour and alignment are in the Style tab.</p>
        </>
      ) : n.type === "shape" ? (
        <>
          <Field label="Shape">
            {(id) => (
              <select id={id} className="input" value={String(p.shape ?? "rounded")} onChange={(e) => P("shape")(e.target.value)}>
                {SHAPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {p.shape === "line" || p.shape === "arrow" ? (
            <Field label="Direction">
              {(id) => (
                <select id={id} className="input" value={String(p.dir ?? "h")} onChange={(e) => P("dir")(e.target.value)}>
                  {LINE_DIRS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          ) : (
            <TextField label="Text inside" value={String(p.text ?? "")} onChange={P("text")} multiline />
          )}
        </>
      ) : n.type === "image" ? (
        <ImageFields n={n} />
      ) : n.type === "link" ? (
        <>
          <TextField label="Link (page, video or file)" type="url" value={String(p.url ?? "")} placeholder="https://" onChange={(v) => P("url")(safeUrl(v))} help="YouTube, Vimeo, Loom and Wistia links show as videos. Opens in a new tab." />
          <TextField label="Title" value={String(p.title ?? "")} placeholder="e.g. Sales video walkthrough" onChange={P("title")} />
        </>
      ) : n.type === "checklist" ? (
        <>
          <TextField label="Title" value={String(p.title ?? "")} onChange={P("title")} />
          <ChecklistEditor n={n} label="Items" />
        </>
      ) : n.type === "frame" ? (
        <>
          <TextField label="Stage name" value={n.name} onChange={(v) => updateNode(n.id, { name: v })} />
          <Field label="Colour" help="Blocks inside the frame move with it.">
            {(id) => (
              <select id={id} className="input" value={String(p.color)} onChange={(e) => P("color")(e.target.value)}>
                {FRAME_COLORS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </>
      ) : (
        <>
          <TextField
            label={baseOf(n.type) === "cond" ? "Question" : "Name"}
            value={n.name}
            onChange={(v) => updateNode(n.id, { name: v })}
            help={baseOf(n.type) === "cond" ? "For example “Bought the Kickstart?” or “Opened the email?”" : undefined}
          />
          {T.cat === "traffic" && (
            <>
              <div className="field">
                <span className="lbl">Cost model</span>
                <Seg<TrafficModel>
                  label="Cost model"
                  value={(p.model as TrafficModel) || "budget"}
                  options={[
                    ["budget", "Total budget"],
                    ["cpc", "Per click"],
                    ["cpm", "Per 1,000 views"],
                  ]}
                  onChange={P("model")}
                />
              </div>
              {p.model === "cpc" ? (
                <div className="row2">
                  <NumField label="Clicks" value={num(p.clicks)} onChange={P("clicks")} min={0} />
                  <NumField label={`Cost per click (${C})`} value={num(p.cpc)} onChange={P("cpc")} min={0} />
                </div>
              ) : p.model === "cpm" ? (
                <>
                  <div className="row2">
                    <NumField label="Impressions" value={num(p.impr)} onChange={P("impr")} min={0} />
                    <NumField label={`CPM (${C})`} value={num(p.cpm)} onChange={P("cpm")} min={0} />
                  </div>
                  <NumField label="Click-through rate (%)" value={num(p.ctr)} onChange={P("ctr")} min={0} max={100} />
                </>
              ) : (
                <div className="row2">
                  <NumField label="Visitors" value={num(p.visitors)} onChange={P("visitors")} min={0} />
                  <NumField label={`Spend (${C})`} value={num(p.spend)} onChange={P("spend")} min={0} />
                </div>
              )}
            </>
          )}
          {baseOf(n.type) === "cond" && (
            <NumField label={`${T.ports?.[0] ?? "Yes"} (%)`} value={num(p.pct)} onChange={P("pct")} min={0} max={100} help={`Share of people who go the ${T.ports?.[0] ?? "Yes"} way. Everyone else follows the ${T.ports?.[1] ?? "No"} path (bottom dot).`} />
          )}
          {baseOf(n.type) === "split" && (
            <NumField label={`${T.ports?.[0] ?? "A"} (%)`} value={num(p.pct)} onChange={P("pct")} min={0} max={100} help={`${T.ports?.[1] ?? "B"} gets the rest. Connect ${T.ports?.[0] ?? "A"} from the right dot and ${T.ports?.[1] ?? "B"} from the bottom dot; split it further with the share on each connection.`} />
          )}
          {T.cat === "page" && (
            <>
              <NumField label="Conversion rate (%)" value={num(p.cr)} onChange={P("cr")} min={0} max={100} help="Share of visitors who move on. The rest follow the bottom dot." />
              <label className="check">
                <input type="checkbox" checked={!!p.lead} onChange={(e) => P("lead")(e.target.checked)} />
                People who pass this step count as leads
              </label>
            </>
          )}
          {(T.cat === "page" || T.cat === "offer") && !shared && <ThumbnailField n={n} />}
          {T.cat === "action" && (
            <>
              <NumField label={`${T.crl ?? "Conversion rate"} (%)`} value={num(p.cr)} onChange={P("cr")} min={0} max={100} />
              {n.type === "wait" && <WaitField n={n} />}
              {n.type === "seq" && <NumField label="Emails in the sequence" value={num(p.count)} onChange={P("count")} min={1} />}
              <NumField label={`Cost per person (${C})`} value={num(p.costPer)} onChange={P("costPer")} min={0} help="SMS fees, setter time per call, tool cost per contact." />
            </>
          )}
          {T.cat === "offer" && <OfferFields n={n} C={C} />}

          {baseOf(n.type) === "goal" && !shared && <TextField label="What counts as done (internal)" value={n.desc ?? ""} placeholder="e.g. Booked a call" onChange={(v) => updateNode(n.id, { desc: v })} />}
          {!shared && (
            <Field label="Build status" help="Track which steps are planned, in progress or live. Shown in Reports → Published status.">
              {(id) => (
                <select id={id} className="input" value={n.status ?? "planned"} onChange={(e) => updateNode(n.id, { status: e.target.value as StepStatus })}>
                  {STEP_STATUSES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          <NodeStats n={n} />
          {baseOf(n.type) !== "goal" && !shared && <InternalNotes n={n} />}
        </>
      )}
      <Actions ro={ro} n={n} />
    </>
  );
}

function InternalNotes({ n }: { n: FunnelNode }) {
  const ro = useEditor((s) => s.readOnly);
  return (
    <RichTextField
      label="Internal notes"
      help="Team only. Never shown on client share links, presentations or PDF reports."
      value={n.desc ?? ""}
      placeholder="Copy ideas, owner, status…"
      disabled={ro}
      onChange={(v) => updateNode(n.id, { desc: v })}
    />
  );
}

/** This step's numbers per day / week / month / year (the funnel models a month). */
function PeriodForecast({ n }: { n: FunnelNode }) {
  const r = useEditor((s) => s.R.N[n.id]);
  const cur = useEditor((s) => s.settings.currency);
  const shared = useEditor((s) => s.shared && s.settings.hideNumbers);
  if (!r || shared) return null;
  const T = typeOf(n.type);
  const inn = T.cat === "traffic" ? r.out : r.inflow;
  return (
    <div className="mb-3">
      <h4>Forecast for this step</h4>
      <div tabIndex={0} role="region" aria-label="Table (scrolls sideways when it is wider than the screen)" className="fm-tblwrap">
        <table className="tbl">
          <caption className="sr-only">Forecast for {n.name}</caption>
          <thead>
            <tr>
              <th scope="col">Per</th>
              <th scope="col" className="r">In</th>
              <th scope="col" className="r">Out</th>
              {T.cat === "offer" && <th scope="col" className="r">Revenue</th>}
              {(T.cat === "traffic" || T.cat === "action") && <th scope="col" className="r">Cost</th>}
            </tr>
          </thead>
          <tbody>
            {(["day", "week", "month", "year"] as PeriodKey[]).map((k) => {
              const f = periodFactor(k);
              return (
                <tr key={k}>
                  <th scope="row" className="font-semibold">{k[0].toUpperCase() + k.slice(1)}</th>
                  <td className="r">{nf(inn * f, 1)}</td>
                  <td className="r">{nf(r.out * f, 1)}</td>
                  {T.cat === "offer" && <td className="r">{money(r.rev * f, cur)}</td>}
                  {(T.cat === "traffic" || T.cat === "action") && <td className="r">{money((r.spend + r.cost) * f, cur)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Analytics tab: this step's numbers, its place in the funnel and a conversion goal. */
function NodeAnalytics({ n }: { n: FunnelNode }) {
  const R = useEditor((s) => s.R);
  const nodes = useEditor((s) => s.nodes);
  const edges = useEditor((s) => s.edges);
  const settings = useEditor((s) => s.settings);
  const ro = useEditor((s) => s.readOnly);
  const shared = useEditor((s) => s.shared);
  const r = R.N[n.id];
  const T = typeOf(n.type);
  const m = (v: number) => money(v, settings.currency);
  const goal = settings.goals.find((g) => g.kind === "conversion" && g.nodeId === n.id);
  const rateable = ["page", "offer", "action"].includes(T.cat) || isShareLogic(n.type);
  const impact = useMemo(() => (goal && goal.value > 0 ? withStepRate({ nodes, edges }, settings, n.id, goal.value) : null), [goal, nodes, edges, settings, n.id]);
  if (!r) return null;
  const inn = T.cat === "traffic" ? r.out : r.inflow;
  const setGoal = (v: number) => {
    const rest = settings.goals.filter((g) => g !== goal);
    setSettings({ goals: v > 0 ? [...rest, { id: goal?.id ?? nid(), name: goal?.name || `${n.name} conversion`, kind: "conversion", value: v, nodeId: n.id }] : rest });
  };
  return (
    <>
      <h4>Numbers (per month)</h4>
      <NodeStats n={n} />
      <StatBox
        items={[
          ["Share of all visitors", pct(R.traffic ? inn / R.traffic : NaN)],
          ...(T.cat !== "traffic" ? ([["Conversion here", pct(inn ? r.out / inn : NaN)]] as [string, string][]) : []),
          ...(T.cat === "offer" ? ([["Share of revenue", pct(R.rev ? r.rev / R.rev : NaN)]] as [string, string][]) : []),
          ...(T.cat === "traffic" && r.spend ? ([["Cost per visitor", m(r.spend / r.out)]] as [string, string][]) : []),
        ]}
      />
      {rateable && !(shared && settings.hideNumbers) && (
        <>
          <h4>Goal</h4>
          <fieldset disabled={ro || shared} className="m-0 border-0 p-0">
            <NumField label={`Target ${isShareLogic(n.type) ? "share" : "conversion"} (%)`} value={goal?.value || undefined} min={0} max={100} onChange={setGoal} help={`Today: ${nf(stepRate(n), 1)}%. Saved as a goal in Reports → Goals.`} />
          </fieldset>
          {impact && (
            <StatBox
              items={[
                ["Revenue at target", m(impact.rev)],
                ["Change", `${impact.rev - R.rev >= 0 ? "+" : ""}${m(impact.rev - R.rev)}`],
                ["Profit at target", m(impact.profit)],
                ["Customers at target", nf(impact.cust, 1)],
              ]}
            />
          )}
        </>
      )}
      <PeriodForecast n={n} />
      <button type="button" className="btn mb-3" onClick={() => setSection("data")}>
        <Icon name="chart" size={16} /> Open reports
      </button>
    </>
  );
}

function OfferFields({ n, C }: { n: FunnelNode; C: string }) {
  const p = n.p;
  const P = (k: string) => (v: number | string | boolean) => updateParams(n.id, { [k]: v });
  const iv = (p.interval as Interval) || "monthly";
  return (
    <>
      <NumField label="Buy rate (%)" value={num(p.cr)} onChange={P("cr")} min={0} max={100} help="Share of people reaching this offer who buy. Non-buyers follow the bottom dot." />
      {baseOf(n.type) === "sub" ? (
        <>
          <div className="field">
            <span className="lbl">Billing</span>
            <Seg<Interval>
              label="Billing"
              value={iv}
              options={[
                ["weekly", "Weekly"],
                ["monthly", "Monthly"],
                ["quarterly", "Quarterly"],
                ["yearly", "Yearly"],
              ]}
              onChange={P("interval")}
            />
          </div>
          <div className="row2">
            <NumField label={`Price per ${INT_LABEL[iv]} (${C})`} value={num(p.price)} onChange={P("price")} min={0} />
            <NumField label={`Setup fee (${C})`} value={num(p.setup)} onChange={P("setup")} min={0} />
          </div>
          <div className="row2">
            <NumField label="Trial (days)" value={num(p.trialDays)} onChange={P("trialDays")} min={0} />
            <NumField label={`Trial price (${C})`} value={num(p.trialPrice)} onChange={P("trialPrice")} min={0} />
          </div>
          <NumField label="Average customer stays (months)" value={num(p.life)} onChange={P("life")} min={0} help="Used for lifetime value. 1 ÷ monthly churn: 10% churn ≈ 10 months." />
        </>
      ) : baseOf(n.type) === "plan" ? (
        <>
          <div className="row2">
            <NumField label="Number of payments" value={num(p.pays)} onChange={P("pays")} min={1} />
            <NumField label={`Each payment (${C})`} value={num(p.price)} onChange={P("price")} min={0} />
          </div>
          <div className="field">
            <span className="lbl">Paid every</span>
            <Seg<Interval>
              label="Paid every"
              value={iv}
              options={[
                ["weekly", "Week"],
                ["monthly", "Month"],
                ["quarterly", "Quarter"],
              ]}
              onChange={P("interval")}
            />
          </div>
        </>
      ) : (
        <NumField label={`Price (${C})`} value={num(p.price)} onChange={P("price")} min={0} />
      )}
      <div className="row2">
        <NumField label="Discount (%)" value={num(p.disc)} onChange={P("disc")} min={0} max={100} />
        <NumField label="Refund rate (%)" value={num(p.refund)} onChange={P("refund")} min={0} max={100} />
      </div>
      <div className="row2">
        <NumField label={`Delivery cost per sale (${C})`} value={num(p.fulfil)} onChange={P("fulfil")} min={0} />
        <NumField label="Affiliate commission (%)" value={num(p.aff)} onChange={P("aff")} min={0} max={100} />
      </div>
      <label className="check">
        <input type="checkbox" checked={!!p.newc} onChange={(e) => P("newc")(e.target.checked)} />
        Counts as a new customer (used for CPA and AOV)
      </label>
      <TextField label="Checkout URL" type="url" value={n.url ?? ""} placeholder="https://" onChange={(v) => updateNode(n.id, { url: v })} />
    </>
  );
}

function NodeStats({ n }: { n: FunnelNode }) {
  const r = useEditor((s) => s.R.N[n.id]);
  const cur = useEditor((s) => s.settings.currency);
  const wp = useEditor((s) => s.settings.whatif.price);
  if (!r) return null;
  const T = typeOf(n.type);
  const m = (v: number) => money(v, cur);
  if (T.cat === "traffic")
    return (
      <StatBox
        items={[
          ["Visitors", nf(r.out)],
          ["Spend", m(r.spend)],
          ["Cost per visitor", m(r.spend / r.out)],
        ]}
      />
    );
  if (T.cat === "offer") {
    const v = offerVals(n, wp);
    return (
      <StatBox
        items={[
          ["Reaching offer", nf(r.inflow, 1)],
          ["Buying", nf(r.out, 1)],
          ["Cash now", m(r.cash)],
          ["Lifetime value", m(r.ltv)],
          ...(baseOf(n.type) === "sub"
            ? ([
                ["MRR", m(r.mrr)],
                ["LTV / subscriber", m(v.ltv)],
              ] as [string, string][])
            : []),
          ["Costs", m(r.cogs)],
          ["Not buying", nf(r.non, 1)],
        ]}
      />
    );
  }
  const yes = T.ports?.[0] ?? "Moving on",
    no = T.ports?.[1] ?? "Dropping off";
  return (
    <StatBox
      items={[
        ["Arriving", nf(r.inflow, 1)],
        [yes, nf(r.out, 1)],
        [no, nf(r.non, 1)],
        ...(T.cat === "action" ? ([["Cost", m(r.cost)]] as [string, string][]) : []),
      ]}
    />
  );
}

function EdgeInspector({ e }: { e: FunnelEdge }) {
  const a = useEditor((s) => s.nodes.find((n) => n.id === e.from));
  const b = useEditor((s) => s.nodes.find((n) => n.id === e.to));
  const flow = useEditor((s) => s.R.flows[e.id] ?? 0);
  const R = useEditor((s) => s.R);
  const cur = useEditor((s) => s.settings.currency);
  const ro = useEditor((s) => s.readOnly);
  const [tab, setTab] = useState<"flow" | "style">("flow");
  const labels: [string, string] = (a && typeOf(a.type).ports) || ["People who converted", "People who didn’t convert"];
  const conv = edgeConversion(e.from, flow, R);
  const rev = edgeRevenue(e.to, flow, R);
  return (
    <>
      <h3>Connection</h3>
      <p className="sub">
        {a?.name} → {b?.name}
      </p>
      <div className="fm-insp-tabs" role="tablist" aria-label="Connection panels">
        {(
          [
            ["flow", "Flow"],
            ["style", "Style"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <fieldset disabled={ro} className="m-0 min-w-0 border-0 p-0">
        {tab === "flow" ? (
          <>
            {a && portsFor(a.type).hasAlt && (
              <div className="field">
                <span className="lbl">Who goes this way</span>
                <Seg<"main" | "alt">
                  label="Who goes this way"
                  value={e.port === "alt" ? "alt" : "main"}
                  options={[
                    ["main", labels[0]],
                    ["alt", labels[1]],
                  ]}
                  onChange={(v) => updateEdge(e.id, { port: v })}
                />
              </div>
            )}
            <Field label="Share of them (%)" help="Split one group between several next steps, for example 60% email and 40% retargeting.">
              {(id) => <NumInput id={id} value={num(e.share ?? 100)} min={0} max={100} onChange={(v) => updateEdge(e.id, { share: v })} />}
            </Field>
            <StatBox
              items={[
                ["People on this path", nf(flow, 1)],
                ["Conversion at the source step", conv == null ? "No data yet" : `${nf(conv * 100, 1)}%`],
                ["Revenue through this path", rev > 0 ? money(rev, cur) : "No data yet"],
              ]}
            />
            {!ro && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" className="btn" onClick={() => flipEdge(e.id)}>
                  Flip direction
                </button>
                <button type="button" className="btn" onClick={() => openInsertStep(e.id) || showToast("Scroll the connection into view first")}>
                  Insert step on line
                </button>
              </div>
            )}
          </>
        ) : (
          <EdgeStyleFields e={e} />
        )}
        {!ro && (
          <button type="button" className="btn danger" onClick={deleteSelection}>
            Delete connection
          </button>
        )}
      </fieldset>
    </>
  );
}

function MultiInspector({ count }: { count: number }) {
  const ro = useEditor((s) => s.readOnly);
  const first = useEditor((s) => s.nodes.find((n) => n.id === s.selNodes[0]));
  const sameType = useEditor((s) => s.selNodes.length > 1 && new Set(s.nodes.filter((n) => s.selNodes.includes(n.id)).map((n) => n.type)).size === 1);
  const [tab, setTab] = useState<"style" | "arrange" | "details">("style");
  const tabs: ["style" | "arrange" | "details", string][] = [
    ["style", "Style"],
    ["arrange", "Arrange"],
    ...(sameType && first && !isAnnot(first.type) ? ([["details", "Details"]] as ["details", string][]) : []),
  ];
  const cur = tabs.some(([k]) => k === tab) ? tab : "style";
  return (
    <>
      <ScopeHeader title={`${count} blocks`} sub="Drag any of them to move the group" />
      <div className="fm-insp-tabs" role="tablist" aria-label="Selection panels">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={cur === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <fieldset disabled={ro} className="m-0 min-w-0 border-0 p-0">
        {cur === "style" && first && <MultiStyle />}
        {cur === "arrange" && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => align("left")}>
                Align left
              </button>
              <button type="button" className="btn" onClick={() => align("top")}>
                Align top
              </button>
              <button type="button" className="btn" onClick={() => align("center")}>
                Centre
              </button>
              <button type="button" className="btn" onClick={() => align("middle")}>
                Middle
              </button>
              <button type="button" className="btn" onClick={() => align("hdist")}>
                Space across
              </button>
              <button type="button" className="btn" onClick={() => align("vdist")}>
                Space down
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={tidySelection}>
                Tidy selection
              </button>
              <button type="button" className="btn" onClick={wrapInFrame}>
                Put in a stage frame
              </button>
            </div>
            <MultiArrange />
          </>
        )}
        {cur === "details" && first && <NodeDetails n={first} />}
      </fieldset>
    </>
  );
}

function MultiStyle() {
  const ids = useEditor((s) => s.selNodes);
  const first = useEditor((s) => s.nodes.find((n) => n.id === s.selNodes[0]));
  return first ? <StylePanel n={first} ids={ids} /> : null;
}

function MultiArrange() {
  const ids = useEditor((s) => s.selNodes);
  return <ArrangeBar ids={ids} />;
}
