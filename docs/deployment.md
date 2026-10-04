# Deployment

Funnel Mapper Pro runs on **Supabase** (database, sign-in, file storage) and **Vercel** (the website).
Two scripts do the whole job, and both are safe to re-run:

| Command | What it does |
|---|---|
| `npm run deploy` | Creates or reuses the Supabase project (London), applies every migration, sets sign-in to invite-only with the website address and email templates, creates or reuses the Vercel project, sets its environment variables, deploys to production, smoke-tests the site, and invites the first admin. |
| `npm run live-check` | Verifies the live site end to end with temporary accounts it creates and deletes again (no emails sent): access rules, private storage, share-link privacy, and a browser walkthrough of the main workflows. |

## What the person who owns the accounts provides

1. A **Supabase personal access token**: supabase.com → sign in → avatar (top right) → **Account preferences** → **Access Tokens** → **Generate new token**.
   The account needs an organization. The script creates one called “Layer2Funnels” if there isn't one.
2. A **Vercel access token**: vercel.com → sign in → avatar → **Account Settings** → **Tokens** → **Create**.
   Vercel’s free Hobby plan is for non-commercial use; an agency tool should use **Pro**.
3. The **email address of the first admin**, who receives the invite.

Tokens are secrets. Store them as environment variables (below), never in chat or in the repository.

## Running it from a Claude Code cloud session

1. In the environment settings (cloud environment menu in the session's title bar → **Edit**), add these **environment variables**:
   - `SUPABASE_ACCESS_TOKEN`: the Supabase token
   - `VERCEL_TOKEN`: the Vercel token
2. In the same settings, under **Network access**, allow these domains (or choose full network access):
   `api.supabase.com`, `*.supabase.co`, `api.vercel.com`, `vercel.com`, `*.vercel.com`, `*.vercel.app`
3. Start a **new session** in that environment (new variables are picked up by new sessions).

### Agent runbook (for the session doing the deployment)

```bash
npm ci
ADMIN_EMAIL='<admin email>' npm run deploy          # prints the live URL; state goes to .deploy/state.json (no secrets)
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run live-check
```

- `deploy` stops with a clear message if something is missing (token, organization choice, quota) or fails.
  If the Vercel build fails, it prints the end of the build log. Fix the cause, push to `main`, and re-run; finished steps are skipped.
- Supabase’s free plan allows 2 active projects per organization. If creating the project fails on quota, ask the owner to delete or pause one, or upgrade.
- `live-check` refuses to run until the workspace has an admin, so a temporary account can never become the first admin.
  The admin exists as soon as the invite has been sent.
- Optional variables: `SUPABASE_ORG` (organization slug, if the account has several), `SUPABASE_REGION` (default `eu-west-2`),
  `PROJECT_NAME` (default `funnel-mapper-pro`), `VERCEL_SCOPE` (team slug), `RESEND_ADMIN_INVITE=1`.

## After the first deployment

- **Admin:** the invited admin opens the email “You’re invited to Funnel Mapper Pro”, chooses a password, then sets the agency name, logo and currency in **Settings**.
- **Emails:** Supabase’s built-in mailer only delivers to members of the Supabase organization and sends a few emails per hour.
  Before inviting teammates, either add them to the Supabase organization, or set up your own email sender
  (Supabase → Project Settings → Authentication → SMTP; e.g. Resend, Postmark or Google Workspace SMTP).
  Teammates can also be added in Supabase → Authentication → Users → **Add user** (with a password). Accounts created that way
  start with **no access** until an admin activates them in **Settings → Team**; invited accounts are active straight away.
- **Updates:** push to `main`, then run `npm run deploy` again. Only new migrations are applied, and the site is redeployed.
  (Optional: connect the GitHub repository in Vercel → Project → Settings → Git so pushes deploy automatically.
  Database migrations still go through `npm run deploy`.)
- **Free-plan note:** Supabase pauses free projects after a week without activity. `npm run deploy` restores a paused project;
  the Pro plan avoids pausing and adds daily backups.

## Databases that were migrated by hand (demo and production)

The demo (`arwedmqmxrxllytzriat`) and production (`kyhlhacbmlbkiibvpsel`) databases were partly migrated through the
Supabase dashboard / connector, which records its own timestamps and sometimes splits a migration into chunks.
`npm run deploy` matches those by name (`pendingMigrations` in `scripts/deploy/migrations.mjs`, unit-tested in
`tests/unit/deploy-migrations.test.ts`) and **refuses** to run when a gap would re-apply an older migration over newer
ones. In that case, pass the last repo migration that is already in the database:

```bash
MIGRATIONS_BASELINE=20261009000000 npm run deploy   # demo: everything up to workspace_members is already applied
```

Pending V1-completion migrations (apply in order, together with the code that needs them):

| Migration | What | Notes |
|---|---|---|
| `20261010000000_share_notes.sql` | Funnel notes stay off share links unless shared on purpose | Functions replaced in place; compatible with older code. |
| `20261011000000_roles.sql` | Owner / Admin / Editor / Viewer on `workspace_members` | Replaces the role check constraint (`DROP CONSTRAINT`): apply with `npm run deploy`, the Supabase CLI or the SQL editor, not the dashboard connector. Renames `member` → `editor`, so deploy the code at the same time (older code still writes `member`). |
| `20261012000000_client_archive.sql` | `clients.archived_at` | Additive. |
| `20261013000000_workspace_assets.sql` | `workspace_assets` table (saved style presets and workspace blocks), RLS by workspace | Additive: a new table. Older code ignores it; the new code reads it when the editor opens, and shows "Couldn't load the saved blocks" with a retry if the table is missing. Apply with `npm run deploy` or the CLI. |

None of these were applied to the demo or production databases by the engineering work: apply them as described below, then run `npm run live-check`.

Production additionally still needs everything from `20261003000000_team_workspace.sql` onwards (it has 3 of 12).

Order of operations for an existing database: **migrations first, then the code** (the new code reads
`clients.archived_at` and the new roles; the old code keeps working on the migrated database apart from changing a
teammate's role, which briefly fails until the new code is live).
- Production: run `npm run deploy` from the merged code. It applies the migrations, then deploys. Then run `npm run live-check`.
- Demo: Vercel deploys `main` automatically, so apply the migrations (`MIGRATIONS_BASELINE=20261009000000 npm run deploy`,
  or the CLI) right before merging.

## Page thumbnails (optional environment setting)

"Capture preview" on a Page block needs a screenshot service. Set `CAPTURE_URL_TEMPLATE` (server-only, see `.env.example`) on
Vercel, for example `https://screenshots.example.com/v1/shot?key=SECRET&width=1280&url={url}`; it must answer with an image.
Redeploy after adding it. Until it is set, the editor tells people automatic capture is not set up and goes straight to
"Upload instead", so nothing is blocked. The end-to-end tests run against a local stand-in (`tests/e2e/capture-stub.mjs`).

## Doing it by hand instead

See “Deploying (Supabase + Vercel)” in the README for the manual dashboard steps. The scripts do exactly the same thing.
