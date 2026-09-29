-- =============================================================================
-- Test 30 — Recherche en français (fr_unaccent, pg_trgm, rechercher())
-- =============================================================================
-- Prouve les critères d'acceptation de la phase 1 et la section 11 :
--   - « pediatrie » trouve « Pédiatrie » (accents et racines ignorés) ;
--   - « sbc » trouve le sigle SBC ; une faute de frappe sur un sigle le trouve
--     encore (similarité par trigrammes) ;
--   - rechercher() ne renvoie JAMAIS d'objet non publié, même appelée par un
--     modérateur (filtre explicite en plus de la RLS) ;
--   - forme des résultats (type, sous-titre, rang, limite).
-- Appels faits comme le site : RPC en visiteur anonyme (rôle anon).
-- Données fictives, préfixe [TEST], annulées à la fin (rollback). Robuste à la
-- présence de seed.sql et seed_demo.sql : les vérifications portent sur les
-- objets créés ici et sur le statut de TOUT ce qui est renvoyé.
-- =============================================================================
begin;

-- ── Configuration fr_unaccent ────────────────────────────────────────────────
do $$
begin
  perform test_verifier(
    to_tsvector('public.fr_unaccent'::regconfig, 'Congrès de Pédiatrie')
      @@ websearch_to_tsquery('public.fr_unaccent'::regconfig, 'pediatrie'),
    'fr_unaccent : « pediatrie » correspond à « Pédiatrie »');
  perform test_verifier(
    to_tsvector('public.fr_unaccent'::regconfig, 'Journées pédiatriques')
      @@ websearch_to_tsquery('public.fr_unaccent'::regconfig, 'journee'),
    'fr_unaccent : racinisation française (« journee » trouve « Journées »)');
  perform test_verifier(
    to_tsvector('public.fr_unaccent'::regconfig, 'Société béninoise') = to_tsvector('public.fr_unaccent'::regconfig, 'societe beninoise'),
    'fr_unaccent : mêmes lexèmes avec ou sans accents');
end
$$;

-- ── Données de test ──────────────────────────────────────────────────────────
do $$
declare
  s_ped uuid; s_ped_cachee uuid; s_sbc uuid; s_sbc_cachee uuid; s_trgm uuid;
begin
  insert into public.societes (slug, sigle, nom_complet, ville, statut) values
    ('test-rech-ped', '[TEST] SFPED', '[TEST] Société fictive de Pédiatrie', 'Parakou', 'publie')
    returning id into s_ped;
  insert into public.societes (slug, sigle, nom_complet, statut) values
    ('test-rech-ped-cachee', '[TEST] SFPEDX', '[TEST] Pédiatrie non publiée', 'en_attente')
    returning id into s_ped_cachee;
  insert into public.societes (slug, sigle, nom_complet, statut) values
    ('test-rech-sbc', 'SBC', '[TEST] Organisation fictive au sigle SBC', 'publie')
    returning id into s_sbc;
  insert into public.societes (slug, sigle, nom_complet, statut) values
    ('test-rech-sbc-cachee', 'SBC', '[TEST] Homonyme non publié', 'brouillon')
    returning id into s_sbc_cachee;
  insert into public.societes (slug, sigle, nom_complet, statut) values
    ('test-rech-trgm', 'KWZPLM', '[TEST] Organisation fictive au sigle rare', 'publie')
    returning id into s_trgm;

  insert into public.evenements (slug, titre, type, resume, ville, date_debut, date_fin, statut) values
    ('test-rech-ev-ped', '[TEST] Journées fictives de Pédiatrie', 'journees', '[TEST] Résumé', 'Cotonou',
     '2027-03-12', '2027-03-14', 'publie'),
    ('test-rech-ev-ped-attente', '[TEST] Congrès de Pédiatrie en attente', 'congres', null, null,
     '2027-04-01', '2027-04-02', 'en_attente'),
    ('test-rech-ev-ped-archive', '[TEST] Atelier de Pédiatrie archivé', 'atelier', null, null,
     '2025-04-01', '2025-04-01', 'archive'),
    ('test-rech-ev-ped-refuse', '[TEST] Séminaire de Pédiatrie refusé', 'seminaire', null, null,
     '2027-05-01', '2027-05-01', 'refuse');
end
$$;

-- ── En visiteur anonyme (RPC du site) ────────────────────────────────────────
do $$
declare
  v_ids uuid[];
  v_non_publies bigint;
  v_n bigint;
  v_rang real;
