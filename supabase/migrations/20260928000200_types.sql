-- =============================================================================
-- Migration 2/7 — Types énumérés
-- =============================================================================
-- Ce que fait cette migration (spécifications, section 5.2) : crée les 12 types
-- énumérés du modèle de données, dans le schéma public. Les valeurs sont celles
-- des spécifications, dans le même ordre (src/lib/textes.ts en donne les libellés
-- français ; son test vérifie la correspondance).
-- Idempotente : un type déjà présent est laissé tel quel (« create type » n'a pas
-- de clause « if not exists »). Pour ajouter une valeur plus tard, écrire une
-- nouvelle migration avec « alter type … add value ».
-- =============================================================================

do $$ begin
  create type public.statut_publication as enum ('brouillon', 'en_attente', 'publie', 'refuse', 'archive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.categorie_organisation as enum ('societe_savante', 'institution_academique', 'association_professionnelle', 'autre');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.type_evenement as enum ('congres', 'journees', 'colloque', 'seminaire', 'atelier', 'webinaire', 'formation', 'autre');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.modalite_evenement as enum ('presentiel', 'en_ligne', 'hybride');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.type_echeance as enum ('soumission_resumes', 'inscription_tarif_preferentiel', 'inscription', 'bourse', 'prix', 'autre');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.role_utilisateur as enum ('admin', 'moderateur', 'gestionnaire');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.statut_demande as enum ('en_attente', 'acceptee', 'refusee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.role_organisation as enum ('organisateur', 'co_organisateur', 'partenaire');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.type_emplacement as enum ('banniere_accueil', 'banniere_agenda', 'banniere_discipline', 'evenement_en_avant', 'lettre');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.type_cible as enum ('societe', 'evenement', 'emplacement');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.source_evenement as enum ('manuel', 'synchro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.type_demande_contact as enum ('contact', 'visibilite');
exception when duplicate_object then null; end $$;
