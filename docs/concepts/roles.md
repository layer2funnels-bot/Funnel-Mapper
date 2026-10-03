# Concept: workspace roles (Owner / Admin / Editor / Viewer)

Status: implemented in the final V1 completion (Oct 2026), on top of per-workspace memberships
(`workspace_members`, see `workspaces-and-team.md`).

## Roles

| Role | Can do |
|---|---|
| **Owner** | Everything an admin can. Also creates independent accounts (team workspace) and hands ownership to another active member. Exactly one per workspace; nobody else can demote, deactivate or remove them. |
| **Admin** | Invites, changes roles (admin/editor/viewer), deactivates and removes members; edits branding; creates workspaces; edits all data. |
| **Editor** | Creates and edits clients, funnels, versions, actuals, share links, products and templates. (The former "member".) |
| **Viewer** | Reads everything in the workspace (clients, funnels, reports, versions, comments); changes nothing. |

A role belongs to a membership: the same person can be an editor in one workspace and the owner of another.

## Where it's enforced

- **Database (the security boundary):** migration `20261011000000_roles.sql`.
  - `my_role()` reads the caller's role in the workspace they're working in.
  - `can_write()` (owner/admin/editor) is added to every data policy (clients, funnels, versions, actuals, share
    links, products, templates, comment moderation, storage uploads/updates/deletes). Separate `… members read`
    policies keep reads open to every active member, viewers included.
  - `is_team_admin()` now means owner or admin.
  - `guard_member_update()`: only owners and admins change memberships (RLS); nobody makes themselves owner or
    changes the owner's role or activation; a workspace keeps at least one active owner/admin.
  - `transfer_ownership(p_to)`: the owner hands over the workspace they're in (they become an admin).
  - New accounts: the first team account and creators of workspaces / independent accounts are owners; invited
    people join as editors (the inviting admin can pick admin, editor or viewer).
- **App (mirrors the database):** `requireUser()` returns `role`, `isAdmin`, `isOwner` and `canEdit`.
  - Server actions that write return "Viewers can look but not change anything" before calling the database.
  - Viewers get the editor read-only (no unlock, no share, versions, import, status or templates), client pages
    with every form disabled, and no "New client / New funnel / Use template" buttons.
  - Settings shows the role legend, a role picker for admins and "Make owner" for the owner.
- **Legacy:** `profiles.role` / `profiles.active` are not used for access (kept for compatibility, values unchanged).

## Tests

- `tests/integration/roles.test.ts`: the viewer reads everything and every write is refused (tables and storage);
  editors can't change roles; admins manage roles below the owner; the owner is protected; handover both ways;
  creators own new workspaces.
- `tests/e2e/v1.spec.ts` "a viewer sees everything and can change nothing", "the owner assigns roles".