begin
  perform test_anonyme();

  -- « pediatrie »
  select array_agg(id) into v_ids from public.rechercher('pediatrie', 100);
  perform test_verifier(
    (select id from public.societes where slug = 'test-rech-ped') = any(v_ids),
    'rechercher(''pediatrie'') trouve l''organisation publiée dont le nom contient « Pédiatrie »');
  perform test_verifier(
    (select id from public.evenements where slug = 'test-rech-ev-ped') = any(v_ids),
    'rechercher(''pediatrie'') trouve l''événement publié dont le titre contient « Pédiatrie »');
  perform test_verifier(
    (select type from public.rechercher('pediatrie', 100) where slug = 'test-rech-ped') = 'societe'
    and (select type from public.rechercher('pediatrie', 100) where slug = 'test-rech-ev-ped') = 'evenement',
    'rechercher : colonne type = « societe » ou « evenement »');
  perform test_verifier(
    (select sous_titre from public.rechercher('pediatrie', 100) where slug = 'test-rech-ev-ped') = '12/03/2027',
    'rechercher : sous-titre d''un événement = date de début JJ/MM/AAAA');
  perform test_verifier(
    (select sous_titre from public.rechercher('pediatrie', 100) where slug = 'test-rech-ped') = '[TEST] Société fictive de Pédiatrie',
    'rechercher : sous-titre d''une organisation = nom complet');

  -- « sbc »
  perform test_verifier(
    exists (select 1 from public.rechercher('sbc') where slug = 'test-rech-sbc' and titre = 'SBC' and type = 'societe'),
    'rechercher(''sbc'') trouve l''organisation au sigle SBC');
  perform test_verifier(
    (select rang from public.rechercher('sbc') where slug = 'test-rech-sbc') >= 1,
    'rechercher(''sbc'') : sigle exact, rang maximal (similarité 1)');

  -- Trigrammes : le sigle est trouvé malgré une faute de frappe.
  perform test_verifier(
    exists (select 1 from public.rechercher('kwzplx') where slug = 'test-rech-trgm'),
    'rechercher(''kwzplx'') trouve le sigle KWZPLM par similarité (pg_trgm)');

  -- Jamais de non publié.
  perform test_verifier(
    not exists (select 1 from public.rechercher('pediatrie', 1000) where slug in
      ('test-rech-ped-cachee', 'test-rech-ev-ped-attente', 'test-rech-ev-ped-archive', 'test-rech-ev-ped-refuse'))
    and not exists (select 1 from public.rechercher('sbc', 1000) where slug = 'test-rech-sbc-cachee'),
    'rechercher : aucun objet non publié (en_attente, brouillon, archive, refuse) parmi les résultats');

  perform test_deconnecter();

  -- Contre-épreuve en postgres (sans RLS) : tout ce que renvoie la fonction est publié.
  select count(*) into v_non_publies
    from (select * from public.rechercher('pediatrie', 1000)
          union all select * from public.rechercher('sbc', 1000)
          union all select * from public.rechercher('test fictive', 1000)
          union all select * from public.rechercher('congres', 1000)) res
   where (res.type = 'societe' and (select s.statut from public.societes s where s.id = res.id) <> 'publie')
      or (res.type = 'evenement' and (select e.statut from public.evenements e where e.id = res.id) <> 'publie');
  perform test_verifier(v_non_publies = 0,
    'rechercher appelée par postgres (sans RLS) : le filtre explicite statut = publie écarte tout non publié');

  -- Limite et ordre
  select count(*) into v_n from public.rechercher('test', 2);
  perform test_verifier(v_n <= 2, 'rechercher : le paramètre limite est respecté');
  perform test_verifier(
    (select bool_and(ok) from (
       select rang <= lag(rang) over () or lag(rang) over () is null as ok
         from public.rechercher('pediatrie', 100)) t),
    'rechercher : résultats classés par rang décroissant');
  select rang into v_rang from public.rechercher('pediatrie', 100) where slug = 'test-rech-ev-ped';
  perform test_verifier(v_rang > 0, 'rechercher : rang positif pour un résultat plein texte');

  -- Saisie vide ou sans mot utile : aucun résultat, aucune erreur.
  select count(*) into v_n from public.rechercher('', 20);
  perform test_verifier(v_n = 0, 'rechercher('''') : aucun résultat, sans erreur');
end
$$;

-- ── Même un modérateur n'obtient que du publié ───────────────────────────────
do $$
declare
  u_mod uuid := test_creer_utilisateur('rech-moderateur@exemple.invalid', '[TEST] Modérateur');
begin
  update public.profils set role = 'moderateur' where id = u_mod;
  perform test_connecter(u_mod);
  perform test_verifier(
    exists (select 1 from public.evenements where slug = 'test-rech-ev-ped-attente'),
    'préalable : le modérateur voit l''événement en attente dans la table');
  perform test_verifier(
    not exists (select 1 from public.rechercher('pediatrie', 1000) where slug in
      ('test-rech-ped-cachee', 'test-rech-ev-ped-attente', 'test-rech-ev-ped-archive', 'test-rech-ev-ped-refuse'))
    and exists (select 1 from public.rechercher('pediatrie', 1000) where slug = 'test-rech-ev-ped'),
    'rechercher appelée par un modérateur : uniquement le publié');
  perform test_deconnecter();
end
$$;

rollback;
