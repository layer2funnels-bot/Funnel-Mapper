import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import type { TemplateOption } from "@/components/new-funnel-dialog";

type SB = SupabaseClient<Database>;

/** Options for the "Start from" picker: built-ins + the user's own templates. */
export async function templateOptions(sb: SB): Promise<TemplateOption[]> {
  const { data } = await sb.from("templates").select("id, name, builtin_key, owner_id, category").order("created_at");
  return (data ?? []).map((t) => ({
    value: t.builtin_key ? `builtin:${t.builtin_key}` : `template:${t.id}`,
    label: t.name,
    group: t.owner_id ? "My templates" : "Built-in templates",
  }));
}
