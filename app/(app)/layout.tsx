import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, profile } = await requireUser();
  return (
    <div className="min-h-full lg:flex">
      <AppNav agency={profile.agency_name || "My agency"} user={profile.full_name || user.email || ""} logo={profile.agency_logo_url} />
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
