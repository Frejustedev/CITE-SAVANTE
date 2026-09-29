-- =============================================================================
-- Test 05 — Structure de la base
-- =============================================================================
-- Vérifie ce que les migrations doivent avoir créé, indépendamment des données :
-- les 14 tables (et pas les tables P1), la RLS partout, les 12 types énumérés,
-- le search_path fixé sur chaque fonction, la liste exacte des fonctions
-- security definer et leurs droits d'exécution, les déclencheurs, les index de
-- la section 5.4, les privilèges (TRUNCATE, colonne traitee, colonnes de
-- données personnelles de societes et evenements), les contraintes de format
-- des liens, les politiques (une par opération, aucune écriture pour anon) et
-- le stockage.
-- Les aides de test (fonctions public.test_*) sont exclues des contrôles.
-- Lancé par scripts/valider-base.sh ; chaque « OK | … » est une vérification.
-- =============================================================================
begin;

-- ── Tables, RLS, tables P1 ───────────────────────────────────────────────────
do $$
declare
  v_attendues text[] := array[
    'clics_sortants', 'demandes_contact', 'disciplines', 'echeances',
    'emplacements_pub', 'evenement_disciplines', 'evenement_societes', 'evenements',
    'gestionnaires', 'journal_moderation', 'profils', 'societe_disciplines',
    'societes', 'tentatives_formulaires'];
  v_presentes text[];
  v_sans_rls text;
begin
  select array_agg(c.relname::text order by c.relname)
    into v_presentes
    from pg_catalog.pg_class c
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p');
  perform test_verifier(v_presentes = v_attendues,
    format('le schéma public contient exactement les 14 tables du MVP (trouvé : %s)', v_presentes));

  select string_agg(c.relname, ', ')
    into v_sans_rls
    from pg_catalog.pg_class c
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p')
     and not c.relrowsecurity;
  perform test_verifier(v_sans_rls is null,
    format('RLS activée sur toutes les tables de public (sans RLS : %s)', coalesce(v_sans_rls, 'aucune')));

  perform test_verifier(
    to_regclass('public.abonnes') is null
      and to_regclass('public.sources_synchro') is null
      and to_regclass('public.actualites') is null,
    'les tables P1 (abonnes, sources_synchro, actualites) ne sont pas créées');
end
$$;

-- ── Types énumérés (section 5.2) ─────────────────────────────────────────────
do $$
begin
  perform test_verifier(
    (select count(*) from pg_catalog.pg_type t
      where t.typnamespace = 'public'::regnamespace and t.typtype = 'e') = 12,
    '12 types énumérés dans public');
  perform test_verifier(
    enum_range(null::public.statut_publication)::text[] = array['brouillon', 'en_attente', 'publie', 'refuse', 'archive']
    and enum_range(null::public.categorie_organisation)::text[] = array['societe_savante', 'institution_academique', 'association_professionnelle', 'autre']
    and enum_range(null::public.type_evenement)::text[] = array['congres', 'journees', 'colloque', 'seminaire', 'atelier', 'webinaire', 'formation', 'autre']
    and enum_range(null::public.modalite_evenement)::text[] = array['presentiel', 'en_ligne', 'hybride']
    and enum_range(null::public.type_echeance)::text[] = array['soumission_resumes', 'inscription_tarif_preferentiel', 'inscription', 'bourse', 'prix', 'autre']
    and enum_range(null::public.role_utilisateur)::text[] = array['admin', 'moderateur', 'gestionnaire']
    and enum_range(null::public.statut_demande)::text[] = array['en_attente', 'acceptee', 'refusee']
    and enum_range(null::public.role_organisation)::text[] = array['organisateur', 'co_organisateur', 'partenaire']
    and enum_range(null::public.type_emplacement)::text[] = array['banniere_accueil', 'banniere_agenda', 'banniere_discipline', 'evenement_en_avant', 'lettre']
    and enum_range(null::public.type_cible)::text[] = array['societe', 'evenement', 'emplacement']
    and enum_range(null::public.source_evenement)::text[] = array['manuel', 'synchro']
    and enum_range(null::public.type_demande_contact)::text[] = array['contact', 'visibilite'],
    'valeurs et ordre des 12 types énumérés conformes à la section 5.2');
end
$$;

-- ── Fonctions : search_path, security definer, droits d'exécution ───────────
do $$
declare
  v_sans_search_path text;
  v_definer text[];
