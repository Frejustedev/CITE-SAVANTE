-- =============================================================================
-- seed.sql — Données initiales de Cité Savante (production)
-- =============================================================================
-- Contenu réel, exactement les spécifications, section 5.6 :
--   - les 5 disciplines (ordre, slug, nom, description d'une phrase) ;
--   - les 5 organisations déjà connues, insérées au statut « brouillon » : nom
--     complet, logo et description restent à compléter dans le back-office par
--     le porteur du projet avant toute publication (un modérateur y passera le
--     statut à « publie ») ; toutes rattachées à la discipline « sante ».
-- Aucun événement réel n'est inventé ici (CLAUDE.md, section 6). Les données
-- fictives de démonstration sont dans seed_demo.sql, jamais chargées en
-- production.
-- Idempotent : chaque insertion est « on conflict … do nothing », rejouable
-- sans erreur ni doublon (le script de validation charge ce fichier une seule
-- fois par passage, mais un chargement manuel répété ne doit rien casser).
-- =============================================================================

-- ── Disciplines (section 5.6) ────────────────────────────────────────────────
-- Descriptions : une phrase factuelle sur le champ couvert, sans affirmation
-- sur l'association ou sur le Bénin.
insert into public.disciplines (ordre, slug, nom, description) values
  (1, 'sante', 'Santé et médecine',
      'Médecine, chirurgie, pharmacie, soins infirmiers et santé publique.'),
  (2, 'sciences-techniques', 'Sciences et techniques',
      'Mathématiques, physique, informatique, ingénierie et technologies.'),
  (3, 'agronomie-environnement', 'Agronomie et environnement',
      'Agriculture, élevage, foresterie, environnement et ressources naturelles.'),
  (4, 'sciences-humaines-sociales', 'Sciences humaines et sociales',
      'Histoire, sociologie, anthropologie, psychologie, lettres et sciences de l''éducation.'),
  (5, 'droit-economie', 'Droit et économie',
      'Droit, sciences politiques, économie et gestion.')
on conflict (slug) do nothing;

-- ── Organisations connues (section 5.6) ──────────────────────────────────────
-- Statut « brouillon » volontairement : seules les colonnes de la table de la
-- section 5.6 sont renseignées (slug, sigle, catégorie, site_web,
-- site_congres) ; nom_complet reste NULL, à compléter par le porteur du projet.
-- sometec.site_web et sobenchir.site_congres sont NULL (aucune valeur connue).
insert into public.societes (slug, sigle, nom_complet, categorie, site_web, site_congres, statut) values
  ('fss',       'FSS',       null, 'institution_academique'::public.categorie_organisation,
                             'https://fss-cotonou.com',  'https://j5s3.fss-cotonou.com',      'brouillon'::public.statut_publication),
  ('sobeped',   'SOBEPED',   null, 'societe_savante'::public.categorie_organisation,
                             'https://sobeped.com',      'https://congres.sobeped.com',       'brouillon'::public.statut_publication),
  ('sbc',       'SBC',       null, 'societe_savante'::public.categorie_organisation,
                             'https://sbcbenin.org',     'https://congres.sbcbenin.org',       'brouillon'::public.statut_publication),
  ('sometec',   'SOMETEC',   null, 'societe_savante'::public.categorie_organisation,
                             null,                       'https://congres.sometec.org',        'brouillon'::public.statut_publication),
  ('sobenchir', 'SOBENCHIR', null, 'societe_savante'::public.categorie_organisation,
                             'https://sobenchir.org',    null,                                  'brouillon'::public.statut_publication)
on conflict (slug) do nothing;

-- ── Rattachement à la discipline « santé » (section 5.6) ─────────────────────
insert into public.societe_disciplines (societe_id, discipline_id)
select s.id, d.id
from public.societes s, public.disciplines d
where s.slug in ('fss', 'sobeped', 'sbc', 'sometec', 'sobenchir')
  and d.slug = 'sante'
on conflict (societe_id, discipline_id) do nothing;
