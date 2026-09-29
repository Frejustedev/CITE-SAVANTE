-- =============================================================================
-- Test 20 — Déclencheurs : création de profil, updated_at, protections
-- =============================================================================
-- Prouve les déclencheurs de la section 5.4 et la décision 4 de PROGRESS.md :
--   A. creer_profil : profil créé à l'inscription, par GoTrue (rôle
--      supabase_auth_admin, sans droit sur public.profils) ;
--   B. maj_updated_at ;
--   C. proteger_societe : un gestionnaire modifie la description de SA fiche,
--      jamais statut, mise_en_avant, slug ni categorie ; rien sur une autre ;
--   D. statut_evenement_gestionnaire : statut imposé à la création (en_attente,
--      ou publie si « de confiance »), source/slug/source_ref/cree_par figés,
--      un événement publié modifié reste publié, un événement refusé retouché
--      repasse en attente même pour un profil « de confiance » (une SECONDE
--      retouche par ce profil le publie : limite assumée, voir la migration
--      4) ; le modérateur publie ;
--   E. proteger_profil : seul un administrateur change role et de_confiance ;
--   F. le client de service et postgres (auth.role() nul) ne sont pas
--      contraints (vérifié dans chaque bloc) ;
--   G. colonnes figées pour un connecté non modérateur : soumis_par_nom,
--      soumis_par_email et logo_path (societes), soumis_par_nom,
--      soumis_par_email et affiche_path (evenements) ; soumis_par_* et
--      affiche_path forcés à NULL à la création d'un événement (conservés pour
--      le modérateur, le client de service et postgres).
-- Données fictives, préfixe [TEST], annulées à la fin (rollback).
-- =============================================================================
begin;

-- ── Données de test ──────────────────────────────────────────────────────────
do $$
declare
  u_gest   uuid := test_creer_utilisateur('dec-gestionnaire@exemple.invalid', '[TEST] Gestionnaire ordinaire');
  u_conf   uuid := test_creer_utilisateur('dec-confiance@exemple.invalid', '[TEST] Gestionnaire de confiance');
  u_simple uuid := test_creer_utilisateur('dec-simple@exemple.invalid', '[TEST] Simple');
  u_mod    uuid := test_creer_utilisateur('dec-moderateur@exemple.invalid', '[TEST] Modérateur');
  u_admin  uuid := test_creer_utilisateur('dec-admin@exemple.invalid', '[TEST] Administrateur');
  s_a uuid; s_b uuid; s_c uuid;
begin
  update public.profils set de_confiance = true where id = u_conf;
  update public.profils set role = 'moderateur' where id = u_mod;
  update public.profils set role = 'admin' where id = u_admin;

  -- A : gérée par u_gest et u_conf, avec logo et coordonnées de l'auteur
  -- (bloc G : colonnes figées) ; B : gérée par u_gest, sans logo ni auteur ;
  -- C : gérée par personne.
  insert into public.societes (slug, sigle, nom_complet, categorie, statut, description,
                               logo_path, soumis_par_nom, soumis_par_email)
    values ('test-dec-a', '[TEST] DECA', '[TEST] Société fictive A', 'societe_savante', 'publie', '[TEST] Description d''origine',
            'test-dec-a/1700000000.webp', '[TEST] Auteur de la fiche A', 'auteur-fiche-a@exemple.invalid')
    returning id into s_a;
  insert into public.societes (slug, sigle, statut, description)
    values ('test-dec-b', '[TEST] DECB', 'publie', '[TEST] Description de B')
    returning id into s_b;
  insert into public.societes (slug, sigle, statut, description)
    values ('test-dec-c', '[TEST] DECC', 'publie', '[TEST] Description de C')
    returning id into s_c;
  insert into public.gestionnaires (user_id, societe_id, statut) values
    (u_gest, s_a, 'acceptee'), (u_conf, s_a, 'acceptee'), (u_gest, s_b, 'acceptee');

  -- Événements de l'organisation A, créés par u_gest ou u_conf, dans chaque statut.
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, cree_par) values
    ('test-dec-publie',   '[TEST] Congrès publié',   'congres',  aujourdhui() + 30, aujourdhui() + 31, 'publie',     u_gest),
    ('test-dec-attente',  '[TEST] Journées en attente', 'journees', aujourdhui() + 40, aujourdhui() + 40, 'en_attente', u_gest),
    ('test-dec-attente-2','[TEST] Journées en attente 2', 'journees', aujourdhui() + 41, aujourdhui() + 41, 'en_attente', u_conf),
    ('test-dec-refuse',   '[TEST] Atelier refusé',   'atelier',  aujourdhui() + 50, aujourdhui() + 50, 'refuse',     u_gest),
    ('test-dec-refuse-2', '[TEST] Atelier refusé 2', 'atelier',  aujourdhui() + 51, aujourdhui() + 51, 'refuse',     u_conf),
    ('test-dec-refuse-3', '[TEST] Atelier refusé 3', 'atelier',  aujourdhui() + 52, aujourdhui() + 52, 'refuse',     u_conf),
    ('test-dec-refuse-4', '[TEST] Atelier refusé 4', 'atelier',  aujourdhui() + 53, aujourdhui() + 53, 'refuse',     u_conf),
    ('test-dec-refuse-5', '[TEST] Atelier refusé 5', 'atelier',  aujourdhui() + 54, aujourdhui() + 54, 'refuse',     u_conf),
    ('test-dec-brouillon','[TEST] Séminaire brouillon', 'seminaire', aujourdhui() + 55, aujourdhui() + 55, 'brouillon', u_gest),
    ('test-dec-brouillon-2','[TEST] Séminaire brouillon 2', 'seminaire', aujourdhui() + 56, aujourdhui() + 56, 'brouillon', u_conf),
    ('test-dec-archive',  '[TEST] Colloque archivé', 'colloque', aujourdhui() - 90, aujourdhui() - 89, 'archive',    u_gest);
  -- Bloc G : un événement avec affiche et coordonnées de l'auteur, un sans.
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, cree_par,
                                 affiche_path, soumis_par_nom, soumis_par_email) values
    ('test-dec-figee', '[TEST] Colloque avec affiche', 'colloque', aujourdhui() + 60, aujourdhui() + 61, 'en_attente', u_gest,
     'test-dec-figee/1700000000.webp', '[TEST] Auteur de l''événement', 'auteur-ev@exemple.invalid'),
    ('test-dec-figee-vide', '[TEST] Colloque sans affiche', 'colloque', aujourdhui() + 62, aujourdhui() + 62, 'en_attente', u_gest,
     null, null, null);
  insert into public.evenement_societes (evenement_id, societe_id)
    select e.id, s_a from public.evenements e where e.slug like 'test-dec-%';
