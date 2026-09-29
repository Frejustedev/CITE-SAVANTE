-- =============================================================================
-- Test 10 — Sécurité au niveau des lignes (RLS) et privilèges
-- =============================================================================
-- Prouve les politiques de la section 6 des spécifications, rôle par rôle :
--   A. visiteur anonyme : ne voit que le publié, ne lit aucune table interne,
--      n'écrit dans AUCUNE des 14 tables (insert, update, delete, truncate) ;
--   B. utilisateur connecté sans rôle particulier ; B bis. utilisateur connecté
--      sans ligne dans profils (ne peut pas se créer un profil administrateur) ;
--   C. rattachements d'un gestionnaire (organisateurs, disciplines, échéances) ;
--   D. modérateur ; E. administrateur ; F. client de service ; G. stockage ;
--   H. connexion par la recette documentée dans 00_stubs_supabase.sql (set local
--      role + request.jwt.claims) et invisibilité des lignes rattachées à un
--      événement invisible.
-- Les protections par déclencheur (statut, slug…) sont dans 20_declencheurs.
--
-- Données : créées ici, fictives, préfixe [TEST] (slugs « test-rls-… », adresses
-- en .invalid) ; le fichier est annulé à la fin (rollback). Indépendant de
-- seed.sql et de seed_demo.sql.
-- Connexion simulée comme PostgREST : test_connecter(uuid) = « set local role
-- authenticated » + request.jwt.claims ; test_anonyme() ; test_service() ;
-- test_deconnecter() revient à postgres (voir 00_stubs_supabase.sql).
-- =============================================================================
begin;

-- ── Données de test (en postgres, sans RLS) ──────────────────────────────────
do $$
declare
  u_simple   uuid := test_creer_utilisateur('rls-simple@exemple.invalid', '[TEST] Simple');
  u_gest     uuid := test_creer_utilisateur('rls-gestionnaire@exemple.invalid', '[TEST] Gestionnaire');
  u_attente  uuid := test_creer_utilisateur('rls-attente@exemple.invalid', '[TEST] Demande en attente');
  u_mod      uuid := test_creer_utilisateur('rls-moderateur@exemple.invalid', '[TEST] Modérateur');
  u_admin    uuid := test_creer_utilisateur('rls-admin@exemple.invalid', '[TEST] Administrateur');
  u_sans     uuid := test_creer_utilisateur('rls-sans-profil@exemple.invalid', '[TEST] Sans profil');
  d1 uuid; d2 uuid;
  s_a uuid; s_c uuid; s_gb uuid; s_brouillon uuid; s_attente uuid; s_refuse uuid; s_archive uuid;
  e_pub uuid; e_att uuid; e_brou uuid; e_simple uuid; e_supp uuid;
begin
  update public.profils set role = 'moderateur' where id = u_mod;
  update public.profils set role = 'admin' where id = u_admin;
  delete from public.profils where id = u_sans;

  insert into public.disciplines (slug, nom, ordre) values ('test-rls-d1', '[TEST] Discipline 1', 101) returning id into d1;
  insert into public.disciplines (slug, nom, ordre) values ('test-rls-d2', '[TEST] Discipline 2', 102) returning id into d2;

  insert into public.societes (slug, sigle, statut) values ('test-rls-a', '[TEST] RLSA', 'publie') returning id into s_a;
  insert into public.societes (slug, sigle, statut) values ('test-rls-c', '[TEST] RLSC', 'publie') returning id into s_c;
  insert into public.societes (slug, sigle, statut) values ('test-rls-gb', '[TEST] RLSGB', 'brouillon') returning id into s_gb;
  insert into public.societes (slug, sigle, statut) values ('test-rls-brouillon', '[TEST] RLSB', 'brouillon') returning id into s_brouillon;
  insert into public.societes (slug, sigle, statut) values ('test-rls-attente', '[TEST] RLSE', 'en_attente') returning id into s_attente;
  insert into public.societes (slug, sigle, statut) values ('test-rls-refuse', '[TEST] RLSR', 'refuse') returning id into s_refuse;
  insert into public.societes (slug, sigle, statut) values ('test-rls-archive', '[TEST] RLSX', 'archive') returning id into s_archive;
  insert into public.societe_disciplines values (s_a, d1), (s_brouillon, d1);

  insert into public.gestionnaires (user_id, societe_id, statut) values
    (u_gest, s_a, 'acceptee'), (u_gest, s_gb, 'acceptee'), (u_attente, s_a, 'en_attente');

  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut)
    values ('test-rls-ev-publie', '[TEST] Congrès publié', 'congres', aujourdhui() + 30, aujourdhui() + 32, 'publie')
    returning id into e_pub;
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, cree_par)
    values ('test-rls-ev-attente', '[TEST] Journées en attente', 'journees', aujourdhui() + 40, aujourdhui() + 41, 'en_attente', u_gest)
    returning id into e_att;
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut)
    values ('test-rls-ev-brouillon', '[TEST] Atelier brouillon', 'atelier', aujourdhui() + 50, aujourdhui() + 50, 'brouillon')
    returning id into e_brou;
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut, cree_par)
    values ('test-rls-ev-simple', '[TEST] Séminaire d''un utilisateur', 'seminaire', aujourdhui() + 60, aujourdhui() + 60, 'en_attente', u_simple)
    returning id into e_simple;
  insert into public.evenements (slug, titre, type, date_debut, date_fin, statut)
    values ('test-rls-ev-a-supprimer', '[TEST] Événement à supprimer', 'autre', aujourdhui() + 70, aujourdhui() + 70, 'en_attente')
    returning id into e_supp;

  insert into public.evenement_societes (evenement_id, societe_id) values (e_pub, s_a), (e_att, s_a), (e_brou, s_c);
  insert into public.evenement_disciplines values (e_pub, d1), (e_att, d1), (e_brou, d1);
  insert into public.echeances (evenement_id, type, date_limite) values
    (e_pub, 'soumission_resumes', aujourdhui() + 10),
    (e_att, 'inscription', aujourdhui() + 20),
    (e_brou, 'bourse', aujourdhui() + 25);

  insert into public.emplacements_pub (type, titre, annonceur, date_debut, date_fin, actif) values
    ('banniere_accueil', '[TEST] Emplacement actif', '[TEST] Annonceur', aujourdhui() - 1, aujourdhui() + 1, true),
    ('banniere_accueil', '[TEST] Emplacement inactif', '[TEST] Annonceur', aujourdhui() - 1, aujourdhui() + 1, false),
    ('banniere_agenda', '[TEST] Emplacement futur', '[TEST] Annonceur', aujourdhui() + 10, aujourdhui() + 20, true),
    ('banniere_agenda', '[TEST] Emplacement passé', '[TEST] Annonceur', aujourdhui() - 20, aujourdhui() - 10, true);

  insert into public.clics_sortants (cible_type, cible_id, url, page_origine)
    values ('societe', s_a, 'https://exemple.invalid/', '/societes/test-rls-a');
  insert into public.journal_moderation (objet_type, objet_id, action, motif, auteur)
    values ('societe', s_a, 'publie', '[TEST] motif', u_mod);
  insert into public.demandes_contact (type, nom, email, message)
    values ('contact', '[TEST] Visiteur', 'visiteur@exemple.invalid', '[TEST] Message d''origine');
  insert into public.tentatives_formulaires (empreinte, formulaire) values ('test-empreinte', 'contact');

  insert into storage.objects (bucket_id, name) values
    ('logos', 'test-rls/logo.webp'),
    ('affiches', 'test-rls/affiche-en-attente.webp'),
    ('publicites', 'test-rls/publicite.webp');
