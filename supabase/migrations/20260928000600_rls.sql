-- =============================================================================
-- Migration 6/7 — Sécurité au niveau des lignes (RLS) et privilèges
-- =============================================================================
-- Ce que fait cette migration (spécifications, section 6) :
--   - active la RLS sur les 14 tables, sans exception ;
--   - crée les politiques du tableau de la section 6, une par opération
--     (select / insert / update / delete), aux noms explicites ;
--   - demandes_contact : un modérateur ne peut modifier QUE la colonne traitee
--     (politique + privilège de colonne) ;
--   - societes et evenements : soumis_par_nom et soumis_par_email illisibles
--     par anon et authenticated, cree_par illisible par anon (privilèges de
--     colonne, ajout de la relecture de sécurité, voir plus bas) ;
--   - retire TRUNCATE à anon et authenticated (durcissement, voir plus bas).
--
-- Conventions :
--   - rôles : les politiques de lecture visent anon et/ou authenticated ; aucune
--     politique d'écriture ne vise anon. Le client de service (service_role)
--     contourne la RLS : les formulaires publics, la passerelle et les e-mails
--     passent par lui, côté serveur uniquement (server actions contrôlées) ;
--   - performance (recommandation Supabase) : auth.uid(), est_moderateur() et
--     est_admin() sont écrits « (select …) », évalués une fois par requête et
--     non une fois par ligne ;
--   - « si l'événement est visible » = exists (select 1 from evenements e where
--     e.id = evenement_id) : la sous-requête hérite de la RLS d'evenements ;
--   - tables sans politique pour une opération = opération refusée.
-- Idempotente : « drop policy if exists » avant chaque « create policy ».
-- =============================================================================

alter table public.disciplines            enable row level security;
alter table public.societes               enable row level security;
alter table public.societe_disciplines    enable row level security;
alter table public.evenements             enable row level security;
alter table public.evenement_societes     enable row level security;
alter table public.evenement_disciplines  enable row level security;
alter table public.echeances              enable row level security;
alter table public.profils                enable row level security;
alter table public.gestionnaires          enable row level security;
alter table public.emplacements_pub       enable row level security;
alter table public.clics_sortants         enable row level security;
alter table public.journal_moderation     enable row level security;
alter table public.demandes_contact       enable row level security;
alter table public.tentatives_formulaires enable row level security;

-- =============================================================================
-- disciplines — lecture : tous ; écriture : administrateur
-- =============================================================================
drop policy if exists "Lecture : tous" on public.disciplines;
create policy "Lecture : tous"
  on public.disciplines for select to anon, authenticated
  using (true);

drop policy if exists "Ajout : administrateur" on public.disciplines;
create policy "Ajout : administrateur"
  on public.disciplines for insert to authenticated
  with check ((select public.est_admin()));

drop policy if exists "Modification : administrateur" on public.disciplines;
create policy "Modification : administrateur"
  on public.disciplines for update to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "Suppression : administrateur" on public.disciplines;
create policy "Suppression : administrateur"
  on public.disciplines for delete to authenticated
  using ((select public.est_admin()));

-- =============================================================================
-- societes — lecture : publiées, ou modérateur, ou gestionnaire de la fiche ;
-- modification : modérateur ou gestionnaire (champs protégés : déclencheur
-- proteger_societe) ; ajout et suppression : modérateur (les formulaires publics
-- passent par le client de service)
-- =============================================================================
drop policy if exists "Lecture : fiches publiées" on public.societes;
create policy "Lecture : fiches publiées"
  on public.societes for select to anon
  using (statut = 'publie');

drop policy if exists "Lecture : publiées, modérateur ou gestionnaire" on public.societes;
create policy "Lecture : publiées, modérateur ou gestionnaire"
  on public.societes for select to authenticated
  using (
    statut = 'publie'
    or (select public.est_moderateur())
    or public.gere_societe(id)
  );

drop policy if exists "Ajout : modérateur" on public.societes;
create policy "Ajout : modérateur"
  on public.societes for insert to authenticated
  with check ((select public.est_moderateur()));

drop policy if exists "Modification : modérateur ou gestionnaire" on public.societes;
create policy "Modification : modérateur ou gestionnaire"
  on public.societes for update to authenticated
  using ((select public.est_moderateur()) or public.gere_societe(id))
  with check ((select public.est_moderateur()) or public.gere_societe(id));

