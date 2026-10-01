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

export type Workspace = Database["public"]["Tables"]["workspace"]["Row"];
const DEFAULT_WORKSPACE: Workspace = { id: 1, agency_name: "Layer2Funnels", agency_logo_url: null, default_currency: "GBP", updated_at: "" };

/**
 * Current team member, their profile and the shared workspace, or redirect to /login.
 * A user without an active profile (deactivated, or not part of the team) is signed out. Cached per request.
 */
export const requireUser = cache(async () => {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: workspace }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    sb.from("workspace").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (!profile || !profile.active) redirect("/auth/removed");
  return { sb, user, profile, workspace: workspace ?? DEFAULT_WORKSPACE, isAdmin: profile.role === "admin" };
});
