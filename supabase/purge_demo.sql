-- =============================================================================
-- purge_demo.sql — retire toutes les données de démonstration ([DÉMO])
-- =============================================================================
-- À exécuter si supabase/seed_demo.sql a été chargé par erreur sur un projet
-- destiné à la production, ou pour nettoyer un environnement de développement
-- avant un nouveau chargement propre.
--
-- Ordre (identique à celui de seed_demo.sql) :
--   1. événements dont le titre commence par « [DÉMO] » — la suppression
--      entraîne, par cascade (on delete cascade), celle de leurs échéances
--      (echeances), de leurs organisateurs (evenement_societes), de leurs
--      disciplines liées (evenement_disciplines) et de tout emplacement
--      publicitaire qui leur est rattaché (emplacements_pub.evenement_id) ;
--   2. organisations dont le nom complet commence par « [DÉMO] » — la
--      suppression entraîne, par cascade, celle de leurs disciplines liées
--      (societe_disciplines) ;
--   3. emplacements publicitaires restants dont l'annonceur commence par
--      « [DÉMO] » (ceux qui ne sont rattachés à aucun événement, par exemple
--      une bannière d'agenda sans image — déjà retirés du n° 1 s'ils étaient
--      rattachés à un événement démo).
--
-- Le préfixe « [DÉMO] » est celui exigé par CLAUDE.md, section 6 : ce script
-- ne touche à aucune autre donnée. Sans effet si aucune donnée [DÉMO] n'est
-- présente (les DELETE ne touchent alors aucune ligne).
--
-- Utilisation :
--   psql ... -f supabase/purge_demo.sql
-- =============================================================================

delete from public.evenements where titre like '[DÉMO]%';
delete from public.societes where nom_complet like '[DÉMO]%';
delete from public.emplacements_pub where annonceur like '[DÉMO]%';
