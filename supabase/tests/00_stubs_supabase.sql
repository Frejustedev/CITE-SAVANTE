-- =============================================================================
-- Environnement Supabase simulé sur un PostgreSQL nu — VALIDATION LOCALE UNIQUEMENT
-- =============================================================================
-- Ce fichier n'est PAS une migration : il ne doit jamais être exécuté sur le
-- projet Supabase. Il reproduit, au plus près de Supabase, ce dont les
-- migrations de `supabase/migrations/` ont besoin pour s'appliquer telles
-- quelles et pour que la RLS soit testable :
--   - les rôles anon, authenticated (NOINHERIT), service_role (BYPASSRLS),
--     authenticator (connexion de PostgREST) et supabase_auth_admin (GoTrue) ;
--   - le schéma extensions (où Supabase installe les extensions) ;
--   - le schéma auth : auth.users, auth.uid(), auth.role(), auth.jwt(), écrites
--     comme dans Supabase (lecture de request.jwt.claim.* puis de
--     request.jwt.claims, le JSON posé par PostgREST à chaque requête) ;
--   - le schéma storage : storage.buckets et storage.objects (RLS activée) ;
--   - les privilèges par défaut de Supabase sur le schéma public.
-- Puis des aides de test (fonctions public.test_*), absentes de Supabase.
--
-- Utilisation : scripts/valider-base.sh (base jetable recréée à chaque passage).
--
-- Se connecter dans un test (dans une transaction ou un bloc DO) :
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<uuid>', 'role', 'authenticated')::text, true);
--   ... requêtes soumises aux policies RLS, comme via PostgREST ...
--   reset role;
--   select set_config('request.jwt.claims', '', true);
-- Raccourcis équivalents : test_connecter(<uuid>), test_anonyme(), test_service(),
-- test_deconnecter() (voir plus bas).
-- =============================================================================

-- ── Garde-fou : jamais sur un vrai Supabase ─────────────────────────────────
-- supabase/tests/ est aussi le dossier lu par « supabase test db ». Sur une
-- vraie base Supabase, ce fichier remplacerait auth.uid() et modifierait les
-- privilèges par défaut. Les rôles supabase_admin et supabase_storage_admin
-- existent sur toute base Supabase et ne sont jamais créés ici : leur présence
-- arrête tout.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_roles
    where rolname in ('supabase_admin', 'supabase_storage_admin')
  ) then
    raise exception '00_stubs_supabase.sql refuse de s''exécuter : cette base est un vrai Supabase (rôle supabase_admin ou supabase_storage_admin présent). Ce fichier est réservé à scripts/valider-base.sh sur un PostgreSQL nu.';
  end if;
end
$$;

-- ── Rôles (communs à toute la grappe) ────────────────────────────────────────
-- Plusieurs bases de test peuvent être créées en parallèle sur la même grappe :
-- une création concurrente du même rôle est tolérée.
do $$
declare
  v_role text;
  v_def  text;
begin
  for v_role, v_def in
    select * from (values
      ('anon',                'nologin noinherit'),
      ('authenticated',       'nologin noinherit'),
      ('service_role',        'nologin noinherit bypassrls'),
      ('authenticator',       'login noinherit'),
      ('supabase_auth_admin', 'nologin noinherit')
    ) as r(nom, def)
  loop
    if not exists (select 1 from pg_catalog.pg_roles where rolname = v_role) then
      begin
        execute format('create role %I %s', v_role, v_def);
      exception when duplicate_object or unique_violation then
        null;
      end;
    end if;
  end loop;
end
$$;

-- PostgREST se connecte en authenticator puis fait « set local role » vers l'un
-- de ces trois rôles, selon le JWT.
grant anon, authenticated, service_role to authenticator;

-- ── Schéma public : privilèges par défaut de Supabase ───────────────────────
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- ── Schéma extensions ────────────────────────────────────────────────────────
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

-- ── Schéma auth ──────────────────────────────────────────────────────────────
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;