end
$$;

-- ── A. Création du profil à l'inscription ────────────────────────────────────
do $$
declare
  v_id uuid;
  v_id2 uuid;
begin
  -- GoTrue écrit dans auth.users sous le rôle supabase_auth_admin, qui n'a aucun
  -- droit sur public.profils : seul creer_profil (security definer) peut créer
  -- la ligne.
  perform test_verifier(
    not has_table_privilege('supabase_auth_admin', 'public.profils', 'insert')
    and not has_table_privilege('supabase_auth_admin', 'public.profils', 'select'),
    'préalable : supabase_auth_admin n''a aucun droit sur public.profils');
  perform set_config('role', 'supabase_auth_admin', true);
  insert into auth.users (email, aud, role, raw_user_meta_data)
    values ('dec-inscription@exemple.invalid', 'authenticated', 'authenticated', '{"nom": "[TEST] Nouvel inscrit"}')
    returning id into v_id;
  -- Métadonnées fournies par l'utilisateur à l'inscription : seul « nom » est lu.
  insert into auth.users (email, aud, role, raw_user_meta_data)
    values ('dec-intrus@exemple.invalid', 'authenticated', 'authenticated',
            '{"nom": "[TEST] Intrus", "role": "admin", "de_confiance": true}')
    returning id into v_id2;
  perform set_config('role', 'none', true);

  perform test_verifier(
    (select nom = '[TEST] Nouvel inscrit' and role = 'gestionnaire' and not de_confiance
       from public.profils where id = v_id),
    'creer_profil : profil créé à l''inscription (nom repris, rôle gestionnaire, pas de confiance)');
  perform test_verifier(
    (select role = 'gestionnaire' and not de_confiance from public.profils where id = v_id2),
    'creer_profil : un rôle glissé dans les métadonnées d''inscription est ignoré');
end
$$;

-- ── B. updated_at ────────────────────────────────────────────────────────────
do $$
begin
  update public.societes set updated_at = '2020-01-01' where slug = 'test-dec-c';
  update public.evenements set updated_at = '2020-01-01' where slug = 'test-dec-brouillon';
  -- Le déclencheur a remis now() même quand on force une valeur.
  perform test_verifier((select updated_at from public.societes where slug = 'test-dec-c') = now(),
    'maj_updated_at : societes.updated_at remis à now() à chaque modification');
  perform test_verifier((select updated_at from public.evenements where slug = 'test-dec-brouillon') = now(),
    'maj_updated_at : evenements.updated_at remis à now() à chaque modification');
end
$$;

-- ── C. Protection des organisations ──────────────────────────────────────────
do $$
declare
  u_gest uuid := (select id from auth.users where email = 'dec-gestionnaire@exemple.invalid');
  u_mod  uuid := (select id from auth.users where email = 'dec-moderateur@exemple.invalid');
  s_a uuid := (select id from public.societes where slug = 'test-dec-a');
  s_c uuid := (select id from public.societes where slug = 'test-dec-c');
  v_n bigint;