begin
  select string_agg(p.proname, ', ')
    into v_sans_search_path
    from pg_catalog.pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname not like 'test\_%'
     and not exists (
       select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search\_path=%');
  perform test_verifier(v_sans_search_path is null,
    format('toute fonction de public a un search_path fixé (sans : %s)', coalesce(v_sans_search_path, 'aucune')));

  select array_agg(p.proname::text order by p.proname)
    into v_definer
    from pg_catalog.pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.prosecdef
     and p.proname not like 'test\_%';
  perform test_verifier(
    v_definer = array['auteur_soumission', 'creer_profil', 'est_admin', 'est_moderateur', 'gere_evenement', 'gere_societe', 'role_courant'],
    format('fonctions security definer : exactement creer_profil, auteur_soumission et les 5 fonctions de rôles (trouvé : %s)', v_definer));
  perform test_verifier(
    has_function_privilege('authenticated', 'public.auteur_soumission(text, uuid)', 'execute')
    and not has_function_privilege('anon', 'public.auteur_soumission(text, uuid)', 'execute'),
    'auteur_soumission() exécutable par authenticated, pas par anon');

  perform test_verifier(
    (select bool_and(p.proconfig @> array['search_path=pg_catalog, public'])
       from pg_catalog.pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.prosecdef and p.proname not like 'test\_%'),
    'fonctions security definer : search_path « pg_catalog, public »');

  perform test_verifier(
    (select p.proconfig @> array['search_path=public, extensions']
       from pg_catalog.pg_proc p
      where p.oid = 'public.rechercher(text, integer)'::regprocedure),
    'rechercher() : search_path « public, extensions » (pg_trgm)');

  perform test_verifier(
    not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = 'public.rechercher(text, integer)'::regprocedure),
    'rechercher() n''est pas security definer (la RLS s''applique)');

  -- Fonctions de rôles : authenticated oui, anon non.
  perform test_verifier(
    has_function_privilege('authenticated', 'public.role_courant()', 'execute')
    and has_function_privilege('authenticated', 'public.est_moderateur()', 'execute')
    and has_function_privilege('authenticated', 'public.est_admin()', 'execute')
    and has_function_privilege('authenticated', 'public.gere_societe(uuid)', 'execute')
    and has_function_privilege('authenticated', 'public.gere_evenement(uuid)', 'execute'),
    'fonctions de rôles exécutables par authenticated');
  perform test_verifier(
    not has_function_privilege('anon', 'public.role_courant()', 'execute')
    and not has_function_privilege('anon', 'public.est_moderateur()', 'execute')
    and not has_function_privilege('anon', 'public.est_admin()', 'execute')
    and not has_function_privilege('anon', 'public.gere_societe(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.gere_evenement(uuid)', 'execute'),
    'fonctions de rôles (security definer) non exécutables par anon');

  -- Fonctions de déclencheur : non exécutables par anon ni authenticated
  -- (service_role garde le droit par défaut, sans effet : une fonction
  -- « returns trigger » ne s'appelle pas directement).
  perform test_verifier(
    not has_function_privilege('anon', 'public.creer_profil()', 'execute')
    and not has_function_privilege('authenticated', 'public.creer_profil()', 'execute')
    and not has_function_privilege('authenticated', 'public.proteger_societe()', 'execute')
    and not has_function_privilege('authenticated', 'public.statut_evenement_gestionnaire()', 'execute')
    and not has_function_privilege('authenticated', 'public.proteger_profil()', 'execute')
    and not has_function_privilege('authenticated', 'public.maj_updated_at()', 'execute'),
    'fonctions de déclencheur non exécutables par anon ni authenticated');

  perform test_verifier(
    has_function_privilege('anon', 'public.rechercher(text, integer)', 'execute')
    and has_function_privilege('anon', 'public.aujourdhui()', 'execute'),
    'rechercher() et aujourdhui() exécutables par anon');
end
$$;

-- ── Déclencheurs et index ────────────────────────────────────────────────────
do $$
begin
  perform test_verifier(
    exists (select 1 from pg_catalog.pg_trigger where tgname = 'societes_updated' and tgrelid = 'public.societes'::regclass)
    and exists (select 1 from pg_catalog.pg_trigger where tgname = 'evenements_updated' and tgrelid = 'public.evenements'::regclass)
    and exists (select 1 from pg_catalog.pg_trigger where tgname = 'nouvel_utilisateur' and tgrelid = 'auth.users'::regclass)
    and exists (select 1 from pg_catalog.pg_trigger where tgname = 'proteger_societe' and tgrelid = 'public.societes'::regclass)
    and exists (select 1 from pg_catalog.pg_trigger where tgname = 'statut_evenement_gestionnaire' and tgrelid = 'public.evenements'::regclass)
    and exists (select 1 from pg_catalog.pg_trigger where tgname = 'proteger_profil' and tgrelid = 'public.profils'::regclass),
    'les 6 déclencheurs sont en place (updated_at ×2, nouvel_utilisateur, 3 protections)');

  perform test_verifier(
    to_regclass('public.societes_recherche_idx') is not null
    and to_regclass('public.societes_sigle_trgm_idx') is not null
    and to_regclass('public.evenements_recherche_idx') is not null
    and to_regclass('public.evenements_dates_idx') is not null
    and to_regclass('public.echeances_date_idx') is not null
    and to_regclass('public.clics_cible_idx') is not null
    and to_regclass('public.tentatives_idx') is not null,
    'les 7 index de la section 5.4 existent');

  perform test_verifier(
    exists (select 1 from pg_catalog.pg_ts_config
             where cfgname = 'fr_unaccent' and cfgnamespace = 'public'::regnamespace),
    'configuration de recherche public.fr_unaccent présente');

  perform test_verifier(
    exists (select 1 from pg_catalog.pg_extension e
             where e.extname = 'unaccent' and e.extnamespace = 'extensions'::regnamespace)
    and exists (select 1 from pg_catalog.pg_extension e
             where e.extname = 'pg_trgm' and e.extnamespace = 'extensions'::regnamespace),
    'unaccent et pg_trgm installées dans le schéma extensions');
end
$$;

-- ── Privilèges ───────────────────────────────────────────────────────────────
do $$
declare
  v_table text;
  v_tronquables text := '';
begin
  foreach v_table in array array[
    'disciplines', 'societes', 'societe_disciplines', 'evenements', 'evenement_societes',
    'evenement_disciplines', 'echeances', 'profils', 'gestionnaires', 'emplacements_pub',
    'clics_sortants', 'journal_moderation', 'demandes_contact', 'tentatives_formulaires']
  loop
    if has_table_privilege('anon', 'public.' || v_table, 'truncate')
       or has_table_privilege('authenticated', 'public.' || v_table, 'truncate') then
      v_tronquables := v_tronquables || v_table || ' ';
    end if;
  end loop;
  perform test_verifier(v_tronquables = '',
    format('TRUNCATE retiré à anon et authenticated sur les 14 tables (reste : %s)', nullif(v_tronquables, '')));

  perform test_verifier(
    not has_table_privilege('authenticated', 'public.demandes_contact', 'update')
    and has_column_privilege('authenticated', 'public.demandes_contact', 'traitee', 'update')
    and not has_column_privilege('authenticated', 'public.demandes_contact', 'message', 'update')
    and not has_column_privilege('authenticated', 'public.demandes_contact', 'email', 'update')
    and not has_column_privilege('anon', 'public.demandes_contact', 'traitee', 'update'),
    'demandes_contact : authenticated ne peut modifier que la colonne traitee, anon rien');

  -- Données personnelles (relecture de sécurité) : aucune colonne soumis_par_*
  -- du schéma public n'est lisible par anon ni par authenticated.
  perform test_verifier(
    not exists (
      select 1
        from information_schema.columns c
       where c.table_schema = 'public'
         and c.column_name like 'soumis\_par\_%'
         and (has_column_privilege('anon', format('public.%I', c.table_name), c.column_name, 'select')
              or has_column_privilege('authenticated', format('public.%I', c.table_name), c.column_name, 'select'))),
    'soumis_par_nom / soumis_par_email : lisibles ni par anon ni par authenticated, dans aucune table');
  perform test_verifier(
    not has_table_privilege('anon', 'public.societes', 'select')
    and not has_table_privilege('authenticated', 'public.societes', 'select')
    and not has_table_privilege('anon', 'public.evenements', 'select')
    and not has_table_privilege('authenticated', 'public.evenements', 'select'),
    'societes et evenements : plus de droit de lecture sur la table entière pour anon et authenticated (droits par colonne)');
  perform test_verifier(
    not has_column_privilege('anon', 'public.evenements', 'cree_par', 'select')
    and has_column_privilege('authenticated', 'public.evenements', 'cree_par', 'select'),
    'evenements.cree_par : lisible par authenticated, pas par anon');
  perform test_verifier(
    (select bool_and(has_column_privilege('anon', 'public.societes', col, 'select')
                     and has_column_privilege('authenticated', 'public.societes', col, 'select'))
       from unnest(array['id', 'slug', 'sigle', 'nom_complet', 'categorie', 'description', 'annee_creation',
                         'ville', 'pays', 'site_web', 'site_congres', 'email', 'telephone', 'reseaux',
                         'logo_path', 'statut', 'mise_en_avant', 'recherche', 'created_at', 'updated_at']) col)
    and (select bool_and(has_column_privilege('anon', 'public.evenements', col, 'select')
                         and has_column_privilege('authenticated', 'public.evenements', col, 'select'))
       from unnest(array['id', 'slug', 'titre', 'type', 'resume', 'description', 'date_debut', 'date_fin',
                         'heure_debut', 'modalite', 'lieu_nom', 'adresse', 'ville', 'pays',
                         'lien_inscription', 'site_web', 'affiche_path', 'tarifs', 'gratuit',
                         'credits_fmc', 'contact_email', 'statut', 'source', 'source_ref', 'recherche',
                         'created_at', 'updated_at']) col),
    'societes et evenements : toutes les colonnes publiques restent lisibles par anon et authenticated');
  perform test_verifier(
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'societes') = 22
    and (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'evenements') = 30,
    'societes (22 colonnes) et evenements (30) : une colonne ajoutée impose de revoir les droits de colonne (migration 6)');
