"use client";
import { useMemo } from "react";
import { LogoUpload } from "@/components/logo-upload";
import { CATS, FRAME_COLORS, INT_LABEL, portsFor, typeOf, type Interval, type TrafficModel } from "@/lib/catalog";
import { money, nf } from "@/lib/format";
import { num, offerVals } from "@/lib/funnel-math";
import type { FunnelEdge, FunnelNode } from "@/lib/graph";
import { sym } from "@/lib/format";
import { align, deleteSelection, selectNodes, duplicateSelection, updateEdge, updateNode, updateParams, useEditor, wrapInFrame } from "@/lib/editor/store";
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

function Actions({ ro }: { ro: boolean }) {
  if (ro) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn" onClick={duplicateSelection}>
        Duplicate
      </button>
      <button type="button" className="btn danger" onClick={deleteSelection}>
        Delete
      </button>
    </div>
  );
}

function NodeInspector({ n }: { n: FunnelNode }) {
  const T = typeOf(n.type);
  const cur = useEditor((s) => s.settings.currency);
  const ro = useEditor((s) => s.readOnly);
  const shared = useEditor((s) => s.shared);
  const C = sym(cur).trim();
  const p = n.p;
  const P = (k: string) => (v: number | string | boolean) => updateParams(n.id, { [k]: v });
  return (
    <fieldset disabled={ro} className="m-0 min-w-0 border-0 p-0">
      <h3>{T.label}</h3>
      <p className="sub">{CATS[T.cat]}</p>
      {n.type === "note" ? (
        <TextField label="Note" value={String(p.text ?? "")} onChange={P("text")} multiline />
      ) : n.type === "label" ? (
        <>
          <TextField label="Text" value={String(p.text ?? "")} onChange={P("text")} multiline />
          <NumField label="Size (px)" value={num(p.size)} onChange={P("size")} min={12} max={96} />
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
            label={n.type === "cond" ? "Question" : "Name"}
            value={n.name}
            onChange={(v) => updateNode(n.id, { name: v })}
            help={n.type === "cond" ? "For example “Bought the Kickstart?” or “Opened the email?”" : undefined}
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
          {n.type === "cond" && <NumField label="Yes (%)" value={num(p.pct)} onChange={P("pct")} min={0} max={100} help="Share of people who answer yes. Everyone else follows the No path (bottom dot)." />}
          {n.type === "split" && <NumField label="Version A (%)" value={num(p.pct)} onChange={P("pct")} min={0} max={100} help="Version B gets the rest. Connect A from the right dot and B from the bottom dot." />}
          {T.cat === "page" && (
            <>
              <NumField label="Conversion rate (%)" value={num(p.cr)} onChange={P("cr")} min={0} max={100} help="Share of visitors who move on. The rest follow the bottom dot." />
              <label className="check">
                <input type="checkbox" checked={!!p.lead} onChange={(e) => P("lead")(e.target.checked)} />
                People who pass this step count as leads
              </label>
              <TextField label="Page URL" type="url" value={n.url ?? ""} placeholder="https://" onChange={(v) => updateNode(n.id, { url: v })} />
            </>
          )}
          {T.cat === "action" && (
            <>
              <NumField label={`${T.crl ?? "Conversion rate"} (%)`} value={num(p.cr)} onChange={P("cr")} min={0} max={100} />
              {n.type === "wait" && <NumField label="Wait (days)" value={num(p.days)} onChange={P("days")} min={0} />}
              {n.type === "seq" && <NumField label="Emails in the sequence" value={num(p.count)} onChange={P("count")} min={1} />}
              <NumField label={`Cost per person (${C})`} value={num(p.costPer)} onChange={P("costPer")} min={0} help="SMS fees, setter time per call, tool cost per contact." />
            </>
          )}
          {T.cat === "offer" && <OfferFields n={n} C={C} />}
          {(T.cat === "page" || T.cat === "offer") && !shared && (
            <div className="field">
              <span className="lbl">Page screenshot</span>
              <LogoUpload bucket="screenshots" label="Screenshot" url={n.shot ?? null} name={`shot-${n.id}`} onChange={async (u) => updateNode(n.id, { shot: u ?? undefined })} />
            </div>
          )}
          {n.type === "goal" && !shared && <TextField label="What counts as done (internal)" value={n.desc ?? ""} placeholder="e.g. Booked a call" onChange={(v) => updateNode(n.id, { desc: v })} />}
          <NodeStats n={n} />
          {n.type !== "goal" && !shared && (
            <TextField label="Internal notes" help="Team only. Never shown on client share links, presentations or PDF reports." value={n.desc ?? ""} placeholder="Copy ideas, owner, status…" multiline onChange={(v) => updateNode(n.id, { desc: v })} />
          )}
        </>
      )}
      <Actions ro={ro} />
    </fieldset>
  );
}

function OfferFields({ n, C }: { n: FunnelNode; C: string }) {
  const p = n.p;
  const P = (k: string) => (v: number | string | boolean) => updateParams(n.id, { [k]: v });
  const iv = (p.interval as Interval) || "monthly";
  return (
    <>
      <NumField label="Buy rate (%)" value={num(p.cr)} onChange={P("cr")} min={0} max={100} help="Share of people reaching this offer who buy. Non-buyers follow the bottom dot." />
      {n.type === "sub" ? (
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
      ) : n.type === "plan" ? (
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
          ...(n.type === "sub"
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
  const yes = n.type === "cond" ? "Yes" : n.type === "split" ? "Version A" : "Moving on",
    no = n.type === "cond" ? "No" : n.type === "split" ? "Version B" : "Dropping off";
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
  const ro = useEditor((s) => s.readOnly);
  const labels: [string, string] = a?.type === "cond" ? ["Yes", "No"] : a?.type === "split" ? ["Version A", "Version B"] : ["People who converted", "People who didn’t convert"];
  return (
    <fieldset disabled={ro} className="m-0 min-w-0 border-0 p-0">
      <h3>Connection</h3>
      <p className="sub">
        {a?.name} → {b?.name}
      </p>
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
      <StatBox items={[["People on this path", nf(flow, 1)]]} />
      {!ro && (
        <button type="button" className="btn danger" onClick={deleteSelection}>
          Delete connection
        </button>
      )}
    </fieldset>
  );
}

function MultiInspector({ count }: { count: number }) {
  const ro = useEditor((s) => s.readOnly);
  return (
    <>
      <h3>{count} blocks selected</h3>
      <p className="sub">Drag any of them to move the group.</p>
      {!ro && (
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
            <button type="button" className="btn" onClick={wrapInFrame}>
              Put in a stage frame
            </button>
            <button type="button" className="btn" onClick={duplicateSelection}>
              Duplicate
            </button>
            <button type="button" className="btn danger" onClick={deleteSelection}>
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}