drop policy if exists "Suppression : modérateur" on public.societes;
create policy "Suppression : modérateur"
  on public.societes for delete to authenticated
  using ((select public.est_moderateur()));

-- =============================================================================
-- societe_disciplines — lecture : tous ; écriture : modérateur ou gestionnaire
-- de l'organisation
-- =============================================================================
drop policy if exists "Lecture : tous" on public.societe_disciplines;
create policy "Lecture : tous"
  on public.societe_disciplines for select to anon, authenticated
  using (true);

drop policy if exists "Ajout : modérateur ou gestionnaire" on public.societe_disciplines;
create policy "Ajout : modérateur ou gestionnaire"
  on public.societe_disciplines for insert to authenticated
  with check ((select public.est_moderateur()) or public.gere_societe(societe_id));

drop policy if exists "Modification : modérateur ou gestionnaire" on public.societe_disciplines;
create policy "Modification : modérateur ou gestionnaire"
  on public.societe_disciplines for update to authenticated
  using ((select public.est_moderateur()) or public.gere_societe(societe_id))
  with check ((select public.est_moderateur()) or public.gere_societe(societe_id));

drop policy if exists "Suppression : modérateur ou gestionnaire" on public.societe_disciplines;
create policy "Suppression : modérateur ou gestionnaire"
  on public.societe_disciplines for delete to authenticated
  using ((select public.est_moderateur()) or public.gere_societe(societe_id));

-- =============================================================================
-- evenements — lecture : publiés, ou modérateur, ou gestionnaire d'une
-- organisation organisatrice, ou créateur ; ajout : utilisateur connecté en son
-- propre nom (statut imposé par le déclencheur statut_evenement_gestionnaire) ;
-- modification : modérateur ou gestionnaire ; suppression : modérateur
-- =============================================================================
drop policy if exists "Lecture : événements publiés" on public.evenements;
create policy "Lecture : événements publiés"
  on public.evenements for select to anon
  using (statut = 'publie');

drop policy if exists "Lecture : publiés, modérateur, gestionnaire ou créateur" on public.evenements;
create policy "Lecture : publiés, modérateur, gestionnaire ou créateur"
  on public.evenements for select to authenticated
  using (
    statut = 'publie'
    or (select public.est_moderateur())
    or cree_par = (select auth.uid())
    or public.gere_evenement(id)
  );

drop policy if exists "Ajout : utilisateur connecté, en son nom" on public.evenements;
create policy "Ajout : utilisateur connecté, en son nom"
  on public.evenements for insert to authenticated
  with check (cree_par = (select auth.uid()));

drop policy if exists "Modification : modérateur ou gestionnaire" on public.evenements;
create policy "Modification : modérateur ou gestionnaire"
  on public.evenements for update to authenticated
  using ((select public.est_moderateur()) or public.gere_evenement(id))
  with check ((select public.est_moderateur()) or public.gere_evenement(id));

drop policy if exists "Suppression : modérateur" on public.evenements;
create policy "Suppression : modérateur"
  on public.evenements for delete to authenticated
  using ((select public.est_moderateur()));

-- =============================================================================
-- evenement_societes — lecture : si l'événement est visible ; écriture :
-- modérateur, ou gestionnaire de l'organisation liée ET auteur de l'événement
-- (sans cette seconde condition, un gestionnaire pourrait rattacher à son
-- organisation l'événement d'un autre et en prendre la gestion)
-- =============================================================================
drop policy if exists "Lecture : si l'événement est visible" on public.evenement_societes;
create policy "Lecture : si l'événement est visible"
  on public.evenement_societes for select to anon, authenticated
  using (exists (select 1 from public.evenements e where e.id = evenement_societes.evenement_id));

drop policy if exists "Ajout : modérateur ou gestionnaire auteur" on public.evenement_societes;
create policy "Ajout : modérateur ou gestionnaire auteur"
  on public.evenement_societes for insert to authenticated
  with check (
    (select public.est_moderateur())
    or (
      public.gere_societe(societe_id)
      and exists (
        select 1 from public.evenements e
        where e.id = evenement_societes.evenement_id
          and e.cree_par = (select auth.uid())
      )
    )
  );

