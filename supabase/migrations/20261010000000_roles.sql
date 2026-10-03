-- Roles: Owner / Admin / Editor / Viewer, per workspace (docs/concepts/roles.md).
--
--   owner   one per workspace (the first admin; the creator of a personal workspace). Everything an admin can do,
--           plus creating independent accounts (team) and handing ownership to someone else. Can't be demoted or
--           deactivated by anyone else.
--   admin   manages members (invite, roles, deactivate) and branding, and edits all data.
--   editor  edits all data (clients, funnels, versions, actuals, share links, products, templates). Was "member".
--   viewer  reads everything in the workspace; writes nothing. Enforced here, in RLS: the UI only mirrors it.
--
-- Safe on a live database: existing members become editors (same rights as before), the earliest active admin
-- of each workspace becomes its owner, other admins stay admins. Policies are changed in place (ALTER POLICY)
-- and read-only policies are added next to them; functions are replaced in place. The one structural change is
-- the role check constraint, which has to be replaced to allow the new values: apply with the Supabase CLI
-- (`supabase db push`) or the SQL editor.

-- ---------------------------------------------------------------------------
-- role values
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'editor' where role = 'member';
update public.profiles p set role = 'owner'
 where p.id in (
   select distinct on (workspace_id) id from public.profiles
    where role = 'admin' and active
    order by workspace_id, created_at, id)
   and not exists (select 1 from public.profiles o where o.workspace_id = p.workspace_id and o.role = 'owner');
alter table public.profiles add constraint profiles_role_check check (role in ('owner', 'admin', 'editor', 'viewer'));
alter table public.profiles alter column role set default 'editor';
create unique index if not exists profiles_one_owner on public.profiles (workspace_id) where role = 'owner';

-- ---------------------------------------------------------------------------
-- role helpers (security definer: they read the caller's own profile)
-- ---------------------------------------------------------------------------
-- owner or admin of their (active) workspace: member management and branding
create or replace function public.is_team_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and active and role in ('owner', 'admin'))
$$;
-- may change data: everyone but viewers
create or replace function public.can_write() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and active and role in ('owner', 'admin', 'editor'))
$$;
create or replace function public.is_workspace_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and active and role = 'owner')
$$;
revoke all on function public.can_write() from public;
revoke all on function public.is_workspace_owner() from public;
grant execute on function public.can_write() to authenticated;
grant execute on function public.is_workspace_owner() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: members read their workspace; only owners, admins and editors write
-- ---------------------------------------------------------------------------
alter policy "clients: team" on public.clients
  using (workspace_id = public.current_workspace_id() and public.can_write())
  with check (workspace_id = public.current_workspace_id() and public.can_write());
alter policy "funnels: team" on public.funnels
  using (workspace_id = public.current_workspace_id() and public.can_write())
  with check (workspace_id = public.current_workspace_id() and public.can_write());
alter policy "funnel_versions: team" on public.funnel_versions
  using (workspace_id = public.current_workspace_id() and public.can_write())
  with check (workspace_id = public.current_workspace_id() and public.can_write());
alter policy "funnel_actuals: team" on public.funnel_actuals
  using (workspace_id = public.current_workspace_id() and public.can_write())
  with check (workspace_id = public.current_workspace_id() and public.can_write());
alter policy "share_links: team" on public.share_links
  using (workspace_id = public.current_workspace_id() and public.can_write())
  with check (workspace_id = public.current_workspace_id() and public.can_write());
alter policy "products: team" on public.products
  using (workspace_id = public.current_workspace_id() and public.can_write())
  with check (workspace_id = public.current_workspace_id() and public.can_write());

create policy "clients: members read" on public.clients for select to authenticated using (workspace_id = public.current_workspace_id());
create policy "funnels: members read" on public.funnels for select to authenticated using (workspace_id = public.current_workspace_id());
create policy "funnel_versions: members read" on public.funnel_versions for select to authenticated using (workspace_id = public.current_workspace_id());
create policy "funnel_actuals: members read" on public.funnel_actuals for select to authenticated using (workspace_id = public.current_workspace_id());
create policy "share_links: members read" on public.share_links for select to authenticated using (workspace_id = public.current_workspace_id());
create policy "products: members read" on public.products for select to authenticated using (workspace_id = public.current_workspace_id());

alter policy "share_comments: team updates" on public.share_comments
  using (workspace_id = public.current_workspace_id() and public.can_write())
  with check (workspace_id = public.current_workspace_id() and public.can_write());
alter policy "share_comments: team deletes" on public.share_comments
  using (workspace_id = public.current_workspace_id() and public.can_write());

alter policy "templates: team adds" on public.templates
  with check (owner_id is not null and workspace_id = public.current_workspace_id() and public.can_write());
