-- Supabase SQL Editor: Storage buckets + first superadmin bootstrap.
-- Run AFTER 00_schema_clean.sql and 01_rls.sql.
-- Works with ONLY the publishable/anon key: no service-role key is needed.
--
-- IMPORTANT (hosted Supabase): storage.objects is owned by
-- supabase_storage_admin and RLS is already enabled there. The SQL Editor runs
-- as postgres, so `alter table storage.objects enable row level security`
-- raises 42501 "must be owner of table objects". Supabase explicitly says to
-- remove that ALTER [1](https://github.com/orgs/supabase/discussions/36611)
-- and to treat the storage schema as managed/read-only [1](https://supabase.com/docs/guides/storage/schema/design).
-- We only create bucket rows and RLS policies on storage.objects here; policies
-- are the supported access-control mechanism [1](https://supabase.com/docs/guides/storage/security/access-control).
-- If a statement still hits 42501, use Dashboard -> Storage -> Policies / New
-- bucket for that item. Never use a service-role key to work around it.

begin;

-- 1. Public media buckets with per-type size/MIME limits.
--    If this raises insufficient_privilege, create the three buckets in the
--    Dashboard (Storage -> New bucket) and rerun this file.
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('fenote-images', 'fenote-images', true, 10485760,
     array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','image/avif']),
    ('fenote-videos', 'fenote-videos', true, 524288000,
     array['video/mp4','video/webm','video/quicktime']),
    ('fenote-documents', 'fenote-documents', true, 20971520,
     array['application/pdf'])
  on conflict (id) do update set
    name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
exception when insufficient_privilege then
  raise notice '42501: could not upsert storage.buckets. Create fenote-images, fenote-videos and fenote-documents in Dashboard -> Storage, then rerun this file.';
end $$;

-- 2. Access policies on storage.objects. RLS is already enabled by Supabase.
--    Each block is isolated so one 42501 does not roll back the others.
--    If you see a 42501 notice below, add that policy in
--    Dashboard -> Storage -> Policies before testing admin uploads.
do $$
begin
  drop policy if exists "fenote media public read" on storage.objects;
  create policy "fenote media public read" on storage.objects
    for select to public
    using (bucket_id in ('fenote-images','fenote-videos','fenote-documents'));
exception when insufficient_privilege then
  raise notice '42501: could not create SELECT policy on storage.objects. Add "fenote media public read" in Dashboard -> Storage -> Policies.';
end $$;

do $$
begin
  drop policy if exists "fenote admins upload media" on storage.objects;
  create policy "fenote admins upload media" on storage.objects
    for insert to authenticated
    with check (
      bucket_id in ('fenote-images','fenote-videos','fenote-documents')
      and public.is_admin()
    );
exception when insufficient_privilege then
  raise notice '42501: could not create INSERT policy on storage.objects. Add "fenote admins upload media" in Dashboard -> Storage -> Policies.';
end $$;

do $$
begin
  drop policy if exists "fenote admins update media" on storage.objects;
  create policy "fenote admins update media" on storage.objects
    for update to authenticated
    using (
      bucket_id in ('fenote-images','fenote-videos','fenote-documents')
      and public.is_admin()
    )
    with check (
      bucket_id in ('fenote-images','fenote-videos','fenote-documents')
      and public.is_admin()
    );
exception when insufficient_privilege then
  raise notice '42501: could not create UPDATE policy on storage.objects. Add "fenote admins update media" in Dashboard -> Storage -> Policies.';
end $$;

do $$
begin
  drop policy if exists "fenote admins delete media" on storage.objects;
  create policy "fenote admins delete media" on storage.objects
    for delete to authenticated
    using (
      bucket_id in ('fenote-images','fenote-videos','fenote-documents')
      and public.is_admin()
    );
exception when insufficient_privilege then
  raise notice '42501: could not create DELETE policy on storage.objects. Add "fenote admins delete media" in Dashboard -> Storage -> Policies.';
end $$;

-- Warn (but do not fail) if any of the four policies is still missing.
do $$
declare
  v_missing text;
begin
  select string_agg(expected.name, ', ')
  into v_missing
  from (values
    ('fenote media public read'),
    ('fenote admins upload media'),
    ('fenote admins update media'),
    ('fenote admins delete media')
  ) as expected(name)
  where not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = expected.name
  );
  if v_missing is not null then
    raise warning 'Missing storage.objects policies: %. Add them in Dashboard -> Storage -> Policies before testing uploads.', v_missing;
  end if;
end $$;

-- 3. Ensure exactly one superadmin exists.
--    On an injected legacy DB, 01_rls.sql already promoted the first users row.
--    On a fresh DB, replace <SUPERADMIN_EMAIL> below with the exact Auth email.
--    Remove the angle brackets: use 'you@example.com', NOT '<you@example.com>'.
--    No password or hash is stored here.
do $$
declare
  v_count integer;
  v_email text := '<SUPERADMIN_EMAIL>';
begin
  select count(*) into v_count
  from public.admin_profiles
  where role = 'superadmin' and is_active = true;

  if v_count > 0 then
    raise notice 'Superadmin already present; no bootstrap insert needed.';
    return;
  end if;

  if v_email is null
     or btrim(v_email) = ''
     or v_email like '<%'
     or v_email like '%>' then
    raise notice 'No injected admin found. Replace <SUPERADMIN_EMAIL> with the exact Supabase Auth email, without angle brackets, and rerun; or insert one admin_profiles row with role = superadmin.';
    return;
  end if;

  insert into public.admin_profiles (email, role, is_active)
  values (lower(btrim(v_email)), 'superadmin', true)
  on conflict (email) do update set
    role = 'superadmin', is_active = true, updated_at = now();
  raise notice 'Superadmin seeded for %', v_email;
end $$;

commit;

-- Verification:
-- select id, name, public, file_size_limit from storage.buckets where id like 'fenote-%';
-- select schemaname, tablename, policyname from pg_policies where schemaname = 'storage' and tablename = 'objects';
-- select id, email, role, is_active, auth_user_id from public.admin_profiles order by id;
