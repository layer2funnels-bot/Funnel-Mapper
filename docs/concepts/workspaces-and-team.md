# Concept: workspaces, team invites and editor panel controls

Status: implemented in the "Workspace + Team + Editor panels" milestone (Oct 2026).

## What existed

- One implicit shared workspace. Every active `profiles` row (role `admin`/`member`, `active` flag) could read
  and write every row of every table: the RLS policies call `is_team_member()`.
- `workspace` was a single-row table (`id = 1`) holding the agency name, logo and default currency.
- Invite-only: sign-ups are off, magic links never create users, uninvited accounts start inactive, and
  Settings → Team already sends invites through the service role on the server.
- Storage: `logos` and `screenshots` objects live under `<uid>/…`; thumbnails are `<funnelId>.png`.

## Goal

There are two separate access worlds:

1. **The Layer2Funnels team workspace**, shared by the whole team (exactly today's behaviour).
2. **Independent users**, each with a private workspace. They can't see Layer2Funnels data or each other's.

## Design (smallest safe extension)

- **`workspaces`** (new table): `id uuid`, `kind` (`team` | `personal`), `agency_name`, `agency_logo_url`,
  `default_currency`. A partial unique index allows exactly one `team` workspace. The migration copies the
  old `workspace` row into it under a fixed id (`…a000…0001`). The legacy table stays in place, frozen, and
  only team members can read it.
- **Membership = the profile row.** `profiles.workspace_id` is added next to the existing `role` and
  `active` columns.
  - An account belongs to exactly one workspace. That matches the brief: an independent user "is not a team
    member", so the two worlds never share an account.
  - This keeps every working membership mechanism unchanged: roles, deactivation, last-admin guard, invite
    activation.
  - A many-to-many `workspace_members` table can come later if one person ever needs two workspaces.
- **Every data table gets `workspace_id`** (`clients`, `funnels`, `funnel_versions`, `funnel_actuals`,
  `share_links`, `share_comments`, `products`, `templates`).
  - Existing rows are backfilled to the team workspace.
  - Root rows (`clients`, `templates`, agency-wide `products`) default to the caller's workspace.
  - Child rows always copy their parent's workspace via a `BEFORE INSERT OR UPDATE` trigger: a funnel from
    its client, versions/actuals/links/comments from their funnel, client products from their client. So a
    row can never point at a parent in another workspace.
  - App inserts needed no changes.
- **RLS**: `current_workspace_id()` (security definer) returns the caller's workspace, or null if the
  account is inactive.
  - Every policy becomes `workspace_id = current_workspace_id()`, changed in place with `ALTER POLICY`.
    Built-in templates (`owner_id is null`) stay readable by everyone signed in.
  - Profiles are visible only within the same workspace. Admins manage only their own workspace's members.
    Nobody but the service role can move a profile between workspaces.
- **Storage**: reads, updates and deletes are allowed when the object's owner folder (`<uid>/…`) belongs
  to a member of the caller's workspace, or the thumbnail's funnel belongs to it. Uploads go only to your
  own folder, or to the thumbnail of a funnel in your workspace. No objects move.
- **Share links** are branded from the funnel's own workspace.

## Accounts and sign-up

- **Team invites** (Settings → Team, admins of the team workspace) keep using `inviteUserByEmail`. Invited
  accounts land in the team workspace and are activated by the existing `on_auth_user_invited` trigger.
  Dashboard invites behave the same way.
- **Independent accounts** are created through `lib/independent.ts` (server-only, service role):
  1. It records the email in `workspace_signups`. That table is service-role only: RLS is on and there are
     no policies.
  2. It sends an invite email.
  3. `handle_new_user()` sees the pending signup and, in the same transaction that creates the user,
     creates a `personal` workspace. The user becomes its active admin.

  There's no window where the new account belongs to the team workspace.
  - **Owner/admin workflow:** Settings → *Create an independent account* (team-workspace admins only).
  - **Private sign-up URL:** `/join/<INDEPENDENT_SIGNUP_CODE>`. It returns 404 unless the server-only env
    var is set and matches. It always answers "check your email", so it can't be used to discover
    accounts.
  - The main app still has no sign-up link. Supabase sign-ups stay off.
- Accounts created any other way still start inactive in the team workspace, so an admin must activate them
  (unchanged).

## Roles

Owner/Admin/Editor/Viewer are **deferred**.

- Mapping Editor to today's Member and Owner to the first admin would be easy.
- A real Viewer needs:
  - read-only RLS on every table;
  - read-only handling of every write path in the UI: editor, client forms, products, templates, imports
    and actuals.

That is a permission-system pass, not a small extension. The secure Admin/Member model is kept.

## Editor panel controls

- Desktop (≥ 1021 px) gets toolbar toggles to collapse the Block Library (left) and the Inspector/report
  panel (right). The grid column shrinks to 0, so the canvas takes the space and React Flow resizes itself.
- State is kept per browser with the editor's other view options (`fm-editor-opts`, via `setOpt`).
- Opening version history or comments re-opens the right panel.
- Tablet and phone keep their existing drawers; the toggles are hidden there.

## Data safety

- The migration is additive only: no `DROP`, no column removal, no data rewrite beyond backfilling the new
  columns to the team workspace.
- Functions are replaced in place and policies are changed with `ALTER POLICY`. That is also compatible
  with the Supabase connector, which hangs on SQL containing `DROP`.

## Update: several workspaces per person (migration 20261009000000)

- **Who:** admins (of the workspace they're working in) create workspaces from the left menu's workspace picker.
  A new workspace starts empty, with its creator as its admin.
- **Membership:** `workspace_members` holds one row per (workspace, person) with that person's role and active
  flag there. It replaces `profiles.role/active` for access; those columns are kept, but nothing reads them for
  access any more.
- **Current workspace:** `profiles.workspace_id` is the workspace the person is working in.
  - `current_workspace_id()` returns it only while they're an active member, so every data policy isolates
    workspaces exactly as before.
  - Switching goes through `switch_workspace()`, which checks membership. The profile guard refuses any other
    move.
- **Per workspace:**
  - The team list, invites, roles, deactivation and removal all apply to the current workspace.
  - Inviting someone who already has an account adds them directly.
  - Removing someone deletes their account only if they belong to no other workspace. Their work in that
    workspace goes to the admin who removed them.
- **Independent accounts:** still created from the team workspace or `/join/<code>`, each with its own workspace.
