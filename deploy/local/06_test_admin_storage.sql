-- Local, non-secret verification of DB-backed superadmin + Storage policies.
-- Run after scripts/setup-local-db.sh via scripts/test-local-rls.sh.

\echo '== A. seed mock confirmed Auth users =='
-- The fresh hosted bootstrap uses the exact verified superadmin email from
-- 04_storage_and_admin_bootstrap.sql. Local validation substitutes
-- local-superadmin@example.com and pre-provisions one ordinary admin.
insert into public.admin_profiles (email, role, is_active)
values ('admin@fenote.test', 'admin', true)
on conflict (email) do update set role = 'admin', is_active = true;

insert into auth.users (id, email, email_confirmed_at)
values
  ('11111111-1111-1111-1111-111111111111', 'local-superadmin@example.com', now()),
  ('22222222-2222-2222-2222-222222222222', 'admin@fenote.test', now())
on conflict (id) do nothing;

\echo '== B. link the superadmin and pre-provisioned admin on first login =='
select email, role, auth_user_id from public.link_admin_profile('11111111-1111-1111-1111-111111111111', 'local-superadmin@example.com');
select email, role, auth_user_id from public.link_admin_profile('22222222-2222-2222-2222-222222222222', 'admin@fenote.test');

\echo '== C. exactly one active superadmin =='
select count(*) as active_superadmins
from public.admin_profiles where role = 'superadmin' and is_active = true;
-- Expected: 1.

\echo '== D. ordinary admin cannot create another admin =='
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","email":"admin@fenote.test","role":"authenticated"}';
do $$
begin
  insert into public.admin_profiles (email, role) values ('intruder@fenote.test', 'admin');
  raise exception 'FAIL: ordinary admin inserted an admin row';
exception when insufficient_privilege then
  raise notice 'PASS: ordinary admin cannot insert admin_profiles';
end $$;

\echo '== E. ordinary admin can upload CONTENT media, but not create admins =='
do $$
begin
  insert into storage.objects (bucket_id, name, owner_id)
  values ('fenote-images', 'images/test/allowed.jpg', '22222222-2222-2222-2222-222222222222');
  raise notice 'PASS: ordinary admin can upload content media (admin management remains superadmin-only)';
exception when insufficient_privilege then
  raise exception 'FAIL: ordinary admin content upload denied';
end $$;

\echo '== F. superadmin can pre-provision an admin =='
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","email":"superadmin@fenote.test","role":"authenticated"}';
insert into public.admin_profiles (email, role, is_active)
values ('new-admin@fenote.test', 'admin', true);

\echo '== G. superadmin can upload to Storage =='
insert into storage.objects (bucket_id, name, owner_id)
values ('fenote-videos', 'videos/gallery/intro.mp4', '11111111-1111-1111-1111-111111111111');

\echo '== H. anon cannot write admin_profiles or Storage =='
reset role;
set role anon;
do $$
begin
  perform 1 from public.admin_profiles limit 1;
  raise exception 'FAIL: anon read admin_profiles';
exception when insufficient_privilege then
  raise notice 'PASS: anon read denied on admin_profiles';
end $$;
do $$
begin
  insert into storage.objects (bucket_id, name) values ('fenote-images', 'images/anon.jpg');
  raise exception 'FAIL: anon uploaded to Storage';
exception when insufficient_privilege then
  raise notice 'PASS: anon Storage upload denied';
end $$;
reset role;

\echo '== I. buckets configured =='
select id, public, file_size_limit from storage.buckets where id like 'fenote-%' order by id;

\echo '== J. activation allowlist helper: trusted server only =='
select public.admin_activation_status('new-admin@fenote.test') as allowlisted,
       public.admin_activation_status('nobody@fenote.test') as not_allowlisted;
-- Expected: t / f.
set role anon;
do $$
begin
  perform public.admin_activation_status('new-admin@fenote.test');
  raise exception 'FAIL: anon can probe the activation allowlist';
exception when insufficient_privilege then
  raise notice 'PASS: anon cannot call admin_activation_status';
end $$;
reset role;

\echo '== K. public content tables are in the Realtime publication =='
select count(*) as realtime_content_tables
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in (
    'about','blog','client','contact','gallery','hero_content','hero_slide',
    'highlight','payment_packages','payment_settings','resource','services',
    'team','team_members','testimonial'
  );
-- Expected: 15.