end
$$;

-- ── Contraintes de format des liens (relecture de sécurité) ──────────────────
do $$
begin
  perform test_verifier(
    (select count(*) from pg_catalog.pg_constraint
      where contype = 'c'
        and conname in ('societes_site_web_https', 'societes_site_congres_https', 'societes_reseaux_objet',
                        'evenements_lien_inscription_https', 'evenements_site_web_https',
                        'emplacements_pub_lien_https')
        and connamespace = 'public'::regnamespace) = 6,
    'les 6 contraintes de format (liens https:// et reseaux objet) sont en place');
end
$$;

-- ── Politiques RLS ───────────────────────────────────────────────────────────
do $$
declare
  v_sans_politique text;
begin
  perform test_verifier(
    not exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and cmd = 'ALL'),
    'aucune politique « for all » : une politique par opération');

  perform test_verifier(
    not exists (
      select 1 from pg_catalog.pg_policies
       where schemaname = 'public'
         and cmd in ('INSERT', 'UPDATE', 'DELETE')
         and (roles @> array['anon']::name[] or roles @> array['public']::name[])),
    'aucune politique d''écriture ne vise anon ni PUBLIC');

  select string_agg(t, ', ')
    into v_sans_politique
    from unnest(array[
      'disciplines', 'societes', 'societe_disciplines', 'evenements', 'evenement_societes',
      'evenement_disciplines', 'echeances', 'profils', 'gestionnaires', 'emplacements_pub',
      'clics_sortants', 'journal_moderation', 'demandes_contact']) t
   where not exists (select 1 from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename = t);
  perform test_verifier(v_sans_politique is null,
    format('chacune des 13 tables accessibles a au moins une politique (sans : %s)', v_sans_politique));

  perform test_verifier(
    not exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'tentatives_formulaires'),
    'tentatives_formulaires : aucune politique (client de service uniquement)');

  perform test_verifier(
    not exists (select 1 from pg_catalog.pg_policies
                 where schemaname = 'public'
                   and tablename in ('clics_sortants', 'journal_moderation')
                   and cmd <> 'SELECT'),
    'clics_sortants et journal_moderation : lecture seule (aucune politique d''écriture)');

  perform test_verifier(
    (select array_agg(cmd::text order by cmd) from pg_catalog.pg_policies
      where schemaname = 'public' and tablename = 'demandes_contact') = array['SELECT', 'UPDATE'],
    'demandes_contact : politiques de lecture et de modification seulement');