end
$$;

-- ── A. Visiteur anonyme : lecture ────────────────────────────────────────────
do $$
declare
  e_pub  uuid := (select id from public.evenements where slug = 'test-rls-ev-publie');
  e_att  uuid := (select id from public.evenements where slug = 'test-rls-ev-attente');
  e_brou uuid := (select id from public.evenements where slug = 'test-rls-ev-brouillon');
  v_table text;
  v_n bigint;
begin
  -- Les lignes existent bien (sinon « 0 ligne vue » ne prouverait rien).
  foreach v_table in array array['clics_sortants', 'journal_moderation', 'demandes_contact',
                                  'tentatives_formulaires', 'profils', 'gestionnaires']
  loop
    execute format('select count(*) from public.%I', v_table) into v_n;
    perform test_verifier(v_n > 0, format('préalable : %s contient des lignes', v_table));
  end loop;

  perform test_anonyme();

  perform test_verifier(auth.uid() is null and auth.role() = 'anon' and current_user = 'anon',
    'anonyme : rôle anon, sans auth.uid()');

  perform test_verifier(
    (select count(*) from public.societes where slug like 'test-rls-%') = 2
    and (select bool_and(statut = 'publie') from public.societes where slug like 'test-rls-%'),
    'anonyme : ne voit que les 2 organisations publiées');
  perform test_verifier(
    not exists (select 1 from public.societes
                 where slug in ('test-rls-brouillon', 'test-rls-gb', 'test-rls-attente',
                                'test-rls-refuse', 'test-rls-archive')),
    'anonyme : ne voit aucune organisation brouillon, en_attente, refuse ou archive');

  perform test_verifier(
    exists (select 1 from public.evenements where id = e_pub)
    and not exists (select 1 from public.evenements where id in (e_att, e_brou))
    and not exists (select 1 from public.evenements where slug in ('test-rls-ev-simple', 'test-rls-ev-a-supprimer')),
    'anonyme : voit l''événement publié, pas ceux en_attente ou brouillon');

  perform test_verifier(
    (select count(*) from public.echeances where evenement_id = e_pub) = 1
    and (select count(*) from public.echeances where evenement_id in (e_att, e_brou)) = 0,
    'anonyme : voit les échéances de l''événement publié seulement');
  perform test_verifier(
    (select count(*) from public.evenement_societes where evenement_id = e_pub) = 1
    and (select count(*) from public.evenement_societes where evenement_id in (e_att, e_brou)) = 0,
    'anonyme : ne voit pas les organisateurs d''un événement non publié');
  perform test_verifier(
    (select count(*) from public.evenement_disciplines where evenement_id = e_pub) = 1
    and (select count(*) from public.evenement_disciplines where evenement_id in (e_att, e_brou)) = 0,
    'anonyme : ne voit pas les disciplines d''un événement non publié');

  perform test_verifier((select count(*) from public.disciplines where slug like 'test-rls-%') = 2,
    'anonyme : lit les disciplines');
  perform test_verifier((select count(*) from public.societe_disciplines) >= 2,
    'anonyme : lit les rattachements organisation-discipline (lecture : tous)');

  foreach v_table in array array['clics_sortants', 'journal_moderation', 'demandes_contact',
                                  'tentatives_formulaires', 'profils', 'gestionnaires']
  loop
    execute format('select count(*) from public.%I', v_table) into v_n;
    perform test_verifier(v_n = 0, format('anonyme : ne lit aucune ligne de %s', v_table));
  end loop;

  perform test_verifier(
    (select count(*) from public.emplacements_pub where titre like '[TEST]%') = 1
    and exists (select 1 from public.emplacements_pub where titre = '[TEST] Emplacement actif'),
    'anonyme : ne voit que l''emplacement actif dont la période contient aujourd''hui (ni inactif, ni futur, ni passé)');

  perform test_deconnecter();
end
$$;

