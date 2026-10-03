"use client";
import { useActionState, useState, useTransition } from "react";
import { FormMessage, Submit } from "@/components/form-bits";
import { LogoUpload } from "@/components/logo-upload";
import { CURRENCIES, CURRENCY_CODES } from "@/lib/graph";
import { createIndependentAccountAction, inviteMemberAction, removeMemberAction, setMemberAction, updateAgencyLogo, updateProfileAction, updateWorkspaceAction } from "../actions";

export function ProfileForm({ fullName, email, role }: { fullName: string; email: string; role: string }) {
  const [state, action] = useActionState(updateProfileAction, undefined);
  return (
    <form action={action}>
      <FormMessage state={state?.error ? state : state?.ok ? { message: "Saved" } : undefined} />
      <div className="row2">
        <div className="field">
          <label htmlFor="pf-name">Your name</label>
          <input className="input" id="pf-name" name="full_name" defaultValue={fullName} autoComplete="name" />
        </div>
        <div className="field">
          <span className="lbl">Email</span>
          <p className="m-0 py-2 text-sm">
            {email} · <span className="pill bg-brand-soft text-brand">{role === "admin" ? "Admin" : "Member"}</span>
          </p>
        </div>
      </div>
      <Submit className="btn primary">Save</Submit>
    </form>
  );
}

export function WorkspaceForm({ agencyName, currency, disabled }: { agencyName: string; currency: string; disabled: boolean }) {
  const [state, action] = useActionState(updateWorkspaceAction, undefined);
  return (
    <form action={action}>
      <fieldset disabled={disabled} className="m-0 border-0 p-0">
        <FormMessage state={state?.error ? state : state?.ok ? { message: "Saved" } : undefined} />
        <div className="row2">
          <div className="field">
            <label htmlFor="ws-agency">Agency name</label>
            <input className="input" id="ws-agency" name="agency_name" defaultValue={agencyName} autoComplete="organization" />
          </div>
          <div className="field">
            <label htmlFor="ws-cur">Default currency</label>
            <select className="input" id="ws-cur" name="default_currency" defaultValue={currency}>
              {CURRENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCIES[c].label}
                </option>
              ))}
            </select>
            <span className="help">Used for new clients. Each client and funnel can override it.</span>
          </div>
        </div>
        {!disabled && <Submit className="btn primary">Save branding</Submit>}
      </fieldset>
    </form>
  );
}

export function AgencyLogo({ url }: { url: string | null }) {
  const [u, setU] = useState(url);
  return (
    <LogoUpload
      url={u}
      name="agency"
      label="Logo"
      onChange={async (next) => {
        await updateAgencyLogo(next);
        setU(next);
      }}
    />
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMemberAction, undefined);
  return (
    <form action={action}>
      <FormMessage state={state?.error ? state : state?.ok ? { message: "Invite sent. They’ll get an email to choose a password." } : undefined} />
      <div className="row2">
        <div className="field">
          <label htmlFor="inv-email">Email</label>
          <input className="input" id="inv-email" name="email" type="email" required autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="inv-name">Name (optional)</label>
          <input className="input" id="inv-name" name="full_name" autoComplete="off" />
        </div>
      </div>
      <Submit className="btn primary">Send invite</Submit>
    </form>
  );
}

export function IndependentForm() {
  const [state, action] = useActionState(createIndependentAccountAction, undefined);
  return (
    <form action={action}>
      <FormMessage state={state?.error ? state : state?.ok ? { message: "Account created. They’ll get an email to choose a password and open their private workspace." } : undefined} />
      <div className="row2">
        <div className="field">
          <label htmlFor="ind-email">Email</label>
          <input className="input" id="ind-email" name="email" type="email" required autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="ind-name">Name (optional)</label>
          <input className="input" id="ind-name" name="full_name" autoComplete="off" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ind-ws">Workspace name (optional)</label>
        <input className="input" id="ind-ws" name="workspace_name" autoComplete="off" />
      </div>
      <Submit className="btn primary">Create independent account</Submit>
    </form>
  );
}

type Member = { id: string; full_name: string; email: string; role: string; active: boolean };

export function MemberRow({ member: m, me, canManage, canRemove }: { member: Member; me: boolean; canManage: boolean; canRemove: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const run = (patch: { role?: "admin" | "member"; active?: boolean }) =>
    start(async () => {
      setErr("");
      const r = await setMemberAction(m.id, patch);
      if (r?.error) setErr(r.error);
    });
  return (
    <li className={`flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-0 ${m.active ? "" : "bg-bg"}`}>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft font-bold text-brand" aria-hidden="true">
        {(m.full_name || m.email).slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">
          {m.full_name || m.email}
          {me && <span className="ml-1 font-normal text-muted">(you)</span>}
        </div>
        <div className="truncate text-xs text-muted">{m.email}</div>
      </div>
      {!m.active && <span className="pill st-past">Deactivated</span>}
      {canManage && !me ? (
        <>
          <label className="sr-only" htmlFor={`role-${m.id}`}>
            Role for {m.email}
          </label>
          <select id={`role-${m.id}`} className="input min-h-[32px]! w-auto py-1! text-sm" value={m.role} disabled={pending} onChange={(e) => run({ role: e.target.value as "admin" | "member" })}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button type="button" className={`btn sm ${m.active ? "danger" : ""}`} disabled={pending} onClick={() => (m.active ? confirm(`Remove ${m.email}'s access? They’re signed out and can’t see anything until reactivated.`) && run({ active: false }) : run({ active: true }))}>
            {m.active ? "Deactivate" : "Reactivate"}
          </button>
          {canRemove && (
            <button
              type="button"
              className="btn sm danger"
              disabled={pending}
              onClick={() =>
                confirm(`Remove ${m.email} from the team?\n\nTheir account and email are deleted and they can’t sign in again (you can invite them later). Their clients, funnels and templates are kept and transferred to you.`) &&
                start(async () => {
                  setErr("");
                  const r = await removeMemberAction(m.id);
                  if (r?.error) setErr(r.error);
                })
              }
            >
              Remove
            </button>
          )}
        </>
      ) : (
        <span className="pill bg-brand-soft text-brand">{m.role === "admin" ? "Admin" : "Member"}</span>
      )}
      {err && (
        <p role="alert" className="w-full text-sm text-bad">
          {err}
        </p>
      )}
    </li>
  );
}
