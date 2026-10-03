# Access and privacy

Funnel Mapper Pro is a private Layer2Funnels tool. Only invited team members and independent users created by the
team can sign in; nothing internal is public.

There are two separate access worlds (see `docs/concepts/workspaces-and-team.md`):

- **The Layer2Funnels team workspace:** the whole team shares its clients, funnels, templates and files.
- **Independent users:** each has a private workspace. They can't see Layer2Funnels data or each other's,
  and the team can't see theirs.

## What is enforced in code

- **No public sign-up.** There is no sign-up page. Magic links never create accounts (`shouldCreateUser: false`),
  and the sign-in form gives the same answer whether or not an email belongs to the team.
- **Every page needs a session** except sign-in / password recovery (`/login`, `/reset-password`, `/auth/*`)
  and token-checked share links (`/s/<token>`, `/api/share/<token>`). See `lib/supabase/proxy.ts`.
- **Workspace-scoped Row Level Security** on every table:
  - Every row carries a `workspace_id`, and an *active* member can read and edit only their own workspace's rows.
  - Child rows (funnels, versions, actuals, share links, comments, client products) always inherit their
    parent's workspace, so nothing can be attached across workspaces.
  - Deactivated members and anonymous visitors see nothing.
  - Members can't change their own role or workspace, and each workspace always keeps an active admin.
- **Storage:**
  - `thumbnails` and `screenshots` are private to their workspace (short-lived signed URLs).
  - `logos` is public because client share links display the client's and agency's logo.
  - Uploads go only into your own folder.
- **Internal block notes and screenshots never leave the database on share links** (stripped in `get_shared_funnel()`),
  and saving from an editable link keeps them. Presentation mode and PDF reports don't show them either.
- **Share links** go through `get_shared_funnel()`, which returns only that one funnel plus the client's name and logo
  (no contact details). With *Hide numbers* on, the database strips every price, rate and cost before anything leaves it.
  Links can expire or be revoked at any time.
- **No indexing / framing:** `robots.txt` disallows everything, pages send `X-Robots-Tag: noindex`, `X-Frame-Options: DENY`,
  and `Referrer-Policy: strict-origin-when-cross-origin` so share tokens never leak to sites a client clicks through to.

## Production setup (Supabase dashboard)

1. **Authentication → Sign In / Providers → User Signups:** turn **off** "Allow new users to sign up".
   Keep the **Email** provider enabled (it is also what allows team members to sign in).
2. **Authentication → Email Templates:** paste the templates from `supabase/templates/` for *Invite user*,
   *Magic Link* and *Reset Password*. They link to `/auth/confirm`, which verifies the token on the server.
3. **Authentication → URL Configuration:** set *Site URL* to the deployed app URL and add `https://<your-domain>/**`
   to the redirect allow list.

## Adding and removing team members

- **Invite:** Settings → Team → *Invite a teammate* (needs `SUPABASE_SERVICE_ROLE_KEY` on the server), or
  Supabase → Authentication → Users → **Invite user**. They get an email, click it, and choose a password.
  The first account in a new project becomes the admin automatically.
- **Remove:** Settings → Team → **Deactivate**. They're signed out and see nothing; their work stays in the workspace.
  Reactivate any time. (Deleting a user in the Supabase dashboard also deletes the clients and funnels they created.)
- **Admins** can change roles, deactivate members and edit the workspace branding.

## Independent accounts

- **Owner/admin workflow:** Settings → **Independent accounts**. Only admins of the team workspace see it.
  Enter the email; the person gets an email to choose a password and lands in their own empty workspace.
- **Private sign-up URL:** set `INDEPENDENT_SIGNUP_CODE` (server-only, at least 8 characters) to enable
  `/join/<code>`. Admins see the full link in Settings. Unknown codes return 404, and the main app never
  links to it.
- Both paths need `SUPABASE_SERVICE_ROLE_KEY` on the server. The database creates the personal workspace in
  the same transaction that creates the account.
- To remove an independent user, delete them in Supabase → Authentication → Users. Their clients and funnels
  go with them.

## Local development

`supabase/config.toml` already has sign-ups disabled and the templates wired in. The seed creates
`demo@layer2funnels.test` (admin), `teammate@layer2funnels.test` (member) and `former@layer2funnels.test` (deactivated),
and two independent users, `solo@independent.test` and `solo2@independent.test` (each with a private workspace),
all with password `demo-password`.
Invite emails sent locally appear in Mailpit at http://127.0.0.1:54324.