begin
  perform test_connecter(u_gest);

  v_n := test_lignes_touchees(format('update public.societes set description = ''[TEST] Description revue par le bureau'', ville = ''Porto-Novo'' where id = %L', s_a));
  perform test_verifier(v_n = 1, 'gestionnaire : modifie la description de SA société');

  perform test_doit_echouer(format('update public.societes set statut = ''archive'' where id = %L', s_a),
    'gestionnaire : ne peut pas changer le statut de sa société');
  perform test_doit_echouer(format('update public.societes set mise_en_avant = true where id = %L', s_a),
    'gestionnaire : ne peut pas mettre sa société en avant');
  perform test_doit_echouer(format('update public.societes set slug = ''test-dec-a-bis'' where id = %L', s_a),
    'gestionnaire : ne peut pas changer le slug de sa société');
  perform test_doit_echouer(format('update public.societes set categorie = ''autre'' where id = %L', s_a),
    'gestionnaire : ne peut pas changer la catégorie de sa société');
  perform test_doit_echouer(format('update public.societes set description = ''[TEST] x'', statut = ''publie'', mise_en_avant = true where id = %L', s_a),
    'gestionnaire : une modification mêlant description et champ protégé est refusée en entier');

  v_n := test_lignes_touchees(format('update public.societes set description = ''[TEST] Piratée'' where id = %L', s_c));
  perform test_verifier(v_n = 0, 'gestionnaire : ne modifie rien sur une autre société (0 ligne)');
  v_n := test_lignes_touchees(format('update public.societes set statut = ''archive'' where id = %L', s_c));
  perform test_verifier(v_n = 0, 'gestionnaire : ne change pas le statut d''une autre société (0 ligne)');
  v_n := test_lignes_touchees(format('delete from public.societes where id = %L', s_a));
  perform test_verifier(v_n = 0, 'gestionnaire : ne peut pas supprimer SA société (modérateur seulement, 0 ligne)');

  perform test_deconnecter();

  perform test_verifier(
    (select description = '[TEST] Description revue par le bureau' and ville = 'Porto-Novo'
        and statut = 'publie' and not mise_en_avant and slug = 'test-dec-a' and categorie = 'societe_savante'
       from public.societes where id = s_a)
    and (select description = '[TEST] Description de C' and statut = 'publie' from public.societes where id = s_c),
    'gestionnaire : seule la description (et la ville) de sa société ont changé');

  -- Le modérateur, lui, peut tout changer.
  perform test_connecter(u_mod);
  v_n := test_lignes_touchees(format('update public.societes set mise_en_avant = true, categorie = ''institution_academique'' where id = %L', s_a));
  perform test_verifier(v_n = 1, 'modérateur : met une société en avant et change sa catégorie');
  v_n := test_lignes_touchees(format('update public.societes set statut = ''archive'' where id = %L', s_c));
  perform test_verifier(v_n = 1, 'modérateur : archive une société');
  perform test_deconnecter();

  -- Client de service (server actions) et postgres : non contraints.
  perform test_service();
  v_n := test_lignes_touchees(format('update public.societes set statut = ''publie'' where id = %L', s_c));
  perform test_verifier(v_n = 1, 'service : change le statut d''une société (déclencheur non appliqué)');
  perform test_deconnecter();
  update public.societes set slug = 'test-dec-c-renomme' where id = s_c;
  perform test_verifier((select slug from public.societes where id = s_c) = 'test-dec-c-renomme',
    'postgres (auth.role() nul) : change un slug (déclencheur non appliqué)');
end
$$;

-- ── D. Statut des événements saisis par un gestionnaire ──────────────────────
do $$
declare
  u_gest uuid := (select id from auth.users where email = 'dec-gestionnaire@exemple.invalid');
  u_conf uuid := (select id from auth.users where email = 'dec-confiance@exemple.invalid');
  u_mod  uuid := (select id from auth.users where email = 'dec-moderateur@exemple.invalid');
  e_publie    uuid := (select id from public.evenements where slug = 'test-dec-publie');
  e_attente   uuid := (select id from public.evenements where slug = 'test-dec-attente');
  e_refuse    uuid := (select id from public.evenements where slug = 'test-dec-refuse');
  e_refuse2   uuid := (select id from public.evenements where slug = 'test-dec-refuse-2');
  e_refuse3   uuid := (select id from public.evenements where slug = 'test-dec-refuse-3');
  e_refuse4   uuid := (select id from public.evenements where slug = 'test-dec-refuse-4');
  e_refuse5   uuid := (select id from public.evenements where slug = 'test-dec-refuse-5');
  e_attente2  uuid := (select id from public.evenements where slug = 'test-dec-attente-2');
  e_brouillon uuid := (select id from public.evenements where slug = 'test-dec-brouillon');
  e_brouillon2 uuid := (select id from public.evenements where slug = 'test-dec-brouillon-2');
  e_archive   uuid := (select id from public.evenements where slug = 'test-dec-archive');
  v_n bigint;
  v_statut_1 public.statut_publication;
  v_statut_2 public.statut_publication;
