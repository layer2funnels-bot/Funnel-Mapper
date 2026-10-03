import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/supabase/server";
import { AgencyLogo, IndependentForm, InviteForm, MemberRow, ProfileForm, WorkspaceForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { sb, user, profile, workspace, isAdmin, isTeam } = await requireUser();
  // RLS returns only this workspace's members
  const { data: members } = await sb.from("profiles").select("id, full_name, email, role, active, created_at").order("created_at");
  const canInvite = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const joinCode = process.env.INDEPENDENT_SIGNUP_CODE ?? "";
  const joinUrl = canInvite && joinCode.length >= 8 ? `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/join/${joinCode}` : "";
  return (
    <div className="max-w-[820px]">
      <PageHeader title="Settings" sub={isTeam ? "Your profile, the team workspace and its branding." : "Your profile, your private workspace and its branding."} />
      <section className="card mb-6 p-6" aria-labelledby="profile-h">
        <h2 id="profile-h" className="mb-4 font-display text-lg font-bold">
          Your profile
        </h2>
        <ProfileForm fullName={profile.full_name} email={user.email ?? ""} role={profile.role} />
      </section>

      <section className="card mb-6 p-6" aria-labelledby="brand-h">
        <h2 id="brand-h" className="mb-1 font-display text-lg font-bold">
          Workspace branding
        </h2>
        <p className="mb-4 text-sm text-muted">Shown on client share links and PDF reports, next to the client’s logo.{!isAdmin && " Only admins can change it."}</p>
        <WorkspaceForm agencyName={workspace.agency_name} currency={workspace.default_currency} disabled={!isAdmin} />
        <div className="mt-4">
          <span className="mb-2 block text-[13px] font-bold">Agency logo</span>
          {isAdmin ? (
            <AgencyLogo url={workspace.agency_logo_url} />
          ) : workspace.agency_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspace.agency_logo_url} alt="Agency logo" className="h-16 w-16 rounded-xl border border-line bg-white object-contain" />
          ) : (
            <p className="text-sm text-muted">No logo yet.</p>
          )}
        </div>
      </section>

      {isTeam ? (
        <section className="card mb-6 p-6" aria-labelledby="team-h">
          <h2 id="team-h" className="mb-1 font-display text-lg font-bold">
            Team
          </h2>
          <p className="mb-4 text-sm text-muted">Everyone listed here shares the same clients, funnels and templates. There is no public sign-up: people join by invite only.</p>
          {isAdmin && (
            <div className="mb-5 rounded-xl border border-line p-4">
              <h3 className="mb-2 text-sm font-bold">Invite a teammate</h3>
              {canInvite ? (
                <InviteForm />
              ) : (
                <p className="text-sm text-muted">
                  Invite from Supabase → Authentication → Users → <b>Invite user</b>. (To invite from here, set <code>SUPABASE_SERVICE_ROLE_KEY</code> on the server. See the README.)
                </p>
              )}
            </div>
          )}
          <ul className="m-0 list-none p-0" aria-label="Team members">
            {(members ?? []).map((m) => (
              <MemberRow key={m.id} member={m} me={m.id === user.id} canManage={isAdmin} />
            ))}
          </ul>
        </section>
      ) : (
        <section className="card mb-6 p-6" aria-labelledby="team-h">
          <h2 id="team-h" className="mb-1 font-display text-lg font-bold">
            Private workspace
          </h2>
          <p className="text-sm text-muted">This workspace is yours alone: only you can see its clients, funnels, templates and files.</p>
        </section>
      )}

      {isTeam && isAdmin && (
        <section className="card mb-6 p-6" aria-labelledby="indep-h">
          <h2 id="indep-h" className="mb-1 font-display text-lg font-bold">
            Independent accounts
          </h2>
          <p className="mb-4 text-sm text-muted">
            Create an account for someone outside the team. They get their own private workspace: they can’t see Layer2Funnels clients, funnels or templates, and the team can’t see theirs.
          </p>
          {canInvite ? (
            <IndependentForm />
          ) : (
            <p className="text-sm text-muted">
              Needs <code>SUPABASE_SERVICE_ROLE_KEY</code> on the server.
            </p>
          )}
          {joinUrl && (
            <div className="mt-4 text-sm">
              <span className="mb-1 block font-bold">Private sign-up link</span>
              <p className="m-0 text-muted">Anyone with this link can create their own independent workspace. Share it only with people you choose.</p>
              <code className="mt-1 block break-all rounded-lg border border-line px-2 py-1" data-testid="join-url">
                {joinUrl}
              </code>
            </div>
          )}
        </section>
      )}

      <section className="card mb-6 p-6" aria-labelledby="look-h">
        <h2 id="look-h" className="mb-3 font-display text-lg font-bold">
          Appearance
        </h2>
        <ThemeToggle className="btn" />
      </section>
      <section className="card p-6" aria-labelledby="acct-h">
        <h2 id="acct-h" className="mb-3 font-display text-lg font-bold">
          Account
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/update-password" className="btn">
            Change password
          </Link>
          <form action="/auth/signout" method="post">
            <button className="btn">Sign out</button>
          </form>
        </div>
      </section>
    </div>
  );
}
