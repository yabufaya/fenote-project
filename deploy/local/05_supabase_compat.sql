-- LOCAL TEST ONLY. Creates minimal Supabase-compatible auth/storage objects so
-- 01_rls.sql and 04_storage_and_admin_bootstrap.sql can be validated on plain
-- PostgreSQL 17. On hosted Supabase these already exist and this is a no-op.

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
    id uuid primary key,
    email text unique,
    email_confirmed_at timestamptz,
    created_at timestamptz default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

create table if not exists storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text
);

create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text not null references storage.buckets(id),
    name text not null,
    owner_id text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    metadata jsonb default '{}'::jsonb,
    version text,
    unique (bucket_id, name)
);

-- Hosted Supabase already enables RLS on storage.objects. Enable it here too;
-- 04_storage_and_admin_bootstrap.sql must NOT alter storage.objects on hosted
-- projects because the SQL Editor role is not the owner (42501).
alter table storage.objects enable row level security;

-- Supabase grants these by default; plain PostgreSQL needs them for the local
-- RLS policy test to reach the policy instead of failing on schema privileges.
grant usage on schema storage to anon, authenticated, service_role;
grant usage on schema auth to authenticated, service_role;
grant select on storage.objects to anon, authenticated, service_role;
grant insert, update, delete on storage.objects to authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