begin
  -- Création par un gestionnaire ordinaire : en_attente, quoi qu'il envoie.
  perform test_connecter(u_gest);
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, source, source_ref, cree_par)
    values ('test-dec-nouveau', '[TEST] Nouveau congrès', 'congres', aujourdhui() + 100, aujourdhui() + 101,
            'publie', 'synchro', 'ref-externe', u_gest);
  perform test_deconnecter();
  perform test_verifier(
    (select statut = 'en_attente' and source = 'manuel' and source_ref is null
       from public.evenements where slug = 'test-dec-nouveau'),
    'gestionnaire ordinaire : l''événement créé est en_attente même s''il envoie « publie » (source manuel, source_ref nul)');

  -- Création par un gestionnaire de confiance : publie.
  perform test_connecter(u_conf);
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, cree_par)
    values ('test-dec-confiance', '[TEST] Journées de confiance', 'journees', aujourdhui() + 110, aujourdhui() + 110,
            'brouillon', u_conf);
  perform test_deconnecter();
  perform test_verifier((select statut from public.evenements where slug = 'test-dec-confiance') = 'publie',
    'gestionnaire de confiance : l''événement créé est publié directement');

  perform test_connecter(u_gest);

  -- Champs figés
  perform test_doit_echouer(format('update public.evenements set slug = ''test-dec-autre-slug'' where id = %L', e_attente),
    'gestionnaire : ne peut pas changer le slug d''un événement');
  perform test_doit_echouer(format('update public.evenements set source = ''synchro'' where id = %L', e_attente),
    'gestionnaire : ne peut pas changer la source d''un événement');
  perform test_doit_echouer(format('update public.evenements set source_ref = ''ref'' where id = %L', e_attente),
    'gestionnaire : ne peut pas changer la référence de source d''un événement');
  perform test_doit_echouer(format('update public.evenements set cree_par = %L where id = %L', u_conf, e_attente),
    'gestionnaire : ne peut pas changer l''auteur d''un événement');

  -- Statut à la modification
  v_n := test_lignes_touchees(format('update public.evenements set titre = ''[TEST] Congrès publié (programme mis à jour)'', statut = ''brouillon'' where id = %L', e_publie));
  perform test_verifier(v_n = 1, 'gestionnaire : modifie un événement publié de son organisation');
  v_n := test_lignes_touchees(format('update public.evenements set statut = ''publie'' where id = %L', e_attente));
  perform test_verifier(v_n = 1, 'gestionnaire : peut envoyer une modification sur un événement en attente');
  v_n := test_lignes_touchees(format('update public.evenements set titre = ''[TEST] Atelier corrigé'' where id = %L', e_refuse));
  perform test_verifier(v_n = 1, 'gestionnaire : peut corriger un événement refusé');
  v_n := test_lignes_touchees(format('update public.evenements set titre = ''[TEST] Séminaire complété'' where id = %L', e_brouillon));
  perform test_verifier(v_n = 1, 'gestionnaire : peut compléter un brouillon');
  v_n := test_lignes_touchees(format('update public.evenements set titre = ''[TEST] Colloque archivé retouché'', statut = ''publie'' where id = %L', e_archive));
  perform test_verifier(v_n = 1, 'gestionnaire : peut retoucher un événement archivé');
  v_n := test_lignes_touchees(format('delete from public.evenements where id = %L', e_attente));
  perform test_verifier(v_n = 0, 'gestionnaire : ne peut pas supprimer un événement (0 ligne)');

  perform test_deconnecter();

  -- Gestionnaire de confiance (correctif du coordinateur) : un événement REFUSÉ
  -- retouché repasse en attente — une retouche ne le republie pas d'elle-même.
  -- Brouillon et en attente : publiés. Limite assumée (migration 4) : une
  -- SECONDE retouche trouve l'événement en attente et le publie.
  perform test_connecter(u_conf);
  v_n := test_lignes_touchees(format('update public.evenements set titre = ''[TEST] Atelier refusé 2 corrigé'' where id = %L', e_refuse2));
  perform test_verifier(v_n = 1, 'gestionnaire de confiance : corrige un événement refusé');
  v_n := test_lignes_touchees(format('update public.evenements set titre = ''[TEST] Atelier refusé 4 corrigé'', statut = ''publie'' where id = %L', e_refuse4));
  perform test_verifier(v_n = 1, 'gestionnaire de confiance : corrige un événement refusé en envoyant « publie »');
  insert into public.evenements (id, slug, titre, type, date_debut, date_fin, statut, cree_par)
    values (e_refuse3, 'test-dec-refuse-3', '[TEST] Atelier refusé 3 (upsert)', 'atelier', aujourdhui() + 52, aujourdhui() + 52,
            'publie', u_conf)
    on conflict (id) do update set titre = excluded.titre, statut = excluded.statut;
  v_n := test_lignes_touchees(format('update public.evenements set titre = ''[TEST] Journées en attente 2 complétées'' where id = %L', e_attente2));
  perform test_verifier(v_n = 1, 'gestionnaire de confiance : complète un événement en attente');
  v_n := test_lignes_touchees(format('update public.evenements set titre = ''[TEST] Séminaire brouillon 2 complété'' where id = %L', e_brouillon2));
  perform test_verifier(v_n = 1, 'gestionnaire de confiance : complète un brouillon');
  -- Deux retouches successives d'un même événement refusé (statut lu entre
  -- les deux : le gestionnaire voit les événements de son organisation).
  update public.evenements set titre = '[TEST] Atelier refusé 5, retouche 1' where id = e_refuse5;
  v_statut_1 := (select statut from public.evenements where id = e_refuse5);
  update public.evenements set titre = '[TEST] Atelier refusé 5, retouche 2' where id = e_refuse5;
  v_statut_2 := (select statut from public.evenements where id = e_refuse5);
  perform test_deconnecter();

  perform test_verifier(
    (select statut = 'publie' and titre = '[TEST] Congrès publié (programme mis à jour)' from public.evenements where id = e_publie),
    'la modification d''un événement publié le laisse publié (contrôle a posteriori), même s''il envoie « brouillon »');
  perform test_verifier((select statut from public.evenements where id = e_attente) = 'en_attente',
    'un événement en attente reste en attente même si le gestionnaire ordinaire envoie « publie »');
  perform test_verifier((select statut from public.evenements where id = e_refuse) = 'en_attente',
    'un événement refusé corrigé par un gestionnaire ordinaire repasse en attente de modération');
  perform test_verifier((select statut from public.evenements where id = e_brouillon) = 'en_attente',
    'un brouillon complété par un gestionnaire ordinaire passe en attente de modération');
  perform test_verifier((select statut from public.evenements where id = e_refuse2) = 'en_attente',
    'un événement refusé corrigé par un gestionnaire de confiance repasse en attente (une retouche ne le republie pas)');
  perform test_verifier(
    (select statut = 'en_attente' and titre = '[TEST] Atelier refusé 4 corrigé' from public.evenements where id = e_refuse4),
    'un événement refusé corrigé par un gestionnaire de confiance qui envoie « publie » repasse en attente');
  perform test_verifier(
    (select statut = 'en_attente' and titre = '[TEST] Atelier refusé 3 (upsert)' from public.evenements where id = e_refuse3),
    'upsert (on conflict do update) d''un événement refusé par un gestionnaire de confiance : repasse en attente');
  perform test_verifier(v_statut_1 = 'en_attente',
    format('deux retouches d''un événement refusé par un gestionnaire de confiance : en attente après la 1re (%s)', v_statut_1));
  perform test_verifier(
    v_statut_2 = 'publie'
    and (select statut = 'publie' and titre = '[TEST] Atelier refusé 5, retouche 2' from public.evenements where id = e_refuse5),
    format('deux retouches d''un événement refusé par un gestionnaire de confiance : publié après la 2e, sans modérateur '
           '(limite assumée, documentée dans la migration 4) (%s)', v_statut_2));
  perform test_verifier((select statut from public.evenements where id = e_attente2) = 'publie',
    'un événement en attente complété par un gestionnaire de confiance est publié (règle inchangée)');
  perform test_verifier((select statut from public.evenements where id = e_brouillon2) = 'publie',
    'un brouillon complété par un gestionnaire de confiance est publié (règle inchangée)');
  perform test_verifier((select statut from public.evenements where id = e_archive) = 'archive',
    'un événement archivé reste archivé même si le gestionnaire envoie « publie »');
  perform test_verifier(
    (select slug = 'test-dec-attente' and source = 'manuel' and source_ref is null and cree_par = u_gest
       from public.evenements where id = e_attente),
    'slug, source, source_ref et cree_par inchangés');

  -- Le modérateur publie, refuse, et peut corriger le slug.
  perform test_connecter(u_mod);
  v_n := test_lignes_touchees(format('update public.evenements set statut = ''publie'' where id = %L', e_attente));
  perform test_verifier(v_n = 1 and (select statut from public.evenements where id = e_attente) = 'publie',
    'modérateur : publie un événement en attente');
  v_n := test_lignes_touchees(format('update public.evenements set statut = ''refuse'' where id = %L', e_refuse));
  perform test_verifier(v_n = 1 and (select statut from public.evenements where id = e_refuse) = 'refuse',
    'modérateur : refuse un événement');
  v_n := test_lignes_touchees(format('update public.evenements set slug = ''test-dec-brouillon-corrige'' where id = %L', e_brouillon));
  perform test_verifier(v_n = 1, 'modérateur : corrige le slug d''un événement non publié');
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, cree_par)
    values ('test-dec-par-moderateur', '[TEST] Webinaire du modérateur', 'webinaire', aujourdhui() + 5, aujourdhui() + 5, 'brouillon', u_mod);
  perform test_verifier((select statut from public.evenements where slug = 'test-dec-par-moderateur') = 'brouillon',
    'modérateur : crée un événement avec le statut de son choix');
  perform test_deconnecter();

  -- Client de service (synchronisation P1, formulaire public) : statut et source respectés.
  perform test_service();
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, source, source_ref)
    values ('test-dec-synchro', '[TEST] Événement synchronisé', 'congres', aujourdhui() + 120, aujourdhui() + 121,
            'publie', 'synchro', 'ics:test-1');
  insert into public.evenements (slug, titre, type, date_debut, date_fin, soumis_par_nom, soumis_par_email)
    values ('test-dec-formulaire', '[TEST] Événement du formulaire public', 'journees', aujourdhui() + 130, aujourdhui() + 130,
            '[TEST] Auteur', 'auteur@exemple.invalid');
  perform test_deconnecter();
  perform test_verifier(
    (select statut = 'publie' and source = 'synchro' and source_ref = 'ics:test-1'
       from public.evenements where slug = 'test-dec-synchro')
    and (select statut from public.evenements where slug = 'test-dec-formulaire') = 'en_attente',
    'service : statut et source fournis respectés (déclencheur non appliqué)');
