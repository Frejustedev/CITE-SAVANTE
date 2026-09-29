-- =============================================================================
-- seed_demo.sql — Données de démonstration de Cité Savante (développement UNIQUEMENT)
-- =============================================================================
-- Ne charge JAMAIS ce fichier sur un projet destiné à la production. Garde-fou
-- (décision 8, PROGRESS.md) : le bloc ci-dessous lève une exception tant que
-- « citesavante.demo » ne vaut pas exactement 'oui'. scripts/valider-base.sh le
-- règle avant de charger ce fichier ; en dehors de ce script, réglez-le à la
-- main avant un chargement volontaire :
--   set citesavante.demo = 'oui';
--   \i supabase/seed_demo.sql
--
-- Dépend de supabase/seed.sql (les 5 disciplines doivent déjà exister).
--
-- Contenu fictif, entièrement identifiable :
--   - organisations : nom_complet préfixé « [DÉMO] », sigles inventés (aucun ne
--     désigne une société existant réellement au Bénin), slugs préfixés
--     « demo- » ;
--   - événements : titres préfixés « [DÉMO] », slugs préfixés « demo- » ;
--   - emplacements publicitaires : annonceur préfixé « [DÉMO] » ;
--   - tout lien externe est fictif, en https://example.org/… ;
--   - aucune donnée personnelle réelle : soumis_par_nom/soumis_par_email et
--     cree_par restent NULL partout, les adresses de contact sont en
--     @example.org.
--
-- Idempotent autant que possible : les dates sont RELATIVES à la date du jour
-- de Porto-Novo (public.aujourdhui()), donc différentes à chaque exécution à
-- un autre jour ; un simple « on conflict do nothing » figerait de vieilles
-- dates ou dupliquerait les échéances (qui n'ont pas de clé naturelle). Ce
-- fichier commence donc par SUPPRIMER toutes les données « [DÉMO] »
-- existantes (même ordre que supabase/purge_demo.sql), puis les réinsère avec
-- des dates fraîches : deux chargements successifs, même le même jour,
-- donnent exactement le même résultat.
-- =============================================================================

-- ── Garde-fou : jamais par accident ──────────────────────────────────────────
do $$
begin
  if coalesce(current_setting('citesavante.demo', true), '') <> 'oui' then
    raise exception 'seed_demo.sql : jeu de données de démonstration, à ne charger qu''en développement. Réglez « citesavante.demo » à ''oui'' pour l''exécuter volontairement (set citesavante.demo = ''oui'';).'
      using errcode = '42501';
  end if;
end
$$;

-- ── Dépendance : les 5 disciplines de seed.sql doivent exister ───────────────
do $$
begin
  if (select count(*) from public.disciplines where slug in
        ('sante', 'sciences-techniques', 'agronomie-environnement',
         'sciences-humaines-sociales', 'droit-economie')) <> 5 then
    raise exception 'seed_demo.sql : les 5 disciplines de supabase/seed.sql sont introuvables — chargez seed.sql avant seed_demo.sql.';
  end if;
end
$$;

-- ── Nettoyage préalable (idempotence : voir en-tête) ─────────────────────────
-- Même ordre que supabase/purge_demo.sql : événements (cascade échéances,
-- organisateurs, disciplines liées et emplacements publicitaires rattachés),
-- puis organisations (cascade leurs disciplines), puis emplacements restants.
delete from public.evenements where titre like '[DÉMO]%';
delete from public.societes where nom_complet like '[DÉMO]%';
delete from public.emplacements_pub where annonceur like '[DÉMO]%';

-- =============================================================================
-- Organisations fictives (10) — réparties sur les 5 disciplines
-- =============================================================================
-- 8 publiées (dont 2 mises en avant, et une sans site ni plateforme — pour
-- l'écran de prospection du back-office), 1 en attente, 1 brouillon.
insert into public.societes
  (id, slug, sigle, nom_complet, categorie, ville, site_web, site_congres, statut, mise_en_avant) values
  ('de110000-0000-0000-0000-000000000001', 'demo-sbmi',   'SBMI',
     '[DÉMO] Société Béninoise de Médecine Interne', 'societe_savante'::public.categorie_organisation,
     'Cotonou', 'https://example.org/sbmi', 'https://example.org/congres-sbmi',
     'publie'::public.statut_publication, true),
  ('de110000-0000-0000-0000-000000000002', 'demo-abpn',   'ABPN',
     '[DÉMO] Association Béninoise de Pneumologie', 'societe_savante'::public.categorie_organisation,
     'Porto-Novo', 'https://example.org/abpn', null,
     'publie'::public.statut_publication, false),
  ('de110000-0000-0000-0000-000000000003', 'demo-sbgeo',  'SBGEO',
     '[DÉMO] Société Béninoise de Géosciences', 'societe_savante'::public.categorie_organisation,
     'Parakou', 'https://example.org/sbgeo', 'https://example.org/congres-sbgeo',
     'publie'::public.statut_publication, true),
  ('de110000-0000-0000-0000-000000000004', 'demo-abin',   'ABIN',
     '[DÉMO] Association Béninoise d''Informatique', 'association_professionnelle'::public.categorie_organisation,
     'Abomey-Calavi', 'https://example.org/abin', null,
     'publie'::public.statut_publication, false),
  ('de110000-0000-0000-0000-000000000005', 'demo-sbagro', 'SBAGRO',
     '[DÉMO] Société Béninoise d''Agronomie', 'societe_savante'::public.categorie_organisation,
     'Bohicon', 'https://example.org/sbagro', null,
     'publie'::public.statut_publication, false),
  ('de110000-0000-0000-0000-000000000006', 'demo-abenv',  'ABENV',
     '[DÉMO] Association Béninoise pour l''Environnement', 'association_professionnelle'::public.categorie_organisation,
     'Natitingou', null, null,
     'publie'::public.statut_publication, false),
  ('de110000-0000-0000-0000-000000000007', 'demo-sbshs',  'SBSHS',
     '[DÉMO] Société Béninoise des Sciences Humaines et Sociales', 'societe_savante'::public.categorie_organisation,
     'Cotonou', 'https://example.org/sbshs', null,
     'publie'::public.statut_publication, false),
  ('de110000-0000-0000-0000-000000000008', 'demo-iehp',   'IEHP',
     '[DÉMO] Institut d''Études sur l''Homme et la Société', 'institution_academique'::public.categorie_organisation,
     'Porto-Novo', 'https://example.org/iehp', null,
     'en_attente'::public.statut_publication, false),
  ('de110000-0000-0000-0000-000000000009', 'demo-abde',   'ABDE',
     '[DÉMO] Association Béninoise de Droit et d''Économie', 'association_professionnelle'::public.categorie_organisation,
     'Cotonou', 'https://example.org/abde', null,
     'publie'::public.statut_publication, false),
  ('de110000-0000-0000-0000-000000000010', 'demo-sbjur',  'SBJUR',
     '[DÉMO] Société Béninoise de Sciences Juridiques', 'societe_savante'::public.categorie_organisation,
     'Djougou', 'https://example.org/sbjur', null,
     'brouillon'::public.statut_publication, false);

insert into public.societe_disciplines (societe_id, discipline_id)
select s.id, d.id
from (values
  ('demo-sbmi',   'sante'),
  ('demo-abpn',   'sante'),
  ('demo-sbgeo',  'sciences-techniques'),
  ('demo-abin',   'sciences-techniques'),
  ('demo-sbagro', 'agronomie-environnement'),
  ('demo-abenv',  'agronomie-environnement'),
  ('demo-sbshs',  'sciences-humaines-sociales'),
  ('demo-iehp',   'sciences-humaines-sociales'),
  ('demo-abde',   'droit-economie'),
  ('demo-sbjur',  'droit-economie')
) as x(societe_slug, discipline_slug)
join public.societes s on s.slug = x.societe_slug
join public.disciplines d on d.slug = x.discipline_slug;

-- =============================================================================
-- Événements fictifs (20) — six prochains mois, tous types et modalités
-- =============================================================================
-- Statuts : 18 publiés (dont 3 déjà passés, visibles dans les archives —
-- spécifications section 7 : un événement passé reste « publie ») et
-- 2 en attente (pour tester la file de modération). Le congrès de pédiatrie
-- (n° 1) porte le parcours de bout en bout n° 1 : publié, lien_inscription et
-- site_web renseignés. L'événement n° 20 chevauche deux mois civils, calculé
-- depuis le 1ᵉʳ jour du mois suivant pour que le chevauchement soit vrai quel
-- que soit le jour d'exécution.
insert into public.evenements
  (id, slug, titre, type, resume, date_debut, date_fin, modalite, ville,
   lien_inscription, site_web, gratuit, credits_fmc, contact_email, statut, source, source_ref) values
  -- 1 — parcours e2e n° 1 : congrès publié, lien_inscription + site_web
  ('ee110000-0000-0000-0000-000000000001', 'demo-congres-pediatrie-cotonou',
   '[DÉMO] Congrès international de pédiatrie de Cotonou',
   'congres'::public.type_evenement, 'Rencontre annuelle fictive consacrée à la pédiatrie clinique et à la recherche pédiatrique.',
   (select public.aujourdhui()) + 150, (select public.aujourdhui()) + 152,
   'presentiel'::public.modalite_evenement, 'Cotonou',
   'https://example.org/inscription/pediatrie', 'https://example.org/congres-pediatrie',
   false, 'Crédits FMC : 6 points', 'inscriptions@example.org',
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  -- 2 — passé (archives)
  ('ee110000-0000-0000-0000-000000000002', 'demo-congres-medecine-interne',
   '[DÉMO] Congrès de médecine interne du Bénin',
   'congres'::public.type_evenement, 'Congrès fictif consacré aux avancées de la médecine interne.',
   (select public.aujourdhui()) - 40, (select public.aujourdhui()) - 38,
   'presentiel'::public.modalite_evenement, 'Cotonou',
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000003', 'demo-journees-pneumologie',
   '[DÉMO] Journées béninoises de pneumologie',
   'journees'::public.type_evenement, 'Journées scientifiques fictives dédiées aux maladies respiratoires.',
   (select public.aujourdhui()) + 20, (select public.aujourdhui()) + 21,
   'presentiel'::public.modalite_evenement, 'Porto-Novo',
   null, null, false, 'Crédits FMC : 3 points', null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000004', 'demo-colloque-geosciences',
   '[DÉMO] Colloque national de géosciences',
   'colloque'::public.type_evenement, 'Colloque fictif sur la géologie et les sciences de la Terre.',
   (select public.aujourdhui()) + 75, (select public.aujourdhui()) + 77,
   'hybride'::public.modalite_evenement, 'Parakou',
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000005', 'demo-seminaire-ia-appliquee',
   '[DÉMO] Séminaire d''intelligence artificielle appliquée',
   'seminaire'::public.type_evenement, 'Séminaire fictif sur les usages pratiques de l''intelligence artificielle.',
   (select public.aujourdhui()) + 6, (select public.aujourdhui()) + 6,
   'en_ligne'::public.modalite_evenement, null,
   null, null, true, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000006', 'demo-atelier-cartographie',
   '[DÉMO] Atelier de cartographie numérique',
   'atelier'::public.type_evenement, 'Atelier pratique fictif sur les outils de cartographie numérique.',
   (select public.aujourdhui()) + 33, (select public.aujourdhui()) + 34,
   'presentiel'::public.modalite_evenement, 'Abomey-Calavi',
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000007', 'demo-webinaire-agriculture-durable',
   '[DÉMO] Webinaire sur l''agriculture durable',
   'webinaire'::public.type_evenement, 'Webinaire fictif sur les pratiques agricoles durables.',
   (select public.aujourdhui()) + 4, (select public.aujourdhui()) + 4,
   'en_ligne'::public.modalite_evenement, null,
   null, null, true, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000008', 'demo-formation-agroecologie',
   '[DÉMO] Formation en agroécologie',
   'formation'::public.type_evenement, 'Formation fictive aux principes de l''agroécologie.',
   (select public.aujourdhui()) + 90, (select public.aujourdhui()) + 92,
   'presentiel'::public.modalite_evenement, 'Bohicon',
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  -- 9 — en attente (modération)
  ('ee110000-0000-0000-0000-000000000009', 'demo-congres-agroforesterie',
   '[DÉMO] Congrès régional d''agroforesterie',
   'congres'::public.type_evenement, 'Congrès fictif sur les systèmes agroforestiers.',
   (select public.aujourdhui()) + 110, (select public.aujourdhui()) + 112,
   'presentiel'::public.modalite_evenement, 'Natitingou',
   null, null, false, null, null,
   'en_attente'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000010', 'demo-journees-environnement-biodiversite',
   '[DÉMO] Journées environnement et biodiversité',
   'journees'::public.type_evenement, 'Journées fictives sur la préservation de la biodiversité.',
   (select public.aujourdhui()) + 55, (select public.aujourdhui()) + 56,
   'hybride'::public.modalite_evenement, 'Natitingou',
   null, null, true, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000011', 'demo-colloque-shs',
   '[DÉMO] Colloque de sciences humaines et sociales',
   'colloque'::public.type_evenement, 'Colloque fictif pluridisciplinaire en sciences humaines et sociales.',
   (select public.aujourdhui()) + 130, (select public.aujourdhui()) + 131,
   'presentiel'::public.modalite_evenement, 'Cotonou',
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  -- 12 — en attente (modération)
  ('ee110000-0000-0000-0000-000000000012', 'demo-seminaire-sociologie-urbaine',
   '[DÉMO] Séminaire de sociologie urbaine',
   'seminaire'::public.type_evenement, 'Séminaire fictif sur les transformations urbaines.',
   (select public.aujourdhui()) + 18, (select public.aujourdhui()) + 18,
   'en_ligne'::public.modalite_evenement, null,
   null, null, true, null, null,
   'en_attente'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000013', 'demo-atelier-ecriture-scientifique',
   '[DÉMO] Atelier d''écriture scientifique',
   'atelier'::public.type_evenement, 'Atelier fictif de rédaction d''articles scientifiques.',
   (select public.aujourdhui()) + 42, (select public.aujourdhui()) + 42,
   'presentiel'::public.modalite_evenement, 'Cotonou',
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000014', 'demo-webinaire-droit-affaires',
   '[DÉMO] Webinaire de droit des affaires',
   'webinaire'::public.type_evenement, 'Webinaire fictif sur le droit des affaires en Afrique de l''Ouest.',
   (select public.aujourdhui()) + 2, (select public.aujourdhui()) + 2,
   'en_ligne'::public.modalite_evenement, null,
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000015', 'demo-formation-fiscalite-entreprises',
   '[DÉMO] Formation en fiscalité des entreprises',
   'formation'::public.type_evenement, 'Formation fictive sur les obligations fiscales des entreprises.',
   (select public.aujourdhui()) + 160, (select public.aujourdhui()) + 161,
   'presentiel'::public.modalite_evenement, 'Cotonou',
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000016', 'demo-congres-droit-economique',
   '[DÉMO] Congrès de droit économique',
   'congres'::public.type_evenement, 'Congrès fictif sur les mutations du droit économique.',
   (select public.aujourdhui()) + 95, (select public.aujourdhui()) + 97,
   'hybride'::public.modalite_evenement, 'Cotonou',
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  -- 17 — passé (archives)
  ('ee110000-0000-0000-0000-000000000017', 'demo-journees-chirurgie',
   '[DÉMO] Journées de chirurgie',
   'journees'::public.type_evenement, 'Journées fictives sur les techniques chirurgicales.',
   (select public.aujourdhui()) - 90, (select public.aujourdhui()) - 90,
   'presentiel'::public.modalite_evenement, 'Cotonou',
   null, null, false, 'Crédits FMC : 5 points', null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  -- 18 — passé (archives)
  ('ee110000-0000-0000-0000-000000000018', 'demo-colloque-histoire-regionale',
   '[DÉMO] Colloque d''histoire régionale',
   'colloque'::public.type_evenement, 'Colloque fictif sur l''histoire régionale du golfe du Bénin.',
   (select public.aujourdhui()) - 200, (select public.aujourdhui()) - 198,
   'presentiel'::public.modalite_evenement, 'Porto-Novo',
   null, null, true, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  ('ee110000-0000-0000-0000-000000000019', 'demo-seminaire-mathematiques-appliquees',
   '[DÉMO] Séminaire de mathématiques appliquées',
   'seminaire'::public.type_evenement, 'Séminaire fictif sur les applications des mathématiques.',
   (select public.aujourdhui()) + 7, (select public.aujourdhui()) + 7,
   'en_ligne'::public.modalite_evenement, null,
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null),
  -- 20 — chevauche deux mois civils (calculé depuis le 1er jour du mois suivant)
  ('ee110000-0000-0000-0000-000000000020', 'demo-colloque-multidisciplinaire-2mois',
   '[DÉMO] Colloque international multidisciplinaire',
   'colloque'::public.type_evenement, 'Colloque fictif à cheval sur deux mois, pour tester l''affichage des dates.',
   (date_trunc('month', (select public.aujourdhui()) + interval '1 month'))::date - 2,
   (date_trunc('month', (select public.aujourdhui()) + interval '1 month'))::date + 2,
   'hybride'::public.modalite_evenement, 'Cotonou',
   null, null, false, null, null,
   'publie'::public.statut_publication, 'manuel'::public.source_evenement, null);

-- ── Organisateurs (dont un co-organisateur, sur le congrès de pédiatrie) ─────
insert into public.evenement_societes (evenement_id, societe_id, role)
select e.id, s.id, x.role::public.role_organisation
from (values
  ('demo-congres-pediatrie-cotonou',        'demo-sbmi',   'organisateur'),
  ('demo-congres-pediatrie-cotonou',        'demo-abpn',   'co_organisateur'),
  ('demo-congres-medecine-interne',         'demo-sbmi',   'organisateur'),
  ('demo-journees-pneumologie',             'demo-abpn',   'organisateur'),
  ('demo-colloque-geosciences',             'demo-sbgeo',  'organisateur'),
  ('demo-seminaire-ia-appliquee',           'demo-abin',   'organisateur'),
  ('demo-atelier-cartographie',             'demo-sbgeo',  'organisateur'),
  ('demo-webinaire-agriculture-durable',    'demo-sbagro', 'organisateur'),
  ('demo-formation-agroecologie',           'demo-sbagro', 'organisateur'),
  ('demo-congres-agroforesterie',           'demo-abenv',  'organisateur'),
  ('demo-journees-environnement-biodiversite', 'demo-abenv', 'organisateur'),
  ('demo-colloque-shs',                     'demo-sbshs',  'organisateur'),
  ('demo-seminaire-sociologie-urbaine',     'demo-sbshs',  'organisateur'),
  ('demo-atelier-ecriture-scientifique',    'demo-sbshs',  'organisateur'),
  ('demo-webinaire-droit-affaires',         'demo-abde',   'organisateur'),
  ('demo-formation-fiscalite-entreprises',  'demo-abde',   'organisateur'),
  ('demo-congres-droit-economique',         'demo-abde',   'organisateur'),
  ('demo-journees-chirurgie',               'demo-sbmi',   'organisateur'),
  ('demo-colloque-histoire-regionale',      'demo-sbshs',  'organisateur'),
  ('demo-seminaire-mathematiques-appliquees','demo-sbgeo', 'organisateur'),
  ('demo-colloque-multidisciplinaire-2mois','demo-sbmi',   'organisateur')
) as x(evenement_slug, societe_slug, role)
join public.evenements e on e.slug = x.evenement_slug
join public.societes s on s.slug = x.societe_slug;

-- ── Disciplines rattachées (les 5 sont représentées) ─────────────────────────
insert into public.evenement_disciplines (evenement_id, discipline_id)
select e.id, d.id
from (values
  ('demo-congres-pediatrie-cotonou',        'sante'),
  ('demo-congres-medecine-interne',         'sante'),
  ('demo-journees-pneumologie',             'sante'),
  ('demo-colloque-geosciences',             'sciences-techniques'),
  ('demo-seminaire-ia-appliquee',           'sciences-techniques'),
  ('demo-atelier-cartographie',             'sciences-techniques'),
  ('demo-webinaire-agriculture-durable',    'agronomie-environnement'),
  ('demo-formation-agroecologie',           'agronomie-environnement'),
  ('demo-congres-agroforesterie',           'agronomie-environnement'),
  ('demo-journees-environnement-biodiversite', 'agronomie-environnement'),
  ('demo-colloque-shs',                     'sciences-humaines-sociales'),
  ('demo-seminaire-sociologie-urbaine',     'sciences-humaines-sociales'),
  ('demo-atelier-ecriture-scientifique',    'sciences-humaines-sociales'),
  ('demo-webinaire-droit-affaires',         'droit-economie'),
  ('demo-formation-fiscalite-entreprises',  'droit-economie'),
  ('demo-congres-droit-economique',         'droit-economie'),
  ('demo-journees-chirurgie',               'sante'),
  ('demo-colloque-histoire-regionale',      'sciences-humaines-sociales'),
  ('demo-seminaire-mathematiques-appliquees','sciences-techniques'),
  ('demo-colloque-multidisciplinaire-2mois','sante')
) as x(evenement_slug, discipline_slug)
join public.evenements e on e.slug = x.evenement_slug
join public.disciplines d on d.slug = x.discipline_slug;

-- =============================================================================
-- Échéances (1 à 3 par événement)
-- =============================================================================
-- Règle de base : une échéance « inscription » le jour de l'événement. Pour
-- les événements dont le début tombe dans les 7 prochains jours (n° 5, 7, 14,
-- 19 — tous publiés), cette échéance est automatiquement « urgente » (badge
-- or, spécifications section 7). Pour les événements déjà passés (n° 2, 17,
-- 18), elle est automatiquement déjà passée.
insert into public.echeances (evenement_id, type, date_limite)
select id, 'inscription'::public.type_echeance, date_debut
from public.evenements
where slug like 'demo-%';

-- Deux échéances supplémentaires sur le congrès de pédiatrie (parcours e2e),
-- pour illustrer plusieurs échéances sur un même événement.
insert into public.echeances (evenement_id, type, libelle, date_limite)
select id, 'soumission_resumes'::public.type_echeance, 'Soumission des résumés', date_debut - 30
from public.evenements where slug = 'demo-congres-pediatrie-cotonou';

insert into public.echeances (evenement_id, type, libelle, date_limite)
select id, 'inscription_tarif_preferentiel'::public.type_echeance, 'Tarif préférentiel', date_debut - 60
from public.evenements where slug = 'demo-congres-pediatrie-cotonou';

-- =============================================================================
-- Emplacements publicitaires fictifs (2), actifs sur la période courante
-- =============================================================================
insert into public.emplacements_pub
  (type, titre, annonceur, texte_alternatif, lien, discipline_id, evenement_id,
   date_debut, date_fin, actif)
values
  ('evenement_en_avant'::public.type_emplacement,
   '[DÉMO] Mise en avant — congrès de pédiatrie',
   '[DÉMO] Cité Savante',
   'Bannière de mise en avant du congrès [DÉMO] de pédiatrie de Cotonou',
   'https://example.org/congres-pediatrie',
   (select id from public.disciplines where slug = 'sante'),
   (select id from public.evenements where slug = 'demo-congres-pediatrie-cotonou'),
   (select public.aujourdhui()) - 5, (select public.aujourdhui()) + 30, true),
  ('banniere_agenda'::public.type_emplacement,
   '[DÉMO] Bannière agenda — partenaire fictif',
   '[DÉMO] Fournisseur médical Exemple',
   null,
   'https://example.org/partenaire',
   null, null,
   (select public.aujourdhui()) - 10, (select public.aujourdhui()) + 60, true);