end
$$;

-- ── Stockage ─────────────────────────────────────────────────────────────────
do $$
begin
  perform test_verifier(
    (select count(*) from storage.buckets where id in ('logos', 'affiches', 'publicites') and public) = 3,
    'buckets publics logos, affiches, publicites présents');
  perform test_verifier(
    (select file_size_limit from storage.buckets where id = 'logos') = 500 * 1024
    and (select file_size_limit from storage.buckets where id = 'affiches') = 2 * 1024 * 1024
    and (select file_size_limit from storage.buckets where id = 'publicites') = 1024 * 1024,
    'tailles maximales : logos 500 Ko, affiches 2 Mo, publicites 1 Mo');
  perform test_verifier(
    (select bool_and(allowed_mime_types::text[] = array['image/png', 'image/jpeg', 'image/webp'])
       from storage.buckets where id in ('logos', 'affiches', 'publicites')),
    'formats acceptés : PNG, JPEG, WebP uniquement (SVG refusé)');
  perform test_verifier(
    not exists (
      select 1 from pg_catalog.pg_policies
       where schemaname = 'storage' and tablename in ('objects', 'buckets')
         and cmd <> 'SELECT'),
    'storage : aucune politique d''écriture (envois par le client de service)');
  -- Correctif du coordinateur : un bucket public sert ses fichiers par son URL
  -- publique sans aucune politique ; une politique de lecture sur
  -- storage.objects ne servait qu'à LISTER les objets par l'API (affiches
  -- d'événements non publiés ou refusés comprises).
  perform test_verifier(
    not exists (select 1 from pg_catalog.pg_policies
                 where schemaname = 'storage' and tablename = 'objects'),
    'storage.objects : aucune politique, pas même de lecture (fichiers servis par l''URL publique, aucun listage par l''API)');
end
$$;

rollback;
