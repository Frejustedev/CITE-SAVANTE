-- =============================================================================
-- Test 50 — Relecture de sécurité adversariale (phase 1)
-- =============================================================================
-- Tentatives d'attaque contre la RLS, les privilèges et les déclencheurs, en
-- plus des tests 10 et 20. Exécutés sur la base d'avant la relecture, les
-- blocs B, D et E échouaient (failles corrigées depuis), ainsi que le contrôle
-- « fonctions STABLE » du bloc A (auteur_soumission n'existait pas) ; les blocs
-- C, F et G passaient déjà et figent des protections vérifiées. Le bloc G
-- montre aussi, côté SQL, l'organisatrice masquée qui cassait l'agenda public
-- (src/lib/requetes/evenements.ts). Voir PROGRESS.md, « Relecture sécurité
-- phase 1 » :
--   A. audit du catalogue : aucune vue, RLS partout, inventaire EXACT des
--      politiques (tableau de la section 6), aucune écriture « true », aucune
--      politique « to public », (select …) autour de auth.uid() et des fonctions
--      de rôles, fonctions stables, index utiles aux politiques ;
--   B. données personnelles : soumis_par_nom / soumis_par_email illisibles par
--      anon et authenticated (faille corrigée), cree_par illisible par anon,
--      auteur_soumission() réservée aux modérateurs ;
--   C. escalades : upserts (insert … on conflict do update) sur gestionnaires,
--      profils, societes, evenements ; rattachements et échéances déplacés vers
--      l'événement d'un autre ; cree_par nul ; appels directs des fonctions
--      security definer ; rechercher() ; stockage ; demandes_contact ;
--   D. déclencheurs : rôle du JWT absent ou d'une autre casse sous le rôle
--      authenticated (faille corrigée), valeurs nulles, modifications
--      multi-colonnes sans changement, messages en français ;
--   E. liens externes https:// uniquement, même par l'API (faille corrigée) ;
--   F. creer_profil avec des métadonnées absentes ou malformées ;
--   G. matrice des tables internes pour chaque profil, et demande de gestion
--      seulement en attente.
-- Données fictives, préfixe [TEST], adresses en .invalid, annulées à la fin
-- (rollback). Indépendant de seed.sql et de seed_demo.sql.
-- =============================================================================
begin;

-- ── Données de test (en postgres, sans RLS) ──────────────────────────────────
do $$
declare
  u_simple  uuid := test_creer_utilisateur('sec-simple@exemple.invalid', '[TEST] Simple');
  u_gest    uuid := test_creer_utilisateur('sec-gestionnaire@exemple.invalid', '[TEST] Gestionnaire');
  u_attente uuid := test_creer_utilisateur('sec-attente@exemple.invalid', '[TEST] Demande en attente');
  u_conf    uuid := test_creer_utilisateur('sec-confiance@exemple.invalid', '[TEST] De confiance');
  u_mod     uuid := test_creer_utilisateur('sec-moderateur@exemple.invalid', '[TEST] Modérateur');
  u_admin   uuid := test_creer_utilisateur('sec-admin@exemple.invalid', '[TEST] Administrateur');
  s_a uuid; s_b uuid; s_c uuid;
  e_pub uuid; e_att uuid; e_autre uuid;
begin
  insert into public.disciplines (slug, nom, ordre) values ('test-sec-d1', '[TEST] Discipline sécurité', 201);
  update public.profils set de_confiance = true where id = u_conf;
  update public.profils set role = 'moderateur' where id = u_mod;
  update public.profils set role = 'admin' where id = u_admin;

  insert into public.societes (slug, sigle, statut, soumis_par_nom, soumis_par_email)
    values ('test-sec-a', '[TEST] SECA', 'publie', '[TEST] Auteur de la fiche A', 'auteur-a@exemple.invalid')
    returning id into s_a;
  insert into public.societes (slug, sigle, statut)
    values ('test-sec-b', '[TEST] SECB', 'en_attente')
    returning id into s_b;
  insert into public.societes (slug, sigle, statut)
    values ('test-sec-c', '[TEST] SECC', 'publie')
    returning id into s_c;

  insert into public.gestionnaires (user_id, societe_id, statut) values
    (u_gest, s_a, 'acceptee'), (u_conf, s_a, 'acceptee'), (u_attente, s_a, 'en_attente');

  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, cree_par, soumis_par_nom, soumis_par_email)
    values ('test-sec-ev-publie', '[TEST] Congrès sécurité publié', 'congres', aujourdhui() + 30, aujourdhui() + 31,
            'publie', u_gest, '[TEST] Auteur de l''événement', 'auteur-ev@exemple.invalid')
    returning id into e_pub;
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, cree_par)
    values ('test-sec-ev-attente', '[TEST] Journées zkwqvx en attente', 'journees', aujourdhui() + 40, aujourdhui() + 40,
            'en_attente', u_gest)
    returning id into e_att;
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, cree_par)
    values ('test-sec-ev-autre', '[TEST] Atelier d''une autre organisation', 'atelier', aujourdhui() + 50, aujourdhui() + 50,
            'publie', u_simple)
    returning id into e_autre;

  -- e_pub : organisé par A (gérée) et co-organisé par B (non publiée).
  insert into public.evenement_societes (evenement_id, societe_id, role) values
    (e_pub, s_a, 'organisateur'), (e_pub, s_b, 'co_organisateur'), (e_att, s_a, 'organisateur'),
    (e_autre, s_c, 'organisateur');
  insert into public.echeances (evenement_id, type, date_limite) values
    (e_att, 'inscription', aujourdhui() + 35), (e_autre, 'inscription', aujourdhui() + 45);

  insert into public.demandes_contact (type, nom, email, message)
    values ('contact', '[TEST] Visiteur', 'visiteur-sec@exemple.invalid', '[TEST] Message d''origine');
  insert into public.clics_sortants (cible_type, cible_id, url) values ('societe', s_a, 'https://exemple.invalid/');
  insert into public.journal_moderation (objet_type, objet_id, action, auteur) values ('societe', s_a, 'publie', u_mod);
  insert into public.tentatives_formulaires (empreinte, formulaire) values ('test-sec-empreinte', 'contact');