end
$$;

-- ── E. Protection des profils ────────────────────────────────────────────────
do $$
declare
  u_simple uuid := (select id from auth.users where email = 'dec-simple@exemple.invalid');
  u_gest   uuid := (select id from auth.users where email = 'dec-gestionnaire@exemple.invalid');
  u_mod    uuid := (select id from auth.users where email = 'dec-moderateur@exemple.invalid');
  u_admin  uuid := (select id from auth.users where email = 'dec-admin@exemple.invalid');
  v_n bigint;
begin
  perform test_connecter(u_simple);
  perform test_doit_echouer(format('update public.profils set role = ''admin'' where id = %L', u_simple),
    'utilisateur : ne peut pas se donner le rôle admin');
  perform test_doit_echouer(format('update public.profils set role = ''moderateur'' where id = %L', u_simple),
    'utilisateur : ne peut pas se donner le rôle moderateur');
  perform test_doit_echouer(format('update public.profils set de_confiance = true where id = %L', u_simple),
    'utilisateur : ne peut pas se déclarer « de confiance »');
  v_n := test_lignes_touchees(format('update public.profils set nom = ''[TEST] Simple (renommé)'' where id = %L', u_simple));
  perform test_verifier(v_n = 1, 'utilisateur : modifie son nom');
  perform test_doit_echouer(format('update public.profils set id = %L where id = %L', gen_random_uuid(), u_simple),
    'utilisateur : ne peut pas changer l''identifiant de son profil');
  perform test_deconnecter();

  -- Un modérateur n'est pas administrateur.
  perform test_connecter(u_mod);
  perform test_doit_echouer(format('update public.profils set role = ''admin'' where id = %L', u_mod),
    'modérateur : ne peut pas se donner le rôle admin');
  perform test_doit_echouer(format('update public.profils set de_confiance = true where id = %L', u_mod),
    'modérateur : ne peut pas se déclarer « de confiance »');
  v_n := test_lignes_touchees(format('update public.profils set de_confiance = true where id = %L', u_gest));
  perform test_verifier(v_n = 0, 'modérateur : ne modifie pas le profil d''un autre (0 ligne)');
  perform test_deconnecter();

  perform test_verifier(
    (select role = 'gestionnaire' and not de_confiance and nom = '[TEST] Simple (renommé)' from public.profils where id = u_simple)
    and (select role = 'moderateur' and not de_confiance from public.profils where id = u_mod)
    and (select not de_confiance from public.profils where id = u_gest),
    'rôles et « de confiance » inchangés après les tentatives');

  -- L'administrateur décide.
  perform test_connecter(u_admin);
  v_n := test_lignes_touchees(format('update public.profils set role = ''moderateur'' where id = %L', u_simple));
  perform test_verifier(v_n = 1, 'administrateur : nomme un modérateur');
  v_n := test_lignes_touchees(format('update public.profils set de_confiance = true where id = %L', u_gest));
  perform test_verifier(v_n = 1, 'administrateur : déclare un gestionnaire « de confiance »');
  perform test_deconnecter();
  perform test_verifier(
    (select role from public.profils where id = u_simple) = 'moderateur'
    and (select de_confiance from public.profils where id = u_gest),
    'administrateur : changements de rôle et de confiance enregistrés');

  -- Requête documentée dans PROGRESS.md pour désigner le premier administrateur
  -- (éditeur SQL de Supabase : rôle postgres, sans JWT).
  update public.profils set role = 'admin'
   where id = (select id from auth.users where email = 'dec-gestionnaire@exemple.invalid');
  perform test_verifier((select role from public.profils where id = u_gest) = 'admin',
    'postgres : la requête de désignation du premier administrateur fonctionne');

  -- Client de service : non contraint.
  perform test_service();
  v_n := test_lignes_touchees(format('update public.profils set role = ''gestionnaire'' where id = %L', u_gest));
  perform test_verifier(v_n = 1, 'service : change un rôle (déclencheur non appliqué)');
  perform test_deconnecter();
