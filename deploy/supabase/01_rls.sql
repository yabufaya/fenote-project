-- Supabase hardening for the Fenote schema.
-- Run AFTER the fresh CREATE-only deploy/supabase/00_schema_clean.sql and BEFORE
-- exposing the Data API. This file's ALTER TABLE ... ENABLE ROW LEVEL SECURITY
-- statements are security toggles, not structural schema changes.
--
-- Model: both Express APIs connect as `postgres` via DATABASE_URL and therefore
-- bypass RLS. RLS exists here to make sure the public `anon` key cannot read or
-- write patient data through Supabase's auto-generated REST/GraphQL API.
-- Supabase Auth is now the only identity store: the legacy public.users table
-- (password hashes / reset tokens) has been removed from 00_schema_clean.sql.
-- The fresh schema uses identity columns, so the *_id_seq sequence names used
-- below (e.g. public.bookings_id_seq) are still created automatically.

begin;

-- 0. Supabase provides these roles; a plain local PostgreSQL does not.
--    Creating them here lets the same script run locally and on Supabase.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    -- Supabase's service_role bypasses RLS; reproduce that locally so the
    -- trusted-server verification queries behave the same way.
    create role service_role nologin bypassrls;
  elsif not (select rolbypassrls from pg_roles where rolname = 'service_role') then
    alter role service_role with bypassrls;
  end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;

-- 1. Remove Supabase's default automatic grants on public tables/sequences.
--    (Newer projects may not grant these; REVOKE is safe either way.)
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
revoke truncate on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- 2. Enable RLS on every app table (RLS with no policies = deny for anon/authenticated).
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- 3. Public, read-only content tables.
grant select on
  public.about,
  public.blog,
  public.client,
  public.contact,
  public.gallery,
  public.hero_content,
  public.hero_slide,
  public.highlight,
  public.payment_packages,
  public.payment_settings,
  public.resource,
  public.services,
  public.team,
  public.team_members,
  public.testimonial,
  public.booking_availability_state
to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'about','blog','client','contact','gallery','hero_content','hero_slide',
    'highlight','payment_packages','payment_settings','resource','services',
    'team','team_members','testimonial','booking_availability_state'
  ] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format(
      'create policy "public read" on public.%I for select to anon, authenticated using (true)',
      t
    );
  end loop;
end $$;

-- 4. No anonymous writes to private tables. Booking, contact-message and
--    subscriber submissions go through the two Express APIs, which connect as
--    postgres. This prevents a browser from bypassing slot locking, validation
--    and audit/notification triggers through the Supabase Data API.
revoke insert on public.bookings, public.subscribers, public.contact_messages from anon, authenticated;
drop policy if exists "anon can submit booking" on public.bookings;
drop policy if exists "anon can subscribe" on public.subscribers;
drop policy if exists "anon can send message" on public.contact_messages;

-- 4d. DB-backed admin roles. Publishable/anon-key only: no service-role key.
--     SECURITY DEFINER + table owner avoids recursive RLS when a policy on
--     admin_profiles asks "is the caller an admin?".
create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select ap.role
  from public.admin_profiles ap
  where ap.auth_user_id = auth.uid()
    and ap.is_active = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_admin_role() in ('admin', 'superadmin'), false);
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_admin_role() = 'superadmin', false);
$$;

-- Called by both Express APIs after getClaims() verifies the access token.
-- Links a pre-provisioned email row to auth.users.id on first CONFIRMED login.
create or replace function public.link_admin_profile(p_user_id uuid, p_email text)
returns setof public.admin_profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_confirmed timestamptz;
  v_profile public.admin_profiles;
begin
  if p_user_id is null or p_email is null or btrim(p_email) = '' then
    return;
  end if;

  if to_regclass('auth.users') is not null then
    execute 'select email_confirmed_at from auth.users where id = $1'
      into v_confirmed using p_user_id;
    if v_confirmed is null then
      return;
    end if;
  end if;

  update public.admin_profiles
     set auth_user_id = p_user_id,
         linked_at = now(),
         updated_at = now()
   where auth_user_id is null
     and lower(email) = lower(btrim(p_email))
     and is_active = true
     and role in ('admin', 'superadmin')
  returning * into v_profile;

  if v_profile.id is not null then
    return next v_profile;
    return;
  end if;

  for v_profile in
    select * from public.admin_profiles
     where (auth_user_id = p_user_id or lower(email) = lower(btrim(p_email)))
       and is_active = true
     order by case when auth_user_id = p_user_id then 0 else 1 end
     limit 1
  loop
    return next v_profile;
  end loop;
