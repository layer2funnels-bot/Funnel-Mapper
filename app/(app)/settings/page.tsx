import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/supabase/server";
import { AgencyLogo, ProfileForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, profile } = await requireUser();
  return (
    <div className="max-w-[760px]">
      <PageHeader title="Settings" sub="Your profile, agency branding and defaults." />
      <section className="card mb-6 p-6" aria-labelledby="profile-h">
        <h2 id="profile-h" className="mb-4 font-display text-lg font-bold">
          Profile & agency
        </h2>
        <ProfileForm profile={profile} />
      </section>
      <section className="card mb-6 p-6" aria-labelledby="brand-h">
        <h2 id="brand-h" className="mb-1 font-display text-lg font-bold">
          Agency logo
        </h2>
        <p className="mb-4 text-sm text-muted">Appears on share pages and PDF reports next to your client’s logo.</p>
        <AgencyLogo url={profile.agency_logo_url} />
      </section>
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
        <p className="mb-3 text-sm">
          Signed in as <b>{user.email}</b>
        </p>
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