drop policy if exists "Modification : modérateur ou gestionnaire auteur" on public.evenement_societes;
create policy "Modification : modérateur ou gestionnaire auteur"
  on public.evenement_societes for update to authenticated
  using (
    (select public.est_moderateur())
    or (
      public.gere_societe(societe_id)
      and exists (
        select 1 from public.evenements e
        where e.id = evenement_societes.evenement_id
          and e.cree_par = (select auth.uid())
      )
    )
  )
  with check (
    (select public.est_moderateur())
    or (
      public.gere_societe(societe_id)
      and exists (
        select 1 from public.evenements e
        where e.id = evenement_societes.evenement_id
          and e.cree_par = (select auth.uid())
      )
    )
  );

drop policy if exists "Suppression : modérateur ou gestionnaire auteur" on public.evenement_societes;
create policy "Suppression : modérateur ou gestionnaire auteur"
  on public.evenement_societes for delete to authenticated
  using (
    (select public.est_moderateur())
    or (
      public.gere_societe(societe_id)
      and exists (
        select 1 from public.evenements e
        where e.id = evenement_societes.evenement_id
          and e.cree_par = (select auth.uid())
      )
    )
  );

-- =============================================================================
-- evenement_disciplines — lecture : si l'événement est visible ; écriture :
-- modérateur ou gestionnaire de l'événement
-- =============================================================================
drop policy if exists "Lecture : si l'événement est visible" on public.evenement_disciplines;
create policy "Lecture : si l'événement est visible"
  on public.evenement_disciplines for select to anon, authenticated
  using (exists (select 1 from public.evenements e where e.id = evenement_disciplines.evenement_id));

drop policy if exists "Ajout : modérateur ou gestionnaire de l'événement" on public.evenement_disciplines;
create policy "Ajout : modérateur ou gestionnaire de l'événement"
  on public.evenement_disciplines for insert to authenticated
  with check ((select public.est_moderateur()) or public.gere_evenement(evenement_id));

drop policy if exists "Modification : modérateur ou gestionnaire de l'événement" on public.evenement_disciplines;
create policy "Modification : modérateur ou gestionnaire de l'événement"
  on public.evenement_disciplines for update to authenticated
  using ((select public.est_moderateur()) or public.gere_evenement(evenement_id))
  with check ((select public.est_moderateur()) or public.gere_evenement(evenement_id));

drop policy if exists "Suppression : modérateur ou gestionnaire de l'événement" on public.evenement_disciplines;
create policy "Suppression : modérateur ou gestionnaire de l'événement"
  on public.evenement_disciplines for delete to authenticated
  using ((select public.est_moderateur()) or public.gere_evenement(evenement_id));

-- =============================================================================
-- echeances — lecture : si l'événement est visible ; écriture : modérateur ou
-- gestionnaire de l'événement
-- =============================================================================
drop policy if exists "Lecture : si l'événement est visible" on public.echeances;
create policy "Lecture : si l'événement est visible"
  on public.echeances for select to anon, authenticated
  using (exists (select 1 from public.evenements e where e.id = echeances.evenement_id));

drop policy if exists "Ajout : modérateur ou gestionnaire de l'événement" on public.echeances;
create policy "Ajout : modérateur ou gestionnaire de l'événement"
  on public.echeances for insert to authenticated
  with check ((select public.est_moderateur()) or public.gere_evenement(evenement_id));

drop policy if exists "Modification : modérateur ou gestionnaire de l'événement" on public.echeances;
create policy "Modification : modérateur ou gestionnaire de l'événement"
  on public.echeances for update to authenticated
  using ((select public.est_moderateur()) or public.gere_evenement(evenement_id))
  with check ((select public.est_moderateur()) or public.gere_evenement(evenement_id));

drop policy if exists "Suppression : modérateur ou gestionnaire de l'événement" on public.echeances;
create policy "Suppression : modérateur ou gestionnaire de l'événement"
  on public.echeances for delete to authenticated
  using ((select public.est_moderateur()) or public.gere_evenement(evenement_id));