end
$$;

-- =============================================================================
-- A. Audit du catalogue
-- =============================================================================
do $$
declare
  v_attendu text[] := array[
    'clics_sortants|SELECT|authenticated',
    'demandes_contact|SELECT|authenticated', 'demandes_contact|UPDATE|authenticated',
    'disciplines|DELETE|authenticated', 'disciplines|INSERT|authenticated',
    'disciplines|SELECT|anon,authenticated', 'disciplines|UPDATE|authenticated',
    'echeances|DELETE|authenticated', 'echeances|INSERT|authenticated',
    'echeances|SELECT|anon,authenticated', 'echeances|UPDATE|authenticated',
    'emplacements_pub|DELETE|authenticated', 'emplacements_pub|INSERT|authenticated',
    'emplacements_pub|SELECT|anon', 'emplacements_pub|SELECT|authenticated',
    'emplacements_pub|UPDATE|authenticated',
    'evenement_disciplines|DELETE|authenticated', 'evenement_disciplines|INSERT|authenticated',
    'evenement_disciplines|SELECT|anon,authenticated', 'evenement_disciplines|UPDATE|authenticated',
    'evenement_societes|DELETE|authenticated', 'evenement_societes|INSERT|authenticated',
    'evenement_societes|SELECT|anon,authenticated', 'evenement_societes|UPDATE|authenticated',
    'evenements|DELETE|authenticated', 'evenements|INSERT|authenticated',
    'evenements|SELECT|anon', 'evenements|SELECT|authenticated', 'evenements|UPDATE|authenticated',
    'gestionnaires|INSERT|authenticated', 'gestionnaires|SELECT|authenticated',
    'gestionnaires|UPDATE|authenticated',
    'journal_moderation|SELECT|authenticated',
    'profils|DELETE|authenticated', 'profils|INSERT|authenticated',
    'profils|SELECT|authenticated', 'profils|UPDATE|authenticated',
    'societe_disciplines|DELETE|authenticated', 'societe_disciplines|INSERT|authenticated',
    'societe_disciplines|SELECT|anon,authenticated', 'societe_disciplines|UPDATE|authenticated',
    'societes|DELETE|authenticated', 'societes|INSERT|authenticated',
    'societes|SELECT|anon', 'societes|SELECT|authenticated', 'societes|UPDATE|authenticated'];
  v_reel text[];
  v_manquantes text;
  v_en_trop text;
  v_fonction text;
  v_total int;
  v_enveloppees int;
