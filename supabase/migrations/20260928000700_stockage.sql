-- =============================================================================
-- Migration 7/7 — Stockage des images
-- =============================================================================
-- Ce que fait cette migration (spécifications, section 5.7) :
--   - crée (ou remet à jour) trois buckets publics : logos (500 Ko), affiches
--     (2 Mo) et publicites (1 Mo), limités aux formats PNG, JPEG et WebP.
--     Le SVG est refusé (il peut contenir du script : risque XSS). Tailles en
--     octets, 1 Ko = 1 024 octets ; les server actions d'envoi doivent appliquer
--     les mêmes limites ;
--   - ne crée AUCUNE politique sur storage.objects, pas même de lecture.
--     « En lecture publique » (5.7) = bucket public : Supabase sert chaque
--     fichier par son URL publique (/storage/v1/object/public/…) sans consulter
--     la RLS. Une politique de lecture n'ajoutait que la possibilité de LISTER
--     le contenu des buckets par l'API (alerte Supabase
--     « public_bucket_allows_listing »), ce qui exposait les affiches
--     d'événements non publiés ou refusés (correctif du coordinateur ; prouvé
--     par supabase/tests/10_rls.test.sql, bloc G). Le « drop policy if exists »
--     ci-dessous retire cette ancienne politique si elle existe.
-- AUCUNE politique d'écriture pour anon ou authenticated : les envois passent par
-- une server action qui vérifie les droits puis écrit avec le client de service
-- (qui contourne la RLS), et met à jour logo_path / affiche_path avec le même
-- client (colonnes figées pour les gestionnaires, migration 4). Aucune écriture
-- directe depuis le navigateur.
-- Chemins prévus : logos/{societe_id}/{horodatage}.webp,
-- affiches/{evenement_id}/{horodatage}.webp.
-- Idempotente : « on conflict do update » et « drop policy if exists ».
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('logos',      'logos',      true, 512000,  array['image/png', 'image/jpeg', 'image/webp']),
  ('affiches',   'affiches',   true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('publicites', 'publicites', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set name               = excluded.name,
      public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Images publiques : lecture pour tous" on storage.objects;