end
$$;

-- ── G. Colonnes figées : coordonnées de l'auteur et chemins d'images ─────────
-- Correctif du coordinateur. soumis_par_nom / soumis_par_email reçoivent les
-- e-mails de décision (un gestionnaire pourrait les détourner) ; logo_path /
-- affiche_path ne doivent désigner que des fichiers envoyés par la server
-- action d'envoi, qui écrit avec le client de service après vérification des
-- droits (spécifications 5.7). Figées pour un utilisateur connecté non
-- modérateur ; à la création d'un événement par un tel utilisateur,
-- soumis_par_nom, soumis_par_email et affiche_path sont forcés à NULL
-- (affiche_path : reprise après vérification). Rappel : ni le
-- gestionnaire ni le modérateur ne LISENT soumis_par_* (privilèges de colonne,
-- 50_securite B) ; les valeurs sont donc vérifiées en postgres.
do $$
declare
  u_gest uuid := (select id from auth.users where email = 'dec-gestionnaire@exemple.invalid');
  u_conf uuid := (select id from auth.users where email = 'dec-confiance@exemple.invalid');
  u_mod  uuid := (select id from auth.users where email = 'dec-moderateur@exemple.invalid');
  s_a uuid := (select id from public.societes where slug = 'test-dec-a');
  s_b uuid := (select id from public.societes where slug = 'test-dec-b');
  e_figee uuid := (select id from public.evenements where slug = 'test-dec-figee');
  e_vide  uuid := (select id from public.evenements where slug = 'test-dec-figee-vide');
  v_n bigint;
  v_msg text;