-- ── A. Visiteur anonyme : aucune écriture dans les 14 tables ─────────────────
do $$
declare
  u_simple uuid := (select id from auth.users where email = 'rls-simple@exemple.invalid');
  u_sans   uuid := (select id from auth.users where email = 'rls-sans-profil@exemple.invalid');
  d2   uuid := (select id from public.disciplines where slug = 'test-rls-d2');
  s_a  uuid := (select id from public.societes where slug = 'test-rls-a');
  s_c  uuid := (select id from public.societes where slug = 'test-rls-c');
  e_pub uuid := (select id from public.evenements where slug = 'test-rls-ev-publie');
  v_sql text;
  v_table text;
  v_colonne text;
  v_n bigint;
  v_insertions text[];
  -- Une colonne modifiable par table (les tables de liaison n'ont pas created_at).
  v_colonnes text[][] := array[
    ['disciplines', 'nom'], ['societes', 'description'], ['societe_disciplines', 'discipline_id'],
    ['evenements', 'titre'], ['evenement_societes', 'role'], ['evenement_disciplines', 'discipline_id'],
    ['echeances', 'libelle'], ['profils', 'nom'], ['gestionnaires', 'message'],
    ['emplacements_pub', 'titre'], ['clics_sortants', 'url'], ['journal_moderation', 'motif'],
    ['demandes_contact', 'traitee'], ['tentatives_formulaires', 'formulaire']];
  i int;
begin
  v_insertions := array[
    $q$insert into public.disciplines (slug, nom) values ('test-rls-anon', '[TEST] anon')$q$,
    $q$insert into public.societes (slug, sigle, statut) values ('test-rls-anon', '[TEST] ANON', 'en_attente')$q$,
    format('insert into public.societe_disciplines (societe_id, discipline_id) values (%L, %L)', s_c, d2),
    $q$insert into public.evenements (slug, titre, type, date_debut, date_fin) values ('test-rls-anon', '[TEST] anon', 'congres', '2030-01-01', '2030-01-02')$q$,
    format('insert into public.evenement_societes (evenement_id, societe_id) values (%L, %L)', e_pub, s_c),
    format('insert into public.evenement_disciplines (evenement_id, discipline_id) values (%L, %L)', e_pub, d2),
    format('insert into public.echeances (evenement_id, type, date_limite) values (%L, ''autre'', ''2030-01-01'')', e_pub),
    format('insert into public.profils (id, nom) values (%L, ''[TEST] anon'')', u_sans),
    format('insert into public.gestionnaires (user_id, societe_id) values (%L, %L)', u_simple, s_c),
    $q$insert into public.emplacements_pub (type, titre, annonceur, date_debut, date_fin) values ('lettre', '[TEST] anon', '[TEST] anon', '2030-01-01', '2030-01-02')$q$,
    format('insert into public.clics_sortants (cible_type, cible_id, url) values (''societe'', %L, ''https://exemple.invalid/'')', s_a),
    format('insert into public.journal_moderation (objet_type, objet_id, action) values (''societe'', %L, ''publie'')', s_a),
    $q$insert into public.demandes_contact (type, nom, email, message) values ('contact', '[TEST] anon', 'anon@exemple.invalid', '[TEST] anon')$q$,
    $q$insert into public.tentatives_formulaires (empreinte, formulaire) values ('test-anon', 'contact')$q$];

  perform test_anonyme();

  foreach v_sql in array v_insertions
  loop
    perform test_doit_echouer(v_sql, 'anonyme : insertion refusée — ' || substring(v_sql from 'into public\.(\w+)'));
  end loop;

  for i in 1 .. array_length(v_colonnes, 1)
  loop
    v_table := v_colonnes[i][1];
    v_colonne := v_colonnes[i][2];
    -- Modification : 0 ligne touchée (RLS) ou refus de privilège (-1).
    v_n := test_lignes_touchees(format('update public.%I set %I = %I', v_table, v_colonne, v_colonne));
    perform test_verifier(v_n in (0, -1), format('anonyme : aucune modification possible dans %s (résultat : %s)', v_table, v_n));

    v_n := test_lignes_touchees(format('delete from public.%I', v_table));
    perform test_verifier(v_n in (0, -1), format('anonyme : aucune suppression possible dans %s (résultat : %s)', v_table, v_n));

    perform test_doit_echouer(format('truncate public.%I', v_table),
      format('anonyme : TRUNCATE refusé sur %s', v_table));
  end loop;

  perform test_verifier(test_lignes_touchees('update public.demandes_contact set traitee = true') = -1,
    'anonyme : aucun droit de modification sur demandes_contact (refus de privilège)');

  perform test_deconnecter();

  -- Contre-épreuve en postgres : rien n'a bougé.
  perform test_verifier(
    (select count(*) from public.societes where slug like 'test-rls-%') = 7
    and (select count(*) from public.evenements where slug like 'test-rls-%') = 5
    and (select count(*) from public.demandes_contact where message = '[TEST] Message d''origine' and not traitee) = 1
    and (select count(*) from public.tentatives_formulaires where empreinte = 'test-empreinte') = 1,
    'après les tentatives anonymes, les données sont intactes');
end
$$;

-- ── B. Utilisateur connecté sans rôle particulier ────────────────────────────
do $$
declare
  u_simple uuid := (select id from auth.users where email = 'rls-simple@exemple.invalid');
  u_gest   uuid := (select id from auth.users where email = 'rls-gestionnaire@exemple.invalid');
  u_mod    uuid := (select id from auth.users where email = 'rls-moderateur@exemple.invalid');
  s_a  uuid := (select id from public.societes where slug = 'test-rls-a');
  s_c  uuid := (select id from public.societes where slug = 'test-rls-c');
  e_pub uuid := (select id from public.evenements where slug = 'test-rls-ev-publie');
  e_simple uuid := (select id from public.evenements where slug = 'test-rls-ev-simple');
  v_n bigint;
begin
  perform test_connecter(u_simple);

  perform test_verifier(auth.uid() = u_simple and auth.role() = 'authenticated' and current_user = 'authenticated',
    'connecté : rôle authenticated, auth.uid() lu dans request.jwt.claims');
  perform test_verifier(role_courant() = 'gestionnaire' and not est_moderateur() and not est_admin(),
    'connecté : rôle par défaut « gestionnaire », ni modérateur ni administrateur');

  -- Lecture
  perform test_verifier((select count(*) from public.profils) = 1
      and (select id from public.profils) = u_simple,
    'connecté : ne lit que son propre profil');
  perform test_verifier(
    not exists (select 1 from public.societes where slug like 'test-rls-%' and statut <> 'publie'),
    'connecté : ne voit aucune organisation non publiée qu''il ne gère pas');
  perform test_verifier(
    exists (select 1 from public.evenements where id = e_simple)
    and not exists (select 1 from public.evenements where slug in ('test-rls-ev-attente', 'test-rls-ev-brouillon')),
    'connecté : voit l''événement en attente qu''il a créé, pas ceux des autres');
  perform test_verifier(
    (select count(*) from public.clics_sortants) = 0
    and (select count(*) from public.journal_moderation) = 0
    and (select count(*) from public.demandes_contact) = 0
    and (select count(*) from public.tentatives_formulaires) = 0
    and (select count(*) from public.gestionnaires) = 0,
    'connecté : ne lit ni clics, ni journal, ni demandes de contact, ni tentatives, ni les demandes de gestion des autres');
  perform test_verifier(
    not exists (select 1 from public.emplacements_pub where titre = '[TEST] Emplacement inactif'),
    'connecté : ne voit pas un emplacement inactif');

  -- Demandes de gestion
  perform test_doit_echouer(
    format('insert into public.gestionnaires (user_id, societe_id, statut) values (%L, %L, ''acceptee'')', u_simple, s_c),
    'connecté : ne peut pas créer une demande de gestion déjà « acceptee »');
  perform test_doit_echouer(
    format('insert into public.gestionnaires (user_id, societe_id) values (%L, %L)', u_gest, s_c),
    'connecté : ne peut pas créer une demande au nom d''un autre');
  perform test_doit_echouer(
    format('insert into public.gestionnaires (user_id, societe_id, decide_par, decide_le) values (%L, %L, %L, now())', u_simple, s_c, u_mod),
    'connecté : ne peut pas créer une demande portant déjà une décision (decide_par, decide_le)');
  insert into public.gestionnaires (user_id, societe_id, fonction, message)
    values (u_simple, s_c, '[TEST] Secrétaire général', '[TEST] Demande');
  perform test_verifier(
    (select statut from public.gestionnaires where user_id = u_simple and societe_id = s_c) = 'en_attente',
    'connecté : peut demander la gestion d''une fiche, en attente');
  v_n := test_lignes_touchees(format('update public.gestionnaires set statut = ''acceptee'' where user_id = %L', u_simple));
  perform test_verifier(v_n = 0, 'connecté : ne peut pas accepter sa propre demande (0 ligne)');
  perform test_verifier(not gere_societe(s_c), 'connecté : toujours pas gestionnaire de la fiche demandée');
  v_n := test_lignes_touchees(format('delete from public.gestionnaires where user_id = %L', u_simple));
  perform test_verifier(v_n = 0, 'connecté : ne peut pas supprimer une demande de gestion (0 ligne)');

  -- Écritures réservées
  perform test_doit_echouer($q$insert into public.disciplines (slug, nom) values ('test-rls-x', '[TEST] x')$q$,
    'connecté : ne peut pas créer de discipline');
  perform test_doit_echouer($q$insert into public.societes (slug, sigle) values ('test-rls-x', '[TEST] X')$q$,
    'connecté : ne peut pas créer d''organisation (formulaire public = client de service)');
  perform test_doit_echouer(
    format('insert into public.evenements (slug, titre, type, date_debut, date_fin, cree_par) values (''test-rls-x'', ''[TEST] x'', ''congres'', ''2030-01-01'', ''2030-01-01'', %L)', u_gest),
    'connecté : ne peut pas créer un événement au nom d''un autre');
  perform test_doit_echouer(
    $q$insert into public.evenements (slug, titre, type, date_debut, date_fin) values ('test-rls-x', '[TEST] x', 'congres', '2030-01-01', '2030-01-01')$q$,
    'connecté : ne peut pas créer un événement sans auteur (cree_par nul)');
  perform test_doit_echouer(
    format('insert into public.echeances (evenement_id, type, date_limite) values (%L, ''autre'', ''2030-01-01'')', e_pub),
    'connecté : ne peut pas ajouter d''échéance à un événement qu''il ne gère pas');
  perform test_doit_echouer($q$insert into public.emplacements_pub (type, titre, annonceur, date_debut, date_fin) values ('lettre', '[TEST] x', '[TEST] x', '2030-01-01', '2030-01-02')$q$,
    'connecté : ne peut pas créer d''emplacement publicitaire');
  perform test_doit_echouer(format('insert into public.clics_sortants (cible_type, cible_id, url) values (''societe'', %L, ''https://exemple.invalid/'')', s_a),
    'connecté : ne peut pas écrire dans clics_sortants');
  perform test_doit_echouer(format('insert into public.journal_moderation (objet_type, objet_id, action) values (''societe'', %L, ''publie'')', s_a),
    'connecté : ne peut pas écrire dans journal_moderation');
  perform test_doit_echouer($q$insert into public.demandes_contact (type, nom, email, message) values ('contact', '[TEST] x', 'x@exemple.invalid', '[TEST] x')$q$,
    'connecté : ne peut pas écrire dans demandes_contact (client de service)');
  perform test_doit_echouer($q$insert into public.tentatives_formulaires (empreinte, formulaire) values ('x', 'contact')$q$,
    'connecté : ne peut pas écrire dans tentatives_formulaires');

  v_n := test_lignes_touchees('update public.demandes_contact set traitee = true');
  perform test_verifier(v_n = 0, 'connecté : ne peut pas marquer une demande de contact comme traitée (0 ligne)');
  v_n := test_lignes_touchees(format('update public.societes set description = ''[TEST] x'' where id = %L', s_c));
  perform test_verifier(v_n = 0, 'connecté : ne peut pas modifier une organisation qu''il ne gère pas (0 ligne)');
  v_n := test_lignes_touchees(format('update public.evenements set titre = ''[TEST] x'' where id = %L', e_simple));
  perform test_verifier(v_n = 0,
    'connecté : sans organisation gérée, ne peut pas modifier son propre événement (update : modérateur ou gere_evenement)');
  v_n := test_lignes_touchees(format('delete from public.evenements where id = %L', e_simple));
  perform test_verifier(v_n = 0, 'connecté : ne peut pas supprimer un événement (modérateur seulement)');

  v_n := test_lignes_touchees(format('update public.profils set nom = ''[TEST] Autre'' where id = %L', u_gest));
  perform test_verifier(v_n = 0, 'connecté : ne peut pas modifier le profil d''un autre (0 ligne)');
  v_n := test_lignes_touchees(format('delete from public.profils where id = %L', u_simple));
  perform test_verifier(v_n = 0, 'connecté : ne peut pas supprimer son profil (administrateur seulement)');

  perform test_deconnecter();
end
$$;

-- ── B bis. Utilisateur connecté sans ligne dans profils ─────────────────────
-- proteger_profil ne garde que les MODIFICATIONS (before update) : un
-- utilisateur dont le profil manque ne doit pas pouvoir le créer lui-même avec
-- le rôle de son choix (ajout : administrateur seulement).
do $$
declare
  u_sans uuid := (select id from auth.users where email = 'rls-sans-profil@exemple.invalid');
begin
  perform test_verifier(not exists (select 1 from public.profils where id = u_sans),
    'préalable : l''utilisateur « sans profil » n''a pas de ligne dans profils');

  perform test_connecter(u_sans);
  perform test_verifier(role_courant() is null and not est_moderateur() and not est_admin(),
    'sans profil : aucun rôle, ni modérateur ni administrateur');
  perform test_doit_echouer(
    format('insert into public.profils (id, nom, role) values (%L, ''[TEST] Intrus'', ''admin'')', u_sans),
    'sans profil : ne peut pas se créer un profil administrateur');
  perform test_doit_echouer(
    format('insert into public.profils (id, nom, de_confiance) values (%L, ''[TEST] Intrus'', true)', u_sans),
    'sans profil : ne peut pas se créer un profil « de confiance »');
  perform test_doit_echouer(
    format('insert into public.profils (id, nom) values (%L, ''[TEST] Intrus'')', u_sans),
    'sans profil : ne peut pas créer lui-même son profil (déclencheur creer_profil ou administrateur)');
  perform test_deconnecter();

  perform test_verifier(not exists (select 1 from public.profils where id = u_sans),
    'sans profil : toujours aucune ligne dans profils après les tentatives');
end
$$;

-- ── C. Rattachements d'un gestionnaire : organisateurs, disciplines, échéances
do $$
declare
  u_gest    uuid := (select id from auth.users where email = 'rls-gestionnaire@exemple.invalid');
  u_attente uuid := (select id from auth.users where email = 'rls-attente@exemple.invalid');
  d1   uuid := (select id from public.disciplines where slug = 'test-rls-d1');
  d2   uuid := (select id from public.disciplines where slug = 'test-rls-d2');
  s_a  uuid := (select id from public.societes where slug = 'test-rls-a');
  s_c  uuid := (select id from public.societes where slug = 'test-rls-c');
  s_gb uuid := (select id from public.societes where slug = 'test-rls-gb');
  e_pub  uuid := (select id from public.evenements where slug = 'test-rls-ev-publie');
  e_att  uuid := (select id from public.evenements where slug = 'test-rls-ev-attente');
  e_brou uuid := (select id from public.evenements where slug = 'test-rls-ev-brouillon');
  e_nouv uuid;
  v_n bigint;
begin
  perform test_connecter(u_gest);

  perform test_verifier(gere_societe(s_a) and gere_societe(s_gb) and not gere_societe(s_c),
    'gestionnaire : gere_societe() vrai pour ses fiches acceptées seulement');
  perform test_verifier(
    exists (select 1 from public.societes where id = s_gb)
    and not exists (select 1 from public.societes where slug = 'test-rls-brouillon'),
    'gestionnaire : voit la fiche brouillon qu''il gère, pas les autres brouillons');
  perform test_verifier(
    exists (select 1 from public.evenements where id = e_att)
    and exists (select 1 from public.echeances where evenement_id = e_att)
    and exists (select 1 from public.evenement_societes where evenement_id = e_att),
    'gestionnaire : voit l''événement en attente de son organisation, ses échéances et organisateurs');

  -- Disciplines de son organisation
  insert into public.societe_disciplines (societe_id, discipline_id) values (s_a, d2);
  perform test_verifier(exists (select 1 from public.societe_disciplines where societe_id = s_a and discipline_id = d2),
    'gestionnaire : peut rattacher une discipline à son organisation');
  perform test_doit_echouer(
    format('insert into public.societe_disciplines (societe_id, discipline_id) values (%L, %L)', s_c, d2),
    'gestionnaire : ne peut pas rattacher une discipline à une autre organisation');

  -- Nouvel événement, rattaché à son organisation
  insert into public.evenements (slug, titre, type, date_debut, date_fin, cree_par)
    values ('test-rls-ev-nouveau', '[TEST] Colloque du gestionnaire', 'colloque', aujourdhui() + 90, aujourdhui() + 91, u_gest)
    returning id into e_nouv;
  insert into public.evenement_societes (evenement_id, societe_id) values (e_nouv, s_a);
  perform test_verifier(gere_evenement(e_nouv), 'gestionnaire : rattache son nouvel événement à son organisation');
  perform test_doit_echouer(
    format('insert into public.evenement_societes (evenement_id, societe_id) values (%L, %L)', e_nouv, s_c),
    'gestionnaire : ne peut pas désigner comme organisatrice une organisation qu''il ne gère pas');
  perform test_doit_echouer(
    format('update public.evenement_societes set societe_id = %L where evenement_id = %L and societe_id = %L', s_c, e_nouv, s_a),
    'gestionnaire : ne peut pas réattribuer son événement à une organisation qu''il ne gère pas (update)');
  perform test_verifier(
    exists (select 1 from public.evenement_societes where evenement_id = e_nouv and societe_id = s_a)
    and not exists (select 1 from public.evenement_societes where evenement_id = e_nouv and societe_id = s_c),
    'gestionnaire : le rattachement de son événement est inchangé après la tentative');
  perform test_doit_echouer(
    format('insert into public.evenement_societes (evenement_id, societe_id) values (%L, %L)', e_brou, s_a),
    'gestionnaire : ne peut pas rattacher à son organisation l''événement créé par un autre');
  -- e_pub : organisé par son organisation, mais créé par quelqu'un d'autre.
  v_n := test_lignes_touchees(format('delete from public.evenement_societes where evenement_id = %L', e_pub));
  perform test_verifier(v_n = 0,
    'gestionnaire : ne peut pas retirer les organisateurs d''un événement qu''il n''a pas créé (0 ligne)');

  insert into public.echeances (evenement_id, type, date_limite) values (e_nouv, 'soumission_resumes', aujourdhui() + 60);
  insert into public.evenement_disciplines (evenement_id, discipline_id) values (e_nouv, d1);
  perform test_verifier(
    (select count(*) from public.echeances where evenement_id = e_nouv) = 1
    and (select count(*) from public.evenement_disciplines where evenement_id = e_nouv) = 1,
    'gestionnaire : ajoute échéances et disciplines à l''événement de son organisation');
  perform test_doit_echouer(
    format('insert into public.echeances (evenement_id, type, date_limite) values (%L, ''autre'', ''2030-01-01'')', e_brou),
    'gestionnaire : ne peut pas ajouter d''échéance à l''événement d''une autre organisation');
  v_n := test_lignes_touchees(format('update public.echeances set date_limite = date_limite + 1 where evenement_id = %L', e_att));
  perform test_verifier(v_n = 1, 'gestionnaire : modifie l''échéance d''un événement de son organisation');
  v_n := test_lignes_touchees(format('update public.echeances set date_limite = date_limite + 1 where evenement_id = %L', e_brou));
  perform test_verifier(v_n = 0, 'gestionnaire : ne modifie pas l''échéance d''un autre événement (0 ligne)');

  perform test_deconnecter();

  -- Une demande seulement en attente ne donne aucun droit.
  perform test_connecter(u_attente);
  perform test_verifier(not gere_societe(s_a), 'demande en attente : gere_societe() faux');
  v_n := test_lignes_touchees(format('update public.societes set description = ''[TEST] x'' where id = %L', s_a));
  perform test_verifier(v_n = 0, 'demande en attente : ne peut pas modifier la fiche (0 ligne)');
  perform test_verifier(not exists (select 1 from public.evenements where id = e_att),
    'demande en attente : ne voit pas les événements en attente de la fiche');
  perform test_verifier((select count(*) from public.gestionnaires) = 1,
    'demande en attente : voit sa propre demande');
  perform test_deconnecter();
end
$$;

-- ── D. Modérateur ────────────────────────────────────────────────────────────
do $$
declare
  u_mod    uuid := (select id from auth.users where email = 'rls-moderateur@exemple.invalid');
  u_simple uuid := (select id from auth.users where email = 'rls-simple@exemple.invalid');
  s_c    uuid := (select id from public.societes where slug = 'test-rls-c');
  e_supp uuid := (select id from public.evenements where slug = 'test-rls-ev-a-supprimer');
  v_n bigint;
begin
  perform test_connecter(u_mod);

  perform test_verifier(est_moderateur() and not est_admin(), 'modérateur : est_moderateur() vrai, est_admin() faux');
  perform test_verifier(
    (select count(*) from public.societes where slug like 'test-rls-%') = 7
    and (select count(*) from public.evenements where slug like 'test-rls-%') >= 5,
    'modérateur : voit toutes les organisations et tous les événements, quel que soit le statut');
  perform test_verifier(
    (select count(*) from public.clics_sortants) > 0
    and (select count(*) from public.journal_moderation) > 0
    and (select count(*) from public.demandes_contact) > 0
    and (select count(*) from public.profils) >= 5
    and (select count(*) from public.gestionnaires) >= 3,
    'modérateur : lit clics, journal, demandes de contact, profils et demandes de gestion');
  perform test_verifier((select count(*) from public.tentatives_formulaires) = 0,
    'modérateur : ne lit pas tentatives_formulaires (client de service uniquement)');
  perform test_verifier(not exists (select 1 from public.emplacements_pub where titre = '[TEST] Emplacement inactif'),
    'modérateur : ne voit pas les emplacements inactifs (administrateur seulement)');

  -- demandes_contact : traitee seulement
  v_n := test_lignes_touchees($q$update public.demandes_contact set traitee = true where message = '[TEST] Message d''origine'$q$);
  perform test_verifier(v_n = 1, 'modérateur : peut marquer une demande de contact comme traitée');
  perform test_doit_echouer($q$update public.demandes_contact set message = '[TEST] réécrit'$q$,
    'modérateur : ne peut pas modifier le message d''une demande de contact');
  perform test_doit_echouer($q$update public.demandes_contact set email = 'autre@exemple.invalid'$q$,
    'modérateur : ne peut pas modifier l''e-mail d''une demande de contact');
  perform test_verifier(test_lignes_touchees('delete from public.demandes_contact') = 0,
    'modérateur : ne peut pas supprimer une demande de contact (0 ligne)');

  -- Modération des demandes de gestion et des fiches
  v_n := test_lignes_touchees(format('update public.gestionnaires set statut = ''acceptee'', decide_par = %L, decide_le = now() where user_id = %L and societe_id = %L', u_mod, u_simple, s_c));
  perform test_verifier(v_n = 1, 'modérateur : accepte une demande de gestion');
  insert into public.societes (slug, sigle, statut) values ('test-rls-par-moderateur', '[TEST] MOD', 'publie');
  perform test_verifier(exists (select 1 from public.societes where slug = 'test-rls-par-moderateur'),
    'modérateur : crée une organisation');
  v_n := test_lignes_touchees(format('delete from public.evenements where id = %L', e_supp));
  perform test_verifier(v_n = 1, 'modérateur : supprime un événement');

  -- Réservé à l'administrateur
  perform test_doit_echouer($q$insert into public.disciplines (slug, nom) values ('test-rls-x', '[TEST] x')$q$,
    'modérateur : ne peut pas créer de discipline (administrateur)');
  perform test_doit_echouer($q$insert into public.emplacements_pub (type, titre, annonceur, date_debut, date_fin) values ('lettre', '[TEST] x', '[TEST] x', '2030-01-01', '2030-01-02')$q$,
    'modérateur : ne peut pas créer d''emplacement publicitaire (administrateur)');
  perform test_verifier(test_lignes_touchees('update public.emplacements_pub set actif = false') = 0,
    'modérateur : ne peut pas modifier un emplacement publicitaire (0 ligne)');
  perform test_doit_echouer(format('insert into public.journal_moderation (objet_type, objet_id, action) values (''societe'', %L, ''publie'')', s_c),
    'modérateur : n''écrit pas directement dans le journal (client de service)');

  perform test_deconnecter();
end
$$;

-- ── E. Administrateur ────────────────────────────────────────────────────────
do $$
declare
  u_admin uuid := (select id from auth.users where email = 'rls-admin@exemple.invalid');
begin
  perform test_connecter(u_admin);
  perform test_verifier(est_admin() and est_moderateur(), 'administrateur : est_admin() et est_moderateur() vrais');
  perform test_verifier(
    (select count(*) from public.emplacements_pub where titre like '[TEST] Emplacement%') = 4,
    'administrateur : voit tous les emplacements, y compris inactifs et hors période');
  insert into public.disciplines (slug, nom) values ('test-rls-par-admin', '[TEST] Discipline de l''administrateur');
  insert into public.emplacements_pub (type, titre, annonceur, date_debut, date_fin, actif)
    values ('lettre', '[TEST] Emplacement de l''administrateur', '[TEST] Annonceur', aujourdhui(), aujourdhui() + 7, false);
  perform test_verifier(
    exists (select 1 from public.disciplines where slug = 'test-rls-par-admin')
    and exists (select 1 from public.emplacements_pub where titre = '[TEST] Emplacement de l''administrateur'),
    'administrateur : crée disciplines et emplacements publicitaires');
  perform test_verifier((select count(*) from public.tentatives_formulaires) = 0,
    'administrateur : ne lit pas tentatives_formulaires non plus');
  perform test_deconnecter();
end
$$;

-- ── F. Client de service (server actions, passerelle, formulaires publics) ──
do $$
declare
  s_a uuid := (select id from public.societes where slug = 'test-rls-a');
begin
  perform test_service();
  perform test_verifier(auth.role() = 'service_role' and current_user = 'service_role',
    'service : rôle service_role');
  insert into public.societes (slug, sigle, soumis_par_nom, soumis_par_email)
    values ('test-rls-formulaire', '[TEST] FORM', '[TEST] Auteur', 'auteur@exemple.invalid');
  insert into public.clics_sortants (cible_type, cible_id, url) values ('societe', s_a, 'https://exemple.invalid/');
  insert into public.journal_moderation (objet_type, objet_id, action) values ('societe', s_a, 'modifie');
  insert into public.demandes_contact (type, nom, email, message)
    values ('visibilite', '[TEST] Annonceur', 'annonceur@exemple.invalid', '[TEST] Demande de devis');
  insert into public.tentatives_formulaires (empreinte, formulaire) values ('test-service', 'referencer_societe');
  insert into storage.objects (bucket_id, name) values ('affiches', 'test-rls/affiche.webp');
  perform test_verifier(
    (select statut from public.societes where slug = 'test-rls-formulaire') = 'en_attente'
    and (select count(*) from public.tentatives_formulaires) >= 2
    and exists (select 1 from storage.objects where name = 'test-rls/affiche.webp'),
    'service : contourne la RLS (formulaire public, clics, journal, contact, tentatives, stockage)');
  perform test_deconnecter();
end
$$;

-- ── G. Stockage ──────────────────────────────────────────────────────────────
do $$
declare
  u_gest uuid := (select id from auth.users where email = 'rls-gestionnaire@exemple.invalid');
  u_mod  uuid := (select id from auth.users where email = 'rls-moderateur@exemple.invalid');
  v_profil text;
begin
  -- Aucun listage des objets par l'API (correctif du coordinateur) : un bucket
  -- public sert ses fichiers par son URL publique, sans politique ; la
  -- politique de lecture supprimée permettait de lister, par exemple,
  -- l'affiche d'un événement en attente ou refusé.
  perform test_verifier(
    (select count(distinct bucket_id) from storage.objects
      where bucket_id in ('logos', 'affiches', 'publicites') and name like 'test-rls/%') = 3,
    'préalable (postgres) : des objets existent dans les trois buckets logos, affiches, publicites');
  foreach v_profil in array array['anonyme', 'gestionnaire', 'modérateur']
  loop
    if v_profil = 'anonyme' then
      perform test_anonyme();
    elsif v_profil = 'gestionnaire' then
      perform test_connecter(u_gest);
    else
      perform test_connecter(u_mod);
    end if;
    perform test_verifier(
      (select count(*) from storage.objects where bucket_id in ('logos', 'affiches', 'publicites')) = 0,
      format('stockage : %s (%s) ne liste aucun objet des buckets logos, affiches, publicites',
             v_profil, current_user));
    perform test_deconnecter();
  end loop;

  perform test_anonyme();
  perform test_doit_echouer($q$insert into storage.objects (bucket_id, name) values ('logos', 'test-rls/anon.webp')$q$,
    'stockage : un visiteur anonyme ne peut rien envoyer');
  perform test_verifier(test_lignes_touchees('delete from storage.objects') = 0,
    'stockage : un visiteur anonyme ne peut rien supprimer (0 ligne)');
  perform test_doit_echouer($q$insert into storage.buckets (id, name, public) values ('test-rls', 'test-rls', true)$q$,
    'stockage : un visiteur anonyme ne peut pas créer de bucket');
  perform test_deconnecter();

  perform test_connecter(u_gest);
  perform test_doit_echouer($q$insert into storage.objects (bucket_id, name) values ('logos', 'test-rls/gestionnaire.webp')$q$,
    'stockage : un utilisateur connecté ne peut rien envoyer directement (server action + client de service)');
  perform test_verifier(test_lignes_touchees($q$update storage.objects set name = 'test-rls/renomme.webp'$q$) = 0,
    'stockage : un utilisateur connecté ne peut rien renommer (0 ligne)');
  perform test_verifier(test_lignes_touchees('delete from storage.objects') = 0,
    'stockage : un utilisateur connecté ne peut rien supprimer (0 ligne)');
  perform test_deconnecter();
end
$$;

-- ── H. Connexion selon la recette documentée ─────────────────────────────────
-- Les blocs précédents passent par test_connecter(). Celui-ci applique à la
-- lettre la recette documentée en tête de 00_stubs_supabase.sql, au niveau de
-- psql (« set local role » puis request.jwt.claims), pour qu'une erreur dans
-- cette documentation soit détectée. Les identifiants sont lus avant le
-- changement de rôle : authenticated n'a aucun droit sur auth.users.
-- Utilisateur : rls-simple (ni modérateur, ni gestionnaire de l'organisation A).
-- Événement : test-rls-ev-attente (en attente, organisation A, créé par un autre).
select set_config('test.uid_simple',
  (select id::text from auth.users where email = 'rls-simple@exemple.invalid'), true);
select set_config('test.ev_attente',
  (select id::text from public.evenements where slug = 'test-rls-ev-attente'), true);

do $$
declare
  e_att uuid := current_setting('test.ev_attente')::uuid;
begin
  perform test_verifier(
    exists (select 1 from public.echeances where evenement_id = e_att)
    and exists (select 1 from public.evenement_societes where evenement_id = e_att)
    and exists (select 1 from public.evenement_disciplines where evenement_id = e_att),
    'préalable (recette documentée) : l''événement en attente a échéances, organisateurs et disciplines');
end
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.uid_simple'), 'role', 'authenticated')::text, true);

do $$
declare
  e_att uuid := current_setting('test.ev_attente')::uuid;
begin
  perform test_verifier(
    auth.uid() = current_setting('test.uid_simple')::uuid
    and auth.role() = 'authenticated'
    and current_user = 'authenticated',
    'recette documentée : set local role + request.jwt.claims donnent auth.uid(), auth.role() et le rôle attendus');
  perform test_verifier(
    (select count(*) from public.profils) = 1
    and (select id from public.profils) = auth.uid(),
    'recette documentée : la RLS s''applique (ne lit que son propre profil)');
  perform test_verifier(
    not exists (select 1 from public.evenements where id = e_att)
    and not exists (select 1 from public.echeances where evenement_id = e_att)
    and not exists (select 1 from public.evenement_societes where evenement_id = e_att)
    and not exists (select 1 from public.evenement_disciplines where evenement_id = e_att),
    'connecté sans droit : ne voit ni l''événement en attente d''un autre, ni ses échéances, organisateurs ou disciplines');
  -- Invariant : aucune ligne rattachée visible ne pointe vers un événement invisible.
  perform test_verifier(
    not exists (select 1 from public.echeances x
                 where not exists (select 1 from public.evenements e where e.id = x.evenement_id))
    and not exists (select 1 from public.evenement_societes x
                     where not exists (select 1 from public.evenements e where e.id = x.evenement_id))
    and not exists (select 1 from public.evenement_disciplines x
                     where not exists (select 1 from public.evenements e where e.id = x.evenement_id)),
    'connecté : toute échéance, tout organisateur, toute discipline visible appartient à un événement visible');
end
$$;

reset role;
select set_config('request.jwt.claims', '', true);

do $$
begin
  perform test_verifier(current_user = 'postgres' and auth.uid() is null and auth.role() is null,
    'recette documentée : reset role et claims vides ramènent à postgres, sans JWT');
end
$$;

rollback;
