import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "./database.types";

/** Server Supabase client bound to the request's auth cookies. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

/**
 * Current member, their profile and their workspace (the Layer2Funnels team workspace, or an independent user's
 * private one), or redirect to /login. A user without an active profile (deactivated, or never invited) is
 * signed out. Cached per request. RLS scopes every query to this workspace; `isTeam` only drives the UI.
 */
export const requireUser = cache(async () => {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await sb.from("profiles").select("*, workspace:workspaces(*)").eq("id", user.id).maybeSingle();
  if (!data || !data.active || !data.workspace) redirect("/auth/removed");
  const { workspace, ...profile } = data;
  return { sb, user, profile, workspace, isAdmin: profile.role === "admin", isTeam: workspace.kind === "team" };
});
