# Access and privacy

Funnel Mapper Pro is a private Layer2Funnels tool. Only invited team members can sign in; nothing internal is public.

## What is enforced in code

- **No public sign-up.** There is no sign-up page. Magic links never create accounts (`shouldCreateUser: false`),
  and the sign-in form gives the same answer whether or not an email belongs to the team.
- **Every page needs a session** except sign-in / password recovery (`/login`, `/reset-password`, `/auth/*`)
  and token-checked share links (`/s/<token>`, `/api/share/<token>`). See `lib/supabase/proxy.ts`.
- **Shared workspace with Row Level Security** on every table: every *active* team member can read and edit all clients,
  funnels, templates and data; deactivated members and anonymous visitors see nothing. Members can't change their own role;
  the workspace always keeps an active admin.
- **Storage:** `thumbnails` and `screenshots` are private (team only, short-lived signed URLs). `logos` is public because
  client share links display the client's and agency's logo.
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

## Local development

`supabase/config.toml` already has sign-ups disabled and the templates wired in. The seed creates
`demo@layer2funnels.test` (admin), `teammate@layer2funnels.test` (member) and `former@layer2funnels.test` (deactivated),
all with password `demo-password`.
Invite emails sent locally appear in Mailpit at http://127.0.0.1:54324.
