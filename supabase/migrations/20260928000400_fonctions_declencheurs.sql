-- =============================================================================
-- Migration 4/7 — Fonctions utilitaires, fonctions de rôles et déclencheurs
-- =============================================================================
-- Ce que fait cette migration (spécifications, section 5.4) :
--   - aujourdhui() : la date du jour dans le fuseau Africa/Porto-Novo (ajout) ;
--   - maj_updated_at() et ses déclencheurs sur societes et evenements ;
--   - creer_profil() : crée la ligne de profils à l'inscription (déclencheur sur
--     auth.users) ;
--   - fonctions de rôles utilisées par la RLS : role_courant(), est_moderateur(),
--     est_admin(), gere_societe(uuid), gere_evenement(uuid) ;
--   - auteur_soumission(text, uuid) : coordonnées de l'auteur d'une soumission,
--     pour les modérateurs seulement (ajout de la relecture de sécurité) ;
--   - les trois déclencheurs de protection : proteger_societe,
--     statut_evenement_gestionnaire, proteger_profil.
--
-- Règles communes :
--   - chaque fonction a un search_path fixé (alerte Supabase
--     « function_search_path_mutable ») : « pg_catalog, public » pour les
--     fonctions security definer, « public, extensions » pour les autres ;
--   - les déclencheurs de protection ne contraignent QUE les requêtes d'un
--     utilisateur connecté (auth.role() = 'authenticated') qui n'est pas
--     modérateur (pour proteger_profil : pas administrateur). Le client de
--     service (auth.role() = 'service_role', utilisé par les server actions) et
--     le rôle postgres (migrations, seeds, éditeur SQL : auth.role() nul) ne
--     sont pas contraints. Durcissement (relecture de sécurité) : une requête
--     exécutée sous le rôle authenticated est contrainte AUSSI si le rôle lu
--     dans le JWT diffère (« Authenticated », absent…) : l'exemption exige
--     auth.role() différent de 'authenticated' ET current_user différent de
--     authenticated. Via PostgREST, les deux coïncident toujours ; ce second
--     test ferme la porte si ce n'est pas le cas (prouvé par
--     supabase/tests/50_securite.test.sql) ;
--   - une violation lève une exception en français, code 42501
--     (insufficient_privilege), que l'application traduit en message ;
--   - les fonctions de rôles (security definer) ne sont exécutables que par
--     authenticated et service_role, pas par anon (voir « Droits d'exécution »).
--     Les déclencheurs testent donc auth.role() dans un « if » SÉPARÉ, avant tout
--     appel à est_moderateur() / est_admin() : PostgreSQL vérifie le droit
--     d'exécution d'une fonction à la préparation de l'expression entière, même
--     si l'évaluation s'arrête avant elle.
-- Idempotente : « create or replace » partout.
-- =============================================================================

-- ── Date du jour à Porto-Novo ────────────────────────────────────────────────
-- Supabase tourne en UTC : current_date y donne la date de Greenwich, qui est
-- encore la veille entre minuit et 1 h à Porto-Novo (UTC+1). Toute notion
-- d'« aujourd'hui » côté SQL passe par cette fonction.
create or replace function public.aujourdhui()
returns date
language sql
stable
set search_path = public, extensions
as $$
  select (now() at time zone 'Africa/Porto-Novo')::date
$$;

-- ── updated_at automatique ───────────────────────────────────────────────────
create or replace function public.maj_updated_at()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create or replace trigger societes_updated
  before update on public.societes
  for each row execute function public.maj_updated_at();

create or replace trigger evenements_updated
  before update on public.evenements
  for each row execute function public.maj_updated_at();

-- ── Profil créé à l'inscription ──────────────────────────────────────────────
-- security definer : l'insertion dans auth.users est faite par GoTrue
-- (supabase_auth_admin), qui n'a aucun droit sur public.profils.
create or replace function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profils (id, nom) values (new.id, new.raw_user_meta_data ->> 'nom');
  return new;
end
$$;

create or replace trigger nouvel_utilisateur
  after insert on auth.users
  for each row execute function public.creer_profil();

-- ── Fonctions de rôles ───────────────────────────────────────────────────────
-- security definer : elles lisent profils et gestionnaires sans passer par la
-- RLS de ces tables (ce qui évite toute récursion entre politiques). Elles ne
-- renseignent que sur l'utilisateur courant et restent exécutables par
-- authenticated, car les politiques RLS les appellent avec les droits de
-- l'appelant (droits d'exécution en fin de fichier).
create or replace function public.role_courant()
returns public.role_utilisateur
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select role from public.profils where id = auth.uid()
$$;