end $$;

-- Generic activation check. SECURITY DEFINER lets the trusted Express pool
-- see past admin_profiles RLS; anon/authenticated cannot call it directly.
create or replace function public.admin_activation_status(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_profiles
    where lower(email) = lower(btrim(coalesce(p_email, '')))
      and is_active = true
      and role in ('admin', 'superadmin')
  );
$$;

revoke all on function public.current_admin_role() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_superadmin() from public, anon;
revoke all on function public.link_admin_profile(uuid, text) from public, anon;
revoke all on function public.admin_activation_status(text) from public, anon, authenticated;
grant execute on function public.current_admin_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_superadmin() to authenticated, service_role;
grant execute on function public.link_admin_profile(uuid, text) to authenticated, service_role;
grant execute on function public.admin_activation_status(text) to service_role;

grant select, insert, update, delete on public.admin_profiles to authenticated;
grant usage, select on sequence public.admin_profiles_id_seq to authenticated;

drop policy if exists "admin profiles select own or superadmin" on public.admin_profiles;
create policy "admin profiles select own or superadmin" on public.admin_profiles
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    or public.is_superadmin()
  );

drop policy if exists "superadmin pre-provisions admins" on public.admin_profiles;
create policy "superadmin pre-provisions admins" on public.admin_profiles
  for insert to authenticated
  with check (
    public.is_superadmin()
    and role = 'admin'
    and auth_user_id is null
    and is_active = true
  );

drop policy if exists "superadmin manages admins" on public.admin_profiles;
create policy "superadmin manages admins" on public.admin_profiles
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "superadmin removes non-superadmins" on public.admin_profiles;
create policy "superadmin removes non-superadmins" on public.admin_profiles
  for delete to authenticated
  using (public.is_superadmin() and role <> 'superadmin');

drop policy if exists "pre-provisioned admin links own row" on public.admin_profiles;
create policy "pre-provisioned admin links own row" on public.admin_profiles
  for update to authenticated
  using (
    auth_user_id is null
    and role = 'admin'
    and is_active = true
    and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
  with check (
    auth_user_id = auth.uid()
    and role = 'admin'
    and is_active = true
    and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

-- 4c. Supabase Realtime publication: public content tables plus the single
--     PII-free booking-availability version row. Private booking/message/
--     notification tables are NEVER published; admin live updates use the
--     authenticated Postgres LISTEN/NOTIFY -> SSE bridge instead.
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array[
    'about','blog','client','contact','gallery','hero_content','hero_slide',
    'highlight','payment_packages','payment_settings','resource','services',
    'team','team_members','testimonial','booking_availability_state'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;

-- 5. Private tables: no grants, no policies (deny by default).
--    notifications and bookings reads stay private; the legacy users table
--    no longer exists. Service role keeps full access for trusted server work.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Booking helpers are server-side only. Express uses the postgres role; anon
-- and authenticated browsers must not be able to call them via PostgREST.
revoke all on function
  public.bump_booking_availability(text),
  public.is_slot_open(timestamptz),
  public.regenerate_booking_slots(),
  public.expire_pending_bookings(),
  public.ensure_booking_slots_current(),
  public.create_booking(text, text, text, text, jsonb, timestamptz)
from public, anon, authenticated;
grant execute on function
  public.bump_booking_availability(text),
  public.is_slot_open(timestamptz),
  public.regenerate_booking_slots(),
  public.expire_pending_bookings(),
  public.ensure_booking_slots_current(),
  public.create_booking(text, text, text, text, jsonb, timestamptz)
to service_role;

commit;

-- Materialize the rolling one-week booking window after RLS is in place.
select public.ensure_booking_slots_current();


-- Verification queries (run separately):
-- select schemaname, tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and rowsecurity = false;   -- should return 0 rows
-- select tablename, policyname from pg_policies where schemaname = 'public';