alter policy "templates: team edits" on public.templates
  using (owner_id is not null and workspace_id = public.current_workspace_id() and public.can_write())
  with check (owner_id is not null and workspace_id = public.current_workspace_id() and public.can_write());
alter policy "templates: team deletes" on public.templates
  using (owner_id is not null and workspace_id = public.current_workspace_id() and public.can_write());

alter policy "storage: team uploads" on storage.objects
  with check (bucket_id in ('logos', 'thumbnails', 'screenshots') and public.current_workspace_id() is not null and public.can_write() and (
    (bucket_id = 'thumbnails' and public.storage_object_in_my_workspace(bucket_id, name))
    or (bucket_id <> 'thumbnails' and (storage.foldername(name))[1] = (select auth.uid())::text)));
alter policy "storage: team updates" on storage.objects
  using (bucket_id in ('logos', 'thumbnails', 'screenshots') and public.can_write() and public.storage_object_in_my_workspace(bucket_id, name));
alter policy "storage: team deletes" on storage.objects
  using (bucket_id in ('logos', 'thumbnails', 'screenshots') and public.can_write() and public.storage_object_in_my_workspace(bucket_id, name));

-- ---------------------------------------------------------------------------
-- profile changes: admins manage roles below owner; the owner is protected; ownership moves only by handover
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- requests from signed-in users carry auth.uid(); SQL migrations, the seed and the service role don't
  if (select auth.uid()) is null or current_setting('app.ownership_handover', true) = 'on' then
    return new;
  end if;
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'accounts can''t change workspace' using errcode = '42501';
  end if;
  if (new.role is distinct from old.role or new.active is distinct from old.active or new.email is distinct from old.email)
     and not public.is_team_admin() then
    raise exception 'only admins can change roles or deactivate members' using errcode = '42501';
  end if;
  if (new.role = 'owner' and old.role is distinct from 'owner')
     or (old.role = 'owner' and (new.role is distinct from old.role or new.active is distinct from old.active)) then
    raise exception 'ownership only moves by handover from the owner' using errcode = '42501';
  end if;
  if new.id = (select auth.uid()) and (new.active = false or new.role not in ('owner', 'admin')) and old.role in ('owner', 'admin')
     and not exists (select 1 from public.profiles where role in ('owner', 'admin') and active and id <> new.id and workspace_id = old.workspace_id) then
    raise exception 'the workspace needs at least one active admin' using errcode = '42501';
  end if;
  return new;
end $$;

-- the owner hands the workspace to another active member (who becomes owner; the old owner becomes an admin)
create or replace function public.transfer_ownership(p_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles;
  target public.profiles;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if not found or me.role <> 'owner' or not me.active then
    raise exception 'only the owner can hand over the workspace' using errcode = '42501';
  end if;
  select * into target from public.profiles where id = p_to;
  if not found or target.workspace_id <> me.workspace_id or not target.active or target.id = me.id then
    raise exception 'pick an active member of this workspace' using errcode = '22023';
  end if;
  perform set_config('app.ownership_handover', 'on', true);
  update public.profiles set role = 'admin' where id = me.id;
  update public.profiles set role = 'owner' where id = target.id;
  perform set_config('app.ownership_handover', 'off', true);
end $$;
revoke all on function public.transfer_ownership(uuid) from public;
grant execute on function public.transfer_ownership(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- new accounts: first team account = owner, invited = editor, independent = owner of their personal workspace
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  team uuid := public.team_workspace_id();
  first_account boolean := not exists (select 1 from public.profiles where role in ('owner', 'admin') and workspace_id = team);
  pending public.workspace_signups;
  ws uuid;
  nm text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
begin
  select * into pending from public.workspace_signups where email = lower(coalesce(new.email, ''));
  if found then
    insert into public.workspaces (kind, agency_name)
    values ('personal', coalesce(nullif(trim(pending.workspace_name), ''), nullif(trim(pending.full_name), ''), 'My workspace'))
    returning id into ws;
    insert into public.profiles (id, full_name, email, role, active, workspace_id)
    values (new.id, coalesce(nullif(nm, ''), pending.full_name), coalesce(new.email, ''), 'owner', true, ws)
    on conflict (id) do nothing;
    return new;
  end if;
  -- everyone else joins the team workspace: the first account as its owner, invited accounts active as editors
  -- (see handle_user_invited; an admin can pick another role when inviting), any other account inactive until
  -- an admin activates it
  insert into public.profiles (id, full_name, email, role, active, workspace_id)
  values (new.id, nm, coalesce(new.email, ''), case when first_account then 'owner' else 'editor' end,
          first_account or new.invited_at is not null, team)
  on conflict (id) do nothing;
  return new;
end $$;
