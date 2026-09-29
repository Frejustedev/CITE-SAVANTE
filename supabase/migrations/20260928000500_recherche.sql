-- =============================================================================
-- Migration 5/7 — Fonction de recherche
-- =============================================================================
-- Ce que fait cette migration (spécifications, sections 5.4 et 11) : crée
-- rechercher(q, limite), appelée par RPC depuis /recherche. Elle cherche dans les
-- organisations (plein texte + similarité du sigle par trigrammes) et dans les
-- événements (plein texte), uniquement parmi les fiches publiées, classées par
-- pertinence décroissante.
--
-- Adaptations du SQL des spécifications (signalées dans PROGRESS.md) :
--   - search_path fixé à « public, extensions » : similarity() et l'opérateur %
--     de pg_trgm sont installés dans le schéma extensions ; sans ce réglage, la
--     fonction dépendrait du search_path de l'appelant (et Supabase signale
--     « function_search_path_mutable ») ;
--   - littéraux 'societe'::text et 'evenement'::text, configuration écrite
--     'public.fr_unaccent'::regconfig.
-- La fonction n'est PAS security definer : la RLS s'applique en plus du filtre
-- explicite statut = 'publie'.
-- Idempotente : « create or replace ».
-- =============================================================================

create or replace function public.rechercher(q text, limite int default 20)
returns table (type text, id uuid, slug text, titre text, sous_titre text, rang real)
language sql
stable
set search_path = public, extensions
as $$
  with requete as (select websearch_to_tsquery('public.fr_unaccent'::regconfig, q) as tsq)
  select 'societe'::text, s.id, s.slug, s.sigle, s.nom_complet,
         greatest(ts_rank(s.recherche, r.tsq), similarity(s.sigle, q))
  from public.societes s, requete r
  where s.statut = 'publie' and (s.recherche @@ r.tsq or s.sigle % q)
  union all
  select 'evenement'::text, e.id, e.slug, e.titre, to_char(e.date_debut, 'DD/MM/YYYY'),
         ts_rank(e.recherche, r.tsq)
  from public.evenements e, requete r
  where e.statut = 'publie' and e.recherche @@ r.tsq
  order by 6 desc
  limit limite
$$;
