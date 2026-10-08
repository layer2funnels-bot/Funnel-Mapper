import { AppNav } from "@/components/app-nav";
import { ThemeSync } from "@/components/theme-toggle";
import { TopStrip } from "@/components/top-strip";
import { templateOptions } from "@/lib/queries";
import { roleLabel } from "@/lib/roles";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { sb, user, profile, workspace, workspaces, role, isTeam, isAdmin, canEdit } = await requireUser();
  // data for the top strip's "New funnel" (viewers can't create, so they skip the queries)
  const [clients, templates] = canEdit
    ? await Promise.all([sb.from("clients").select("id, name").is("archived_at", null).order("name").then((r) => r.data ?? []), templateOptions(sb, isTeam ? "Team templates" : "Your templates")])
    : [[], []];
  return (
    <div className="min-h-full lg:flex">
      <ThemeSync saved={user.user_metadata?.theme === "light" || user.user_metadata?.theme === "dark" ? user.user_metadata.theme : null} at={Number(user.user_metadata?.theme_at) || 0} />
      <AppNav agency={workspace.agency_name || "Layer2Funnels"} user={profile.full_name || user.email || ""} role={roleLabel(role)} logo={workspace.agency_logo_url} team={isTeam} workspaceId={workspace.id} workspaces={workspaces} canCreate={isAdmin} />
      <div className="min-w-0 flex-1">
        <TopStrip canEdit={canEdit} clients={clients} templates={templates} />
        <main id="main" className="px-4 py-6 pb-24 sm:px-6 sm:pb-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
