-- =============================================================================
-- Migration 3/7 — Les 14 tables du MVP et leurs index
-- =============================================================================
-- Ce que fait cette migration (spécifications, sections 5.3 et 5.4) :
--   - crée les 14 tables du MVP (les 3 tables P1 — abonnes, sources_synchro,
--     actualites — ne sont PAS créées : elles viendront en phase P1) ;
--   - crée les index de la section 5.4, puis un index sur chaque clé étrangère
--     qui n'en avait pas (ajout, voir PROGRESS.md).
-- La RLS est activée par la migration 6 (20260928000600_rls.sql), dans la même
-- livraison : aucune de ces tables n'est exposée sans politique.
--
-- Adaptations du SQL des spécifications (signalées dans PROGRESS.md) :
--   - noms qualifiés par leur schéma (public., auth., extensions.) ;
--   - configuration de recherche écrite 'public.fr_unaccent'::regconfig ;
--   - gestionnaires.decide_par et journal_moderation.auteur : « on delete set
--     null » ajouté, sans quoi la suppression du compte d'un modérateur ayant
--     déjà décidé serait impossible (spécifications, section 15 : suppression
--     d'un compte sur demande) ;
--   - index des clés étrangères ajoutés en fin de fichier ;
--   - contraintes de format des liens externes (https:// uniquement) et de
--     reseaux (objet JSON), ajoutées en fin de fichier par la relecture de
--     sécurité (voir plus bas et PROGRESS.md).
-- Idempotente : « if not exists » partout (une table existante n'est pas
-- modifiée ; toute évolution passe par une nouvelle migration) ; contraintes
-- ajoutées dans des blocs « do » qui ignorent une contrainte déjà présente.
-- =============================================================================

create table if not exists public.disciplines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nom text not null,
  description text,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.societes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sigle text not null,
  nom_complet text,
  categorie public.categorie_organisation not null default 'societe_savante',
  description text,
  annee_creation int check (annee_creation between 1800 and 2100),
  ville text,
  pays text not null default 'Bénin',
  site_web text,
  site_congres text,                -- plateforme de congrès, si distincte du site officiel
  email text,
  telephone text,
  reseaux jsonb not null default '{}'::jsonb,   -- { facebook, linkedin, x, youtube, whatsapp }
  logo_path text,
  statut public.statut_publication not null default 'en_attente',
  mise_en_avant boolean not null default false,
  soumis_par_nom text,
  soumis_par_email text,
  recherche tsvector generated always as (
    setweight(to_tsvector('public.fr_unaccent'::regconfig, coalesce(sigle, '')), 'A') ||
    setweight(to_tsvector('public.fr_unaccent'::regconfig, coalesce(nom_complet, '')), 'A') ||
    setweight(to_tsvector('public.fr_unaccent'::regconfig, coalesce(ville, '')), 'B') ||
    setweight(to_tsvector('public.fr_unaccent'::regconfig, coalesce(description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.societe_disciplines (
  societe_id uuid not null references public.societes (id) on delete cascade,
  discipline_id uuid not null references public.disciplines (id) on delete cascade,
  primary key (societe_id, discipline_id)
);

create table if not exists public.evenements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titre text not null,
  type public.type_evenement not null,
  resume text check (char_length(resume) <= 280),
  description text,
  date_debut date not null,
  date_fin date not null,
  heure_debut time,
  modalite public.modalite_evenement not null default 'presentiel',
  lieu_nom text,
  adresse text,
  ville text,
  pays text not null default 'Bénin',
  lien_inscription text,
  site_web text,
  affiche_path text,
  tarifs text,
  gratuit boolean not null default false,
  credits_fmc text,
  contact_email text,
  statut public.statut_publication not null default 'en_attente',
  source public.source_evenement not null default 'manuel',
  source_ref text,
  cree_par uuid references auth.users (id) on delete set null,
  soumis_par_nom text,
  soumis_par_email text,
  recherche tsvector generated always as (
    setweight(to_tsvector('public.fr_unaccent'::regconfig, coalesce(titre, '')), 'A') ||
    setweight(to_tsvector('public.fr_unaccent'::regconfig, coalesce(ville, '')), 'B') ||
    setweight(to_tsvector('public.fr_unaccent'::regconfig, coalesce(resume, '')), 'B') ||
    setweight(to_tsvector('public.fr_unaccent'::regconfig, coalesce(description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dates_coherentes check (date_fin >= date_debut),
  constraint source_unique unique (source, source_ref)
);

create table if not exists public.evenement_societes (
  evenement_id uuid not null references public.evenements (id) on delete cascade,
  societe_id uuid not null references public.societes (id) on delete cascade,
  role public.role_organisation not null default 'organisateur',
  primary key (evenement_id, societe_id)
);

create table if not exists public.evenement_disciplines (
  evenement_id uuid not null references public.evenements (id) on delete cascade,
  discipline_id uuid not null references public.disciplines (id) on delete cascade,
  primary key (evenement_id, discipline_id)
);

create table if not exists public.echeances (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references public.evenements (id) on delete cascade,
  type public.type_echeance not null,
  libelle text,                     -- facultatif ; sinon libellé par défaut du type
  date_limite date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text,
  role public.role_utilisateur not null default 'gestionnaire',
  de_confiance boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.gestionnaires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  societe_id uuid not null references public.societes (id) on delete cascade,
  statut public.statut_demande not null default 'en_attente',
  fonction text,                    -- fonction déclarée dans le bureau
  message text,
  decide_par uuid references auth.users (id) on delete set null,
  decide_le timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, societe_id)
);

create table if not exists public.emplacements_pub (
  id uuid primary key default gen_random_uuid(),
  type public.type_emplacement not null,
  titre text not null,
  annonceur text not null,
  image_path text,
  texte_alternatif text,
  lien text,
  discipline_id uuid references public.disciplines (id) on delete set null,
  evenement_id uuid references public.evenements (id) on delete cascade,
  date_debut date not null,
  date_fin date not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  constraint periode_coherente check (date_fin >= date_debut)
);

create table if not exists public.clics_sortants (
  id bigint generated always as identity primary key,
  cible_type public.type_cible not null,
  cible_id uuid not null,
  url text not null,
  page_origine text,
  created_at timestamptz not null default now()
  -- aucune adresse IP, aucun identifiant de visiteur
);

create table if not exists public.journal_moderation (
  id bigint generated always as identity primary key,
  objet_type text not null,         -- 'societe' | 'evenement' | 'gestionnaire' | 'emplacement'
  objet_id uuid not null,
  action text not null,             -- 'publie' | 'refuse' | 'modifie' | 'archive' | 'accepte' ...
  motif text,
  auteur uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.demandes_contact (
  id uuid primary key default gen_random_uuid(),
  type public.type_demande_contact not null,
  nom text not null,
  organisation text,
  email text not null,
  telephone text,
  offre text,                        -- pour type = 'visibilite'
  message text not null,
  traitee boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tentatives_formulaires (
  id bigint generated always as identity primary key,
  empreinte text not null,          -- sha256(IP + sel quotidien), jamais l'IP en clair
  formulaire text not null,
  created_at timestamptz not null default now()
);

-- ── Index de la section 5.4 ──────────────────────────────────────────────────
create index if not exists societes_recherche_idx on public.societes using gin (recherche);
create index if not exists societes_sigle_trgm_idx on public.societes using gin (sigle extensions.gin_trgm_ops);
create index if not exists evenements_recherche_idx on public.evenements using gin (recherche);
create index if not exists evenements_dates_idx on public.evenements (statut, date_debut, date_fin);
create index if not exists echeances_date_idx on public.echeances (date_limite);
create index if not exists clics_cible_idx on public.clics_sortants (cible_type, cible_id, created_at);
create index if not exists tentatives_idx on public.tentatives_formulaires (empreinte, formulaire, created_at);

-- ── Index des clés étrangères (ajout) ────────────────────────────────────────
-- Une clé étrangère sans index rend lents les « on delete cascade / set null »
-- et les jointures inverses (événements d'une organisation, échéances d'un
-- événement…) ; Supabase le signale (« unindexed_foreign_keys »). Les clés déjà
-- couvertes par une clé primaire ou une contrainte d'unicité (colonne de tête)
-- n'en ont pas besoin : profils.id, gestionnaires.user_id, les premières
-- colonnes des tables de liaison.
create index if not exists societe_disciplines_discipline_idx on public.societe_disciplines (discipline_id);
create index if not exists evenements_cree_par_idx on public.evenements (cree_par);
create index if not exists evenement_societes_societe_idx on public.evenement_societes (societe_id);
create index if not exists evenement_disciplines_discipline_idx on public.evenement_disciplines (discipline_id);
create index if not exists echeances_evenement_idx on public.echeances (evenement_id);
create index if not exists gestionnaires_societe_idx on public.gestionnaires (societe_id);
create index if not exists gestionnaires_decide_par_idx on public.gestionnaires (decide_par);
create index if not exists emplacements_pub_discipline_idx on public.emplacements_pub (discipline_id);
create index if not exists emplacements_pub_evenement_idx on public.emplacements_pub (evenement_id);
create index if not exists journal_moderation_auteur_idx on public.journal_moderation (auteur);

-- ── Liens externes : https:// uniquement (ajout, relecture de sécurité) ─────
-- Spécifications, section 6 : « tous les liens externes saisis par les
-- utilisateurs sont validés (https:// uniquement) ». La validation Zod des
-- server actions ne suffit pas : la RLS autorise un gestionnaire à modifier
-- SA fiche et les événements de son organisation directement par l'API REST
-- de Supabase (clé publique + sa session), sans passer par le site. Sans ces
-- contraintes, il pouvait enregistrer « javascript:… » ou « http://… » comme
-- site officiel ou lien d'inscription (prouvé par supabase/tests/
-- 50_securite.test.sql). Elles s'appliquent à tous, client de service
-- compris. Casse du schéma indifférente (« HTTPS:// » accepté), aucun espace.
-- reseaux : seulement un objet JSON ({ facebook, linkedin, … }) ; le format de
-- chaque valeur n'est pas fixé par les spécifications (whatsapp : lien ou
-- numéro ?) et reste à valider par les server actions (PROGRESS.md).
do $$ begin
  alter table public.societes add constraint societes_site_web_https
    check (site_web is null or site_web ~* '^https://[^[:space:]]+$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.societes add constraint societes_site_congres_https
    check (site_congres is null or site_congres ~* '^https://[^[:space:]]+$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.societes add constraint societes_reseaux_objet
    check (jsonb_typeof(reseaux) = 'object');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.evenements add constraint evenements_lien_inscription_https
    check (lien_inscription is null or lien_inscription ~* '^https://[^[:space:]]+$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.evenements add constraint evenements_site_web_https
    check (site_web is null or site_web ~* '^https://[^[:space:]]+$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.emplacements_pub add constraint emplacements_pub_lien_https
    check (lien is null or lien ~* '^https://[^[:space:]]+$');
exception when duplicate_object then null; end $$;