-- Colonnes et types de GoTrue (sous-ensemble). email en varchar(255) comme en
-- production. Aucune table de auth n'est lisible par anon ou authenticated.
create table if not exists auth.users (
  instance_id        uuid,
  id                 uuid primary key default gen_random_uuid(),
  aud                varchar(255),
  role               varchar(255),
  email              varchar(255) unique,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  last_sign_in_at    timestamptz,
  raw_app_meta_data  jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  is_anonymous       boolean not null default false,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
grant all on auth.users to supabase_auth_admin;

-- Fonctions d'authentification, telles qu'écrites dans Supabase.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;

grant execute on function auth.uid(), auth.role(), auth.jwt()
  to anon, authenticated, service_role, supabase_auth_admin;

-- ── Schéma storage ───────────────────────────────────────────────────────────
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null unique,
  owner              uuid,
  owner_id           text,
  public             boolean default false,
  avif_autodetection boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists storage.objects (
  id               uuid primary key default gen_random_uuid(),
  bucket_id        text references storage.buckets (id),
  name             text,
  owner            uuid,
  owner_id         text,
  metadata         jsonb,
  user_metadata    jsonb,
  path_tokens      text[] generated always as (string_to_array(name, '/')) stored,
  version          text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_accessed_at timestamptz default now(),
  unique (bucket_id, name)
);

alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role;

create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end
$$;

create or replace function storage.filename(name text) returns text
language plpgsql immutable as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[array_length(_parts, 1)];
end
$$;

create or replace function storage.extension(name text) returns text
language plpgsql immutable as $$
declare
  _parts text[];
  _filename text;
begin
  select string_to_array(name, '/') into _parts;
  select _parts[array_length(_parts, 1)] into _filename;
  return reverse(split_part(reverse(_filename), '.', 1));
end
$$;

-- =============================================================================
-- Aides de test (n'existent pas dans Supabase)
-- =============================================================================
-- Toutes sont écrites dans public (préfixe test_) pour être appelées sans
-- qualification. Le test de structure (05) les exclut de ses contrôles.

-- Crée un utilisateur comme le ferait GoTrue (le déclencheur creer_profil crée
-- le profil). Réservée à postgres.
create or replace function public.test_creer_utilisateur(p_email text, p_nom text)
returns uuid
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  insert into auth.users (email, aud, role, raw_user_meta_data, email_confirmed_at)
  values (p_email, 'authenticated', 'authenticated', jsonb_build_object('nom', p_nom), now())
  returning id into v_id;
  return v_id;
end
$$;

-- Se connecter comme l'utilisateur p_uid (JWT « authenticated »), comme PostgREST.
create or replace function public.test_connecter(p_uid uuid)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end
$$;

-- Visiteur anonyme (clé publique, sans session).
create or replace function public.test_anonyme()
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end
$$;

-- Client de service (clé service_role, serveur uniquement).
create or replace function public.test_service()
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform set_config('role', 'service_role', true);
end
$$;

-- Revenir à postgres, sans JWT (comme l'éditeur SQL ou une migration).
create or replace function public.test_deconnecter()
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
end
$$;

-- Assertion : lève une exception « ÉCHEC » si p_condition n'est pas vraie,
-- sinon affiche « OK | message » (repris dans le bilan du script).
create or replace function public.test_verifier(p_condition boolean, p_message text)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if p_condition is distinct from true then
    raise exception 'ÉCHEC : %', p_message;
  end if;
  raise notice 'OK | %', p_message;
end
$$;

-- Assertion : l'instruction p_sql doit être refusée avec le code p_sqlstate
-- (42501 par défaut : droits insuffisants, violation de RLS ou déclencheur de
-- protection). Exécutée avec le rôle courant.
create or replace function public.test_doit_echouer(p_sql text, p_message text, p_sqlstate text default '42501')
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_sqlstate then
      raise notice 'OK | % (refusé : %)', p_message, sqlerrm;
      return;
    end if;
    raise exception 'ÉCHEC : % — erreur inattendue % : %', p_message, sqlstate, sqlerrm;
  end;
  raise exception 'ÉCHEC : % — instruction acceptée : %', p_message, p_sql;
end
$$;

-- Nombre de lignes touchées par p_sql (update ou delete), ou -1 si l'instruction
-- est refusée faute de droits (42501). Exécutée avec le rôle courant.
create or replace function public.test_lignes_touchees(p_sql text)
returns bigint
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_n bigint;
begin
  execute p_sql;
  get diagnostics v_n = row_count;
  return v_n;
exception when insufficient_privilege then
  return -1;
end
$$;

-- Réservée à postgres (crée des lignes dans auth.users).
revoke execute on function public.test_creer_utilisateur(text, text) from public, anon, authenticated, service_role;
