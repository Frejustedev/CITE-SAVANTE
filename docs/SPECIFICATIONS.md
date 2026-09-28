# Cité Savante — Spécifications techniques

Version 1.0 · 28 septembre 2026
Document de référence pour le développement. Les règles générales (stack, charte, méthode) sont dans `CLAUDE.md`.

---

## 1. Contexte

Cité Savante (citesavante.com) est l'annuaire des sociétés savantes et l'agenda des congrès et événements scientifiques du Bénin. Le site sert aussi de passerelle vers les sites officiels des sociétés et de vitrine publicitaire.

Périmètre de ce document : le MVP (phases 0 à 7) et les évolutions P1 (section 17). Les évolutions P2 (version anglaise, paiement en ligne, ouverture sous-régionale) ne sont pas à développer, mais le code ne doit pas les empêcher (textes d'interface centralisés, champ `pays` présent).

---

## 2. Stack et dépendances

| Besoin | Choix |
| --- | --- |
| Framework | Next.js (dernière version stable), App Router, TypeScript strict |
| Base, comptes, fichiers | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| Styles | Tailwind CSS |
| Validation | Zod |
| Dates | date-fns, locale `fr`, fuseau `Africa/Porto-Novo` |
| E-mails | Resend |
| Anti-spam | Cloudflare Turnstile (vérification côté serveur par `fetch`) |
| Images d'aperçu | `next/og` (`ImageResponse`) |
| Tests | Vitest, Playwright |

Interdits : bibliothèques d'icônes, bibliothèques de composants UI complètes (MUI, Chakra, etc.), bibliothèques de calendrier lourdes, cartes interactives (Leaflet, Mapbox, Google Maps JS).

---

## 3. Structure du projet

Voir `CLAUDE.md`, section 4. Compléments :

- `src/config/site.ts` exporte : `nom` (« Cité Savante »), `slogan` (« Sociétés, congrès et événements scientifiques du Bénin »), `url` (depuis `NEXT_PUBLIC_SITE_URL`), `emailContact`, `signature` (`{ texte: "Conception : Dr Fréjuste AGBOTON", url: "https://frejusteagboton.info" }`), `reseaux`.
- `src/lib/textes.ts` centralise les libellés répétés (types d'événements, types d'échéances, statuts, catégories) pour préparer une future traduction.

---

## 4. Charte graphique et règles d'interface

### 4.1 Jetons

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `bordeaux` | #6B1E2E | Couleur principale, liens, boutons principaux |
| `bordeaux-profond` | #4A1420 | Survol, pied de page, titres forts |
| `creme` | #F7F1E3 | Fond général |
| `creme-soutenu` | #EDE3CC | Cartes, zones secondaires, quartiers du plan |
| `or` | #B8913A | Accents, fanions, contour de focus, filets |
| `or-clair` | #D9BD72 | Fonds d'accent légers, badges |
| `encre` | #2A1A1C | Texte courant |

Vérifier le contraste AA de chaque combinaison texte/fond utilisée ; `or` sur `creme` n'est autorisé que pour des éléments décoratifs ou du texte de grande taille.

### 4.2 Typographie

- Titres : Fraunces (graisses 500 et 700). Textes : EB Garamond (400, 500, italique 400).
- Échelle : 14 / 16 / 18 / 22 / 28 / 36 / 48 px ; texte courant 18 px sur ordinateur, 17 px sur mobile ; interligne 1,55.
- Chiffres des dates et des comptes à rebours : chiffres tabulaires.

### 4.3 Éléments d'interface

- Boutons : principal plein bordeaux texte crème ; secondaire contour bordeaux ; coins arrondis 6 px.
- Cartes : fond `creme-soutenu`, filet or de 1 px en haut, pas d'ombre portée.
- Badges de type d'événement : texte bordeaux sur `or-clair`, petites capitales.
- Pictogrammes SVG maison nécessaires au MVP : calendrier, lieu, en ligne, lien externe, horloge, partage, WhatsApp (tracé simplifié, pas le logo officiel), téléchargement, recherche, filtre, fanion, bâtiment (3 variantes pour le plan), plume, e-mail, téléphone, flèche. Trait de 1,5 px, extrémités arrondies, `currentColor`.

### 4.4 Mise en page

- Largeur de contenu maximale 1200 px ; gouttière 16 px sur mobile, 32 px au-delà de 768 px.
- En-tête : logotype texte « Cité Savante » en Fraunces (en attendant le logo), navigation : Sociétés, Agenda, Échéances, Référencer, Visibilité ; recherche accessible en permanence. Menu repliable sur mobile.
- Pied de page fond `bordeaux-profond`, texte crème : liens institutionnels, slogan, signature.

---

## 5. Modèle de données

Toutes les migrations sont dans `supabase/migrations/`, numérotées. Le SQL ci-dessous est la cible ; l'adapter si Supabase l'impose (par exemple le schéma de l'extension `unaccent`), en le signalant dans `PROGRESS.md`.

### 5.1 Extensions et recherche en français

```sql
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create text search configuration public.fr_unaccent (copy = pg_catalog.french);
alter text search configuration public.fr_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, french_stem;
```

### 5.2 Types énumérés

```sql
create type statut_publication as enum ('brouillon', 'en_attente', 'publie', 'refuse', 'archive');
create type categorie_organisation as enum ('societe_savante', 'institution_academique', 'association_professionnelle', 'autre');
create type type_evenement as enum ('congres', 'journees', 'colloque', 'seminaire', 'atelier', 'webinaire', 'formation', 'autre');
create type modalite_evenement as enum ('presentiel', 'en_ligne', 'hybride');
create type type_echeance as enum ('soumission_resumes', 'inscription_tarif_preferentiel', 'inscription', 'bourse', 'prix', 'autre');
create type role_utilisateur as enum ('admin', 'moderateur', 'gestionnaire');
create type statut_demande as enum ('en_attente', 'acceptee', 'refusee');
create type role_organisation as enum ('organisateur', 'co_organisateur', 'partenaire');
create type type_emplacement as enum ('banniere_accueil', 'banniere_agenda', 'banniere_discipline', 'evenement_en_avant', 'lettre');
create type type_cible as enum ('societe', 'evenement', 'emplacement');
create type source_evenement as enum ('manuel', 'synchro');
create type type_demande_contact as enum ('contact', 'visibilite');
```

### 5.3 Tables du MVP (14)

```sql
create table disciplines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nom text not null,
  description text,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

create table societes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sigle text not null,
  nom_complet text,
  categorie categorie_organisation not null default 'societe_savante',
  description text,
  annee_creation int check (annee_creation between 1800 and 2100),
  ville text,
  pays text not null default 'Bénin',
  site_web text,
  site_congres text,                -- plateforme de congrès, si distincte du site officiel
  email text,
  telephone text,
  reseaux jsonb not null default '{}'::jsonb,   -- { facebook, linkedin, x, youtube, whatsapp }
  logo_path text,
  statut statut_publication not null default 'en_attente',
  mise_en_avant boolean not null default false,
  soumis_par_nom text,
  soumis_par_email text,
  recherche tsvector generated always as (
    setweight(to_tsvector('public.fr_unaccent', coalesce(sigle, '')), 'A') ||
    setweight(to_tsvector('public.fr_unaccent', coalesce(nom_complet, '')), 'A') ||
    setweight(to_tsvector('public.fr_unaccent', coalesce(ville, '')), 'B') ||
    setweight(to_tsvector('public.fr_unaccent', coalesce(description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table societe_disciplines (
  societe_id uuid not null references societes(id) on delete cascade,
  discipline_id uuid not null references disciplines(id) on delete cascade,
  primary key (societe_id, discipline_id)
);

create table evenements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titre text not null,
  type type_evenement not null,
  resume text check (char_length(resume) <= 280),
  description text,
  date_debut date not null,
  date_fin date not null,
  heure_debut time,
  modalite modalite_evenement not null default 'presentiel',
  lieu_nom text,
  adresse text,
  ville text,
  pays text not null default 'Bénin',
  lien_inscription text,
  site_web text,
  affiche_path text,
  tarifs text,
  gratuit boolean not null default false,
  credits_fmc text,
  contact_email text,
  statut statut_publication not null default 'en_attente',
  source source_evenement not null default 'manuel',
  source_ref text,
  cree_par uuid references auth.users(id) on delete set null,
  soumis_par_nom text,
  soumis_par_email text,
  recherche tsvector generated always as (
    setweight(to_tsvector('public.fr_unaccent', coalesce(titre, '')), 'A') ||
    setweight(to_tsvector('public.fr_unaccent', coalesce(ville, '')), 'B') ||
    setweight(to_tsvector('public.fr_unaccent', coalesce(resume, '')), 'B') ||
    setweight(to_tsvector('public.fr_unaccent', coalesce(description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dates_coherentes check (date_fin >= date_debut),
  constraint source_unique unique (source, source_ref)
);

create table evenement_societes (
  evenement_id uuid not null references evenements(id) on delete cascade,
  societe_id uuid not null references societes(id) on delete cascade,
  role role_organisation not null default 'organisateur',
  primary key (evenement_id, societe_id)
);

create table evenement_disciplines (
  evenement_id uuid not null references evenements(id) on delete cascade,
  discipline_id uuid not null references disciplines(id) on delete cascade,
  primary key (evenement_id, discipline_id)
);

create table echeances (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references evenements(id) on delete cascade,
  type type_echeance not null,
  libelle text,                     -- facultatif ; sinon libellé par défaut du type
  date_limite date not null,
  created_at timestamptz not null default now()
);

create table profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text,
  role role_utilisateur not null default 'gestionnaire',
  de_confiance boolean not null default false,
  created_at timestamptz not null default now()
);

create table gestionnaires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  societe_id uuid not null references societes(id) on delete cascade,
  statut statut_demande not null default 'en_attente',
  fonction text,                    -- fonction déclarée dans le bureau
  message text,
  decide_par uuid references auth.users(id),
  decide_le timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, societe_id)
);

create table emplacements_pub (
  id uuid primary key default gen_random_uuid(),
  type type_emplacement not null,
  titre text not null,
  annonceur text not null,
  image_path text,
  texte_alternatif text,
  lien text,
  discipline_id uuid references disciplines(id) on delete set null,
  evenement_id uuid references evenements(id) on delete cascade,
  date_debut date not null,
  date_fin date not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  constraint periode_coherente check (date_fin >= date_debut)
);

create table clics_sortants (
  id bigint generated always as identity primary key,
  cible_type type_cible not null,
  cible_id uuid not null,
  url text not null,
  page_origine text,
  created_at timestamptz not null default now()
  -- aucune adresse IP, aucun identifiant de visiteur
);

create table journal_moderation (
  id bigint generated always as identity primary key,
  objet_type text not null,         -- 'societe' | 'evenement' | 'gestionnaire' | 'emplacement'
  objet_id uuid not null,
  action text not null,             -- 'publie' | 'refuse' | 'modifie' | 'archive' | 'accepte' ...
  motif text,
  auteur uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table demandes_contact (
  id uuid primary key default gen_random_uuid(),
  type type_demande_contact not null,
  nom text not null,
  organisation text,
  email text not null,
  telephone text,
  offre text,                        -- pour type = 'visibilite'
  message text not null,
  traitee boolean not null default false,
  created_at timestamptz not null default now()
);

create table tentatives_formulaires (
  id bigint generated always as identity primary key,
  empreinte text not null,          -- sha256(IP + sel quotidien), jamais l'IP en clair
  formulaire text not null,
  created_at timestamptz not null default now()
);
```

### 5.4 Index, déclencheurs et fonctions utilitaires

```sql
create index societes_recherche_idx on societes using gin (recherche);
create index societes_sigle_trgm_idx on societes using gin (sigle extensions.gin_trgm_ops);
create index evenements_recherche_idx on evenements using gin (recherche);
create index evenements_dates_idx on evenements (statut, date_debut, date_fin);
create index echeances_date_idx on echeances (date_limite);
create index clics_cible_idx on clics_sortants (cible_type, cible_id, created_at);
create index tentatives_idx on tentatives_formulaires (empreinte, formulaire, created_at);

-- updated_at automatique
create or replace function maj_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger societes_updated before update on societes for each row execute function maj_updated_at();
create trigger evenements_updated before update on evenements for each row execute function maj_updated_at();

-- profil créé à l'inscription
create or replace function creer_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin insert into profils (id, nom) values (new.id, new.raw_user_meta_data->>'nom'); return new; end $$;
create trigger nouvel_utilisateur after insert on auth.users for each row execute function creer_profil();

-- rôles
create or replace function role_courant() returns role_utilisateur
language sql stable security definer set search_path = public as $$
  select role from profils where id = auth.uid() $$;
create or replace function est_moderateur() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(role_courant() in ('admin', 'moderateur'), false) $$;
create or replace function est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(role_courant() = 'admin', false) $$;
create or replace function gere_societe(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from gestionnaires
                 where user_id = auth.uid() and societe_id = sid and statut = 'acceptee') $$;
create or replace function gere_evenement(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from evenement_societes es
                 where es.evenement_id = eid and gere_societe(es.societe_id)) $$;
```

Déclencheurs de protection (à écrire) :
- `proteger_societe` (before update sur `societes`) : si l'utilisateur n'est pas modérateur, interdire la modification de `statut`, `mise_en_avant`, `slug` et `categorie`.
- `statut_evenement_gestionnaire` (before insert or update sur `evenements`) : si l'utilisateur n'est pas modérateur, forcer `statut` à `publie` quand son profil est `de_confiance`, sinon à `en_attente` ; interdire la modification de `source` et `slug`.
- `proteger_profil` (before update sur `profils`) : seul un administrateur peut modifier `role` et `de_confiance`.

Ces déclencheurs ne s'appliquent pas aux écritures faites avec le client de service (rôle `service_role`, reconnaissable par `auth.role()`), qui sont déjà contrôlées par les server actions : formulaires publics, synchronisation P1.

Fonction de recherche :

```sql
create or replace function rechercher(q text, limite int default 20)
returns table (type text, id uuid, slug text, titre text, sous_titre text, rang real)
language sql stable as $$
  with requete as (select websearch_to_tsquery('public.fr_unaccent', q) as tsq)
  select 'societe', s.id, s.slug, s.sigle, s.nom_complet,
         greatest(ts_rank(s.recherche, r.tsq), similarity(s.sigle, q))
  from societes s, requete r
  where s.statut = 'publie' and (s.recherche @@ r.tsq or s.sigle % q)
  union all
  select 'evenement', e.id, e.slug, e.titre, to_char(e.date_debut, 'DD/MM/YYYY'),
         ts_rank(e.recherche, r.tsq)
  from evenements e, requete r
  where e.statut = 'publie' and e.recherche @@ r.tsq
  order by 6 desc
  limit limite
$$;
```

### 5.5 Tables P1 (3) — à créer en phase P1 seulement

```sql
create table abonnes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  disciplines uuid[] not null default '{}',   -- vide = toutes
  confirme boolean not null default false,
  jeton text not null unique,                 -- confirmation et désinscription
  created_at timestamptz not null default now()
);

create table sources_synchro (
  id uuid primary key default gen_random_uuid(),
  societe_id uuid not null references societes(id) on delete cascade,
  type text not null check (type in ('ics', 'rss', 'wp_rest')),
  url text not null,
  actif boolean not null default true,
  derniere_synchro timestamptz,
  dernier_resultat text,
  created_at timestamptz not null default now()
);

create table actualites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  societe_id uuid references societes(id) on delete cascade,
  titre text not null,
  contenu text not null,
  image_path text,
  statut statut_publication not null default 'en_attente',
  publie_le timestamptz,
  created_at timestamptz not null default now()
);
```

### 5.6 Données initiales (`supabase/seed.sql`)

Disciplines (liste provisoire, à valider par le porteur du projet) :

| ordre | slug | nom |
| --- | --- | --- |
| 1 | sante | Santé et médecine |
| 2 | sciences-techniques | Sciences et techniques |
| 3 | agronomie-environnement | Agronomie et environnement |
| 4 | sciences-humaines-sociales | Sciences humaines et sociales |
| 5 | droit-economie | Droit et économie |

Organisations connues, insérées avec le statut `brouillon` (nom complet, logo et description à compléter dans le back-office avant publication) ; toutes rattachées à la discipline `sante` :

| slug | sigle | catégorie | site_web | site_congres |
| --- | --- | --- | --- | --- |
| fss | FSS | institution_academique | https://fss-cotonou.com | https://j5s3.fss-cotonou.com |
| sobeped | SOBEPED | societe_savante | https://sobeped.com | https://congres.sobeped.com |
| sbc | SBC | societe_savante | https://sbcbenin.org | https://congres.sbcbenin.org |
| sometec | SOMETEC | societe_savante | (à compléter) | https://congres.sometec.org |
| sobenchir | SOBENCHIR | societe_savante | https://sobenchir.org | (aucun) |

Aucun événement réel n'est inventé dans `seed.sql`.

`supabase/seed_demo.sql` (développement uniquement) : une dizaine d'organisations et une vingtaine d'événements fictifs, titres préfixés `[DÉMO]`, répartis sur toutes les disciplines, sur les six mois à venir, avec des échéances, pour tester l'interface. Ne jamais l'exécuter en production.

### 5.7 Stockage

Buckets Supabase, en lecture publique : `logos`, `affiches`, `publicites`.
- Formats acceptés : PNG, JPEG, WebP. SVG refusé.
- Tailles maximales : logo 500 Ko, affiche 2 Mo, publicité 1 Mo.
- Chemins : `logos/{societe_id}/{horodatage}.webp`, `affiches/{evenement_id}/{horodatage}.webp`.
- Les envois passent par une server action qui vérifie les droits, puis écrit avec le client de service. Aucune écriture directe depuis le navigateur.

---

## 6. Sécurité et RLS

RLS activée sur les 14 tables. Politiques :

| Table | Lecture | Écriture |
| --- | --- | --- |
| disciplines | tous | admin |
| societes | `statut = 'publie'` ou modérateur ou `gere_societe(id)` | update : modérateur ou `gere_societe(id)` ; insert et delete : modérateur (les formulaires publics passent par le client de service) |
| societe_disciplines | tous | modérateur ou `gere_societe(societe_id)` |
| evenements | `statut = 'publie'` ou modérateur ou `gere_evenement(id)` ou `cree_par = auth.uid()` | insert : utilisateur connecté avec `cree_par = auth.uid()` ; update : modérateur ou `gere_evenement(id)` ; delete : modérateur |
| evenement_societes | si l'événement est visible | modérateur, ou `gere_societe(societe_id)` et l'événement a été créé par l'utilisateur |
| evenement_disciplines | si l'événement est visible | modérateur ou `gere_evenement(evenement_id)` |
| echeances | si l'événement est visible | modérateur ou `gere_evenement(evenement_id)` |
| profils | le sien, ou modérateur | update du sien (hors champs protégés) ; admin pour tout |
| gestionnaires | les siennes, ou modérateur | insert des siennes (`user_id = auth.uid()`, statut `en_attente`) ; update : modérateur |
| emplacements_pub | `actif` et date du jour dans la période, ou admin | admin |
| clics_sortants | modérateur | aucune (insertion par le client de service) |
| journal_moderation | modérateur | aucune (insertion par le client de service) |
| demandes_contact | modérateur | update `traitee` : modérateur ; insert par le client de service |
| tentatives_formulaires | aucune | aucune (client de service uniquement) |

Autres mesures :
- En-têtes : `Content-Security-Policy` adaptée (Turnstile, Supabase), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive.
- Tous les liens externes saisis par les utilisateurs sont validés (`https://` uniquement) et affichés avec `rel="noopener noreferrer"` ; ceux qui ne passent pas par `/go` portent aussi `nofollow`.
- Middleware : `/espace` exige une session ; `/admin` exige le rôle modérateur ou administrateur (vérifié côté serveur, pas seulement dans le middleware).

---

## 7. Règles métier

- **Visibilité** : seul `publie` est public. `archive` est réservé aux fiches retirées ; un événement passé reste `publie` et apparaît dans les archives.
- **À venir / passé** : un événement est à venir si `date_fin >= aujourd'hui` dans le fuseau `Africa/Porto-Novo`, passé sinon.
- **Échéances à venir** : `date_limite >= aujourd'hui`, événement publié. Une échéance est « urgente » à 7 jours ou moins (badge or).
- **Slugs** : sociétés, sigle en minuscules (`sobeped`) ; événements, `type-sigle-organisateur-annee` si possible (`congres-sobeped-2027`), sinon titre + année. En cas de collision, suffixe `-2`, `-3`. Un slug publié ne change plus.
- **Mise en avant** :
  - Organisation : booléen `mise_en_avant`, réglé par un modérateur.
  - Événement : emplacement `evenement_en_avant` actif sur la période ; les événements mis en avant passent en tête de l'agenda avec la mention « Mis en avant ».
- **Gestionnaire de confiance** : après trois événements validés sans modification par un modérateur, le back-office propose de passer le profil `de_confiance` ; la décision reste humaine.
- **Réclamation d'une fiche** : la demande indique la fonction dans le bureau ; le modérateur l'accepte ou la refuse, chaque décision est journalisée et notifiée par e-mail.
- **Organisations sans site** : le back-office les liste pour la prospection (information interne, jamais affichée publiquement).
- **Journal** : toute décision de modération écrit une ligne dans `journal_moderation`.

---

## 8. Pages publiques

Rendu : Server Components, données mises en cache avec les étiquettes `societes`, `evenements`, `disciplines`, `emplacements` et invalidées à chaque écriture concernée. Chaque page définit `title`, `description`, `canonical` et ses balises Open Graph.

### 8.1 Annuaire — `/societes`
- En-tête : « Annuaire des sociétés savantes » et le nombre d'organisations publiées.
- Filtres dans l'URL (`?discipline=sante&ville=cotonou&categorie=societe_savante&q=...`), utilisables sans JavaScript (formulaire GET), enrichis côté client.
- Liste en cartes : logo (ou monogramme du sigle dessiné en SVG si pas de logo), sigle, nom complet, disciplines, ville, nombre d'événements à venir.
- Organisations mises en avant en premier, puis ordre alphabétique du sigle. Pagination par 24.
- État vide : message clair et lien vers « Référencer une société ».

### 8.2 Fiche organisation — `/societes/[slug]`
- En-tête : logo, sigle, nom complet, catégorie, disciplines, ville, année de création.
- Boutons : « Site officiel » et « Plateforme de congrès », tous deux via `/go/societe/{id}?vers=site|congres&from=/societes/{slug}`.
- Présentation, contacts (e-mail, téléphone, réseaux).
- Événements à venir (cartes), puis événements passés (liste compacte, repliable).
- Lien discret : « Vous faites partie du bureau ? Gérer cette fiche » vers `/espace/reclamer/{slug}`.
- JSON-LD `Organization`.

### 8.3 Agenda — `/agenda`
- Deux vues : `?vue=liste` (défaut) et `?vue=calendrier`.
- Filtres dans l'URL : `type`, `discipline`, `ville`, `modalite`, `gratuit`, `du`, `au`, `q`.
- Vue liste : événements à venir groupés par mois, mis en avant en tête. Carte : badge de type, titre, dates, lieu ou « En ligne », organisateurs, prochaine échéance si elle existe.
- Vue calendrier : grille mensuelle légère en HTML et CSS (pas de bibliothèque), navigation mois précédent et suivant ; sur mobile, la grille est remplacée par une liste des jours qui ont des événements.
- Lien vers les archives : `/agenda?periode=passes`.
- Bannière `banniere_agenda` active éventuelle, signalée « Publicité ».

### 8.4 Fiche événement — `/agenda/[slug]`
- Titre, type, dates formatées, heure si connue, modalité, lieu et adresse avec lien « Voir sur la carte » (OpenStreetMap), organisateurs (liens vers leurs fiches), disciplines.
- Affiche si présente (`next/image`, taille adaptée).
- Bloc « Dates clés » : échéances triées, passées barrées, urgentes signalées.
- Bloc « Participation » : tarifs, gratuit, crédits FMC, contact.
- Boutons : « S'inscrire » (via `/go/evenement/{id}?vers=inscription`), « Site de l'événement » (`vers=site`), « Ajouter à mon agenda » (menu : fichier .ics, Google Agenda), « Partager sur WhatsApp ».
- JSON-LD `Event` (avec `eventAttendanceMode`, `location` ou `VirtualLocation`, `organizer`).
- Si l'événement est passé : bandeau « Cet événement a eu lieu » et suggestion des prochains événements de la même discipline.

### 8.5 Échéances — `/echeances`
- Toutes les échéances à venir, groupées par semaine (« Cette semaine », « Semaine prochaine », puis par mois).
- Chaque ligne : date limite, type d'échéance, titre de l'événement (lien), organisateur, nombre de jours restants.
- Filtres : `type`, `discipline`.

### 8.6 Discipline — `/disciplines/[slug]`
- Nom et description du quartier, ses organisations (cartes), ses événements à venir, sa bannière `banniere_discipline` active éventuelle.

### 8.7 Recherche — `/recherche?q=`
- Résultats de la fonction `rechercher`, groupés : Organisations, Événements. Recherche insensible aux accents et tolérante sur les sigles.
- Moins de 2 caractères : invitation à préciser. Aucun résultat : suggestions (agenda, annuaire, référencer).

### 8.8 Référencer — `/referencer`
- Page de choix : « Référencer une organisation » (`/referencer/societe`) ou « Annoncer un événement » (`/referencer/evenement`). Détails en section 12.

### 8.9 Visibilité — `/visibilite`
- Présentation des offres (mise en avant d'un événement, bannière thématique, pack congrès, partenaire de la lettre en P1), sans prix affichés tant qu'ils ne sont pas fixés : « Tarif sur devis ».
- Chiffres réels issus de la base : organisations publiées, événements à venir, clics sortants des 30 derniers jours.
- Formulaire de demande de devis (type `visibilite`).

### 8.10 Pages institutionnelles
- `/a-propos` : mission, fonctionnement, équipe éditoriale (texte fourni par le porteur ; placeholders clairement marqués en attendant).
- `/contact` : formulaire (type `contact`) et adresse e-mail.
- `/mentions-legales` et `/confidentialite` : structure complète avec les champs à compléter entre crochets (éditeur, hébergeur, responsable de traitement, durée de conservation, droits des personnes, contact APDP).

---

## 9. Le Plan de la Cité (accueil)

### 9.1 Structure de la page d'accueil
1. Bandeau d'annonce facultatif (`banniere_accueil` active).
2. Phrase d'ouverture en `h1` : « Toutes les sociétés savantes et tous les congrès scientifiques du Bénin, au même endroit. » Juste en dessous, le champ de recherche et trois liens directs : Annuaire, Agenda, Échéances.
3. **Le Plan de la Cité** (9.2).
4. « Prochain rendez-vous » : l'événement publié le plus proche, avec compte à rebours en jours (et en heures le dernier jour), dates, lieu, bouton vers la fiche.
5. « Échéances de la semaine » : 5 au maximum, lien vers `/echeances`.
6. « Récemment référencées » : les 4 dernières organisations publiées.
7. Chiffres clés calculés en direct : organisations, événements à venir, disciplines.
8. Appel à contribution : « Votre société n'est pas encore sur Cité Savante ? Référencez-la. »

### 9.2 Le plan (composant `src/components/cite/PlanDeLaCite.tsx`)
- Rendu **côté serveur** en SVG inline, à partir des données ; aucun JavaScript nécessaire à l'affichage.
- Vue de dessus, style plan d'architecte : fond `creme`, îlots `creme-soutenu`, rues en réserve (espaces vides), filets `bordeaux` fins, textes en Fraunces.
- **Quartiers** : une discipline = un îlot. Disposition en grille de 3 colonnes sur ordinateur (`viewBox` 1200 de large, hauteur calculée), ordonnée par `disciplines.ordre`. Chaque îlot porte une plaque avec le nom de la discipline et le nombre d'organisations.
- **Bâtiments** : une organisation publiée = un bâtiment dans l'îlot de sa première discipline, en grille de lots de 4 par rangée, triés par sigle. Trois silhouettes de bâtiments dessinées à la main ; la silhouette est choisie de façon déterministe à partir du slug (hachage), pour un plan varié mais stable. Le sigle est inscrit sous le bâtiment.
- **Fanions** : un fanion `or` sur les bâtiments des organisations qui ont au moins un événement publié dans les 90 jours, avec la date courte du prochain (« 12 mars »).
- **Interaction** : chaque bâtiment est un lien `<a>` vers la fiche, focalisable, avec `aria-label` complet (« SOBEPED, Société ..., prochain événement le 12 mars 2027 »). Au survol ou au focus, une infobulle (petit composant client, amélioration progressive) affiche le nom complet et le prochain événement.
- **Îlot vide** : un lot en pointillés « Aucune organisation pour le moment — Référencer ».
- **Mobile (moins de 768 px)** : les quartiers s'empilent verticalement, en une colonne, 3 bâtiments par rangée ; la plaque du quartier reste lisible (16 px minimum).
- **Accessibilité** : le SVG a `role="group"` et un titre ; sous le plan, une liste « Voir le plan sous forme de liste » (`<details>`) reprend quartiers et organisations en HTML.
- **Poids** : SVG inline de moins de 60 Ko pour 100 organisations ; silhouettes définies une fois dans `<defs>` et réutilisées avec `<use>`.
- **Tests** : tests unitaires de la fonction de disposition (positions déterministes, aucun chevauchement, îlot vide géré).

---

## 10. Passerelle, agenda et partage

### 10.1 Passerelle — `GET /go/[type]/[id]`
- `type` : `societe`, `evenement` ou `emplacement` ; paramètres `vers` (`site`, `congres`, `inscription`) et `from` (chemin de la page d'origine).
- Vérifie que la cible existe et est publiée (ou active pour un emplacement), récupère l'URL correspondante, sinon renvoie 404.
- Enregistre une ligne dans `clics_sortants` (client de service), sans IP ni identifiant.
- Ajoute `utm_source=citesavante&utm_medium=referral` à l'URL de destination (sans écraser des UTM existants).
- Redirige en 302. En-tête `X-Robots-Tag: noindex`.

### 10.2 Fichier agenda — `GET /agenda/[slug]/ics`
- Généré sans bibliothèque, conforme RFC 5545 : `VCALENDAR` / `VEVENT` avec `UID` (`{id}@citesavante.com`), `DTSTAMP`, `DTSTART;VALUE=DATE` et `DTEND;VALUE=DATE` (jour suivant la fin) pour les événements sur journées entières, sinon heure avec `TZID=Africa/Porto-Novo`, `SUMMARY`, `LOCATION`, `DESCRIPTION` (résumé + URL de la fiche), `URL`. Lignes pliées à 75 octets, échappements corrects.
- `Content-Type: text/calendar; charset=utf-8`, nom de fichier = slug.
- Tests unitaires du générateur.

### 10.3 Google Agenda
Lien `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=AAAAMMJJ/AAAAMMJJ&details=...&location=...` construit par une fonction testée.

### 10.4 WhatsApp
Lien `https://wa.me/?text=` + texte encodé : « {titre} — {dates}, {lieu}. Détails : {url de la fiche} ». L'aperçu est assuré par l'image Open Graph.

### 10.5 Images d'aperçu (Open Graph)
- `opengraph-image.tsx` pour la fiche événement, la fiche organisation, l'accueil et l'agenda. Format 1200 × 630.
- Événement : fond `creme`, filet `or`, badge de type, titre en Fraunces, dates, lieu, sigles des organisateurs, mention « citesavante.com ». Organisation : sigle en grand, nom complet, disciplines.
- Polices Fraunces et EB Garamond chargées depuis des fichiers locaux.

---

## 11. Recherche

- Champ présent dans l'en-tête sur toutes les pages ; soumission vers `/recherche?q=`.
- Fonction SQL `rechercher` (section 5.4) appelée par RPC.
- Filtres texte de l'annuaire et de l'agenda : même configuration `fr_unaccent`.
- Tests : « pediatrie » trouve « Pédiatrie » ; « sbc » trouve la SBC ; « congres cotonou 2027 » ordonne les événements pertinents.

---

## 12. Formulaires, comptes et espace gestionnaire

### 12.1 Protections communes à tous les formulaires publics
- Turnstile vérifié côté serveur ; champ piège invisible ; longueurs maximales dans Zod.
- Limitation : 5 soumissions par heure et par empreinte (`sha256(IP + sel du jour)`) dans `tentatives_formulaires` ; purge des lignes de plus de 24 h à chaque insertion.
- Message de succès clair indiquant la suite (« Votre proposition sera vérifiée sous 48 heures ; vous recevrez un e-mail. »).
- Case obligatoire d'acceptation de la politique de confidentialité, avec lien.

### 12.2 Référencer une organisation — `/referencer/societe`
Champs : sigle*, nom complet*, catégorie*, disciplines* (1 à 3), ville*, année de création, site web, plateforme de congrès, e-mail de contact*, téléphone, description (1 500 caractères au plus), logo (PNG, JPEG ou WebP, 500 Ko au plus), nom et e-mail de la personne qui soumet*, fonction dans le bureau.
Création avec le statut `en_attente` via le client de service, notification à l'équipe, accusé de réception à l'auteur.
Contrôle de doublon : si un sigle proche existe déjà, proposer la fiche existante et le lien « Gérer cette fiche ».

### 12.3 Annoncer un événement — `/referencer/evenement`
Champs : titre*, type*, organisation(s) organisatrice(s)* (recherche parmi les organisations publiées, ou « Mon organisation n'est pas listée », qui ouvre les champs minimaux d'une nouvelle organisation), disciplines*, date de début*, date de fin*, heure, modalité*, lieu, adresse, ville, lien d'inscription, site de l'événement, tarifs, gratuit, crédits FMC, résumé (280 caractères au plus)*, description, affiche (2 Mo au plus), échéances (liste dynamique : type, date, libellé), e-mail de contact*, nom et e-mail de l'auteur*.
Statut `en_attente`, même circuit de notification.

### 12.4 Comptes
- Supabase Auth : connexion par lien magique par e-mail (pas de mot de passe à gérer).
- Pages : `/espace/connexion`, callback d'authentification, déconnexion.
- Le premier administrateur est désigné par une requête SQL documentée dans `PROGRESS.md` (jamais par l'interface).

### 12.5 Espace gestionnaire — `/espace`
- Tableau de bord : mes organisations (gestion acceptée), mes demandes en attente, mes événements par statut.
- `/espace/reclamer/[slug]` : demande de gestion d'une fiche (fonction dans le bureau, message).
- `/espace/societes/[slug]` : modification de la fiche (hors champs protégés), envoi du logo.
- `/espace/evenements/nouveau` et `/espace/evenements/[id]` : création et modification d'événements de ses organisations, échéances comprises. Statut appliqué par le déclencheur (section 5.4).
- Chaque modification d'une fiche publiée par un gestionnaire non « de confiance » reste visible immédiatement mais apparaît dans le flux « Modifications récentes » du back-office pour contrôle a posteriori.

---

## 13. Back-office — `/admin`

Accès : rôles `moderateur` et `admin`. Mise en page sobre, tableaux lisibles, actions confirmées.

| Écran | Contenu |
| --- | --- |
| Tableau de bord | À modérer (organisations, événements, demandes de gestion), prochains événements, clics sortants des 30 derniers jours, demandes de contact non traitées |
| Organisations | Liste filtrable par statut, création, modification complète, mise en avant, archivage |
| Événements | Idem, avec échéances et organisateurs ; aperçu avant publication |
| Modération | File unique des soumissions en attente : aperçu, publier, corriger puis publier, refuser avec motif (e-mail envoyé) |
| Demandes de gestion | Accepter ou refuser, avec journal et e-mail |
| Disciplines | Création, ordre, description (administrateur) |
| Emplacements publicitaires | Création, période, ciblage, visuel, activation ; clics par emplacement (administrateur) |
| Statistiques | Clics sortants par organisation, par événement, par mois ; export CSV |
| Prospection | Organisations sans site web ni plateforme de congrès (interne) |
| Demandes de contact | Contact et devis de visibilité, marquage « traitée » |
| Utilisateurs | Profils, rôles, statut « de confiance » (administrateur) |
| Journal | Historique des décisions de modération |

---

## 14. E-mails (Resend)

Expéditeur : `Cité Savante <notifications@citesavante.com>` (domaine à vérifier dans Resend). Modèles HTML simples aux couleurs de la charte, avec version texte :

| Modèle | Destinataire | Déclencheur |
| --- | --- | --- |
| Soumission reçue | Auteur | Formulaire public envoyé |
| Nouvelle soumission | Équipe (`ADMIN_NOTIFY_EMAIL`) | Formulaire public ou événement d'un gestionnaire en attente |
| Publication | Auteur ou gestionnaire | Passage à `publie`, avec lien de la page et lien de partage WhatsApp |
| Refus | Auteur ou gestionnaire | Refus, avec motif |
| Demande de gestion reçue | Équipe | Réclamation d'une fiche |
| Demande de gestion acceptée ou refusée | Demandeur | Décision |
| Lien de connexion | Utilisateur | Supabase Auth (modèle personnalisé en français) |

---

## 15. SEO, performance, accessibilité

- **SEO** : métadonnées par page ; `sitemap.ts` (pages fixes, organisations et événements publiés, disciplines) ; `robots.ts` (interdit `/admin`, `/espace`, `/go`) ; URL canonique ; JSON-LD `Organization`, `Event`, `BreadcrumbList` ; `WebSite` avec `SearchAction` sur l'accueil.
- **Performance** : Lighthouse mobile d'au moins 90 sur l'accueil, l'agenda et une fiche événement ; accueil de moins de 500 Ko transférés ; polices en `display: swap` ; aucun script tiers hors Turnstile (chargé seulement sur les pages de formulaire) ; images redimensionnées à l'envoi.
- **Accessibilité** : WCAG 2.1 AA ; lien d'évitement « Aller au contenu » ; focus visible (contour `or`) ; formulaires avec messages d'erreur reliés aux champs ; Plan de la Cité doublé d'une liste.
- **Protection des données** : page de confidentialité ; aucune donnée personnelle dans les clics ; suppression d'un compte sur demande ; empreintes des formulaires purgées sous 24 h.

---

## 16. Tests

- **Unitaires (Vitest)** : formatage des dates, génération des slugs, générateur .ics, lien Google Agenda, lien WhatsApp, ajout des UTM, disposition du Plan de la Cité, schémas Zod.
- **Bout en bout (Playwright, sur `seed_demo.sql`)** :
  1. Un visiteur trouve un congrès de pédiatrie depuis l'accueil, ouvre la fiche, télécharge le .ics et clique « S'inscrire » (vérifier la ligne dans `clics_sortants`).
  2. Un visiteur annonce un événement ; un modérateur le publie ; l'événement apparaît dans l'agenda.
  3. Un gestionnaire réclame une fiche, est accepté, modifie la description.
- Chaque phase ajoute les tests de ce qu'elle livre.

---

## 17. Évolutions P1

### 17.1 Lettre hebdomadaire « L'agenda de la semaine »
- Inscription (pied de page et agenda) avec choix des disciplines ; double confirmation par e-mail ; désinscription en un clic par jeton.
- Envoi chaque lundi matin (Vercel Cron, route protégée par `CRON_SECRET`) : événements des 30 prochains jours et échéances des 14 prochains jours, filtrés par disciplines, encart partenaire éventuel (`lettre`).

### 17.2 Synchronisation des sites partenaires
- Table `sources_synchro` ; tâche planifiée toutes les 6 heures.
- Types : flux ICS, flux RSS, API REST WordPress (le format exact exposé par les plateformes de congrès MedCongress est à définir avec le porteur du projet).
- Chaque élément importé devient un événement `source = 'synchro'`, `source_ref` = identifiant distant, statut `en_attente` (ou `publie` si la source est marquée de confiance). Mise à jour idempotente grâce à la contrainte `source_unique`.
- Résultat de chaque synchronisation visible dans le back-office.

### 17.3 Actualités, flux et archives
- Actualités des organisations (`/actualites`, `/actualites/[slug]`), soumises par les gestionnaires, modérées.
- Flux publics : `/flux/agenda.xml` (RSS), `/flux/agenda.ics` et `/flux/[discipline].ics`.
- Archives : `/agenda/archives/[annee]`.

---

## 18. Variables d'environnement

| Variable | Usage |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://citesavante.com` (URL de développement en local) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé de service, serveur uniquement |
| `RESEND_API_KEY` | Envoi des e-mails |
| `EMAIL_FROM` | `Cité Savante <notifications@citesavante.com>` |
| `ADMIN_NOTIFY_EMAIL` | Adresse de l'équipe de modération |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile, côté navigateur |
| `TURNSTILE_SECRET_KEY` | Turnstile, côté serveur |
| `FORM_HASH_SALT` | Sel des empreintes de formulaires |
| `CRON_SECRET` | Protection des tâches planifiées (P1) |

Un fichier `.env.example` documente chaque variable. `.env.local` n'est jamais commité.

---

## 19. Définition de « terminé » (pour chaque phase)

- Le périmètre du prompt est livré, rien de plus.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` passent.
- Les pages concernées sont vérifiées à 360 px et à 1280 px de large.
- Aucune couleur hors charte, aucune bibliothèque d'icônes, aucun texte en anglais visible.
- `PROGRESS.md` à jour ; commit `feat(phase-N): ...` créé.
- Un résumé liste ce que le porteur du projet doit vérifier lui-même.
