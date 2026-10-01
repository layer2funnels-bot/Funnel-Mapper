"use client";
import { useActionState } from "react";
import { FormMessage, Submit } from "./form-bits";
import { CURRENCIES, CURRENCY_CODES } from "@/lib/graph";
import { CLIENT_STATUSES, STATUS_LABEL, type ClientRow } from "@/lib/schemas";
import type { ActionResult } from "@/app/(app)/actions";

type Action = (s: ActionResult, fd: FormData) => Promise<ActionResult>;

export function ClientForm({ action, client, defaultCurrency = "GBP", submitLabel = "Save client", niches = [] }: { action: Action; client?: Partial<ClientRow>; defaultCurrency?: string; submitLabel?: string; niches?: string[] }) {
  const [state, formAction] = useActionState(action, undefined);
  const c = client ?? {};
  return (
    <form action={formAction} noValidate>
      <FormMessage state={state?.error ? state : undefined} />
      <div className="row2">
        <div className="field">
          <label htmlFor="cf-name">Client name *</label>
          <input className="input" id="cf-name" name="name" defaultValue={c.name ?? ""} required autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="cf-business">Business name</label>
          <input className="input" id="cf-business" name="business_name" defaultValue={c.business_name ?? ""} autoComplete="off" />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="cf-niche">Niche</label>
          <input className="input" id="cf-niche" name="niche" list="niche-list" defaultValue={c.niche ?? ""} placeholder="Fitness, coaching…" />
          <datalist id="niche-list">
            {niches.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="cf-status">Status</label>
          <select className="input" id="cf-status" name="status" defaultValue={c.status ?? "lead"}>
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="cf-email">Email</label>
          <input className="input" id="cf-email" name="email" type="email" defaultValue={c.email ?? ""} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="cf-phone">Phone</label>
          <input className="input" id="cf-phone" name="phone" type="tel" defaultValue={c.phone ?? ""} autoComplete="off" />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="cf-website">Website</label>
          <input className="input" id="cf-website" name="website" defaultValue={c.website ?? ""} placeholder="https://" autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="cf-country">Country</label>
          <input className="input" id="cf-country" name="country" defaultValue={c.country ?? ""} autoComplete="off" />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="cf-currency">Currency</label>
          <select className="input" id="cf-currency" name="currency" defaultValue={c.currency ?? defaultCurrency}>
            {CURRENCY_CODES.map((k) => (
              <option key={k} value={k}>
                {CURRENCIES[k].label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cf-retainer">Monthly retainer</label>
          <input className="input" id="cf-retainer" name="monthly_retainer" type="number" min="0" step="any" defaultValue={c.monthly_retainer ?? 0} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="cf-tags">Tags</label>
        <input className="input" id="cf-tags" name="tags" defaultValue={(c.tags ?? []).join(", ")} placeholder="tripwire, retainer" />
        <span className="help">Separate tags with commas.</span>
      </div>
      {client?.id ? null : (
        <div className="field">
          <label htmlFor="cf-notes">Notes</label>
          <textarea className="input" id="cf-notes" name="notes" defaultValue={c.notes ?? ""} />
        </div>
      )}
      <div className="flex items-center gap-3">
        <Submit className="btn primary">{submitLabel}</Submit>
        <span role="status" className="text-sm text-good">
          {state?.ok ? "Saved" : ""}
        </span>
      </div>
    </form>
  );
}