begin
  -- G1. Gestionnaire ordinaire : refus (42501), organisations.
  perform test_connecter(u_gest);
  perform test_verifier(gere_societe(s_a) and gere_societe(s_b),
    'préalable : le gestionnaire gère les organisations A et B');
  perform test_doit_echouer(format('update public.societes set soumis_par_nom = ''[TEST] Détourné'' where id = %L', s_a),
    'gestionnaire : ne change pas le nom de l''auteur de sa fiche (soumis_par_nom)');
  perform test_doit_echouer(format('update public.societes set soumis_par_email = ''pirate@exemple.invalid'' where id = %L', s_a),
    'gestionnaire : ne change pas l''e-mail de l''auteur de sa fiche (détournement des e-mails de décision)');
  perform test_doit_echouer(format('update public.societes set soumis_par_email = null where id = %L', s_a),
    'gestionnaire : ne vide pas l''e-mail de l''auteur de sa fiche');
  perform test_doit_echouer(format('update public.societes set logo_path = ''test-dec-c/1700000000.webp'' where id = %L', s_a),
    'gestionnaire : ne fait pas pointer son logo vers le fichier d''une autre fiche (logo_path)');
  perform test_doit_echouer(format('update public.societes set logo_path = null where id = %L', s_a),
    'gestionnaire : ne vide pas logo_path directement');
  perform test_doit_echouer(format('update public.societes set logo_path = ''test-dec-b/1700000000.webp'' where id = %L', s_b),
    'gestionnaire : ne renseigne pas un logo_path vide directement (NULL vers une valeur)');
  perform test_doit_echouer(format('update public.societes set soumis_par_email = ''pirate@exemple.invalid'' where id = %L', s_b),
    'gestionnaire : ne renseigne pas un soumis_par_email vide (NULL vers une valeur)');
  perform test_doit_echouer(format('update public.societes set description = ''[TEST] x'', logo_path = ''autre.webp'' where id = %L', s_a),
    'gestionnaire : une modification mêlant description et logo_path est refusée en entier');

  -- G2. Gestionnaire ordinaire : refus (42501), événements.
  perform test_doit_echouer(format('update public.evenements set soumis_par_nom = ''[TEST] Détourné'' where id = %L', e_figee),
    'gestionnaire : ne change pas le nom de l''auteur d''un événement (soumis_par_nom)');
  perform test_doit_echouer(format('update public.evenements set soumis_par_email = ''pirate@exemple.invalid'' where id = %L', e_figee),
    'gestionnaire : ne change pas l''e-mail de l''auteur d''un événement');
  perform test_doit_echouer(format('update public.evenements set affiche_path = ''test-dec-autre/1700000000.webp'' where id = %L', e_figee),
    'gestionnaire : ne fait pas pointer l''affiche vers un autre fichier (affiche_path)');
  perform test_doit_echouer(format('update public.evenements set affiche_path = null where id = %L', e_figee),
    'gestionnaire : ne vide pas affiche_path directement');
  perform test_doit_echouer(format('update public.evenements set affiche_path = ''test-dec-figee-vide/1.webp'' where id = %L', e_vide),
    'gestionnaire : ne renseigne pas un affiche_path vide directement (NULL vers une valeur)');
  perform test_doit_echouer(format('update public.evenements set soumis_par_email = ''pirate@exemple.invalid'' where id = %L', e_vide),
    'gestionnaire : ne renseigne pas un soumis_par_email vide sur un événement (NULL vers une valeur)');

  -- G3. Pas de faux positif : colonnes réécrites à l'identique + autre champ.
  v_n := test_lignes_touchees(format(
    'update public.societes set logo_path = logo_path, description = ''[TEST] Description G'' where id = %L', s_a));
  perform test_verifier(v_n = 1, 'gestionnaire : logo_path réécrit à l''identique + description : accepté');
  v_n := test_lignes_touchees(format(
    'update public.evenements set affiche_path = affiche_path, titre = ''[TEST] Colloque avec affiche (retouché)'' where id = %L', e_figee));
  perform test_verifier(v_n = 1, 'gestionnaire : affiche_path réécrit à l''identique + titre : accepté');

  -- G4. Messages en français, code 42501.
  begin
    update public.societes set logo_path = 'x.webp' where id = s_a;
    v_msg := null;
  exception when others then v_msg := sqlstate || ' ' || sqlerrm;
  end;
  perform test_verifier(v_msg like '42501 Modification refusée : le logo et les coordonnées de l''auteur%',
    format('proteger_societe (colonnes figées) : message en français, code 42501 (%s)', v_msg));
  begin
    update public.evenements set affiche_path = 'x.webp' where id = e_figee;
    v_msg := null;
  exception when others then v_msg := sqlstate || ' ' || sqlerrm;
  end;
  perform test_verifier(v_msg like '42501 Modification refusée : l''affiche et les coordonnées de l''auteur%',
    format('statut_evenement_gestionnaire (colonnes figées) : message en français, code 42501 (%s)', v_msg));

  -- G5. Création d'un événement : soumis_par_* et affiche_path forcés à NULL
  -- (ici, l'affiche d'un autre événement).
  insert into public.evenements (slug, titre, type, date_debut, date_fin, cree_par, soumis_par_nom, soumis_par_email,
                                 affiche_path)
    values ('test-dec-g-cree-gest', '[TEST] Créé avec un auteur', 'atelier', aujourdhui() + 150, aujourdhui() + 150,
            u_gest, '[TEST] Faux auteur', 'faux-auteur@exemple.invalid', 'test-dec-figee/1700000000.webp');
  perform test_deconnecter();

  perform test_connecter(u_conf);
  -- G6. Gestionnaire « de confiance » : mêmes interdits.
  perform test_doit_echouer(format('update public.societes set soumis_par_email = ''pirate@exemple.invalid'' where id = %L', s_a),
    'gestionnaire de confiance : ne change pas l''e-mail de l''auteur de sa fiche');
  perform test_doit_echouer(format('update public.societes set logo_path = ''autre.webp'' where id = %L', s_a),
    'gestionnaire de confiance : ne change pas logo_path directement');
  perform test_doit_echouer(format('update public.evenements set affiche_path = ''autre.webp'' where id = %L', e_figee),
    'gestionnaire de confiance : ne change pas affiche_path directement');
  perform test_doit_echouer(format('update public.evenements set soumis_par_nom = ''[TEST] Détourné'' where id = %L', e_figee),
    'gestionnaire de confiance : ne change pas soumis_par_nom d''un événement');
  insert into public.evenements (slug, titre, type, date_debut, date_fin, cree_par, soumis_par_nom, soumis_par_email,
                                 affiche_path)
    values ('test-dec-g-cree-conf', '[TEST] Créé avec un auteur (confiance)', 'atelier', aujourdhui() + 151, aujourdhui() + 151,
            u_conf, '[TEST] Faux auteur', 'faux-auteur-conf@exemple.invalid', 'test-dec-figee/1700000000.webp');
  perform test_deconnecter();

  perform test_verifier(
    (select soumis_par_nom is null and soumis_par_email is null
       from public.evenements where slug = 'test-dec-g-cree-gest')
    and (select soumis_par_nom is null and soumis_par_email is null
       from public.evenements where slug = 'test-dec-g-cree-conf'),
    'création par un gestionnaire (ordinaire ou de confiance) : soumis_par_nom et soumis_par_email forcés à NULL');
  perform test_verifier(
    (select affiche_path is null from public.evenements where slug = 'test-dec-g-cree-gest'),
    'création par un gestionnaire : affiche_path forcé à NULL (pas l''affiche d''un autre événement)');
  perform test_verifier(
    (select affiche_path is null and statut = 'publie'
       from public.evenements where slug = 'test-dec-g-cree-conf'),
    'création par un gestionnaire de confiance : publié d''office, mais affiche_path forcé à NULL');
  perform test_verifier(
    (select logo_path = 'test-dec-a/1700000000.webp' and soumis_par_nom = '[TEST] Auteur de la fiche A'
        and soumis_par_email = 'auteur-fiche-a@exemple.invalid' and description = '[TEST] Description G'
       from public.societes where id = s_a)
    and (select logo_path is null and soumis_par_email is null from public.societes where id = s_b)
    and (select affiche_path = 'test-dec-figee/1700000000.webp' and soumis_par_nom = '[TEST] Auteur de l''événement'
        and soumis_par_email = 'auteur-ev@exemple.invalid' from public.evenements where id = e_figee)
    and (select affiche_path is null and soumis_par_email is null from public.evenements where id = e_vide),
    'colonnes figées inchangées après les tentatives des gestionnaires');

  -- G7. Modérateur : peut les changer (vérification en postgres : il ne lit
  -- pas soumis_par_*).
  perform test_connecter(u_mod);
  v_n := test_lignes_touchees(format(
    'update public.societes set logo_path = ''test-dec-a/1700000001.webp'', soumis_par_nom = ''[TEST] Auteur corrigé (mod)'', '
    'soumis_par_email = ''auteur-corrige-mod@exemple.invalid'' where id = %L', s_a));
  perform test_verifier(v_n = 1, 'modérateur : change logo_path et soumis_par_* d''une organisation');
  v_n := test_lignes_touchees(format(
    'update public.evenements set affiche_path = ''test-dec-figee/1700000001.webp'', soumis_par_nom = ''[TEST] Auteur corrigé (mod)'', '
    'soumis_par_email = ''auteur-ev-mod@exemple.invalid'' where id = %L', e_figee));
  perform test_verifier(v_n = 1, 'modérateur : change affiche_path et soumis_par_* d''un événement');
  insert into public.evenements (slug, titre, type, date_debut, date_fin, cree_par, soumis_par_nom, soumis_par_email,
                                 affiche_path)
    values ('test-dec-g-cree-mod', '[TEST] Créé par le modérateur', 'atelier', aujourdhui() + 152, aujourdhui() + 152,
            u_mod, '[TEST] Auteur saisi par le modérateur', 'auteur-mod@exemple.invalid', 'test-dec-g-cree-mod/1700000003.webp');
  perform test_deconnecter();
  perform test_verifier(
    (select logo_path = 'test-dec-a/1700000001.webp' and soumis_par_email = 'auteur-corrige-mod@exemple.invalid'
       from public.societes where id = s_a)
    and (select affiche_path = 'test-dec-figee/1700000001.webp' and soumis_par_email = 'auteur-ev-mod@exemple.invalid'
       from public.evenements where id = e_figee)
    and (select soumis_par_email = 'auteur-mod@exemple.invalid' from public.evenements where slug = 'test-dec-g-cree-mod'),
    'modérateur : changements enregistrés, soumis_par_* conservés à la création');
  perform test_verifier(
    (select affiche_path from public.evenements where slug = 'test-dec-g-cree-mod') = 'test-dec-g-cree-mod/1700000003.webp',
    'création par un modérateur : affiche_path conservé');

  -- G8. Client de service (server action d'envoi, formulaires publics) : non
  -- contraint, avec le JWT de la clé de service puis sous le seul rôle.
  perform test_service();
  v_n := test_lignes_touchees(format(
    'update public.societes set logo_path = ''test-dec-b/1700000002.webp'', soumis_par_email = ''auteur-b@exemple.invalid'' where id = %L', s_b));
  perform test_verifier(v_n = 1, 'service : renseigne logo_path et soumis_par_email d''une organisation (envoi du logo)');
  v_n := test_lignes_touchees(format(
    'update public.evenements set affiche_path = ''test-dec-figee-vide/1700000002.webp'' where id = %L', e_vide));
  perform test_verifier(v_n = 1, 'service : renseigne affiche_path d''un événement (envoi de l''affiche)');
  insert into public.evenements (slug, titre, type, date_debut, date_fin, affiche_path)
    values ('test-dec-g-cree-service', '[TEST] Créé par le client de service', 'atelier', aujourdhui() + 153, aujourdhui() + 153,
            'test-dec-g-cree-service/1700000004.webp');
  perform test_deconnecter();
  perform test_verifier(
    (select affiche_path from public.evenements where slug = 'test-dec-g-cree-service') = 'test-dec-g-cree-service/1700000004.webp',
    'création par le client de service : affiche_path conservé');
  perform set_config('role', 'service_role', true);
  perform test_verifier(auth.role() is null and current_user = 'service_role',
    'préalable : rôle service_role sans JWT');
  update public.evenements set soumis_par_nom = '[TEST] Auteur (service sans JWT)' where id = e_vide;
  perform test_deconnecter();
  perform test_verifier(
    (select logo_path = 'test-dec-b/1700000002.webp' and soumis_par_email = 'auteur-b@exemple.invalid'
       from public.societes where id = s_b)
    and (select affiche_path = 'test-dec-figee-vide/1700000002.webp' and soumis_par_nom = '[TEST] Auteur (service sans JWT)'
       from public.evenements where id = e_vide)
    and (select soumis_par_email = 'auteur@exemple.invalid' from public.evenements where slug = 'test-dec-formulaire'),
    'service : changements enregistrés ; soumis_par_* d''un formulaire public conservés à la création');

  -- G9. postgres (migrations, éditeur SQL) : non contraint.
  update public.societes set logo_path = null, soumis_par_nom = null where id = s_a;
  update public.evenements set affiche_path = null, soumis_par_email = null where id = e_figee;
  perform test_verifier(
    (select logo_path is null and soumis_par_nom is null from public.societes where id = s_a)
    and (select affiche_path is null and soumis_par_email is null from public.evenements where id = e_figee),
    'postgres : change logo_path, affiche_path et soumis_par_* (déclencheurs non appliqués)');
end
$$;

rollback;
