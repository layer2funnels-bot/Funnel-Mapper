# Deployment

Funnel Mapper Pro runs on **Supabase** (database, sign-in, file storage) and **Vercel** (the website).
Two scripts support deployment and live checks. `deploy` can create resources and deploy to Production, so verify its target before running it; its repeat handling does not make a wrong target safe.

| Command | What it does |
|---|---|
| `npm run deploy` | Creates or reuses the Supabase project (London), applies pending migrations, sets sign-in to invite-only with the website address and email templates, creates or reuses the Vercel project, sets its environment variables, deploys with `--prod`, smoke-tests the site, and may invite the first admin. |
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

## Demo / Production target warning

The deployment script is a production deployment workflow, not a Demo-only migration command. It selects projects by `.deploy/state.json` and `PROJECT_NAME` (default `funnel-mapper-pro`); if it cannot find a project, it creates one. It sets environment variables for both Production and Preview and runs a Vercel `--prod` deployment. `MIGRATIONS_BASELINE` only affects migration-history matching; it does not select a database or Vercel project. Do not use `npm run deploy` as a Demo-only operation without first verifying the state file, project refs, Vercel project, and resulting domains.

Dashboard inspection on **2026-10-07** confirmed that Vercel project `funnel-mapper-demo` is connected to `layer2funnels-bot/Funnel-Mapper`, with `main` as its Production branch. Both `funnel-mapper-demo.vercel.app` and `mapper.layer2funnels.com` are assigned to that Production environment. Its `NEXT_PUBLIC_SUPABASE_URL` points to the Demo Supabase project (`arwedmqmxrxllytzriat`); the Preview environment is also configured to use that same Demo project. Therefore, a deployment to `main` affects both Production domains, and Preview builds share the Demo database. This is an observed configuration snapshot, not an instruction to change it. Keep Production deployments and domain changes behind explicit owner approval.

## Demo and Production migration history

The Demo (`arwedmqmxrxllytzriat`) and Production (`kyhlhacbmlbkiibvpsel`) databases have migration histories recorded
through the Supabase dashboard / connector, which can use its own timestamps and split migrations into chunks.
`pendingMigrations` in `scripts/deploy/migrations.mjs` matches these records by migration name and **refuses** to run
when a gap could re-apply an older migration over newer ones. A baseline only tells this matcher which earlier repo
migrations are already represented in the selected database; it is not a target selector or approval to apply SQL.

The Demo migration list was inspected on **2026-10-07**. It contains `share_notes`, `roles`, and `client_archive`
(latest recorded row: `client_archive`, version `20261003095827`), along with the earlier workspace migrations. The repo's
`workspace_assets` migration (`20261013000000_workspace_assets.sql`) was not present in that list. With the documented
baseline through `workspace_members` and the observed names, `workspace_assets` is the remaining repo migration at that
snapshot. Verify the dashboard history again before any migration operation. The prior statement that none of the V1
completion migrations had been applied is stale. Production migration history was not inspected in this audit; do not
rely on the previous “3 of 12” note without checking the Production project directly.

The historical Demo baseline remains `20261009000000` for the manually chunked workspace migration history. It lets
the matcher skip repo migrations through `workspace_members`; it does not authorize applying later migrations and must
not be treated as a Demo target selector. No generic deploy command is documented here as a Demo-only migration path.

## Page thumbnails (optional environment setting)

"Capture preview" on a Page block needs a screenshot service. Set `CAPTURE_URL_TEMPLATE` (server-only, see `.env.example`) on
Vercel, for example `https://screenshots.example.com/v1/shot?key=SECRET&width=1280&url={url}`; it must answer with an image.
Redeploy after adding it. Until it is set, the editor tells people automatic capture is not set up and goes straight to
"Upload instead", so nothing is blocked. The end-to-end tests run against a local stand-in (`tests/e2e/capture-stub.mjs`).

## Doing it by hand instead

See “Deploying (Supabase + Vercel)” in the README for the manual dashboard steps. The scripts do exactly the same thing.
