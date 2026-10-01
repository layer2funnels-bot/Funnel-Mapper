// Shared by deploy.mjs and the local verification: how migrations are sent to a Supabase project.
import { readdirSync, readFileSync } from "node:fs";

export const HISTORY_DDL = `create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text not null primary key, statements text[], name text);`;

/** supabase/migrations/*.sql in order → [{ file, version, name, body }] */
export function listMigrations(root) {
  return readdirSync(`${root}supabase/migrations`)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort()
    .map((file) => {
      const [, version, name] = file.match(/^(\d+)_(.+)\.sql$/);
      return { file, version, name, body: readFileSync(`${root}supabase/migrations/${file}`, "utf8") };
    });
}

/** One transaction per migration, recorded in the same history table the Supabase CLI uses. */
export function wrapMigration({ file, version, name, body }) {
  if (body.includes("$fm_migration$")) throw new Error(`${file} contains the reserved quote tag $fm_migration$`);
  return `begin;\n${body}\n;\ninsert into supabase_migrations.schema_migrations (version, name, statements) values ('${version}', '${name}', array[$fm_migration$${body}$fm_migration$]);\ncommit;`;
}
