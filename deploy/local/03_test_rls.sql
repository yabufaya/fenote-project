-- RLS verification for the LOCAL PostgreSQL test.
-- Run after scripts/setup-local-db.sh: scripts/test-local-rls.sh
-- Expected: anon can read public content and the PII-free availability state,
-- but cannot read private tables, insert directly, or execute booking helpers.
-- Public writes go through Express, which connects as postgres.

\echo '== 1. anon can read public content =='
set role anon;
select count(*) as public_blog_rows from public.blog;

\echo '== 1b. anon can read the safe availability version row =='
select version, reason from public.booking_availability_state where id = 1;

\echo '== 2. anon cannot read bookings =='
do $$
begin
  perform 1 from public.bookings limit 1;
  raise exception 'FAIL: anon was able to read bookings';
exception when insufficient_privilege then
  raise notice 'PASS: anon read denied on bookings';
end $$;

\echo '== 3. anon cannot read notifications =='
do $$
begin
  perform 1 from public.notifications limit 1;
  raise exception 'FAIL: anon was able to read notifications';
exception when insufficient_privilege then
  raise notice 'PASS: anon read denied on notifications';
end $$;

\echo '== 4. anon cannot submit a booking directly =='
do $$
begin
  insert into public.bookings (patient_name, patient_email, patient_phone, reason)
  values ('Local RLS Test', 'rls-test@example.com', '0000000000', 'Direct insert test');
  raise exception 'FAIL: anon was able to insert a booking directly';
exception when insufficient_privilege then
  raise notice 'PASS: anon direct booking insert denied';
end $$;

\echo '== 4b. anon cannot subscribe or send a contact message directly =='
do $$
begin
  insert into public.subscribers (email) values ('rls-subscriber@example.com');
  raise exception 'FAIL: anon was able to insert a subscriber directly';
exception when insufficient_privilege then
  raise notice 'PASS: anon direct subscriber insert denied';
end $$;
do $$
begin
  insert into public.contact_messages (name, email, message)
  values ('Local RLS Test', 'rls-message@example.com', 'Direct insert test');
  raise exception 'FAIL: anon was able to insert a contact message directly';
exception when insufficient_privilege then
  raise notice 'PASS: anon direct contact-message insert denied';
end $$;

\echo '== 4c. anon cannot execute server-side booking helpers =='
do $$
begin
  perform public.expire_pending_bookings();
  raise exception 'FAIL: anon was able to execute a booking helper';
exception when insufficient_privilege then
  raise notice 'PASS: anon helper execution denied';
end $$;

do $$
begin
  perform 1 from public.subscribers limit 1;
  raise exception 'FAIL: anon was able to read subscribers';
exception when insufficient_privilege then
  raise notice 'PASS: anon read denied on subscribers';
end $$;

do $$
begin
  perform 1 from public.contact_messages limit 1;
  raise exception 'FAIL: anon was able to read contact_messages';
exception when insufficient_privilege then
  raise notice 'PASS: anon read denied on contact_messages';
end $$;

reset role;

\echo '== 5. service_role can read private tables =='
set role service_role;
select count(*) as booking_rows_visible_to_service_role from public.bookings;
select count(*) as contact_message_rows_visible_to_service_role from public.contact_messages;
reset role;

\echo '== 6. every public table has RLS enabled =='
select count(*) as tables_without_rls
from pg_tables
where schemaname = 'public' and rowsecurity = false;
-- Should be 0.

\echo '== 7. legacy users table is gone =='
select to_regclass('public.users') as users_table;
-- Should be NULL.