-- =============================================================================
-- profils — lecture : le sien, ou modérateur ; modification : le sien (rôle et
-- « de confiance » protégés par le déclencheur proteger_profil), administrateur
-- pour tout ; ajout et suppression : administrateur (le profil est normalement
-- créé par le déclencheur creer_profil)
-- =============================================================================
drop policy if exists "Lecture : son profil, ou modérateur" on public.profils;
create policy "Lecture : son profil, ou modérateur"
  on public.profils for select to authenticated
  using (id = (select auth.uid()) or (select public.est_moderateur()));

drop policy if exists "Ajout : administrateur" on public.profils;
create policy "Ajout : administrateur"
  on public.profils for insert to authenticated
  with check ((select public.est_admin()));

drop policy if exists "Modification : son profil, ou administrateur" on public.profils;
create policy "Modification : son profil, ou administrateur"
  on public.profils for update to authenticated
  using (id = (select auth.uid()) or (select public.est_admin()))
  with check (id = (select auth.uid()) or (select public.est_admin()));

drop policy if exists "Suppression : administrateur" on public.profils;
create policy "Suppression : administrateur"
  on public.profils for delete to authenticated
  using ((select public.est_admin()));

-- =============================================================================
-- gestionnaires (demandes de gestion d'une fiche) — lecture : les siennes, ou
-- modérateur ; ajout : la sienne, au statut en_attente, sans décision
-- (decide_par et decide_le vides : durcissement, voir PROGRESS.md) ;
-- modification : modérateur (décision)
-- =============================================================================
drop policy if exists "Lecture : ses demandes, ou modérateur" on public.gestionnaires;
create policy "Lecture : ses demandes, ou modérateur"
  on public.gestionnaires for select to authenticated
  using (user_id = (select auth.uid()) or (select public.est_moderateur()));

drop policy if exists "Ajout : sa propre demande, en attente" on public.gestionnaires;
create policy "Ajout : sa propre demande, en attente"
  on public.gestionnaires for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and statut = 'en_attente'
    and decide_par is null
    and decide_le is null
  );

drop policy if exists "Modification : modérateur" on public.gestionnaires;
create policy "Modification : modérateur"
  on public.gestionnaires for update to authenticated
  using ((select public.est_moderateur()))
  with check ((select public.est_moderateur()));

-- =============================================================================
-- emplacements_pub — lecture : actifs et dont la période contient la date du
-- jour à Porto-Novo, ou administrateur ; écriture : administrateur
-- =============================================================================
drop policy if exists "Lecture : emplacements actifs du jour" on public.emplacements_pub;
create policy "Lecture : emplacements actifs du jour"
  on public.emplacements_pub for select to anon
  using (actif and (select public.aujourdhui()) between date_debut and date_fin);

drop policy if exists "Lecture : emplacements actifs du jour, ou administrateur" on public.emplacements_pub;
create policy "Lecture : emplacements actifs du jour, ou administrateur"
  on public.emplacements_pub for select to authenticated
  using (
    (actif and (select public.aujourdhui()) between date_debut and date_fin)
    or (select public.est_admin())
  );

drop policy if exists "Ajout : administrateur" on public.emplacements_pub;
create policy "Ajout : administrateur"
  on public.emplacements_pub for insert to authenticated
  with check ((select public.est_admin()));

drop policy if exists "Modification : administrateur" on public.emplacements_pub;
create policy "Modification : administrateur"
  on public.emplacements_pub for update to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "Suppression : administrateur" on public.emplacements_pub;
create policy "Suppression : administrateur"
  on public.emplacements_pub for delete to authenticated
  using ((select public.est_admin()));

-- =============================================================================
-- clics_sortants — lecture : modérateur ; aucune écriture (insertion par le
-- client de service, dans la passerelle /go)
-- =============================================================================
drop policy if exists "Lecture : modérateur" on public.clics_sortants;
create policy "Lecture : modérateur"
  on public.clics_sortants for select to authenticated
  using ((select public.est_moderateur()));

-- =============================================================================
-- journal_moderation — lecture : modérateur ; aucune écriture (insertion par le
-- client de service, à chaque décision de modération)
-- =============================================================================
drop policy if exists "Lecture : modérateur" on public.journal_moderation;
create policy "Lecture : modérateur"
  on public.journal_moderation for select to authenticated
  using ((select public.est_moderateur()));

