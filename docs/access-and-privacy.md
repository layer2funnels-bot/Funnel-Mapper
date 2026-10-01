# Access and privacy

Funnel Mapper Pro is a private Layer2Funnels tool. Only invited team members can sign in; nothing internal is public.

## What is enforced in code

- **No public sign-up.** There is no sign-up page. Magic links never create accounts (`shouldCreateUser: false`),
  and the sign-in form gives the same answer whether or not an email belongs to the team.
- **Every page needs a session** except sign-in / password recovery (`/login`, `/reset-password`, `/auth/*`)
  and token-checked share links (`/s/<token>`, `/api/share/<token>`). See `lib/supabase/proxy.ts`.
- **Row Level Security** is on for every table; users only see rows they own (`supabase/migrations`).
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

## Adding a team member

Authentication → Users → **Invite user** → enter their email. They get an invite email, click it, and choose a password.
To remove someone, delete the user (their own clients and funnels are deleted with them) or ban them in the dashboard.

## Local development

`supabase/config.toml` already has sign-ups disabled and the templates wired in. The seed creates two accounts:
`demo@layer2funnels.test` (sample portfolio) and `teammate@layer2funnels.test` (empty), both with password `demo-password`.
Invite emails sent locally appear in Mailpit at http://127.0.0.1:54324.