begin
  perform test_verifier(
    (select count(*) from pg_catalog.pg_class
      where relnamespace = 'public'::regnamespace and relkind in ('v', 'm', 'f')) = 0,
    'audit : aucune vue, vue matérialisée ni table étrangère dans public (elles contourneraient la RLS)');

  perform test_verifier(
    not exists (select 1 from pg_catalog.pg_class
                 where relnamespace = 'public'::regnamespace and relkind in ('r', 'p') and not relrowsecurity),
    'audit : pg_class.relrowsecurity vrai pour chaque table de public');

  -- Inventaire exact : (table, opération, rôles) de chaque politique.
  select array_agg(ligne order by ligne)
    into v_reel
    from (select format('%s|%s|%s', p.tablename, p.cmd,
                        array_to_string(array(select r from unnest(p.roles) r order by r), ',')) as ligne
            from pg_catalog.pg_policies p
           where p.schemaname = 'public') t;
  select string_agg(x, ', ') into v_manquantes from unnest(v_attendu) x where x <> all (v_reel);
  select string_agg(x, ', ') into v_en_trop from unnest(v_reel) x where x <> all (v_attendu);
  perform test_verifier(
    v_manquantes is null and v_en_trop is null and cardinality(v_reel) = 46,
    format('audit : les 46 politiques correspondent exactement au tableau de la section 6 (manquantes : %s ; en trop : %s)',
           coalesce(v_manquantes, 'aucune'), coalesce(v_en_trop, 'aucune')));

  perform test_verifier(
    not exists (select 1 from pg_catalog.pg_policies
                 where schemaname in ('public', 'storage')
                   and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
                   and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')),
    'audit : aucune politique d''écriture « using (true) » ni « with check (true) » (public, storage)');
  perform test_verifier(
    not exists (select 1 from pg_catalog.pg_policies
                 where schemaname in ('public', 'storage') and 'public' = any (roles)),
    'audit : aucune politique « to public » (toutes visent anon et/ou authenticated)');
  perform test_verifier(
    (select array_agg(distinct tablename::text order by tablename::text) from pg_catalog.pg_policies
      where schemaname = 'public' and cmd = 'SELECT' and qual = 'true')
      = array['disciplines', 'societe_disciplines'],
    'audit : seules disciplines et societe_disciplines sont lisibles sans condition (tableau : « tous »)');

  -- Performance (recommandation Supabase) : auth.uid() et les fonctions de rôle
  -- sans argument sont toujours enveloppées dans (select …), évaluées une fois
  -- par requête et non une fois par ligne.
  foreach v_fonction in array array['auth\.uid\(\)', '(public\.)?est_moderateur\(\)',
                                     '(public\.)?est_admin\(\)', '(public\.)?aujourdhui\(\)']
  loop
    select coalesce(sum(regexp_count(coalesce(qual, '') || ' ' || coalesce(with_check, ''), v_fonction)), 0),
           coalesce(sum(regexp_count(coalesce(qual, '') || ' ' || coalesce(with_check, ''), 'SELECT ' || v_fonction)), 0)
      into v_total, v_enveloppees
      from pg_catalog.pg_policies
     where schemaname = 'public';
    perform test_verifier(v_total > 0 and v_total = v_enveloppees,
      format('performance : %s toujours appelée sous la forme (select …) dans les politiques (%s sur %s)',
             v_fonction, v_enveloppees, v_total));
  end loop;

  perform test_verifier(
    (select bool_and(p.provolatile = 's') from pg_catalog.pg_proc p
      where p.pronamespace = 'public'::regnamespace
        and p.proname in ('role_courant', 'est_moderateur', 'est_admin', 'gere_societe', 'gere_evenement',
                          'aujourdhui', 'rechercher', 'auteur_soumission'))
    and (select count(*) from pg_catalog.pg_proc p
      where p.pronamespace = 'public'::regnamespace
        and p.proname in ('role_courant', 'est_moderateur', 'est_admin', 'gere_societe', 'gere_evenement',
                          'aujourdhui', 'rechercher', 'auteur_soumission')) = 8,
    'performance : les fonctions appelées par les politiques et l''API sont STABLE');

  perform test_verifier(
    exists (select 1 from pg_catalog.pg_indexes
             where schemaname = 'public' and tablename = 'gestionnaires'
               and indexdef like '%UNIQUE%(user_id, societe_id)%')
    and exists (select 1 from pg_catalog.pg_indexes
             where schemaname = 'public' and tablename = 'evenement_societes' and indexdef like '%(societe_id)')
    and exists (select 1 from pg_catalog.pg_indexes
             where schemaname = 'public' and tablename = 'evenement_societes'
               and indexdef like '%(evenement_id, societe_id)%')
    and exists (select 1 from pg_catalog.pg_indexes
             where schemaname = 'public' and tablename = 'evenements' and indexdef like '%(cree_par)'),
    'performance : index de gere_societe (gestionnaires unique user_id, societe_id), de gere_evenement '
      || '(clé evenement_id, societe_id), evenement_societes(societe_id) et evenements(cree_par)');
end
$$;

-- =============================================================================
-- B. Données personnelles (faille corrigée : lisibles par tous avant la relecture)
-- =============================================================================
do $$
declare
  u_simple uuid := (select id from auth.users where email = 'sec-simple@exemple.invalid');
  u_gest   uuid := (select id from auth.users where email = 'sec-gestionnaire@exemple.invalid');
  u_mod    uuid := (select id from auth.users where email = 'sec-moderateur@exemple.invalid');
  s_a   uuid := (select id from public.societes where slug = 'test-sec-a');
  e_pub uuid := (select id from public.evenements where slug = 'test-sec-ev-publie');
  v_nom text;
  v_email text;
begin
  -- Visiteur anonyme (clé publique) : exactement la requête d'aspiration.
  perform test_anonyme();
  perform test_verifier(exists (select 1 from public.societes where id = s_a and sigle = '[TEST] SECA'),
    'anonyme : lit toujours les colonnes publiques d''une organisation publiée');
  perform test_doit_echouer('select soumis_par_nom, soumis_par_email from public.societes',
    'anonyme : ne lit pas le nom ni l''e-mail de l''auteur d''une organisation (soumis_par_*)');
  perform test_doit_echouer('select soumis_par_email from public.evenements',
    'anonyme : ne lit pas l''e-mail de l''auteur d''un événement');
  perform test_doit_echouer('select cree_par from public.evenements',
    'anonyme : ne lit pas l''identifiant du compte créateur d''un événement (cree_par)');
  perform test_doit_echouer('select * from public.societes',
    'anonyme : « select * » sur societes refusé (lister les colonnes, conséquence documentée)');
  perform test_doit_echouer(format('select * from public.auteur_soumission(''societe'', %L)', s_a),
    'anonyme : ne peut pas appeler auteur_soumission()');
  perform test_verifier(
    exists (select 1 from public.evenements e
             join public.echeances x on x.evenement_id = e.id
            where e.slug = 'test-sec-ev-autre'),
    'anonyme : les politiques qui consultent evenements (échéances) fonctionnent toujours');
  perform test_deconnecter();

  -- Utilisateur connecté quelconque (un compte se crée librement).
  perform test_connecter(u_simple);
  perform test_doit_echouer('select soumis_par_email from public.societes',
    'connecté : ne lit pas soumis_par_email des organisations');
  perform test_doit_echouer('select soumis_par_nom from public.evenements',
    'connecté : ne lit pas soumis_par_nom des événements');
  perform test_verifier(
    (select cree_par from public.evenements where slug = 'test-sec-ev-autre') = u_simple,
    'connecté : lit cree_par (ses événements, espace gestionnaire)');
  perform test_verifier((select count(*) from public.auteur_soumission('societe', s_a)) = 0,
    'connecté : auteur_soumission() ne renvoie rien à un non-modérateur');
  perform test_deconnecter();

  -- Gestionnaire de la fiche : pas davantage.
  perform test_connecter(u_gest);
  perform test_doit_echouer(format('update public.societes set description = ''[TEST] x'' where id = %L returning *', s_a),
    'gestionnaire : « returning * » refusé (return=representation sans liste de colonnes)');
  perform test_verifier(
    test_lignes_touchees(format('update public.societes set description = ''[TEST] Revue'' where id = %L returning id', s_a)) = 1,
    'gestionnaire : modifie sa fiche avec « returning id » (colonnes listées)');
  perform test_verifier((select count(*) from public.auteur_soumission('societe', s_a)) = 0,
    'gestionnaire : auteur_soumission() ne renvoie rien, même pour sa propre fiche');
  perform test_deconnecter();

  -- Modérateur : pas de lecture directe, mais la fonction dédiée.
  perform test_connecter(u_mod);
  perform test_doit_echouer('select soumis_par_email from public.evenements',
    'modérateur : pas de lecture directe de soumis_par_email');
  select nom, email into v_nom, v_email from public.auteur_soumission('societe', s_a);
  perform test_verifier(v_nom = '[TEST] Auteur de la fiche A' and v_email = 'auteur-a@exemple.invalid',
    'modérateur : auteur_soumission(''societe'', id) renvoie le nom et l''e-mail de l''auteur');
  select nom, email into v_nom, v_email from public.auteur_soumission('evenement', e_pub);
  perform test_verifier(v_email = 'auteur-ev@exemple.invalid',
    'modérateur : auteur_soumission(''evenement'', id) renvoie l''e-mail de l''auteur');
  perform test_verifier((select count(*) from public.auteur_soumission('emplacement', e_pub)) = 0,
    'modérateur : auteur_soumission() avec un type inconnu ne renvoie rien');
  perform test_deconnecter();

  -- Client de service : tous les droits (e-mails aux auteurs, phases 5 et 6).
  perform test_service();
  perform test_verifier(
    (select soumis_par_email from public.societes where id = s_a) = 'auteur-a@exemple.invalid',
    'service : lit soumis_par_email (e-mails aux auteurs)');
  perform test_deconnecter();
end
$$;

-- =============================================================================
-- C. Escalades
-- =============================================================================
do $$
declare
  u_simple  uuid := (select id from auth.users where email = 'sec-simple@exemple.invalid');
  u_gest    uuid := (select id from auth.users where email = 'sec-gestionnaire@exemple.invalid');
  u_mod     uuid := (select id from auth.users where email = 'sec-moderateur@exemple.invalid');
  s_a uuid := (select id from public.societes where slug = 'test-sec-a');
  s_c uuid := (select id from public.societes where slug = 'test-sec-c');
  e_pub   uuid := (select id from public.evenements where slug = 'test-sec-ev-publie');
  e_att   uuid := (select id from public.evenements where slug = 'test-sec-ev-attente');
  e_autre uuid := (select id from public.evenements where slug = 'test-sec-ev-autre');
  e_nouv uuid;
  v_n bigint;
begin
  -- C1. Demande de gestion : upsert pour s'auto-accepter.
  perform test_connecter(u_simple);
  insert into public.gestionnaires (user_id, societe_id) values (u_simple, s_c);
  perform test_doit_echouer(
    format('insert into public.gestionnaires (user_id, societe_id) values (%L, %L) '
           'on conflict (user_id, societe_id) do update set statut = ''acceptee''', u_simple, s_c),
    'upsert : un utilisateur ne peut pas accepter sa propre demande de gestion (on conflict do update)');
  perform test_verifier(not gere_societe(s_c), 'upsert : la demande reste en attente, aucun droit acquis');

  -- C2. Profil : upsert pour se nommer administrateur.
  perform test_doit_echouer(
    format('insert into public.profils (id, nom, role) values (%L, ''[TEST] x'', ''admin'') '
           'on conflict (id) do update set role = excluded.role, de_confiance = true', u_simple),
    'upsert : un utilisateur ne peut pas se nommer administrateur (on conflict do update sur profils)');
  perform test_verifier(role_courant() = 'gestionnaire', 'upsert : le rôle est inchangé');

  -- C3. Appels directs des fonctions security definer : rien sur autrui.
  perform test_verifier(not gere_societe(s_a) and not gere_evenement(e_pub) and not est_moderateur(),
    'fonctions de rôles : n''informent que sur l''appelant (aucun droit sur la fiche d''un autre)');
  perform test_doit_echouer('select public.creer_profil()',
    'fonction de déclencheur creer_profil() : appel direct refusé');
  perform test_doit_echouer('select public.statut_evenement_gestionnaire()',
    'fonction de déclencheur statut_evenement_gestionnaire() : appel direct refusé');
  perform test_deconnecter();

  perform test_anonyme();
  perform test_doit_echouer('select public.role_courant()', 'anonyme : role_courant() refusé (RPC)');
  perform test_doit_echouer('select public.est_moderateur()', 'anonyme : est_moderateur() refusé (RPC)');
  perform test_doit_echouer('select public.est_admin()', 'anonyme : est_admin() refusé (RPC)');
  perform test_doit_echouer(format('select public.gere_societe(%L)', s_a), 'anonyme : gere_societe() refusé (RPC)');
  perform test_doit_echouer(format('select public.gere_evenement(%L)', e_pub), 'anonyme : gere_evenement() refusé (RPC)');
  perform test_deconnecter();

  -- C4. Gestionnaire accepté (non « de confiance ») sur l'organisation A.
  perform test_connecter(u_gest);

  perform test_doit_echouer(
    format('insert into public.societes (id, slug, sigle, statut) values (%L, ''test-sec-a'', ''[TEST] SECA'', ''publie'') '
           'on conflict (id) do update set mise_en_avant = true', s_a),
    'upsert : un gestionnaire ne met pas sa fiche en avant par on conflict do update (ajout réservé au modérateur)');

  insert into public.evenements (id, slug, titre, type, date_debut, date_fin, statut, cree_par)
    values (e_att, 'test-sec-ev-attente', '[TEST] Journées zkwqvx (upsert)', 'journees', aujourdhui() + 40, aujourdhui() + 40,
            'publie', u_gest)
    on conflict (id) do update set titre = excluded.titre, statut = excluded.statut;
  perform test_verifier(
    (select statut = 'en_attente' and titre = '[TEST] Journées zkwqvx (upsert)' from public.evenements where id = e_att),
    'upsert evenements : excluded.statut est déjà forcé par le déclencheur, l''événement reste en_attente');
  insert into public.evenements (id, slug, titre, type, date_debut, date_fin, cree_par)
    values (e_att, 'test-sec-ev-attente', '[TEST] x', 'journees', aujourdhui() + 40, aujourdhui() + 40, u_gest)
    on conflict (id) do update set statut = 'publie';
  perform test_verifier((select statut from public.evenements where id = e_att) = 'en_attente',
    'upsert evenements : « do update set statut = ''publie'' » littéral ne publie pas');
  perform test_doit_echouer(
    format('insert into public.evenements (id, slug, titre, type, date_debut, date_fin, cree_par) '
           'values (%L, ''x'', ''x'', ''congres'', ''2030-01-01'', ''2030-01-01'', %L) '
           'on conflict (id) do update set cree_par = null, slug = ''test-sec-vole''', e_pub, u_gest),
    'upsert evenements : slug et cree_par restent figés');

  -- Rattachements et échéances déplacés vers l'événement d'un autre.
  insert into public.evenements (slug, titre, type, date_debut, date_fin, cree_par)
    values ('test-sec-ev-nouveau', '[TEST] Nouveau', 'colloque', aujourdhui() + 90, aujourdhui() + 90, u_gest)
    returning id into e_nouv;
  insert into public.evenement_societes (evenement_id, societe_id) values (e_nouv, s_a);
  perform test_doit_echouer(
    format('update public.evenement_societes set evenement_id = %L where evenement_id = %L', e_autre, e_nouv),
    'gestionnaire : ne déplace pas le rattachement de son événement vers l''événement d''un autre');
  perform test_doit_echouer(
    format('update public.echeances set evenement_id = %L where evenement_id = %L', e_autre, e_att),
    'gestionnaire : ne déplace pas une échéance vers l''événement d''une autre organisation');
  v_n := test_lignes_touchees(format('update public.echeances set libelle = ''[TEST] piraté'' where evenement_id = %L', e_autre));
  perform test_verifier(v_n = 0, 'gestionnaire : ne modifie pas l''échéance d''un événement d''une autre organisation (0 ligne)');
  perform test_doit_echouer(
    format('insert into public.evenement_disciplines (evenement_id, discipline_id) '
           'select %L, id from public.disciplines where slug = ''test-sec-d1''', e_autre),
    'gestionnaire : n''ajoute pas de discipline à l''événement d''une autre organisation');

  -- cree_par nul ou d'un autre
  perform test_doit_echouer(format('update public.evenements set cree_par = null where id = %L', e_att),
    'gestionnaire : ne vide pas cree_par de son événement');
  perform test_doit_echouer(
    'insert into public.evenements (slug, titre, type, date_debut, date_fin, cree_par) '
    'values (''test-sec-x'', ''[TEST] x'', ''congres'', ''2030-01-01'', ''2030-01-01'', null)',
    'gestionnaire : ne crée pas d''événement avec cree_par nul');

  -- rechercher() : le gestionnaire VOIT son événement en attente dans la table,
  -- mais la recherche ne le renvoie pas.
  perform test_verifier(exists (select 1 from public.evenements where id = e_att),
    'préalable : le gestionnaire voit son événement en attente dans la table');
  perform test_verifier(not exists (select 1 from public.rechercher('zkwqvx', 1000) where id = e_att),
    'rechercher() : un gestionnaire n''obtient pas son événement en attente');
  perform test_verifier((select count(*) from public.rechercher(null, 20)) = 0,
    'rechercher(null) : aucun résultat, sans erreur');
  perform test_verifier(
    (select count(*) from public.rechercher($q$'); delete from public.evenements; --$q$, 20)) >= 0
    and exists (select 1 from public.evenements where id = e_att),
    'rechercher() : une saisie hostile est traitée comme du texte (aucune injection)');

  -- Stockage : ni objet, ni bucket.
  perform test_doit_echouer($q$insert into storage.objects (bucket_id, name) values ('affiches', 'test-sec/x.svg')$q$,
    'stockage : un gestionnaire n''envoie rien directement');
  perform test_verifier(
    test_lignes_touchees($q$update storage.buckets set allowed_mime_types = array['image/svg+xml'], public = true$q$) = 0,
    'stockage : un connecté ne modifie pas les buckets (formats, visibilité) (0 ligne)');
  perform test_doit_echouer($q$insert into storage.buckets (id, name, public) values ('test-sec', 'test-sec', true)$q$,
    'stockage : un connecté ne crée pas de bucket');
  perform test_deconnecter();

  -- C5. Modérateur : bornes de ses droits.
  perform test_connecter(u_mod);
  perform test_doit_echouer(
    'insert into public.evenements (slug, titre, type, date_debut, date_fin, cree_par) '
    'values (''test-sec-y'', ''[TEST] y'', ''congres'', ''2030-01-01'', ''2030-01-01'', null)',
    'modérateur : ne crée pas non plus d''événement avec cree_par nul (politique d''ajout)');
  perform test_doit_echouer(
    $q$update public.demandes_contact set traitee = true, message = '[TEST] réécrit' where email = 'visiteur-sec@exemple.invalid'$q$,
    'modérateur : traitee + message dans la même requête : refusé en entier');
  perform test_verifier(
    test_lignes_touchees($q$update public.demandes_contact set traitee = true where email = 'visiteur-sec@exemple.invalid'$q$) = 1,
    'modérateur : traitee seule reste modifiable');
  perform test_deconnecter();
end
$$;

-- =============================================================================
-- D. Déclencheurs : contournements
-- =============================================================================
do $$
declare
  u_gest uuid := (select id from auth.users where email = 'sec-gestionnaire@exemple.invalid');
  u_conf uuid := (select id from auth.users where email = 'sec-confiance@exemple.invalid');
  s_a   uuid := (select id from public.societes where slug = 'test-sec-a');
  e_att uuid := (select id from public.evenements where slug = 'test-sec-ev-attente');
  v_msg text;
  v_n bigint;
begin
  -- D1. Rôle du JWT d'une autre casse, sous le rôle authenticated (faille
  -- corrigée : avant la relecture, les trois déclencheurs se désactivaient).
  perform set_config('request.jwt.claims',
    json_build_object('sub', u_gest, 'role', 'Authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  perform test_verifier(auth.uid() = u_gest and auth.role() = 'Authenticated' and current_user = 'authenticated',
    'préalable : rôle authenticated, JWT au rôle « Authenticated »');
  perform test_doit_echouer(format('update public.societes set statut = ''publie'', mise_en_avant = true where id = %L', s_a),
    'JWT « Authenticated » : proteger_societe s''applique quand même');
  perform test_doit_echouer(format('update public.evenements set cree_par = null where id = %L', e_att),
    'JWT « Authenticated » : statut_evenement_gestionnaire s''applique quand même');
  perform test_doit_echouer(format('update public.profils set role = ''admin'' where id = %L', u_gest),
    'JWT « Authenticated » : proteger_profil s''applique quand même');

  -- D2. JWT sans rôle, sous le rôle authenticated.
  perform set_config('request.jwt.claims', json_build_object('sub', u_gest)::text, true);
  perform test_verifier(auth.role() is null and auth.uid() = u_gest, 'préalable : JWT sans rôle');
  perform test_doit_echouer(format('update public.profils set de_confiance = true where id = %L', u_gest),
    'JWT sans rôle : proteger_profil s''applique quand même');
  perform test_doit_echouer(format('update public.societes set slug = ''test-sec-vole'' where id = %L', s_a),
    'JWT sans rôle : proteger_societe s''applique quand même');
  update public.evenements set titre = '[TEST] Retouche sans rôle', statut = 'publie' where id = e_att;
  perform test_verifier((select statut from public.evenements where id = e_att) = 'en_attente',
    'JWT sans rôle : statut_evenement_gestionnaire impose toujours le statut (« publie » envoyé, reste en_attente)');

  -- D3. Rôle authenticated SANS aucun JWT : RLS seule, aucune écriture.
  perform set_config('request.jwt.claims', '', true);
  perform test_verifier(auth.uid() is null and auth.role() is null and current_user = 'authenticated',
    'préalable : rôle authenticated sans JWT');
  perform test_verifier(
    test_lignes_touchees(format('update public.societes set description = ''[TEST] x'' where id = %L', s_a)) = 0
    and test_lignes_touchees(format('update public.profils set role = ''admin'' where id = %L', u_gest)) = 0,
    'sans JWT : aucune modification (RLS)');
  perform test_doit_echouer(
    'insert into public.evenements (slug, titre, type, date_debut, date_fin, cree_par) '
    'values (''test-sec-z'', ''[TEST] z'', ''congres'', ''2030-01-01'', ''2030-01-01'', null)',
    'sans JWT : aucune insertion d''événement (RLS)');
  perform test_deconnecter();

  -- D4. Valeurs nulles, modifications sans changement, casse des valeurs.
  perform test_connecter(u_gest);
  perform test_doit_echouer(format('update public.societes set categorie = null where id = %L', s_a),
    'proteger_societe : categorie à NULL refusée (is distinct from)');
  perform test_doit_echouer(format('update public.evenements set source_ref = '''' where id = %L', e_att),
    'statut_evenement_gestionnaire : source_ref de NULL à chaîne vide refusée');
  perform test_doit_echouer(format('update public.evenements set slug = upper(slug) where id = %L', e_att),
    'statut_evenement_gestionnaire : changement de casse du slug refusé');
  perform test_doit_echouer(format('update public.societes set statut = ''PUBLIE'' where id = %L', s_a),
    'statut en majuscules : valeur d''énumération invalide', '22P02');
  v_n := test_lignes_touchees(format(
    'update public.societes set statut = statut, slug = slug, mise_en_avant = mise_en_avant, '
    'categorie = categorie, description = ''[TEST] Réécrite'' where id = %L', s_a));
  perform test_verifier(v_n = 1,
    'proteger_societe : champs protégés réécrits à l''identique + description : accepté (pas de faux positif)');

  -- D5. Messages en français (code 42501).
  begin
    update public.societes set mise_en_avant = true where id = s_a;
    v_msg := null;
  exception when others then v_msg := sqlstate || ' ' || sqlerrm;
  end;
  perform test_verifier(v_msg like '42501 Modification refusée : seul un modérateur%',
    format('proteger_societe : message en français, code 42501 (%s)', v_msg));
  begin
    update public.evenements set slug = 'test-sec-autre' where id = e_att;
    v_msg := null;
  exception when others then v_msg := sqlstate || ' ' || sqlerrm;
  end;
  perform test_verifier(v_msg like '42501 Modification refusée : le slug%',
    format('statut_evenement_gestionnaire : message en français, code 42501 (%s)', v_msg));
  begin
    update public.profils set de_confiance = true where id = u_gest;
    v_msg := null;
  exception when others then v_msg := sqlstate || ' ' || sqlerrm;
  end;
  perform test_verifier(v_msg like '42501 Modification refusée : seul un administrateur%',
    format('proteger_profil : message en français, code 42501 (%s)', v_msg));
  perform test_deconnecter();

  -- D6. Un gestionnaire « de confiance » ne modifie pas non plus les champs protégés.
  perform test_connecter(u_conf);
  perform test_doit_echouer(format('update public.societes set mise_en_avant = true where id = %L', s_a),
    'gestionnaire de confiance : ne met pas sa fiche en avant');
  perform test_doit_echouer(format('update public.profils set role = ''moderateur'' where id = %L', u_conf),
    'gestionnaire de confiance : ne se nomme pas modérateur');
  perform test_deconnecter();

  -- D7. Client de service et postgres : non contraints (même par la contrainte
  -- de rôle ajoutée).
  perform test_service();
  update public.evenements set slug = 'test-sec-ev-attente-service' where id = e_att;
  perform test_deconnecter();
  update public.evenements set slug = 'test-sec-ev-attente' where id = e_att;
  perform test_verifier((select slug from public.evenements where id = e_att) = 'test-sec-ev-attente',
    'service puis postgres : changent un slug d''événement (déclencheur non appliqué)');
end
$$;

-- =============================================================================
-- E. Liens externes : https:// uniquement, même par l'API (faille corrigée)
-- =============================================================================
do $$
declare
  u_gest uuid := (select id from auth.users where email = 'sec-gestionnaire@exemple.invalid');
  u_admin uuid := (select id from auth.users where email = 'sec-admin@exemple.invalid');
  s_a   uuid := (select id from public.societes where slug = 'test-sec-a');
  e_att uuid := (select id from public.evenements where slug = 'test-sec-ev-attente');
begin
  perform test_connecter(u_gest);
  perform test_doit_echouer(format('update public.societes set site_web = ''javascript:alert(document.cookie)'' where id = %L', s_a),
    'gestionnaire : site_web « javascript: » refusé', '23514');
  perform test_doit_echouer(format('update public.societes set site_congres = ''http://exemple.invalid'' where id = %L', s_a),
    'gestionnaire : site_congres en http:// refusé', '23514');
  perform test_doit_echouer(format('update public.societes set site_web = ''https://exemple.invalid/a b'' where id = %L', s_a),
    'gestionnaire : lien contenant un espace refusé', '23514');
  perform test_doit_echouer(format('update public.societes set reseaux = ''["javascript:alert(1)"]'' where id = %L', s_a),
    'gestionnaire : reseaux doit être un objet JSON', '23514');
  perform test_doit_echouer(format('update public.evenements set lien_inscription = ''javascript:alert(1)'' where id = %L', e_att),
    'gestionnaire : lien_inscription « javascript: » refusé', '23514');
  perform test_doit_echouer(format('update public.evenements set site_web = ''data:text/html,x'' where id = %L', e_att),
    'gestionnaire : site_web « data: » refusé', '23514');
  perform test_verifier(
    test_lignes_touchees(format('update public.societes set site_web = ''https://exemple.invalid/fiche'', '
                                'site_congres = ''HTTPS://congres.exemple.invalid'', '
                                'reseaux = ''{"facebook": "https://exemple.invalid/f"}'' where id = %L', s_a)) = 1
    and test_lignes_touchees(format('update public.evenements set lien_inscription = ''https://exemple.invalid/i'' where id = %L', e_att)) = 1,
    'gestionnaire : liens https:// acceptés (casse du schéma indifférente)');
  perform test_deconnecter();

  perform test_connecter(u_admin);
  perform test_doit_echouer(
    $q$insert into public.emplacements_pub (type, titre, annonceur, lien, date_debut, date_fin) values ('lettre', '[TEST] x', '[TEST] x', 'http://exemple.invalid', '2030-01-01', '2030-01-02')$q$,
    'administrateur : lien d''emplacement en http:// refusé', '23514');
  perform test_deconnecter();

  perform test_service();
  perform test_doit_echouer(
    $q$insert into public.societes (slug, sigle, site_web) values ('test-sec-service', '[TEST] SRV', 'ftp://exemple.invalid')$q$,
    'service : la contrainte s''applique aussi au client de service (formulaires publics)', '23514');
  perform test_deconnecter();
end
$$;

-- =============================================================================
-- F. creer_profil : métadonnées d'inscription absentes ou malformées
-- =============================================================================
do $$
declare
  v_meta jsonb;
  v_id uuid;
  i int := 0;
begin
  perform set_config('role', 'supabase_auth_admin', true);
  foreach v_meta in array array[null, '{}', '[1, 2]', '"texte"', '{"nom": null}', '{"nom": 123}',
                                '{"nom": {"role": "admin"}}']::jsonb[]
  loop
    i := i + 1;
    insert into auth.users (email, aud, role, raw_user_meta_data)
      values (format('sec-meta-%s@exemple.invalid', i), 'authenticated', 'authenticated', v_meta)
      returning id into v_id;
  end loop;
  perform set_config('role', 'none', true);

  perform test_verifier(
    (select count(*) from auth.users u join public.profils p on p.id = u.id
      where u.email like 'sec-meta-%@exemple.invalid'
        and p.role = 'gestionnaire' and not p.de_confiance) = 7,
    'creer_profil : 7 inscriptions aux métadonnées absentes ou malformées, 7 profils « gestionnaire » créés sans erreur');
  perform test_verifier(
    (select bool_and(p.nom is null) from auth.users u join public.profils p on p.id = u.id
      where u.email in ('sec-meta-1@exemple.invalid', 'sec-meta-2@exemple.invalid', 'sec-meta-3@exemple.invalid',
                        'sec-meta-4@exemple.invalid', 'sec-meta-5@exemple.invalid')),
    'creer_profil : nom nul quand les métadonnées sont absentes, vides, un tableau, un texte ou un nom nul');
end
$$;

-- =============================================================================
-- G. Tables internes pour chaque profil ; demande de gestion en attente
-- =============================================================================
do $$
declare
  v_profil text;
  v_uid uuid;
  u_attente uuid := (select id from auth.users where email = 'sec-attente@exemple.invalid');
  s_a uuid := (select id from public.societes where slug = 'test-sec-a');
  s_b uuid := (select id from public.societes where slug = 'test-sec-b');
  e_pub uuid := (select id from public.evenements where slug = 'test-sec-ev-publie');
  e_att uuid := (select id from public.evenements where slug = 'test-sec-ev-attente');
  e_perso uuid;
begin
  foreach v_profil in array array['anonyme', 'sec-simple', 'sec-gestionnaire', 'sec-attente', 'sec-confiance',
                                   'sec-moderateur', 'sec-admin']
  loop
    if v_profil = 'anonyme' then
      perform test_anonyme();
    else
      v_uid := (select id from auth.users where email = v_profil || '@exemple.invalid');
      perform test_connecter(v_uid);
    end if;

    perform test_verifier((select count(*) from public.tentatives_formulaires) = 0,
      format('%s : ne lit pas tentatives_formulaires', v_profil));
    perform test_verifier(not exists (select 1 from public.societes where id = s_b),
      format('%s : ne voit pas l''organisation en attente qu''il ne gère pas', v_profil))
      where v_profil not in ('sec-moderateur', 'sec-admin');
    perform test_verifier(exists (select 1 from public.societes where id = s_b),
      format('%s : voit l''organisation en attente (modération)', v_profil))
      where v_profil in ('sec-moderateur', 'sec-admin');
    perform test_verifier(
      (select count(*) from public.demandes_contact) = 0
      and (select count(*) from public.clics_sortants) = 0
      and (select count(*) from public.journal_moderation) = 0,
      format('%s : ne lit ni demandes de contact, ni clics, ni journal', v_profil))
      where v_profil not in ('sec-moderateur', 'sec-admin');
    perform test_verifier(
      (select count(*) from public.demandes_contact) > 0
      and (select count(*) from public.clics_sortants) > 0
      and (select count(*) from public.journal_moderation) > 0,
      format('%s : lit demandes de contact, clics et journal', v_profil))
      where v_profil in ('sec-moderateur', 'sec-admin');
    -- L'organisatrice non publiée d'un événement publié : invisible hors
    -- modération (la requête publique doit le supporter, voir requetes/evenements.ts).
    perform test_verifier(
      (select count(*) from public.evenement_societes es
         join public.societes s on s.id = es.societe_id
        where es.evenement_id = e_pub) = 1,
      format('%s : parmi les organisatrices de l''événement publié, ne voit que l''organisation publiée', v_profil))
      where v_profil not in ('sec-moderateur', 'sec-admin');

    perform test_deconnecter();
  end loop;

  -- Demande de gestion seulement en attente : aucun droit d'écriture sur A.
  perform test_connecter(u_attente);
  insert into public.evenements (slug, titre, type, date_debut, date_fin, cree_par)
    values ('test-sec-ev-attente-perso', '[TEST] Événement du demandeur', 'atelier', aujourdhui() + 70, aujourdhui() + 70, u_attente)
    returning id into e_perso;
  perform test_doit_echouer(
    format('insert into public.evenement_societes (evenement_id, societe_id) values (%L, %L)', e_perso, s_a),
    'demande en attente : ne rattache pas son événement à l''organisation demandée');
  perform test_doit_echouer(
    format('insert into public.societe_disciplines (societe_id, discipline_id) '
           'select %L, id from public.disciplines where slug = ''test-sec-d1''', s_a),
    'demande en attente : ne rattache pas de discipline à l''organisation demandée');
  perform test_doit_echouer(
    format('insert into public.echeances (evenement_id, type, date_limite) values (%L, ''autre'', ''2030-01-01'')', e_pub),
    'demande en attente : n''ajoute pas d''échéance aux événements de l''organisation demandée');
  perform test_verifier(
    test_lignes_touchees(format('update public.evenements set titre = ''[TEST] x'' where id = %L', e_pub)) = 0
    and not exists (select 1 from public.evenements where id = e_att),
    'demande en attente : ne modifie pas les événements de l''organisation, ne voit pas ceux en attente');
  perform test_deconnecter();
end
$$;

rollback;
