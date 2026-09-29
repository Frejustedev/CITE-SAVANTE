-- =============================================================================
-- Migration 1/7 — Extensions et configuration de recherche en français
-- =============================================================================
-- Ce que fait cette migration (spécifications, section 5.1) :
--   - installe unaccent (suppression des accents) et pg_trgm (similarité par
--     trigrammes, utilisée pour les sigles) dans le schéma « extensions », comme
--     le recommande Supabase (jamais dans public) ;
--   - crée la configuration de recherche plein texte public.fr_unaccent : une copie
--     de la configuration « french » où les mots (word, hword, hword_part) passent
--     par unaccent avant le racinisateur français. « pediatrie » et « Pédiatrie »
--     donnent ainsi le même lexème (« pediatr »).
-- Idempotente : peut être rejouée sans erreur.
-- =============================================================================

create schema if not exists extensions;

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- « create text search configuration » n'a pas de clause « if not exists ».
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_ts_config
    where cfgname = 'fr_unaccent'
      and cfgnamespace = 'public'::regnamespace
  ) then
    create text search configuration public.fr_unaccent (copy = pg_catalog.french);
  end if;
end
$$;

alter text search configuration public.fr_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, french_stem;