-- =============================================================================
-- demandes_contact — lecture : modérateur ; modification de traitee seulement :
-- modérateur ; insertion par le client de service
-- =============================================================================
drop policy if exists "Lecture : modérateur" on public.demandes_contact;
create policy "Lecture : modérateur"
  on public.demandes_contact for select to authenticated
  using ((select public.est_moderateur()));

drop policy if exists "Modification de traitee : modérateur" on public.demandes_contact;
create policy "Modification de traitee : modérateur"
  on public.demandes_contact for update to authenticated
  using ((select public.est_moderateur()))
  with check ((select public.est_moderateur()));

-- La politique ne peut pas restreindre les colonnes : ce sont les privilèges
-- qui le font. authenticated ne peut plus modifier que traitee (et anon rien).
revoke update on public.demandes_contact from anon, authenticated;
grant update (traitee) on public.demandes_contact to authenticated;

-- =============================================================================
-- tentatives_formulaires — aucune politique : ni lecture ni écriture hors client
-- de service (limitation des envois des formulaires publics)
-- =============================================================================

-- =============================================================================
-- Durcissement : colonnes de données personnelles de societes et evenements
-- =============================================================================
-- Ajout de la relecture de sécurité. Une politique RLS filtre des LIGNES, pas
-- des colonnes : sans ce bloc, la lecture publique (« statut = 'publie' »)
-- donnait à n'importe qui, avec la clé publique, le nom et l'e-mail de la
-- personne qui a soumis chaque fiche ou événement publié
-- (GET /rest/v1/societes?select=soumis_par_nom,soumis_par_email), et
-- l'identifiant du compte créateur de chaque événement (cree_par). Prouvé par
-- supabase/tests/50_securite.test.sql.
--   - soumis_par_nom, soumis_par_email : lisibles ni par anon ni par
--     authenticated (un compte se crée librement par lien magique). Les
--     modérateurs passent par public.auteur_soumission() ; les e-mails aux
--     auteurs (phases 5 et 6) par le client de service ;
--   - cree_par : lisible par authenticated (« mes événements », politiques de
--     evenement_societes), pas par anon.
-- Conséquences pour le code (PROGRESS.md) : pour anon et authenticated,
-- « select * » (select=* de PostgREST) et « return=representation » sans liste
-- de colonnes échouent désormais sur ces deux tables (42501) ; toujours lister
-- les colonnes. Une colonne ajoutée plus tard n'est lisible qu'une fois
-- ajoutée ici (fermé par défaut). Le client de service garde tous les droits.
-- Les politiques de la table elle-même n'ont pas besoin de ces droits (vérifié) ;
-- les sous-requêtes des politiques d'autres tables, si : evenements.id (anon,
-- authenticated) et evenements.cree_par (authenticated) restent accordés.
-- Idempotent : « revoke select » sur une table retire aussi ses droits de
-- colonne, puis « grant » les redonne.
revoke select on public.societes from anon, authenticated;
grant select (
  id, slug, sigle, nom_complet, categorie, description, annee_creation, ville, pays,
  site_web, site_congres, email, telephone, reseaux, logo_path, statut, mise_en_avant,
  recherche, created_at, updated_at
) on public.societes to anon, authenticated;

revoke select on public.evenements from anon, authenticated;
grant select (
  id, slug, titre, type, resume, description, date_debut, date_fin, heure_debut,
  modalite, lieu_nom, adresse, ville, pays, lien_inscription, site_web, affiche_path,
  tarifs, gratuit, credits_fmc, contact_email, statut, source, source_ref,
  recherche, created_at, updated_at
) on public.evenements to anon, authenticated;
grant select (cree_par) on public.evenements to authenticated;

-- =============================================================================
-- Durcissement : TRUNCATE
-- =============================================================================
-- Supabase accorde par défaut tous les privilèges (dont TRUNCATE) à anon et
-- authenticated sur les tables de public. TRUNCATE n'est pas soumis à la RLS :
-- même si l'API ne l'expose pas, on le retire.
revoke truncate on
  public.disciplines, public.societes, public.societe_disciplines, public.evenements,
  public.evenement_societes, public.evenement_disciplines, public.echeances,
  public.profils, public.gestionnaires, public.emplacements_pub, public.clics_sortants,
  public.journal_moderation, public.demandes_contact, public.tentatives_formulaires
from anon, authenticated;
