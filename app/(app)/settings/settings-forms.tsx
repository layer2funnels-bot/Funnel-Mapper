"use client";
import { useActionState, useState } from "react";
import { FormMessage, Submit } from "@/components/form-bits";
import { LogoUpload } from "@/components/logo-upload";
import { CURRENCIES, CURRENCY_CODES } from "@/lib/graph";
import type { ProfileRow } from "@/lib/schemas";
import { updateAgencyLogo, updateProfileAction } from "../actions";

export function ProfileForm({ profile }: { profile: ProfileRow }) {
  const [state, action] = useActionState(updateProfileAction, undefined);
  return (
    <form action={action}>
      <FormMessage state={state?.error ? state : state?.ok ? { message: "Saved" } : undefined} />
      <div className="row2">
        <div className="field">
          <label htmlFor="pf-name">Your name</label>
          <input className="input" id="pf-name" name="full_name" defaultValue={profile.full_name} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="pf-agency">Agency name</label>
          <input className="input" id="pf-agency" name="agency_name" defaultValue={profile.agency_name} autoComplete="organization" />
        </div>
      </div>
      <div className="field max-w-[260px]">
        <label htmlFor="pf-cur">Default currency</label>
        <select className="input" id="pf-cur" name="default_currency" defaultValue={profile.default_currency}>
          {CURRENCY_CODES.map((c) => (
            <option key={c} value={c}>
              {CURRENCIES[c].label}
            </option>
          ))}
        </select>
        <span className="help">Used for new clients. Each client and funnel can override it.</span>
      </div>
      <Submit className="btn primary">Save</Submit>
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