create or replace function public.est_moderateur()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(public.role_courant() in ('admin', 'moderateur'), false)
$$;

create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(public.role_courant() = 'admin', false)
$$;

create or replace function public.gere_societe(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.gestionnaires
    where user_id = auth.uid()
      and societe_id = sid
      and statut = 'acceptee'
  )
$$;

create or replace function public.gere_evenement(eid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.evenement_societes es
    where es.evenement_id = eid
      and public.gere_societe(es.societe_id)
  )
$$;

-- ── Coordonnées de l'auteur d'une soumission (modérateurs) ───────────────────
-- Ajout de la relecture de sécurité. soumis_par_nom et soumis_par_email
-- (personne qui a rempli un formulaire public) sont des données personnelles :
-- la migration 6 retire à anon et authenticated le droit de les lire (sinon
-- n'importe qui les aspirait par l'API REST avec la clé publique). Un
-- modérateur en a besoin dans le back-office (aperçu d'une soumission,
-- spécifications 13) : cette fonction les lui renvoie, et ne renvoie RIEN à
-- quiconque n'est pas modérateur. security definer : elle lit des colonnes
-- que l'appelant ne peut pas lire. p_objet_type : 'societe' ou 'evenement'
-- (tout autre valeur : aucun résultat).
create or replace function public.auteur_soumission(p_objet_type text, p_objet_id uuid)
returns table (nom text, email text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select s.soumis_par_nom, s.soumis_par_email
  from public.societes s
  where p_objet_type = 'societe'
    and s.id = p_objet_id
    and public.est_moderateur()
  union all
  select e.soumis_par_nom, e.soumis_par_email
  from public.evenements e
  where p_objet_type = 'evenement'
    and e.id = p_objet_id
    and public.est_moderateur()
$$;

-- ── Protection des organisations ─────────────────────────────────────────────
-- Un gestionnaire modifie la fiche de son organisation, mais pas son statut, sa
-- mise en avant, son slug (adresse publique) ni sa catégorie.
-- Colonnes figées aussi (correctif du coordinateur) : soumis_par_nom et
-- soumis_par_email (ils reçoivent les e-mails de décision : un gestionnaire
-- pourrait les détourner vers lui), et logo_path (il ne doit désigner qu'un
-- fichier envoyé par la server action d'envoi, qui vérifie les droits puis
-- écrit le fichier ET cette colonne avec le client de service, spécifications
-- 5.7 ; sinon un gestionnaire ferait afficher l'image d'une autre fiche).
create or replace function public.proteger_societe()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  -- Client de service, postgres (auth.role() nul) : non contraints.
  if auth.role() is distinct from 'authenticated'
     and current_user <> 'authenticated' then
    return new;
  end if;
  if public.est_moderateur() then
    return new;
  end if;

  if new.statut is distinct from old.statut
     or new.mise_en_avant is distinct from old.mise_en_avant
     or new.slug is distinct from old.slug
     or new.categorie is distinct from old.categorie then
    raise exception 'Modification refusée : seul un modérateur peut changer le statut, la mise en avant, le slug ou la catégorie d''une organisation.'
      using errcode = '42501';
  end if;

  if new.soumis_par_nom is distinct from old.soumis_par_nom
     or new.soumis_par_email is distinct from old.soumis_par_email
     or new.logo_path is distinct from old.logo_path then
    raise exception 'Modification refusée : le logo et les coordonnées de l''auteur d''une organisation ne se modifient pas directement (le logo s''envoie depuis l''espace gestionnaire).'
      using errcode = '42501';
  end if;
  return new;
end
$$;

create or replace trigger proteger_societe
  before update on public.societes
  for each row execute function public.proteger_societe();

-- ── Statut des événements saisis par un utilisateur connecté ─────────────────
-- À la création : statut « publie » si le profil est « de confiance », sinon
-- « en_attente » (quel que soit le statut envoyé) ; source « manuel »,
-- source_ref nul ; soumis_par_nom et soumis_par_email nuls (coordonnées
-- réservées aux formulaires publics, écrites par le client de service) ;
-- affiche_path nul (renseigné ensuite par la server action d'envoi, avec le
-- client de service, spécifications 5.7 ; sinon un événement créé, et publié
-- d'office pour un profil « de confiance », afficherait l'affiche d'un autre).
-- À la modification : slug, source, source_ref et cree_par sont figés, ainsi
-- que soumis_par_nom, soumis_par_email (destinataires des e-mails de décision)
-- et affiche_path (écrite par la server action d'envoi avec le client de
-- service, après vérification des droits, spécifications 5.7) — correctif du
-- coordinateur. Statut :
--   - publie reste publie (la modification est visible et sera contrôlée a
--     posteriori, spécifications 12.5) ;
--   - archive reste archive ;
--   - refuse devient TOUJOURS en_attente, même pour un profil « de confiance »
--     (correctif du coordinateur : une retouche ne republie pas d'elle-même un
--     événement refusé ; la resoumission retourne en file de modération) ;
--   - brouillon et en_attente deviennent publie si le profil est « de
--     confiance », en_attente sinon.
-- Limite assumée : la ligne ne garde aucune trace du refus. Pour un profil
-- « de confiance », une SECONDE retouche trouve l'événement en_attente et le
-- publie, sans modérateur (prouvé par 20_declencheurs, bloc D). Ce profil
-- pouvait déjà créer un nouvel événement au même contenu, publié d'office : le
-- refus ne l'a jamais bloqué, la seconde retouche lui rend seulement la ligne
-- et le slug refusés. Fermer ce chemin demanderait une colonne posée par ce
-- déclencheur à chaque passage à « refuse » (PROGRESS.md, phase 1, « À valider
-- par le porteur »).
create or replace function public.statut_evenement_gestionnaire()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  v_confiance boolean;
begin
  -- Client de service (formulaires publics, synchronisation P1), postgres
  -- (auth.role() nul) : non contraints. anon n'arrive jamais jusqu'à
  -- l'insertion (RLS), mais ce déclencheur « before » s'exécute avant la RLS :
  -- il ne doit donc pas appeler est_moderateur() pour lui.
  if auth.role() is distinct from 'authenticated'
     and current_user <> 'authenticated' then
    return new;
  end if;
  if public.est_moderateur() then
    return new;
  end if;

  -- Le profil de l'utilisateur lui est lisible (RLS de profils : « le sien »).
  v_confiance := coalesce(
    (select p.de_confiance from public.profils p where p.id = auth.uid()),
    false
  );

  if tg_op = 'INSERT' then
    new.statut := case when v_confiance then 'publie' else 'en_attente' end;
    new.source := 'manuel';
    new.source_ref := null;
    new.soumis_par_nom := null;
    new.soumis_par_email := null;
    new.affiche_path := null;
    return new;
  end if;

  if new.slug is distinct from old.slug
     or new.source is distinct from old.source
     or new.source_ref is distinct from old.source_ref
     or new.cree_par is distinct from old.cree_par then
    raise exception 'Modification refusée : le slug, la source, la référence de source et l''auteur d''un événement ne peuvent pas être changés.'
      using errcode = '42501';
  end if;

  if new.soumis_par_nom is distinct from old.soumis_par_nom
     or new.soumis_par_email is distinct from old.soumis_par_email
     or new.affiche_path is distinct from old.affiche_path then
    raise exception 'Modification refusée : l''affiche et les coordonnées de l''auteur d''un événement ne se modifient pas directement (l''affiche s''envoie depuis l''espace gestionnaire).'
      using errcode = '42501';
  end if;

  if old.statut = 'publie' then
    new.statut := 'publie';
  elsif old.statut = 'archive' then
    new.statut := 'archive';
  elsif old.statut = 'refuse' then
    new.statut := 'en_attente';
  else
    new.statut := case when v_confiance then 'publie' else 'en_attente' end;
  end if;

  return new;
end
$$;

create or replace trigger statut_evenement_gestionnaire
  before insert or update on public.evenements
  for each row execute function public.statut_evenement_gestionnaire();

-- ── Protection des profils ───────────────────────────────────────────────────
-- Chacun peut modifier son nom ; seul un administrateur change le rôle ou le
-- statut « de confiance ».
create or replace function public.proteger_profil()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  -- Client de service, postgres (requête de désignation du premier
  -- administrateur, PROGRESS.md) : non contraints.
  if auth.role() is distinct from 'authenticated'
     and current_user <> 'authenticated' then
    return new;
  end if;
  if public.est_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.de_confiance is distinct from old.de_confiance then
    raise exception 'Modification refusée : seul un administrateur peut changer le rôle ou le statut « de confiance » d''un profil.'
      using errcode = '42501';
  end if;
  return new;
end
$$;

create or replace trigger proteger_profil
  before update on public.profils
  for each row execute function public.proteger_profil();

-- ── Droits d'exécution ───────────────────────────────────────────────────────
-- Les fonctions de déclencheur ne s'appellent pas directement (le droit
-- EXECUTE n'est vérifié qu'à la création du déclencheur, pas à son
-- déclenchement) : on retire l'exécution à PUBLIC, anon et authenticated, pour
-- qu'aucune ne soit exposée par l'API. service_role garde le droit hérité des
-- privilèges par défaut de Supabase, sans effet : une fonction « returns
-- trigger » ne s'appelle pas directement. creer_profil est security definer :
-- c'est la plus importante.
revoke execute on function public.maj_updated_at() from public, anon, authenticated;
revoke execute on function public.creer_profil() from public, anon, authenticated;
revoke execute on function public.proteger_societe() from public, anon, authenticated;
revoke execute on function public.statut_evenement_gestionnaire() from public, anon, authenticated;
revoke execute on function public.proteger_profil() from public, anon, authenticated;

-- Fonctions de rôles (security definer) : exécutables par authenticated (les
-- politiques RLS et les déclencheurs les appellent avec ses droits) et par
-- service_role, mais pas par anon ni PUBLIC. Aucune politique visant anon ne les
-- appelle (les politiques de lecture publiques sont écrites à part), et
-- l'alerte Supabase « anon_security_definer_function_executable » ne se
-- déclenche plus. Pour anon, elles répondraient de toute façon « non » (aucun
-- auth.uid()) ; on retire simplement une surface d'appel inutile (/rest/v1/rpc).
revoke execute on function public.role_courant() from public, anon;
revoke execute on function public.est_moderateur() from public, anon;
revoke execute on function public.est_admin() from public, anon;
revoke execute on function public.gere_societe(uuid) from public, anon;
revoke execute on function public.gere_evenement(uuid) from public, anon;
grant execute on function public.role_courant() to authenticated, service_role;
grant execute on function public.est_moderateur() to authenticated, service_role;
grant execute on function public.est_admin() to authenticated, service_role;
grant execute on function public.gere_societe(uuid) to authenticated, service_role;
grant execute on function public.gere_evenement(uuid) to authenticated, service_role;

-- auteur_soumission (security definer, données personnelles) : même règle ;
-- pour un non-modérateur elle ne renvoie aucune ligne.
revoke execute on function public.auteur_soumission(text, uuid) from public, anon;
grant execute on function public.auteur_soumission(text, uuid) to authenticated, service_role;
