# Avancement — Cité Savante

## Fait

Phase 0 (fondations et charte) : les onze points du prompt de phase 0
(`docs/PROMPTS.md`). Ci-dessous : le socle technique (points 1 à 5 et 11), puis les
pictogrammes (point 6), la mise en page et les composants (points 7 à 10) et la
relecture critique finale.

### Socle technique (points 1 à 5 et 11)

- `package.json` : scripts `dev`, `build`, `start`, `lint` (`eslint .`), `typecheck`
  (`tsc --noEmit`), `test` (`vitest run`), `test:e2e` (`playwright test`), `format`
  (`prettier --write .`), `db:types` (préparé pour la phase 1 :
  `supabase gen types --lang=typescript --linked`, qui suppose la CLI Supabase installée
  et le projet lié par `supabase link` ; ne fonctionne pas encore, c'est attendu).
- Dépendances installées : voir « Dépendances ajoutées » ci-dessous.
- Prettier configuré (`.prettierrc`, `.prettierignore` — exclut `docs/` et `CLAUDE.md`).
- Vitest configuré (`vitest.config.mts`, environnement `node`, alias `@` → `src`,
  inclusion `src/**/*.test.ts(x)`, exclusion `e2e/`) avec un test réel
  (`src/lib/textes.test.ts`) qui lit les `create type … as enum` de la section 5.2 des
  spécifications et vérifie que chaque dictionnaire de libellés reprend exactement leurs
  valeurs, chacune avec un libellé non vide.
- Playwright configuré (`playwright.config.ts`, dossier `e2e/`, un seul projet
  `chromium`, `webServer` sur `pnpm dev` port 3000 avec `reuseExistingServer`) avec un
  test d'exemple (`e2e/accueil.spec.ts` — la page d'accueil a un `h1`). **Non exécuté** :
  le navigateur attendu n'est pas installé — voir « À valider par le porteur ».
- Jetons de la charte dans `src/app/globals.css` : palette de couleurs Tailwind par
  défaut entièrement réinitialisée (`--color-*: initial`) puis redéfinie avec les 7
  jetons de la charte (bordeaux, bordeaux-profond, creme, creme-soutenu, or, or-clair,
  encre). Échelle typographique remplacée (`--text-*: initial` puis) : `text-xs` 14 px,
  `text-sm` 16 px, `text-base` 18 px, `text-lg` 22 px, `text-xl` 28 px, `text-2xl` 36 px,
  `text-3xl` 48 px. Styles de base (dans `@layer base`, voir « Décisions ») : fond
  crème, texte encre, `font-texte` en corps de texte (17 px mobile / 18 px dès 768 px,
  interligne 1,55), titres `h1`–`h6` en `font-titre`, liens bordeaux soulignés (survol
  bordeaux-profond), focus clavier visible en or 2 px uniquement sur `:focus-visible`
  (aucun anneau bleu par défaut), `::selection` en or-clair/encre. `tabular-nums` est
  une classe utilitaire native de Tailwind v4, non redéfinie.
- Polices Fraunces (500, 700) et EB Garamond (400, 500, 400 italique) chargées en local
  via `next/font/local` depuis `@fontsource/fraunces` et `@fontsource/eb-garamond`
  (fichiers `.woff2`, `display: swap`), exposées en `--font-titre` / `--font-texte` sur
  `<html>`. Vérifié dans le HTML et le CSS compilés (voir « Décisions »).
- `src/app/layout.tsx` : `<html lang="fr">`, polices, métadonnées par défaut (`title`
  avec gabarit `%s — Cité Savante`, `metadataBase` depuis `site.url`) ; l'en-tête, le
  pied de page et le `<main>` sont décrits plus bas (« Mise en page »).
- `src/config/site.ts` et `src/lib/textes.ts` créés selon le contrat partagé.
- `.env.example` documentant chaque variable de la section 18 des spécifications.
- `.gitignore` : ajout de `test-results/`, `playwright-report/`, `blob-report/`,
  `playwright/.cache/`, `*.stackdump`, exception `!.env.example`.
- `public/*.svg` du gabarit : absents (le dossier `public/` est vide).
- `README.md` réécrit en français.
- `src/app/page.tsx` : page d'accueil provisoire (voir « Mise en page » plus bas).
- Git : dépôt initialisé (branche `main`, remote GitHub `CITE-SAVANTE` déclaré).

### Pictogrammes (point 6 du prompt de phase 0)

- `src/components/pictos/` : les 20 pictogrammes de la section 4.3 (un composant par
  fichier, type commun `PictoProps`, enveloppe interne `Svg.tsx`, barrel `index.ts`),
  livrés par une étape distincte ; affichés à 16, 24 et 48 px sur `/charte`.

### Mise en page et composants de base (points 7, 8, 9 et 10 du prompt de phase 0)

- `src/components/mise-en-page/` :
  - `Conteneur` : 1200 px de contenu au maximum, gouttière 16 px puis 32 px dès 768 px.
  - `LienEvitement` : « Aller au contenu », hors écran jusqu'au focus clavier, cible
    `#contenu`.
  - `EnTete` : logotype texte « Cité Savante » (Fraunces 700) vers `/`, slogan (dès
    640 px), recherche toujours visible, navigation `site.navigation` sur un second
    registre dès 768 px, filet or gradué (`Graduation`) sous l'en-tête. Grille : un seul
    formulaire de recherche, placé selon la largeur.
  - `FormulaireRecherche` : formulaire GET vers `/recherche`, champ `name="q"`,
    `role="search"`, libellé masqué visuellement mais lu, bouton d'envoi nommé.
  - `NavigationPrincipale` (client) : liste `navigation`, `aria-current="page"` sur la
    rubrique courante (seule raison du `"use client"`), disposition horizontale ou
    verticale.
  - `MenuMobile` (client) : `<details>`/`<summary>` natif (fonctionne sans JavaScript),
    amélioré une fois hydraté : `aria-expanded` (jamais rendu côté serveur),
    `aria-controls`, fermeture par Échap avec retour du focus sur le bouton, par clic
    extérieur et au choix d'un lien. Panneau superposé sous l'en-tête, moins de 768 px.
  - `PiedDePage` : fond bordeaux profond, texte crème ; À propos, Contact, Référencer,
    Visibilité, Mentions légales, Confidentialité ; slogan ; e-mail de contact ;
    signature `site.signature` (nouvel onglet, `rel="noopener noreferrer"`, mention
    « s'ouvre dans un nouvel onglet » pour les lecteurs d'écran).
  - `Bouton` (`principal` / `secondaire`, coins 6 px, 44 px de haut minimum ; `<Link>`
    si `href`, `<button type="button">` sinon ; `classesBouton()` exportée), `Carte`
    (crème soutenu, filet or 1 px en haut, sans ombre, prop `as`), `Badge` (bordeaux sur
    or clair, petites capitales ; variante `urgent` crème sur bordeaux), `TitreSection`
    (`h2` Fraunces sur filet or renforcé à gauche), `Graduation` (décor).
- `src/components/formulaires/` : `ChampTexte` (dont `multiligne` → `<textarea>`),
  `Select` (natif, flèche maison, `options` + `optionVide`), `CaseACocher` (case native
  redessinée, retour à la case système en contraste forcé), éléments communs dans
  `commun.tsx`. Libellé relié par `htmlFor`, aide et erreur reliées par
  `aria-describedby`, `aria-invalid` en erreur, message préfixé « Erreur : », mention
  « (obligatoire) » quand `required`. Identifiant généré par `useId` s'il n'est pas
  fourni. Aucun `"use client"` : utilisables dans les Server Components comme dans les
  formulaires clients de la phase 5.
- `src/app/layout.tsx` : `LienEvitement`, `EnTete`, `<main id="contenu">`, `PiedDePage`
  (corps en colonne flexible, pied de page toujours en bas).
- `src/app/page.tsx` : uniquement le `h1` « Toutes les sociétés savantes et tous les
  congrès scientifiques du Bénin, au même endroit. » et « Site en construction. ».
- `src/app/charte/page.tsx` (`robots: noindex, nofollow`, mention « Page interne — à
  supprimer en phase 7 ») : sommaire, 7 couleurs (pastille, nom, valeur, usage),
  contrastes calculés de chaque couple texte/fond ou bordure/fond utilisé, typographie
  (familles, graisses, échelle 14 → 48 px, petites capitales, chiffres tabulaires), les
  20 pictogrammes à 16/24/48 px (et les 4 directions de la flèche), boutons, liens,
  badges, carte, champs, listes et cases avec leurs états (focus, erreur, désactivé,
  coché).
- `src/lib/utils/contraste.ts` (luminance relative et rapport WCAG 2.1, composition d'une
  couleur semi-transparente sur son fond, seuils AA), `src/lib/charte.ts` (miroir TS des
  jetons, couples utilisés, couples à signaler), `src/lib/utils/classes.ts` (`cx`).
- `src/app/globals.css` : ajout de deux utilitaires partagés, `anneau-focus` (le contour
  de focus or, réutilisé par `:focus-visible` via `@apply`) et `petites-capitales`
  (`font-variant-caps: all-small-caps`, que Tailwind ne fournit pas). Jetons inchangés.
- Tests : `src/lib/utils/contraste.test.ts` (valeurs de référence WCAG) et
  `src/lib/charte.test.ts` (les jetons TS sont identiques à ceux de `globals.css` ; chaque
  couple utilisé respecte le seuil AA de sa nature).
- Vérifié dans un Chromium sans interface : aucun défilement horizontal à 360 px
  (`scrollWidth` = 360) ni à 1280 px, sur `/` et `/charte` ; menu mobile (ouverture,
  `aria-expanded`, Échap et retour du focus, clic extérieur) ; menu utilisable sans
  JavaScript ; lien d'évitement visible au premier Tab ; un seul `h1` et un seul `main`.

### Relecture critique (fin de phase 0)

Corrections appliquées après relecture de l'ensemble de la livraison :

- **Champs préremplis bleus** : Chrome peint les champs remplis automatiquement en bleu
  clair (#E8F0FE, règle `!important` interne). `globals.css` les recouvre désormais d'un
  aplat crème (texte encre).
- **Couleurs natives explicites** : `accent-color` bordeaux sur `:root` (cases, boutons
  radio, curseurs) et `caret-color` bordeaux sur les champs, au lieu des valeurs du
  système.
- **Ombres supprimées du thème** : `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*` et
  `--text-shadow-*` réinitialisés (valeurs par défaut en noir pur, et la charte interdit
  les ombres portées) ; `shadow-md` et consorts n'existent plus.
- **Page 404 en français** (`src/app/not-found.tsx`) : tous les liens de navigation
  menaient à la page 404 par défaut de Next.js, en anglais et en thème sombre selon le
  système. Elle est remplacée par « Page introuvable » aux couleurs de la charte.
- **Icône d'onglet** : le `favicon.ico` du gabarit (logo Vercel, noir) est remplacé par
  `src/app/icon.svg` : le pictogramme « bâtiment à colonnes » crème sur bordeaux.
- **`.env.example`** : `EMAIL_FROM` entre guillemets (espaces et chevrons).
- **`db:types`** : `--db-url "$SUPABASE_DB_URL"` remplacé par `--linked` ; la variable
  n'était pas dans la section 18 et `$VAR` n'est pas développé quand pnpm exécute les
  scripts avec `cmd` sous Windows.
- **Test des libellés renforcé** : `textes.test.ts` vérifie maintenant que les clés de
  chaque dictionnaire sont exactement les valeurs des enums SQL de la section 5.2 (lues
  dans `docs/SPECIFICATIONS.md`), et plus seulement que les libellés sont non vides.
- **Vitest** : `vitest.config.ts` renommé en `vitest.config.mts`, ce qui supprime
  l'avertissement « ESM syntax in a file loaded as CommonJS ».
- **PROGRESS.md** : suppression des mentions devenues fausses (pictogrammes et mise en
  page « laissés à une autre étape », layout « sans en-tête ni pied de page »).
- Vérifié sur le build de production (`next start`, Chromium sans interface) :
  - CSS compilé : seules couleurs présentes, les 7 jetons (et leurs variantes
    semi-transparentes), `transparent` et `currentColor` ; les `red` restants ne sont que
    des tests de prise en charge (`@supports (color: color-mix(in lab, red, red))`) ;
  - tabulation complète de l'accueil à 1280 px : lien d'évitement, logotype, recherche,
    bouton, 5 liens de navigation et 8 liens du pied de page ont tous un contour or de
    2 px ; à 360 px, le bouton « Menu », puis les liens du menu ; Échap ferme le menu et
    rend le focus au bouton ; sans JavaScript, le menu s'ouvre et ses 5 liens sont
    atteignables au clavier ;
  - `/`, `/charte` et une page 404 : `scrollWidth` égal à la largeur à 360 et 1280 px, un
    seul `h1`, un seul `main`, tous les champs ont un libellé, aucun `aria-describedby`
    orphelin, aucun identifiant en double, fond crème même avec un système en thème
    sombre.

## Phase 1 — base de données

**État : fait, sauf la liaison au projet distant.** Les huit points du prompt de phase 1
(`docs/PROMPTS.md`) sont faits, avec une réserve sur le point 1 : la CLI Supabase est
installée et configurée (`supabase/config.toml`), mais **le projet Supabase distant
n'existe pas encore** ; la liaison (`supabase link`, `supabase db push`) attend sa
création (procédure pas à pas : « CLI Supabase et liaison au projet distant » plus bas).
Tout est validé sur la grappe PostgreSQL locale.
Une **relecture de sécurité adversariale** (section « Relecture sécurité phase 1 » : 5
failles corrigées, nouveau test `50_securite`), puis **trois correctifs de sécurité
décidés par le coordinateur** (section « Correctifs du coordinateur ») ont été appliqués
directement dans les migrations existantes : le projet distant n'existant pas, rien n'a
été appliqué ailleurs qu'en local. Deux vérificateurs indépendants ont ensuite prouvé
sept écarts, corrigés (section « Reprise après vérification »).
**Vérification de fin de phase : cinq commandes**, `pnpm db:valider` compris (les
tests SQL ne passent pas par `pnpm test` : voir « Validation locale »). Les cinq
passent (bilans exacts : « Vérifications (correctifs et reprise) »), et le coordinateur
les a relancées lui-même avant le commit `feat(phase-1): base de données et sécurité`,
qui groupe l'ensemble de la phase 1.

### Fait

- **Migrations** (`supabase/migrations/`, noms au format de la CLI Supabase, chacune
  commentée en français — en-tête : ce qu'elle fait — et rejouable sans erreur) :
  - `20260928000100_extensions_recherche.sql` : `unaccent` et `pg_trgm` dans le schéma
    `extensions` ; configuration de recherche `public.fr_unaccent` (section 5.1).
  - `20260928000200_types.sql` : les 12 types énumérés de la section 5.2.
  - `20260928000300_tables.sql` : les 14 tables de la section 5.3 (les 3 tables P1 ne
    sont pas créées) ; les 7 index de la section 5.4 et 10 index de clés étrangères ;
    6 contraintes de format (liens externes `https://` uniquement, `reseaux` objet
    JSON — relecture de sécurité).
  - `20260928000400_fonctions_declencheurs.sql` : `aujourdhui()` ; `maj_updated_at()` et
    ses déclencheurs sur `societes` et `evenements` ; `creer_profil()` (security
    definer) déclenchée après chaque insertion dans `auth.users` ; `role_courant()`,
    `est_moderateur()`, `est_admin()`, `gere_societe(uuid)`, `gere_evenement(uuid)` ;
    `auteur_soumission(text, uuid)` (modérateurs, relecture de sécurité) ; les
    trois déclencheurs de protection `proteger_societe`, `statut_evenement_gestionnaire`,
    `proteger_profil` (règles : décision 4, dont les correctifs 3 et 4 du
    coordinateur) ; droits d'exécution.
  - `20260928000500_recherche.sql` : `rechercher(q, limite)`.
  - `20260928000600_rls.sql` : RLS activée sur les 14 tables ; 46 politiques, une par
    opération, aux noms français explicites, selon le tableau de la section 6 ;
    privilèges de colonne sur `demandes_contact`, et sur `societes` / `evenements`
    (données personnelles, relecture de sécurité) ; `TRUNCATE` retiré à `anon` et
    `authenticated`.
  - `20260928000700_stockage.sql` : buckets publics `logos` (500 Ko), `affiches` (2 Mo),
    `publicites` (1 Mo), PNG / JPEG / WebP uniquement ; aucune politique sur
    `storage.objects`, ni de lecture ni d'écriture (fichiers servis par l'URL publique
    du bucket, aucun listage par l'API : correctif 2 du coordinateur, décision 6).
- **Environnement Supabase simulé** : `supabase/tests/00_stubs_supabase.sql` (n'est pas
  une migration). Rôles `anon`, `authenticated` (NOINHERIT), `service_role` (BYPASSRLS),
  `authenticator`, `supabase_auth_admin` ; schéma `extensions` ; schéma `auth` avec
  `auth.users`, `auth.uid()`, `auth.role()` et `auth.jwt()` écrites comme dans Supabase
  (lecture de `request.jwt.claim.sub` / `.role`, puis du JSON `request.jwt.claims`) ;
  schéma `storage` (`buckets`, `objects`, RLS activée) ; privilèges par défaut de
  Supabase sur `public`. Aides de test : `test_creer_utilisateur(email, nom)`,
  `test_connecter(uuid)`, `test_anonyme()`, `test_service()`, `test_deconnecter()`,
  `test_verifier()`, `test_doit_echouer()`, `test_lignes_touchees()`. Garde-fou : le
  fichier refuse de s'exécuter sur un vrai Supabase (présence de `supabase_admin` ou
  `supabase_storage_admin`).
- **Script de validation** : `scripts/valider-base.sh`, lancé par `pnpm db:valider`.
  Voir « Validation locale » plus bas.
- **Tests SQL** (`supabase/tests/*.test.sql`, blocs `DO` avec assertions, données
  fictives préfixées `[TEST]`, adresses en `.invalid`, chaque fichier annulé par
  `rollback` ; indépendants de `seed.sql` et `seed_demo.sql`) :
  - `05_structure` : exactement les 14 tables, RLS partout, pas de tables P1, 12 types
    et leurs valeurs, `search_path` fixé sur toute fonction, liste exacte des fonctions
    security definer et leurs droits d'exécution, 6 déclencheurs, index de 5.4,
    extensions dans `extensions`, `TRUNCATE` retiré, colonne `traitee`, colonnes de
    données personnelles et contraintes de format des liens (relecture de sécurité),
    une politique par opération, aucune écriture pour `anon`, stockage.
  - `10_rls` : visiteur anonyme (lecture et écriture dans les 14 tables), utilisateur
    connecté, utilisateur sans profil, gestionnaire (organisateurs, disciplines,
    échéances), demande en attente, modérateur, administrateur, client de service,
    stockage (aucun objet listé par l'anonyme, un gestionnaire ou un modérateur ; aucun
    envoi), et connexion par la recette documentée (`set local role` +
    `request.jwt.claims`).
  - `20_declencheurs` : `creer_profil` (y compris sous le rôle de GoTrue et avec un rôle
    glissé dans les métadonnées), `updated_at`, les trois protections (dont l'événement
    refusé qui repasse en attente, et publié par une seconde retouche d'un profil de
    confiance — limite assumée —, et les colonnes figées, correctifs 3 et 4), le client
    de service et `postgres` non contraints, requête du premier administrateur.
  - `30_recherche` : `fr_unaccent`, `rechercher()` (« pediatrie », « sbc », faute de
    frappe sur un sigle, jamais de non publié, même pour un modérateur ou appelée par
    `postgres`, forme, limite, ordre).
  - `40_dates` : `aujourdhui()` est la date de Porto-Novo, y compris quand
    `current_date` de la session donne un autre jour ; visibilité des emplacements
    publicitaires en conséquence.
  - `50_securite` (relecture de sécurité, 126 vérifications) : audit du catalogue
    (inventaire exact des 46 politiques contre le tableau de la section 6, aucune
    écriture « true », `(select …)` partout), données personnelles, escalades par
    upsert, déclencheurs contournés par le JWT, liens `https://`, `creer_profil` avec
    des métadonnées malformées, tables internes pour chaque profil. Détail dans
    « Relecture sécurité phase 1 ».
- **Couverture exigée** (point 7 du prompt et liste minimale de la mission), toute
  prouvée par ces tests : l'anonyme ne voit ni organisation brouillon / en attente ni
  événement en attente, ni les échéances et organisateurs d'un événement non publié,
  ne peut insérer, modifier, supprimer ni tronquer dans aucune des 14 tables, ne lit ni
  `clics_sortants`, ni `journal_moderation`, ni `demandes_contact`, ni
  `tentatives_formulaires`, ni `profils` (10) ; un connecté ne peut pas se donner le
  rôle admin ni « de confiance » (20, et 10 pour l'insertion d'un profil) ni créer une
  demande de gestion déjà « acceptee » (10) ; un gestionnaire accepté modifie la
  description de sa société mais ni son statut, ni sa mise en avant, ni son slug, ni sa
  catégorie, et rien sur une autre (0 ligne) (20) ; un événement créé par un
  gestionnaire ordinaire est `en_attente` même s'il envoie `publie`, `publie` s'il est
  de confiance ; source et slug sont figés ; un événement publié modifié reste publié ;
  un modérateur publie (20) ; un modérateur modifie `traitee` mais pas `message` (10) ;
  un emplacement inactif ou hors période est invisible pour l'anonyme (10, 40) ;
  `rechercher('pediatrie')` trouve « Pédiatrie », `rechercher('sbc')` trouve le sigle
  SBC, `rechercher` ne renvoie jamais de non publié (30) ; « aujourd'hui » est la date
  de Porto-Novo (40).
- **Sensibilité des tests** (vérifiée à l'écriture des tests, avant la présente
  étape) : un test volontairement faux fait échouer le script (code de sortie 1), et
  19 altérations volontaires de la RLS ou des déclencheurs ont toutes été détectées.

### Données (points 3 et 4 du prompt de phase 1)

- **`supabase/seed.sql`** (production) : exactement la section 5.6 des spécifications.
  5 disciplines (`ordre`, `slug`, `nom`, `description` — une phrase factuelle sur le
  champ couvert, sans affirmation sur l'association ou sur le Bénin) ; 5 organisations
  connues (`fss`, `sobeped`, `sbc`, `sometec`, `sobenchir`) au statut `brouillon`,
  `nom_complet` laissé `NULL` (à compléter par le porteur dans le back-office), aucune
  autre colonne renseignée que celles du tableau de la section 5.6 (`sigle`,
  `categorie`, `site_web`, `site_congres` — `sometec.site_web` et
  `sobenchir.site_congres` `NULL`, comme demandé) ; toutes rattachées à la discipline
  `sante`. Aucun événement (« pas de données inventées dans `seed.sql` », CLAUDE.md
  section 6). Idempotent : `on conflict (slug) do nothing` (disciplines, sociétés),
  `on conflict (societe_id, discipline_id) do nothing` (rattachement — pas de colonne
  `slug` sur cette table de liaison).
- **`supabase/seed_demo.sql`** (développement uniquement) : garde de la décision 8 en
  tête de fichier (voir plus bas, corrigée), puis une vérification que les 5
  disciplines de `seed.sql` existent (message clair si `seed_demo.sql` est chargé
  avant `seed.sql`), puis les données fictives :
  - **10 organisations** `[DÉMO]`, slugs `demo-*`, sigles inventés (aucun n'existe
    réellement au Bénin) : 8 `publie` (dont 2 `mise_en_avant` — SBMI, SBGEO — et une
    sans `site_web` ni `site_congres`, ABENV, pour l'écran de prospection du
    back-office), 1 `en_attente` (IEHP), 1 `brouillon` (SBJUR). Réparties sur les 5
    disciplines (2 par discipline) ; villes variées (Cotonou, Porto-Novo, Parakou,
    Abomey-Calavi, Bohicon, Natitingou, Djougou).
  - **20 événements** `[DÉMO]`, slugs `demo-*` : 18 `publie` (dont 3 déjà passés,
    visibles dans les archives — spécifications section 7 : un événement passé reste
    `publie`, il ne devient pas `archive`) et 2 `en_attente` (file de modération). Les
    7 types et les 3 modalités sont tous représentés (vérifié, voir « Validation des
    données » plus bas) ; 5 gratuits, 3 avec `credits_fmc` ; un événement (n° 20,
    `demo-colloque-multidisciplinaire-2mois`) chevauche deux mois civils, calculé
    depuis le 1ᵉʳ jour du mois suivant (`date_trunc('month', aujourdhui() + 1 mois) - 2`
    à `+ 2`) pour que le chevauchement soit vrai quel que soit le jour d'exécution, pas
    seulement au moment de l'écriture. `demo-congres-pediatrie-cotonou` porte le
    parcours de bout en bout n° 1 (spécifications section 16) : `publie`,
    `lien_inscription` et `site_web` renseignés, et un co-organisateur (SBMI
    organisateur, ABPN `co_organisateur`, seul exemple de ce rôle dans la démo).
    Chaque événement a une discipline (`evenement_disciplines`) et un organisateur
    (`evenement_societes`) ; les 5 disciplines sont représentées.
  - **Échéances** (22 au total, 1 à 3 par événement) : une échéance `inscription` à la
    date de début pour chaque événement (règle simple qui rend « urgente » celle des
    événements dont le début tombe dans les 7 prochains jours, et « déjà passée » celle
    des 3 événements passés (statut `publie`, pas `archive` — décision 14) — vérifié
    ci-dessous), plus
    deux échéances supplémentaires (`soumission_resumes`, `inscription_tarif_preferentiel`)
    sur le congrès de pédiatrie.
  - **2 emplacements publicitaires** `[DÉMO]`, actifs sur la période courante : un
    `evenement_en_avant` sur le congrès de pédiatrie (publié), une `banniere_agenda`
    sans image, annonceur `[DÉMO] Fournisseur médical Exemple`.
  - Tous les liens externes en `https://example.org/…` (vérifié par requête, aucune
    exception) ; aucune donnée personnelle : `soumis_par_nom`, `soumis_par_email` et
    `cree_par` restent `NULL` partout, les adresses de contact en `@example.org`.
  - **Idempotence** : les dates étant relatives à `aujourdhui()`, un simple
    `on conflict` aurait figé de vieilles dates à chaque rejeu (et `echeances` n'a pas
    de clé naturelle contre les doublons). Le fichier commence donc par supprimer
    toutes les données `[DÉMO]` existantes (même ordre que `purge_demo.sql` :
    événements, puis organisations, puis emplacements restants) avant de les
    réinsérer avec des dates fraîches. Vérifié : un second chargement, le même jour,
    donne exactement les mêmes décomptes (10 organisations, 20 événements,
    22 échéances, 21 organisateurs, 2 emplacements).
- **`supabase/purge_demo.sql`** : mêmes trois `delete` (événements, organisations,
  emplacements, par préfixe `[DÉMO]`), commenté, pour retirer la démo d'un
  projet qui ne devrait pas la porter. Vérifié : ne touche à aucune donnée de
  `seed.sql` (les 5 organisations et les 5 disciplines officielles restent intactes),
  et un second passage est un no-op sans erreur.

### Clients Supabase, types, cache et requêtes (points 5 et 6 du prompt de phase 1)

**`package.json`** : trois dépendances ajoutées (`pnpm add ... --fetch-timeout 300000`),
détaillées dans « Dépendances ajoutées » ; `db:types` réécrit (voir plus bas).

**`src/lib/env.ts`** : `envPublic()` et `envServeur()`, toutes deux PARESSEUSES —
elles ne lisent `process.env` qu'à l'appel, jamais à l'import, et ne mémorisent
rien (chaque appel relit `process.env`, ce qui rend le module testable avec
`vi.stubEnv`/`vi.unstubAllEnvs`, décision 15). Validation Zod ; message
d'erreur en français, une ligne par variable, qui distingue « variable
manquante » d'une valeur mal formée. Requises maintenant : `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. Facultatives jusqu'à leur phase (Resend, Turnstile,
`FORM_HASH_SALT`, `CRON_SECRET`, `ADMIN_NOTIFY_EMAIL`) : `null` si absentes ou
vides (correction de la phase 2 : une valeur vide, comme dans `.env.example`, vaut
« absente »),
plutôt que de bloquer un `.env.local` encore incomplet en phase 1 (décision 16).
`process.env.NEXT_PUBLIC_...` écrit littéralement (jamais `process.env[cle]`) :
Next.js remplace ces expressions au moment du build, ce qui permet d'appeler
`envPublic()` aussi depuis un futur composant client.

**`src/lib/supabase/`** :

- `public.ts` (`import "server-only"`) : client anonyme SANS cookies
  (`@supabase/supabase-js`, pas `@supabase/ssr`), pour les lectures publiques
  mises en cache de `src/lib/requetes/` — un client lié aux cookies d'une
  requête ne pourrait pas être partagé par `unstable_cache` entre visiteurs.
- `service.ts` (`import "server-only"`) : client `service_role`, commentaire
  listant les seuls usages autorisés (formulaires publics, passerelle `/go`,
  e-mails, envois de fichiers après vérification des droits — CLAUDE.md,
  section 6).
- `serveur.ts` : `createServerClient` (`@supabase/ssr`) lié aux cookies de la
  requête via `cookies()` de `next/headers`, ASYNCHRONE (Next 16, comme
  Next 15 : `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`) ;
  `setAll` protégée par un `try/catch` (écriture de cookies impossible pendant
  le rendu d'un Server Component). Pas encore utilisé (l'authentification par
  lien magique et l'espace gestionnaire sont la phase 5) ; un middleware de
  rafraîchissement de session sera à écrire à ce moment-là.
- `navigateur.ts` : `createBrowserClient` (`@supabase/ssr`), option `cookies`
  omise (gérée par la librairie via `document.cookie`, instance unique par
  défaut).
- `types.ts` : généré (voir plus bas).

Chaque client est créé PARESSEUSEMENT, dans une fonction, jamais au niveau du
module : instancier un client à l'import forcerait la lecture des variables
d'environnement pendant `pnpm build`.

**`scripts/generer-types.mjs`** (Node pur, aucune dépendance npm) : interroge
`citesavante_types` via `psql` (cinq requêtes JSON sur `pg_catalog` /
`information_schema` : énumérations, colonnes, contraintes clé primaire/unique,
clés étrangères, fonctions) et écrit `src/lib/supabase/types.ts` au format de
`supabase gen types typescript`. `search_path` vidé (`set search_path = ''`)
pour que les types utilisateur ressortent systématiquement qualifiés
(`public.xxx`) dans les signatures de fonctions, et `-q` (silencieux) pour que
la sortie de `psql` soit exactement le JSON attendu, sans le statut `SET`.
Détail dans l'en-tête du script. Choix de format :

- colonnes `generated always ... stored` (les `recherche` en tsvector) et
  `bigint generated always as identity` (les trois clés techniques) :
  `Insert`/`Update` à `?: never` ; testé par `types.test.ts` (décision 17) ;
- `tsvector` → `unknown` (absent de la table de correspondance usuelle,
  contrairement à un type reconnu) ;
- clés étrangères vers `auth.users` (hors du schéma `public`) exclues des
  `Relationships`, comme le fait `--schema public` de la CLI ;
- `isOneToOne` : toujours `false` dans le fichier généré (aucune clé étrangère
  du schéma actuel ne porte, à elle seule, une contrainte unique). Vérifié
  séparément que la détection fonctionne bien dans le cas positif : une table
  temporaire avec une colonne de clé étrangère `unique` a produit
  `isOneToOne: true`, puis a été supprimée (aucune trace dans le fichier
  final, régénéré ensuite) ;
- fonctions exclues : celles de déclencheur (`returns trigger`, non
  appelables par l'API) et celles préfixées `test_` — ajoutées par
  `supabase/tests/00_stubs_supabase.sql`, que `valider-base.sh` applique
  toujours avant les migrations, mais absentes du projet Supabase réel
  (décision 18) ;
- `rechercher(q, limite default 20)` : argument `limite` optionnel (a une
  valeur par défaut), retour `TABLE(...)` traduit en tableau d'objets ;
- `__InternalSupabase.PostgrestVersion` : valeur d'exemple (`"13.0.4"`), sans
  vérification possible sans PostgREST réel — à corriger, si besoin, au
  premier `supabase gen types --linked` (décision 19).

Généré avec :

```bash
PG_DB=citesavante_types SANS_DEMO=1 bash scripts/valider-base.sh
PG_DB=citesavante_types pnpm db:types
pnpm exec prettier --write src/lib/supabase/types.ts
```

`pnpm db:types` (`node scripts/generer-types.mjs`) reprend les mêmes variables
et les mêmes défauts que `scripts/valider-base.sh` (`PG_BIN`, `PG_HOST`,
`PG_PORT`, `PG_USER`, `PG_DB`). Une fois le projet Supabase distant créé et lié,
les types pourront aussi être régénérés depuis lui par `pnpm db:types:distant`
(« CLI Supabase et liaison au projet distant ») — les deux méthodes doivent
alors produire un fichier équivalent ; toute différence mérite d'être reportée
dans ce script.

**Règle de rendu** (décision 20 ; à suivre par les phases 2 et suivantes) —
`cacheComponents` n'est PAS activé dans `next.config.ts` (choix d'architecture
réservé à une phase ultérieure, hors périmètre de cette étape : il changerait
le rendu de toutes les pages, pas seulement des requêtes). Modèle retenu, dit
« précédent » (`node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`),
disponible même si `unstable_cache` est marqué comme remplacé par `use cache`
en Next 16 (qui, lui, EXIGE `cacheComponents`) :

1. Une lecture publique (`src/lib/requetes/*.ts`) est enveloppée par
   `unstable_cache(fn, cle, { tags, revalidate: DUREE_VALIDITE_CACHE })`,
   étiquetée avec une ou plusieurs constantes de `src/lib/cache.ts`
   (`societes`, `evenements`, `disciplines`, `emplacements`, section 8 des
   spécifications) ET bornée à 5 minutes (`DUREE_VALIDITE_CACHE = 300`,
   ajouté par la correction de la phase 2 ; garde-fou : `src/lib/cache.test.ts`).
   La durée est un filet de sécurité pour les écritures faites HORS d'une
   server action (éditeur SQL, tableau de bord Supabase, script), qui
   n'invalident rien : sans elle, une fiche corrigée en SQL restait servie
   telle quelle jusqu'à un an. Passé le délai, `unstable_cache` sert encore
   l'ancienne valeur et relit en arrière-plan : une écriture SQL apparaît au
   plus tard à la deuxième visite après 5 minutes.
   Exceptions (phase 2) : aucune lecture dont la clé viendrait d'une saisie
   libre du visiteur n'est mise en cache, car chaque saisie créerait une
   entrée persistante (un fichier par entrée dans `.next/cache/fetch-cache`
   en auto-hébergement) ; d'où : recherche texte de l'annuaire non mise en
   cache (comme la lecture de la passerelle), et fiche lue (puis mise en
   cache) seulement si son slug figure dans la liste déjà en cache des
   organisations publiées.
2. Chaque page publique qui appelle une fonction de `src/lib/requetes/`
   (phase 2 et suivantes) exporte `export const dynamic = "force-dynamic";` :
   la PAGE n'est jamais tentée au build (elle n'a pas de base de données à ce
   moment-là), seule la LECTURE, elle, reste mise en cache et partagée entre
   visiteurs par `unstable_cache`.
3. Une server action qui écrit une donnée publique appelle
   `invalider(...etiquettes)` (`src/lib/cache.ts`), qui appelle `updateTag`
   pour chacune : la prochaine lecture attend la version fraîche au lieu de
   servir une version en cache (« lecture de sa propre écriture », exigée
   par le critère de la phase 6 : « Une publication apparaît immédiatement
   sur le site public »). `updateTag` ne fonctionne QUE depuis une server action
   (jamais un Route Handler) : cohérent avec CLAUDE.md, section 6
   (« toutes les écritures passent par des server actions »).
4. « Aujourd'hui » (`aujourdhuiPortoNovo()`) est calculé par l'appelant, EN
   DEHORS de la fonction mise en cache, et passé en argument
   (`src/lib/requetes/evenements.ts`) : `unstable_cache` inclut les arguments
   dans la clé de cache, donc le cache change naturellement de clé au
   changement de jour à Porto-Novo, sans dépendre d'une invalidation.
   Le calculer À L'INTÉRIEUR de la fonction mise en cache aurait figé
   « aujourd'hui » à la date du premier appel.

Vérifié empiriquement (et non seulement affirmé) que ce modèle satisfait la
contrainte fixée pour cette étape (« `pnpm build` doit réussir SANS base de
données ni variables Supabase ») : une page jetable (`src/app/test-cache-jetable/page.tsx`,
`export const dynamic = "force-dynamic"`, appelant `listerDisciplines()`) a été
ajoutée, `pnpm build` lancé sans aucune variable d'environnement et sans
`.env.local`, puis la page supprimée après vérification — détail du résultat
dans « Vérifications ».

Migration future vers `use cache` (quand `cacheComponents` sera activé,
décision d'une phase ultérieure) : remplacer `unstable_cache(fn, cle, {tags})`
par `'use cache'` + `cacheTag(...)` + `cacheLife` (durée équivalente à
`DUREE_VALIDITE_CACHE`) en tête de chaque fonction de
`src/lib/requetes/`, garder les mêmes constantes d'étiquette, remplacer
`updateTag` par son équivalent (déjà celui utilisé ici) ou `revalidateTag(tag,
{ expire: 0 })` si l'invalidation doit un jour se faire hors d'une server
action.

**`src/lib/cache.ts`** : les 4 étiquettes de la section 8 et `invalider(...)`.

**`src/lib/utils/dates.ts`** : `aujourdhuiPortoNovo(maintenant = new Date())`,
`Intl.DateTimeFormat` avec `formatToParts` (fuseau `Africa/Porto-Novo`), pour
correspondre à `public.aujourdhui()` côté SQL. Le paramètre par défaut
(plutôt qu'un appel interne à `new Date()` non paramétrable) rend la fonction
testable ET utilisable comme argument d'une fonction mise en cache (règle de
rendu, point 4 ci-dessus).

**`src/lib/requetes/`** — chaque requête filtre EXPLICITEMENT `statut = 'publie'`
(CLAUDE.md, section 6), est typée par `src/lib/supabase/types.ts`, mise en
cache avec ses étiquettes, et lève une erreur en français si Supabase répond
une erreur :

- `disciplines.ts` : `listerDisciplines()` — pas de colonne `statut` sur cette
  table (toutes les disciplines sont publiques), triées par `ordre`.
- `societes.ts` : `listerSocietesPubliees()` — mises en avant d'abord, puis
  ordre alphabétique du sigle (section 8.1), avec les disciplines de chaque
  société (jointure via `societe_disciplines`). Ni filtres (discipline, ville,
  catégorie, recherche) ni pagination par 24 : hors périmètre de ce point,
  viendront avec la page `/societes` (phase 2).
- `evenements.ts` : `listerEvenementsAVenir()` — `date_fin >= aujourd'hui à
Porto-Novo`, triés par `date_debut`, avec les organisateurs
  (`evenement_societes` → `societes`) et la prochaine échéance non passée
  (`echeances`, la plus proche).

Aucune page n'utilise encore ces requêtes (prévu, phases 2 à 4).

**Tests Vitest ajoutés** :

- `src/lib/utils/dates.test.ts` : autour de minuit UTC (23 h 30 UTC =
  0 h 30 à Porto-Novo, déjà le lendemain), pile à 23 h UTC, juste avant
  22 h 59 UTC, format à deux chiffres, sans argument.
- `src/lib/env.test.ts` : `vi.stubEnv`/`vi.unstubAllEnvs` — variable requise
  manquante (message nommant la variable), URL mal formée, configuration
  valide (Turnstile absente → `null`), pas de mise en cache du premier
  résultat, variables serveur facultatives (`null` puis renseignées),
  adresse `ADMIN_NOTIFY_EMAIL` mal formée.
- `src/lib/supabase/types.test.ts` : deux parties. Une partie D'EXÉCUTION
  (`Constants.public.Enums` reprend exactement les valeurs des 12 types
  énumérés SQL — même principe que `textes.test.ts`). Une partie DE TYPE,
  compilée par `pnpm typecheck` mais jamais exécutée par Vitest (des requêtes
  Supabase réelles n'ont ni base de données ni variables d'environnement dans
  les tests) : `Tables<>`/`Enums<>` ne tombent jamais sur `never` ni `any`,
  les colonnes générées/identité restent `never` en écriture, et une requête
  typique à deux niveaux de jointure (`evenements` → `evenement_societes` →
  `societes`) s'infère correctement — vérifié via `ReturnType` sur une
  fonction jamais appelée, donc sans risque pour `pnpm build`.

### Vérifications (points 5 et 6)

- **`pnpm typecheck`** (`tsc --noEmit`) : réussit, aucune erreur.
- **`pnpm test`** (`vitest run`) : réussit, 6 fichiers, 55 tests (dont les 3
  nouveaux : `dates.test.ts`, `env.test.ts`, `types.test.ts`).
- **`pnpm build`** (sans `.env.local`, absent tout du long — vérifié avant
  chaque lancement — et sans base de données) : réussit.
  - Confirmation empirique de la contrainte « build sans base ni variables
    Supabase » : une page jetable
    (`src/app/test-cache-jetable/page.tsx`, `export const dynamic =
"force-dynamic"`) appelant réellement `listerDisciplines()` — donc
    important le module `src/lib/requetes/disciplines.ts`, où
    `unstable_cache(...)` s'exécute AU NIVEAU DU MODULE, à l'import — a été
    ajoutée ; `pnpm build` a réussi, la route est apparue marquée `ƒ`
    (dynamique, jamais tentée au build) dans le tableau des routes, sans
    aucune erreur de variable d'environnement manquante. La page a ensuite
    été supprimée (jetable, jamais commitée). Ceci confirme à la fois que
    l'appel à `unstable_cache` au niveau du module ne nécessite aucun
    contexte de requête, et que `export const dynamic = "force-dynamic"`
    suffit à empêcher toute tentative de rendu statique au build.
  - Sans cette page, les 4 routes normales du projet (`/`, `/_not-found`,
    `/charte`, `/icon.svg`) restent toutes statiques (`○`), comme en phase 0.
- **`pnpm lint`** (`eslint .`) : réussit, 0 erreur, 0 avertissement. Un
  premier passage avait signalé 9 avertissements `no-unused-vars` sur les
  alias de type de `types.test.ts` (jamais référencés individuellement) ;
  corrigés en les regroupant dans un type EXPORTÉ, `VerificationsDeTypes`.
- **Détection `isOneToOne`** : voir décision 21 et le commentaire de
  `estCleExacte` dans `scripts/generer-types.mjs`.

### Décisions

1. Migrations dans `supabase/migrations/`, au format de la CLI Supabase :
   `20260928000100_extensions_recherche.sql` … `20260928000700_stockage.sql` (7
   fichiers). Tables P1 (`abonnes`, `sources_synchro`, `actualites`) non créées.
2. « Aujourd'hui » côté SQL = `(now() at time zone 'Africa/Porto-Novo')::date`, jamais
   `current_date` (Supabase tourne en UTC : `current_date` y donne encore la veille
   entre minuit et 1 h à Porto-Novo, UTC+1). Écrit une seule fois, dans la fonction
   `public.aujourdhui()`, utilisée par la RLS de `emplacements_pub` et à réutiliser
   partout ailleurs.
3. Toutes les fonctions ont un `search_path` fixé (alerte Supabase
   `function_search_path_mutable`) : `public, extensions` pour les fonctions ordinaires
   (dont `rechercher()`, pour que `similarity()` et l'opérateur `%` de `pg_trgm`,
   installés dans `extensions`, soient trouvés), `pg_catalog, public` pour les fonctions
   security definer. Les configurations de recherche sont écrites
   `'public.fr_unaccent'::regconfig`.
4. Déclencheurs de protection : ils ne s'appliquent QUE si
   `auth.role() = 'authenticated'` et que l'utilisateur n'est pas modérateur
   (`proteger_profil` : pas administrateur). Le client de service (server actions) et
   le rôle `postgres` (migrations, seeds, éditeur SQL, où `auth.role()` est nul) ne
   sont pas contraints (condition exacte : décision 23). Une violation lève une
   exception en français, code `42501`.
   - `proteger_societe` (before update) : statut, mise_en_avant, slug et categorie
     figés ; soumis_par_nom, soumis_par_email et logo_path aussi (correctif 4 du
     coordinateur), avec un message distinct.
   - `statut_evenement_gestionnaire` (before insert or update) :
     - à la création : statut `publie` si le profil est de confiance, sinon
       `en_attente` ; `source = 'manuel'`, `source_ref = null` ; `soumis_par_nom` et
       `soumis_par_email` forcés à `null` (correctif 4 : ces coordonnées ne viennent
       que des formulaires publics, écrits par le client de service) ; `affiche_path`
       forcé à `null` aussi (reprise après vérification : l'affiche n'est renseignée
       que par la server action d'envoi, avec le client de service) ;
     - à la modification : slug, source, source_ref et cree_par figés ;
       soumis_par_nom, soumis_par_email et affiche_path figés aussi (correctif 4,
       message distinct) ;
     - statut à la modification : `publie` reste `publie` (modification visible,
       contrôlée a posteriori, spécifications 12.5) ; `archive` reste `archive` ;
       `refuse` devient TOUJOURS `en_attente`, même pour un profil de confiance
       (correctif 3 : une retouche ne republie pas d'elle-même un événement refusé,
       la resoumission retourne en file de modération) ; `brouillon` et `en_attente`
       deviennent `publie` si le profil est de confiance, `en_attente` sinon —
       conforme à 5.4, et décision assumée : un profil de confiance publie ainsi,
       par une retouche, tout événement en attente de son organisation, y compris
       une soumission du public qu'il n'a pas écrite ;
     - limite assumée (reprise après vérification) : la ligne ne garde aucune trace
       du refus ; pour un profil de confiance, une SECONDE retouche trouve
       l'événement refusé en `en_attente` et le publie, sans modérateur (testé :
       `20_declencheurs`, bloc D). Ce profil pouvait déjà créer un nouvel événement
       au même contenu, publié d'office : le refus ne l'a jamais bloqué, la seconde
       retouche lui rend seulement la ligne et le slug refusés (« À valider par le
       porteur (phase 1) »).
   - `proteger_profil` (before update) : seul un administrateur modifie role et
     de_confiance.

   Dans chaque déclencheur, le test de `auth.role()` est un `if` séparé, placé avant
   tout appel à `est_moderateur()` / `est_admin()` : PostgreSQL vérifie le droit
   d'exécution de toutes les fonctions d'une expression à sa préparation, et `anon` n'a
   pas ce droit (décision 9).

5. `demandes_contact` : les modérateurs ne modifient QUE la colonne `traitee`
   (politique de modification + privilèges de colonne :
   `revoke update … from anon, authenticated ; grant update (traitee) … to authenticated`).
6. Stockage (dernière migration) : buckets publics `logos` (500 Ko), `affiches`
   (2 Mo), `publicites` (1 Mo), types `image/png`, `image/jpeg`, `image/webp` (jamais
   SVG), insérés dans `storage.buckets` avec `on conflict do update`. 1 Ko = 1 024
   octets. AUCUNE politique sur `storage.objects`, ni d'écriture (envois par le client
   de service, section 5.7) ni de lecture (correctif 2 du coordinateur) : un bucket
   public sert ses fichiers par son URL publique sans aucune politique ; la politique
   de lecture d'origine ne servait qu'à LISTER les objets par l'API, ce qui exposait
   les affiches d'événements non publiés ou refusés. La migration garde un
   `drop policy if exists` de cette ancienne politique (idempotence).
7. RLS sur les 14 tables, politiques selon le tableau de la section 6, une par
   opération, noms français explicites, `(select auth.uid())` et
   `(select public.est_moderateur())` pour une évaluation unique par requête
   (recommandation de performance Supabase). « Si l'événement est visible » =
   `exists (select 1 from evenements e where e.id = evenement_id)`, qui hérite de la
   RLS d'`evenements`.
8. `seed_demo.sql` ne doit jamais pouvoir s'exécuter par accident : il commence par un
   bloc qui lève une exception si `current_setting('citesavante.demo', true)` ne vaut
   pas `'oui'`. `scripts/valider-base.sh` fait `set citesavante.demo = 'oui'` avant de
   le charger. **Écrit avec `coalesce(current_setting(...), '')`** : la forme littérale
   de la consigne reçue (`current_setting(..., true) <> 'oui'`) ne se déclenche jamais quand le
   réglage n'a jamais été fait (`current_setting(..., true)` renvoie alors `NULL`, et
   `NULL <> 'oui'` vaut `NULL`, pas vrai — un `if` sur `NULL` ne lève rien). Vérifié :
   sans le `coalesce`, une exécution sans le réglage passait silencieusement.
9. Fonctions de rôles (security definer) exécutables par `authenticated` et
   `service_role` seulement, pas par `anon` ni `PUBLIC` (moins de surface d'appel par
   `/rest/v1/rpc`, alerte Supabase `anon_security_definer_function_executable`). En
   conséquence, les lectures publiques ont une politique propre à `anon`
   (`statut = 'publie'`, ou emplacement actif du jour), séparée de celle
   d'`authenticated`. Fonctions de déclencheur : exécution directe retirée à PUBLIC,
   `anon` et `authenticated` ; `service_role` garde le droit hérité des privilèges par
   défaut de Supabase, sans effet, car une fonction `returns trigger` ne s'appelle
   pas directement.
10. Validation sans Supabase ni Docker : PostgreSQL 17.6 portable, grappe dédiée
    (port 54390), environnement Supabase simulé par `00_stubs_supabase.sql`. Un
    utilisateur est simulé exactement comme PostgREST le fait :
    `set local role authenticated` puis `request.jwt.claims` (jamais par une variable
    maison).
11. `seed_demo.sql` idempotent par suppression puis réinsertion (et non
    `on conflict`) : les dates dépendent du jour d'exécution (relatives à
    `aujourdhui()`), et `echeances` n'a pas de colonne unique naturelle pour un
    `on conflict`. Les trois `delete` sont dans le même ordre que `purge_demo.sql`
    (événements, organisations, emplacements) : les deux fichiers restent cohérents
    l'un avec l'autre, même si l'ordre est en réalité sans effet ici (les clés
    étrangères des tables de liaison et des emplacements rattachés à un événement sont
    toutes en `on delete cascade`).
12. Identifiants des lignes de démonstration fixés en dur (`de110000-…` pour les
    organisations, `ee110000-…` pour les événements) plutôt que
    `gen_random_uuid()` : permet de relier les tables de liaison
    (`evenement_societes`, `evenement_disciplines`) par une simple jointure sur les
    slugs, sans variable PL/pgSQL ni `RETURNING` intermédiaire.
13. Chaque valeur d'énumération est écrite avec un cast explicite
    (`'publie'::public.statut_publication`, etc.), y compris là où ce ne serait pas
    strictement nécessaire : dès qu'une valeur passe par une table dérivée
    (`values (...) as x(...)`, utilisée pour les organisateurs et les disciplines des
    événements), PostgreSQL fige son type en `text` avant qu'elle n'atteigne la
    colonne cible, et l'affectation `text → enum` n'est pas implicite (contrairement à
    un litéral posé directement dans une liste `insert … values`). Vérifié sans cast
    sur `evenement_societes.role` : « column "role" is of type role_organisation but
    expression is of type text ».
14. Un événement passé reste au statut `publie` (jamais `archive`), conformément à la
    section 7 des spécifications (« un événement passé reste `publie` et apparaît
    dans les archives » ; `archive` est réservé aux fiches retirées). Les 3 événements
    `[DÉMO]` passés sont donc `publie`.
15. `src/lib/env.ts` ne mémorise pas son résultat (chaque appel relit
    `process.env`) : une mémorisation aurait empêché de tester un changement de
    variable dans un même processus (`vi.stubEnv`), et le coût d'une relecture
    de `process.env` est négligeable face à celui d'une requête réseau.
16. Variables encore facultatives en phase 1 (`RESEND_API_KEY`, `EMAIL_FROM`,
    `ADMIN_NOTIFY_EMAIL`, `TURNSTILE_SECRET_KEY`, `FORM_HASH_SALT`,
    `CRON_SECRET`) : absentes du schéma requis d'`envServeur()`, elles valent
    `null` si non définies. Les rendre requises maintenant aurait empêché de
    démarrer avec un `.env.local` qui ne couvre encore que Supabase ; c'est au
    code qui les UTILISE (phase 5 ; `CRON_SECRET` : évolution P1-a) de vérifier
    leur présence à ce moment-là.
17. `scripts/generer-types.mjs` marque `?: never` en `Insert`/`Update` pour deux
    catégories de colonnes : `generated always ... stored` (les `recherche` en
    tsvector) et `bigint generated always as identity` (les 3 clés techniques,
    `clics_sortants`/`journal_moderation`/`tentatives_formulaires`) — aucune des
    deux ne peut être écrite sans `OVERRIDING SYSTEM VALUE`, que le code de
    l'application n'utilise jamais. Vérifié par `types.test.ts`, avec
    `Required<...>` avant l'accès indexé : une propriété optionnelle donne
    `never | undefined` (= `undefined`) par indexation directe, ce qui aurait
    masqué un vrai `never` sans ce détour.
18. Le générateur exclut les fonctions dont le nom commence par `test_` : ajoutées
    par `supabase/tests/00_stubs_supabase.sql`, que `scripts/valider-base.sh`
    applique TOUJOURS avant les migrations (y compris pour préparer la base qui
    sert à générer les types, `citesavante_types`), elles n'existeront pas sur
    le projet Supabase réel et ne doivent donc pas apparaître dans
    `Database["public"]["Functions"]`.
19. `search_path` vidé (`set search_path = ''`) le temps des requêtes
    d'introspection de `generer-types.mjs` : `pg_get_function_arguments()` et
    `pg_get_function_result()` qualifient alors SYSTÉMATIQUEMENT un type
    utilisateur (`public.role_utilisateur`), ce qui rend son repérage sans
    ambiguïté (contre un type interne homonyme). Sans ce réglage, la
    qualification dépendrait du `search_path` de la session appelante, donc du
    hasard de l'ordre de connexion.
20. Règle de rendu des lectures publiques (`unstable_cache` + étiquettes +
    durée de validité de 5 minutes, `DUREE_VALIDITE_CACHE`, depuis la
    correction de la phase 2 + `export const dynamic = "force-dynamic"` sur la
    page + `invalider()` → `updateTag` depuis les server actions ; aucune mise
    en cache d'une lecture dont la clé est une saisie libre du visiteur :
    recherche texte, passerelle, slug absent de la liste des organisations
    publiées) : détaillée dans « Clients Supabase, types, cache et requêtes »
    ci-dessus. Choisie plutôt que `cacheComponents`
    (`use cache`) parce que ce dernier exigerait un `<Suspense>` autour de
    chaque accès à une donnée non mise en cache sur TOUTES les pages
    existantes et à venir — une décision d'architecture globale, hors du
    périmètre de cette étape (clients, types, premières requêtes), à
    reconsidérer explicitement le jour où une phase future en aurait besoin.
21. `isOneToOne` (`scripts/generer-types.mjs`) : toujours `false` dans le
    fichier généré, car aucune clé étrangère du schéma actuel ne porte, à elle
    seule, une contrainte unique — un cas plausible (colonne rarement testée)
    plutôt qu'une omission : vérifié séparément que la détection reconnaît
    bien le cas positif (table temporaire `discipline_id uuid not null unique
references disciplines`, supprimée ensuite), qui a produit
    `isOneToOne: true`.
22. Relecture sécurité — données personnelles : `soumis_par_nom` et `soumis_par_email`
    ne sont lisibles ni par `anon` ni par `authenticated` (privilèges de colonne,
    même mécanisme que la décision 5), `cree_par` ne l'est pas par `anon`. Les
    modérateurs les lisent par `auteur_soumission(type, id)` (security definer, vide
    pour un non-modérateur) plutôt que par le client de service, dont les usages sont
    limités par CLAUDE.md, section 6 ; les e-mails aux auteurs (phases 5 et 6)
    passent par le client de service (usage « e-mails »). Ces deux colonnes ne sont
    pas modifiables non plus par un gestionnaire (décision 4, correctif 4).
23. Relecture sécurité — déclencheurs de protection : exemptés seulement si
    `auth.role()` diffère de `'authenticated'` ET `current_user` diffère de
    `authenticated` (complète la décision 4 : service et `postgres` restent libres,
    mais une requête sous le rôle `authenticated` est toujours contrainte, quel que
    soit le rôle écrit dans le JWT).
24. Relecture sécurité — « https:// uniquement » (section 6) imposé aussi par la base
    (6 contraintes `check`), puisque la RLS permet des écritures directes par l'API
    qui ne passent pas par Zod. Casse du schéma indifférente, aucun espace ; `reseaux`
    seulement contraint à être un objet JSON (format des valeurs non spécifié).
25. Relecture sécurité — lectures publiques embarquant des organisations : filtre
    explicite `statut = 'publie'` sur l'organisation embarquée, `!inner`, et garde
    contre `null` (la RLS peut masquer une ligne que le type généré dit non nulle).
26. Relecture sécurité — écarts au tableau de la section 6 et aux décisions 4 et 6
    signalés par la relecture : trois ont été tranchés par le coordinateur et corrigés
    (listage du stockage : correctif 2 ; republication d'un événement refusé par un
    profil de confiance : correctif 3 ; colonnes d'auteur et d'images écrites
    directement : correctif 4 — section « Correctifs du coordinateur ») ; deux restent
    dans « À valider par le porteur (phase 1) », non modifiés (lecture de
    `societe_disciplines`, insertion d'événements par tout compte).
27. CLI Supabase en dépendance de développement (`supabase`, figée par
    `pnpm-lock.yaml`, appelée par `pnpm exec supabase …`) plutôt qu'installée sur le
    poste : même version pour tous. `supabase/config.toml` (créé par
    `supabase init`) ne décrit que l'environnement LOCAL de la CLI (`supabase start`,
    `db reset`, qui demandent Docker, non utilisé ici) : seules modifications,
    `[db.seed] sql_paths = ["./seed.sql"]` commenté (jamais `seed_demo.sql`),
    `[auth] site_url = "http://localhost:3000"` et `additional_redirect_urls` pour le
    serveur de développement (`http://localhost:3000/**`,
    `http://127.0.0.1:3000/**`, retour du lien magique en phase 5). `project_id`
    valait déjà `"cite-savante"` (nom du dossier). La configuration d'authentification
    de production (URL du site, redirections) se règle dans le tableau de bord
    Supabase (phase 7), jamais par `supabase config push`, qui y recopierait ces
    valeurs de développement.

### Adaptations du SQL des spécifications

Comparaison des migrations avec le SQL des sections 5.1 à 5.4, et avec les sections 6
et 5.7. Deux catégories : ce qui était **nécessaire** (le SQL tel quel échoue, ne se
rejoue pas, ou pose un problème de sécurité ou d'intégrité), et ce qui est **explicite
ou durci** (le SQL tel quel fonctionnerait).

Nécessaires :

- **`rechercher()` : `set search_path = public, extensions`.** Vérifié sur la grappe
  locale : le SQL des spécifications échoue dès le `create function` (« function
  similarity(text, text) does not exist ») quand `extensions` n'est pas dans le
  `search_path`, et échoue de même à l'exécution sous le `search_path` de l'appelant.
- **Idempotence** (exigée pour cette livraison, pas par Supabase : une migration
  rejouée par erreur ne doit pas échouer ; le script le vérifie en rejouant les 7
  fichiers) : `create table|index … if not exists` ; types énumérés et configuration
  `fr_unaccent` créés dans un bloc `do` (ces deux instructions n'ont pas de clause
  `if not exists`) ; `create or replace trigger` ; `drop policy if exists` avant chaque
  politique ; `on conflict do update` pour les buckets.
- **`create schema if not exists extensions`** (5.1) : le schéma existe sur Supabase,
  pas sur un PostgreSQL nu ; sans effet sur Supabase.
- **`on delete set null`** sur `gestionnaires.decide_par` et
  `journal_moderation.auteur` (5.3) : sans cette clause, le compte d'un modérateur
  ayant déjà pris une décision ne pourrait plus être supprimé (clé étrangère vers
  `auth.users`), alors que la suppression d'un compte sur demande doit rester possible.
  La ligne du journal est conservée, sans auteur.
- **Fonctions security definer : `search_path = pg_catalog, public`** au lieu de
  `public` (5.4), noms qualifiés (`public.profils`, `public.gestionnaires`) : `pg_catalog`
  en tête empêche qu'un objet homonyme d'une fonction système ne soit pris à sa place
  dans une fonction qui s'exécute avec les droits de son propriétaire.
- **Droits d'exécution** : `creer_profil()` et les autres fonctions de déclencheur ne
  sont plus exécutables par `PUBLIC`, `anon` ni `authenticated` ; les fonctions de
  rôles ne le sont plus par `anon` ni `PUBLIC` (décision 9). Par défaut, toute fonction
  de `public` serait appelable par l'API.
- **Les trois déclencheurs de protection**, seulement décrits en prose en 5.4, sont
  écrits selon la décision 4, qui va au-delà du texte : `source_ref` et `cree_par`
  figés en plus de `source` et `slug` (sinon un gestionnaire pourrait réattribuer un
  événement ou le faire passer pour synchronisé) ; `source = 'manuel'` et
  `source_ref = null` imposés à la création ; à la modification, `publie` reste
  `publie` et `archive` reste `archive` (sinon toute retouche d'un événement publié le
  ferait disparaître du site en le repassant `en_attente`, contraire à 12.5) ;
  exemption fondée sur
  `auth.role() = 'authenticated'` et non sur « service_role seulement » (le rôle
  `postgres` des migrations, des seeds et de l'éditeur SQL, où `auth.role()` est nul,
  doit pouvoir écrire, notamment pour désigner le premier administrateur).
  Correctifs du coordinateur, au-delà de 5.4 aussi :
  - **événement refusé** (correctif 3) : 5.4 dit « forcer `publie` quand le profil est
    de confiance » ; appliqué tel quel, un profil de confiance annulait un refus du
    modérateur par une simple retouche. Un événement `refuse` retouché repasse
    toujours `en_attente` ; une seconde retouche par un profil de confiance le publie
    (limite assumée, décision 4) ;
  - **colonnes figées** (correctif 4) : `soumis_par_nom`, `soumis_par_email` et
    `logo_path` (organisations), `soumis_par_nom`, `soumis_par_email` et
    `affiche_path` (événements), et `soumis_par_*` (correctif 4) puis `affiche_path`
    (reprise après vérification) forcés à `null` à la création d'un
    événement par un connecté non modérateur. Sans cela, un gestionnaire détournait
    vers lui les e-mails de décision, ou faisait afficher l'image d'une autre fiche
    (la RLS laisse écrire directement par l'API ; 5.7 veut que les images passent par
    la server action d'envoi).
- **Liens `https://` et `reseaux`** (migration 3, relecture de sécurité, décision 24) :
  6 contraintes `check` — `societes.site_web`, `societes.site_congres`,
  `evenements.lien_inscription`, `evenements.site_web`, `emplacements_pub.lien`
  (`^https://` sans espace, casse du schéma indifférente) et `societes.reseaux` (objet
  JSON). La section 6 exige des liens `https://`, mais la RLS permet des écritures
  directes par l'API, qui ne passent pas par la validation Zod des server actions
  (`javascript:` accepté avant la relecture).
- **Données personnelles** (migrations 6 et 4, relecture de sécurité, décision 22) :
  privilèges de colonne de LECTURE sur `societes` et `evenements` (`revoke select`
  sur la table puis `grant select (liste des colonnes)`) : `soumis_par_nom` et
  `soumis_par_email` illisibles par `anon` et `authenticated`, `cree_par` illisible
  par `anon` ; fonction `auteur_soumission(text, uuid)` (security definer) pour que
  les modérateurs les lisent. La RLS filtre des lignes, pas des colonnes : sans cela,
  la clé publique suffisait à lire le nom et l'e-mail de l'auteur de toute fiche
  publiée.
- **Stockage** (5.7, correctif 2 du coordinateur) : « buckets en lecture publique »
  traduit par `public = true` seulement, SANS politique de lecture sur
  `storage.objects` : un bucket public sert ses fichiers par son URL publique ; une
  politique de lecture ne servait qu'à lister les objets par l'API (affiches
  d'événements non publiés ou refusés comprises).

Explicites ou durcies (le SQL des spécifications fonctionnerait tel quel) :

- Noms qualifiés par leur schéma partout (`public.`, `auth.`, `extensions.`).
- `'public.fr_unaccent'::regconfig` dans les colonnes générées et dans `rechercher()`
  au lieu de la chaîne seule (décision 3) : même comportement, la surcharge immuable
  `to_tsvector(regconfig, text)` qu'exige une colonne générée est désignée
  explicitement.
- `'societe'::text` et `'evenement'::text` dans `rechercher()` : vérifié, la fonction
  se crée aussi avec les littéraux non typés (l'`union` les résout en `text`) ; le type
  explicite évite de dépendre de cette règle de résolution.
- `set search_path = public, extensions` ajouté aussi à `maj_updated_at()` et aux
  fonctions de déclencheur (décision 3 ; alerte Supabase).
- Ajout de la fonction `aujourdhui()` (décision 2).
- Ajout de 10 index sur les clés étrangères non couvertes (`societe_disciplines`,
  `evenements.cree_par`, `evenement_societes.societe_id`, `evenement_disciplines`,
  `echeances.evenement_id`, `gestionnaires.societe_id` et `decide_par`,
  `emplacements_pub.discipline_id` et `evenement_id`, `journal_moderation.auteur`) :
  performance des suppressions en cascade et des jointures inverses (alerte Supabase
  `unindexed_foreign_keys`).
- Section 6, traduction du tableau en politiques :
  - lectures publiques séparées `anon` / `authenticated` (conséquence de la
    décision 9 ; même résultat, puisque pour `anon` `est_moderateur()` et `gere_*()`
    sont faux et `auth.uid()` nul) ;
  - `emplacements_pub` : « date du jour » = `aujourdhui()` (Porto-Novo) ;
  - `profils` : « admin pour tout » = ajout, modification et suppression par un
    administrateur ; un utilisateur ne peut pas créer lui-même son profil (le
    déclencheur `creer_profil` le fait) ;
  - `gestionnaires` : l'ajout exige en plus `decide_par` et `decide_le` vides (une
    demande ne peut pas arriver avec une décision déjà remplie) ; aucune politique de
    suppression (le tableau n'en prévoit pas) ;
  - `evenement_societes` : « l'événement a été créé par l'utilisateur » =
    `exists (… evenements e where e.id = evenement_id and e.cree_par = (select auth.uid()))` ;
  - `demandes_contact` : privilèges de colonne (décision 5) ;
  - `TRUNCATE` retiré à `anon` et `authenticated` sur les 14 tables (Supabase l'accorde
    par défaut et `TRUNCATE` n'est pas soumis à la RLS).
- Relecture sécurité (décision 23) : condition `current_user` dans l'exemption des
  trois déclencheurs de protection (défense en profondeur : via PostgREST, le rôle de
  la base et celui du JWT coïncident toujours).

### CLI Supabase et liaison au projet distant (point 1 du prompt de phase 1)

**Fait** (29 septembre 2026), sans aucune connexion à Supabase (ni `login`, ni `link`) :

- `pnpm add -D supabase --fetch-timeout 300000` : CLI `supabase` 2.118.0 ;
  `pnpm exec supabase --version` répond `2.118.0`. Le binaire (`supabase.exe`) est
  livré par une dépendance optionnelle propre à la plateforme
  (`@supabase/cli-windows-x64`) ; cette version n'a pas de script d'installation,
  donc l'entrée `supabase: true` ajoutée à `allowBuilds` (`pnpm-workspace.yaml`,
  comme demandé, sans toucher aux autres) est sans effet pour cette version ;
  elle autoriserait d'office un script d'installation qu'une version future
  réintroduirait.
- `pnpm exec supabase init` (non interactif par défaut : aucun réglage VS Code ni
  IntelliJ créé) : a créé seulement `supabase/config.toml` et `supabase/.gitignore`
  (`.branches`, `.temp`, `.env.keys`, `.env.local`, `.env.*.local`). Empreintes
  SHA-256 de `migrations/`, `seed.sql`, `seed_demo.sql`, `purge_demo.sql` et `tests/`
  identiques avant et après. Réglages modifiés : décision 27.
- `package.json` : `db:types` inchangé (générateur local, sans projet distant) ; ajout
  de `db:types:distant` =
  `supabase gen types typescript --linked --schema public > src/lib/supabase/types.ts`.
  Syntaxe vérifiée par `supabase gen types --help` (usage :
  `supabase gen types [flags] [<language>]`) ; sans projet lié, la commande s'arrête
  sur « Cannot find project ref. Have you run supabase link? ».

**Liaison, à faire par le porteur une fois le projet créé** (région Europe,
`docs/PROMPTS.md`, « Avant de commencer »), depuis la racine du dépôt, après le commit
de la phase 1 :

1. `pnpm exec supabase login` — ouvre le navigateur (ou demande un jeton d'accès
   personnel), qui reste sur le poste, hors du dépôt.
2. `pnpm exec supabase link --project-ref <ref>` — `<ref>` est l'identifiant du
   projet, visible dans l'adresse du tableau de bord
   (`https://supabase.com/dashboard/project/<ref>`) ; le mot de passe de la base est
   demandé. La référence est écrite dans `supabase/.temp/` (ignoré par git).
3. `pnpm exec supabase db push --dry-run` (liste des migrations à appliquer : les 7
   fichiers de `supabase/migrations/`), puis `pnpm exec supabase db push` — applique
   les 7 migrations dans l'ordre. Ne charge aucune donnée et ne touche pas à la
   configuration. Point à surveiller : la création du déclencheur
   `nouvel_utilisateur` sur `auth.users` (migration 4, « À valider par le porteur
   (phase 1) »). À partir de ce moment, toute correction du schéma passe par une
   NOUVELLE migration (CLAUDE.md, 7.5), jamais par la modification d'une migration
   appliquée.
4. `supabase/seed.sql` — copier son contenu dans l'éditeur SQL du tableau de bord et
   l'exécuter (rejouable sans doublon). **Jamais `seed_demo.sql` sur ce projet** (il
   refuse de toute façon de s'exécuter sans `set citesavante.demo = 'oui'`,
   décision 8 ; `purge_demo.sql` le retire s'il y a été chargé par erreur).
5. `pnpm db:types:distant`, puis `pnpm exec prettier --write src/lib/supabase/types.ts`,
   puis `git diff src/lib/supabase/types.ts` — compare les types du projet distant au
   fichier généré localement. En dehors de l'en-tête et de
   `__InternalSupabase.PostgrestVersion` (valeur d'exemple, décision 19), toute
   différence est à reporter dans `scripts/generer-types.mjs`. Puis `pnpm typecheck`.
   Attention : la redirection `>` vide `types.ts` AVANT l'exécution ; si la commande
   échoue, le fichier contient le message d'erreur : le restaurer par
   `git checkout -- src/lib/supabase/types.ts`.
6. `.env.local` — copier `.env.example` en `.env.local` et y renseigner
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et
   `SUPABASE_SERVICE_ROLE_KEY` (réglages de l'API du projet dans le tableau de bord),
   plus `NEXT_PUBLIC_SITE_URL`. Ce fichier est ignoré par git (`.env*`) et ne doit
   jamais être commité ; la clé de service ne sert que côté serveur
   (`src/lib/supabase/service.ts`).
7. Ensuite : désigner le premier administrateur (section suivante) après sa première
   connexion, puis contrôler les points « à vérifier sur le vrai projet » de « À
   valider par le porteur (phase 1) » (`!inner`, déclencheur sur `auth.users`,
   `types.ts`).

Ne pas lancer `pnpm exec supabase config push` : `supabase/config.toml` décrit
l'environnement de développement (`site_url` en `http://localhost:3000`) et
écraserait la configuration d'authentification du projet distant (décision 27).

### Désigner le premier administrateur

Le premier administrateur n'est jamais désigné par l'interface (spécifications, 12.4).
La personne se connecte d'abord une fois au site (lien magique) : son compte est créé
dans `auth.users` et son profil dans `profils` (déclencheur `creer_profil`, rôle
`gestionnaire`). Puis, dans l'éditeur SQL du projet Supabase (rôle `postgres`, sans
JWT : le déclencheur `proteger_profil` ne s'applique pas), exécuter :

```sql
-- Désigne le premier administrateur de Cité Savante.
-- Remplacer [adresse-de-l-administrateur] par l'adresse e-mail avec laquelle la
-- personne s'est connectée. « UPDATE 0 » signifie que ce compte n'existe pas encore.
update profils set role = 'admin'
where id = (select id from auth.users where email = '[adresse-de-l-administrateur]');

-- Vérification : doit renvoyer une ligne avec le rôle « admin ».
select p.id, p.nom, p.role
from profils p
where p.id = (select id from auth.users where email = '[adresse-de-l-administrateur]');
```

Ensuite, les rôles (`moderateur`, `admin`) et le statut « de confiance » se règlent
depuis le back-office par un administrateur. Cette requête est rejouée par le test
`20_declencheurs` (« postgres : la requête de désignation du premier administrateur
fonctionne »).

### Validation locale

Prérequis : PostgreSQL 17.6 portable (`C:/Users/agbot/Desktop/PROJETS/pgsql/pgsql/bin`) et la
grappe du projet (`C:/Users/agbot/Desktop/PROJETS/pgsql/data_citesavante`, port 54390,
utilisateur `postgres` en `trust`). Si elle ne répond pas, la démarrer :

```bash
"C:/Users/agbot/Desktop/PROJETS/pgsql/pgsql/bin/pg_ctl.exe" -D C:/Users/agbot/Desktop/PROJETS/pgsql/data_citesavante \
  -l C:/Users/agbot/Desktop/PROJETS/pgsql/data_citesavante.server.log -o "-p 54390" -w start > /dev/null 2>&1
```

Lancer la validation :

```bash
pnpm db:valider
# ou, avec une base jetable propre (obligatoire si plusieurs validations tournent en parallèle) :
PG_DB=citesavante_schema bash scripts/valider-base.sh
```

Variables facultatives : `PG_BIN`, `PG_HOST` (`localhost`), `PG_PORT` (`54390`),
`PG_USER` (`postgres`), `PG_DB` (`citesavante_test` ; cette base est SUPPRIMÉE puis
recréée), `SANS_DEMO=1` (ne pas charger `seed_demo.sql`), `VERBEUX=1` (afficher chaque
vérification réussie).

Le script : (1) recrée la base jetable en UTC, comme Supabase ; (2) applique
`00_stubs_supabase.sql` ; (3) applique les migrations dans l'ordre, chacune dans une
transaction, puis les rejoue toutes (idempotence) ; (4) charge `supabase/seed.sql` puis
`supabase/seed_demo.sql` s'ils existent (le second avec
`set citesavante.demo = 'oui'`) ; (5) exécute chaque `supabase/tests/[0-9]*.test.sql` ; (6) affiche un bilan.
Il s'arrête au premier échec (`psql -v ON_ERROR_STOP=1`), affiche la sortie de psql et
sort avec le code 1 ; la base est conservée pour inspection.

**Ces tests SQL (RLS, déclencheurs, recherche, stockage) ne sont PAS lancés par
`pnpm test`**, qui n'exécute que Vitest sur le code TypeScript : `pnpm db:valider` fait
partie de toute vérification de fin de phase, avec `pnpm typecheck`, `pnpm test`,
`pnpm build` et `pnpm lint`.

Bilan de la dernière exécution (29 septembre 2026, après la reprise,
`PG_DB=citesavante_reprise`, avec `seed.sql` et `seed_demo.sql`, code de sortie 0) :

```
==============================================================
Bilan de la validation (base citesavante_reprise, port 54390)
==============================================================
  Environnement Supabase simulé : appliqué
  Migrations                    : 7 appliquées, rejouées sans erreur
  seed.sql                      : chargé
  seed_demo.sql                 : chargé
  Tests                         : 6 fichiers, 466 vérifications, 0 échec
    - 05_structure.test.sql          38 vérifications
    - 10_rls.test.sql               173 vérifications
    - 20_declencheurs.test.sql      104 vérifications
    - 30_recherche.test.sql          19 vérifications
    - 40_dates.test.sql               6 vérifications
    - 50_securite.test.sql          126 vérifications
  Durée                         : 36 s

VALIDATION RÉUSSIE
```

Historique : 284 vérifications avant la relecture de sécurité (5 fichiers), 417 après
(6 fichiers), 460 après les correctifs du coordinateur, 466 après la reprise.

Les vérifications des tests sont indépendantes de la présence de `seed.sql`/`seed_demo.sql`
(`10_rls`, `30_recherche` et `50_securite` le disent explicitement dans leur en-tête).

### Validation des données (point 4 du prompt de phase 1)

En plus de `scripts/valider-base.sh` (ci-dessus), vérifié par requête directe sur
`citesavante_donnees` :

| Vérification                                         | Résultat                                                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Organisations `[DÉMO]` par statut                    | `publie` 8, `en_attente` 1, `brouillon` 1                                                                                                     |
| Organisations `[DÉMO]` mises en avant                | 2 (SBMI, SBGEO)                                                                                                                               |
| Organisation `[DÉMO]` sans site ni plateforme        | 1 (ABENV)                                                                                                                                     |
| Événements `[DÉMO]` par statut                       | `publie` 18, `en_attente` 2                                                                                                                   |
| Événements `[DÉMO]` par type                         | les 7 types présents (congrès 4, journées 3, colloque 4, séminaire 3, atelier 2, webinaire 2, formation 2)                                    |
| Événements `[DÉMO]` par modalité                     | les 3 modalités présentes (présentiel 11, en ligne 5, hybride 4)                                                                              |
| Événements `[DÉMO]` gratuits / avec crédits FMC      | 5 gratuits, 3 avec crédits FMC                                                                                                                |
| Événements `[DÉMO]` passés                           | 3, tous `publie` (aucun `archive` — décision 14)                                                                                              |
| Événement à cheval sur deux mois                     | 1 (`demo-colloque-multidisciplinaire-2mois`, 2026-09-29 → 2026-10-03, calculé depuis le 1ᵉʳ jour du mois suivant)                             |
| Congrès de pédiatrie (parcours e2e n° 1)             | `demo-congres-pediatrie-cotonou`, `publie`, `lien_inscription` et `site_web` non nuls                                                         |
| Événements `[DÉMO]` par discipline                   | les 5 disciplines représentées (agronomie-environnement 4, droit-économie 3, santé 5, sciences humaines et sociales 4, sciences-techniques 4) |
| Organisateurs `co_organisateur`                      | 1 (ABPN, sur le congrès de pédiatrie)                                                                                                         |
| Échéances `[DÉMO]`                                   | 22 au total (1 à 3 par événement)                                                                                                             |
| Échéances urgentes (7 jours, événement `publie`)     | 5 (≥ 3 demandés ; la 5ᵉ tient à la date d'exécution — l'événement à cheval sur deux mois débutait le jour même)                               |
| Échéances déjà passées                               | 3 (celles des 3 événements passés, restés au statut `publie` — décision 14)                                                                   |
| Emplacements `[DÉMO]` actifs sur la période courante | 2 (`evenement_en_avant` sur le congrès de pédiatrie, `banniere_agenda` sans image)                                                            |
| Liens externes `[DÉMO]` hors `https://example.org/…` | 0 (sociétés, événements, emplacement — vérifié par requête, aucune ligne)                                                                     |

Idempotence et garde-fou (point 4, vérifiés directement, hors `scripts/valider-base.sh`) :

- **Rechargement de `seed_demo.sql`** (avec `citesavante.demo = 'oui'`) sur une base
  déjà peuplée : les 5 décomptes (organisations, événements, échéances, emplacements,
  organisateurs) sont restés strictement identiques avant/après.
- **Chargement sans `citesavante.demo = 'oui'`** : `psql` sort avec un code non nul
  (3), l'exception attendue est affichée, et les décomptes sont restés inchangés
  (transaction unique `-1`, comme dans `scripts/valider-base.sh`) — voir décision 8
  pour le piège du `coalesce`.
- **`purge_demo.sql`** : après exécution, 0 ligne `[DÉMO]` dans les 3 tables
  concernées, les 5 organisations et les 5 disciplines de `seed.sql` intactes ; un
  second passage est un no-op sans erreur. La base a ensuite été repeuplée
  (`seed_demo.sql`) pour rester utilisable à l'inspection.

### Relecture sécurité phase 1

Relecture adversariale de la RLS, des privilèges, des déclencheurs, des fonctions, du
code TypeScript et des données, menée le 29 septembre 2026 sur la base jetable
`citesavante_relecture`. Méthode : chaque faille a d'abord été **prouvée sur la base
non corrigée** (requêtes-sondes en `anon` / `authenticated`, puis le nouveau test
`50_securite` exécuté bloc par bloc sur une copie de cette base : les blocs B, D et E
y échouent, ainsi que le contrôle « fonctions STABLE » du bloc A, `auteur_soumission`
n'existant pas encore), puis **corrigée dans les migrations existantes** (le projet
Supabase distant n'existe pas : rien n'a été appliqué ailleurs qu'en local ; une fois le
premier `supabase db push` fait, toute correction passera par une nouvelle migration,
CLAUDE.md 7.5), puis couverte par un test qui passe.

**Failles corrigées**

| #   | Gravité                                          | Faille                                                                                                                                                                                                                                                                                                                                                               | Preuve (avant correction)                                                                                                                                                                                                                                                                                                                                         | Correction                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Haute                                            | **Données personnelles publiques.** La RLS filtre des lignes, pas des colonnes : pour toute fiche ou tout événement publié, n'importe qui lisait avec la clé publique le nom et l'e-mail de la personne qui l'a soumis (`soumis_par_nom`, `soumis_par_email`), et l'identifiant du compte créateur (`cree_par`). Contraire à la section 15 (protection des données). | En `anon` : `select slug, soumis_par_nom, soumis_par_email from societes` renvoyait `[TEST] Auteur Fictif · auteur.fictif@exemple.invalid` ; idem sur `evenements`, avec `cree_par`. Même chose pour tout compte connecté (création libre par lien magique).                                                                                                      | Migration 6 : privilèges de colonne sur `societes` et `evenements` (`soumis_par_*` illisibles par `anon` et `authenticated`, `cree_par` illisible par `anon`). Migration 4 : `auteur_soumission(type, id)`, security definer, ne renvoie ces coordonnées qu'à un modérateur (back-office). Tests : 05 (5 contrôles), 50 B. |
| 2   | Moyenne (impact critique, défense en profondeur) | **Déclencheurs de protection désactivables par le JWT.** L'exemption reposait sur le seul `auth.role()` : sous le rôle `authenticated`, un JWT au rôle « Authenticated » (autre casse) ou sans rôle désactivait les trois déclencheurs.                                                                                                                              | Sur la base non corrigée, un gestionnaire (JWT `role = 'Authenticated'` puis sans rôle) a publié et mis en avant sa fiche, changé son slug, publié son événement en vidant `cree_par`, et s'est nommé `admin` et « de confiance ». Non atteignable par PostgREST aujourd'hui (le rôle de la base est tiré du même JWT), mais tout reposait sur cette coïncidence. | Migration 4 : l'exemption exige AUSSI `current_user <> 'authenticated'`. Service et `postgres` restent exemptés (décision 4 inchangée pour eux). Test : 50 D1–D3, D7.                                                                                                                                                      |
| 3   | Moyenne                                          | **« https:// uniquement » contournable.** La section 6 impose des liens `https://`, mais la RLS laisse un gestionnaire modifier sa fiche et ses événements directement par l'API REST, sans la validation Zod des server actions.                                                                                                                                    | Un gestionnaire a enregistré `site_web = 'javascript:alert(document.cookie)'`, `site_congres = 'http://…'`, `lien_inscription = 'javascript:alert(1)'` ; `logo_path = '../affiches/x.webp'` accepté aussi (colonne figée depuis : correctif 4 du coordinateur).                                                                                                   | Migration 3 : 6 contraintes `check` (`site_web`, `site_congres`, `lien_inscription`, `evenements.site_web`, `emplacements_pub.lien` : `^https://` sans espace, casse du schéma indifférente ; `reseaux` : objet JSON). Valent pour tous, client de service compris. Tests : 05, 50 E.                                      |
| 4   | Moyenne                                          | **Agenda public cassé par une organisatrice non publiée**, et filtre explicite manquant (CLAUDE.md 6). `listerEvenementsAVenir` lisait `rattachement.societes.id` : la RLS masque à `anon` une organisatrice en attente ou archivée, PostgREST renvoie alors `null`, et l'exception faisait tomber TOUT l'agenda.                                                    | En `anon`, `evenement_societes` d'un événement publié co-organisé par une organisation en attente : 2 rattachements, dont un sans organisation (jointure nulle).                                                                                                                                                                                                  | `src/lib/requetes/evenements.ts` : `societes!inner`, `.eq("evenement_societes.societes.statut", "publie")`, garde contre `null`, étiquette de cache `societes` ajoutée. Test : 50 G (côté SQL).                                                                                                                            |
| 5   | Basse                                            | **Client serveur lié à la clé de service.** `serveur.ts` (session de l'utilisateur, clé publique) appelait `envServeur()`, qui exige `SUPABASE_SERVICE_ROLE_KEY`.                                                                                                                                                                                                    | Lecture du code.                                                                                                                                                                                                                                                                                                                                                  | `envPublic()`. Garde-fou : `src/lib/securite.test.ts`.                                                                                                                                                                                                                                                                     |

**Vérifié sans faille** (et désormais couvert par un test)

- **Tableau de la section 6 contre `pg_policies`** : inventaire EXACT des 46 politiques
  (table, opération, rôles) (50 A) ; comportement par profil — anonyme, connecté sans
  rôle, gestionnaire accepté, demande en attente, « de confiance », modérateur,
  administrateur — en lecture et en écriture (10, 20, 50 G). `relrowsecurity` vrai sur
  les 14 tables, aucune vue (50 A) ; aucune politique d'écriture `true`, aucune
  `to public` (50 A).
- **Escalades refusées** : s'auto-accepter gestionnaire (insert direct : 10 ; upsert
  `on conflict do update` : 50 C1) ; `profils.role` (update : 20 ; upsert : 50 C2) ;
  relier son événement à une société non gérée (10 C), ou avec une demande seulement en
  attente (50 G) ; échéances ou disciplines sur l'événement d'un autre, y compris en
  DÉPLAÇANT une ligne existante (`update … set evenement_id`) (10 C, 50 C4) ; modifier
  ou vider `cree_par` (20 D, 50 C4) ; créer un événement au nom d'un autre ou sans
  auteur, même modérateur (10 B, 50 C4–C5) ; `rechercher()` ne renvoie jamais de non
  publié, même à un gestionnaire qui le voit dans la table, avec une saisie nulle ou
  hostile (30, 50 C4) ; fonctions security definer : refusées à `anon`, et pour un
  connecté elles ne renseignent que sur lui-même (05, 50 C3) ; fonctions de
  déclencheur non appelables (50 C3) ; `storage.objects` et `storage.buckets` : ni
  envoi, ni modification des formats, ni création (10 G, 50 C4) ;
  `tentatives_formulaires` illisible pour les 7 profils (50 G) ; `demandes_contact` :
  `traitee` seule (10 D), y compris combinée à une autre colonne (50 C5).
- **Déclencheurs** : `NULL` (`categorie = null`, `source_ref` de nul à vide), casse (slug
  en majuscules, statut `'PUBLIE'` : valeur invalide), réécriture à l'identique des
  champs protégés sans faux positif, upsert (`excluded.statut` est déjà forcé par le
  `before insert`) (50 C4, D4) ; service et `postgres` non contraints (20 F, 50 D7) ;
  messages en français, code 42501, pour les trois (50 D5).
- **Fonctions** : `search_path` fixé partout, security definer limité à 7 fonctions
  (05) ; `creer_profil` crée un profil « gestionnaire » sans erreur pour des
  métadonnées absentes, vides, en tableau, en texte, avec un nom nul, numérique ou
  objet (50 F). Un profil préexistant est impossible (clé étrangère vers
  `auth.users`) : pas besoin d'`on conflict`.
- **Performance RLS** : `auth.uid()`, `est_moderateur()`, `est_admin()`,
  `aujourdhui()` toujours sous la forme `(select …)` dans les politiques ; fonctions
  STABLE ; index utiles présents (50 A). Pas d'index `gestionnaires (user_id,
societe_id, statut)` ajouté : l'index unique `(user_id, societe_id)` donne déjà au
  plus une ligne à `gere_societe()` ; `evenement_societes (societe_id)` et la clé
  `(evenement_id, societe_id)` servent `gere_evenement()`.
- **Code TypeScript** : la clé de service n'apparaît que dans `env.ts` (et son test) et
  `supabase/service.ts`, que rien n'importe encore ; `service.ts`, `public.ts`,
  `serveur.ts` et `requetes/*.ts` commencent par `import "server-only"` ; aucun
  composant client n'importe un client serveur ; `env.ts` est paresseux (build sans
  variables ni base : réussi) ; les lectures publiques filtrent `statut = 'publie'`
  (organisateurs compris depuis la correction 4). Figé par `src/lib/securite.test.ts`
  (10 tests). Dans le bundle navigateur, `env.ts` (importé par `navigateur.ts`)
  n'emporte que le NOM de la variable de la clé de service, jamais sa valeur (Next.js
  n'intègre que les `NEXT_PUBLIC_*`).
- **Données** : `seed.sql` conforme à la section 5.6 (organisations, catégories, liens,
  `brouillon`, rattachement à `sante`, aucun événement) ; `seed_demo.sql` refuse de
  s'exécuter sans `citesavante.demo = 'oui'` (décision 8), chaque ligne racine est
  préfixée `[DÉMO]` (`nom_complet`, `titre`, `annonceur`), liens en
  `https://example.org/…` et adresses `@example.org` uniquement ; il respecte les
  nouvelles contraintes.

**Conséquences pour le code des phases suivantes**

- Sur `societes` et `evenements`, `anon` et `authenticated` n'ont plus de droit de
  lecture sur la table entière : `select("*")`, un embarquement `societes(*)` ou
  `.select()` sans liste après un `insert` / `update` échouent (42501). Toujours
  lister les colonnes (les requêtes de `src/lib/requetes/` le font déjà). Toute
  nouvelle colonne de ces tables doit être ajoutée aux `grant select (…)` de la
  migration 6 (le test 05 compte les colonnes pour le rappeler). Les décomptes aussi
  (nombre d'organisations publiées, section 8.1 ; chiffres clés, section 9.1) :
  `select("*", { count: "exact", head: true })` produit un `select societes.*` et
  échoue ; écrire `select("id", { count: "exact", head: true })`.
- Back-office (phase 6) : coordonnées de l'auteur d'une soumission par
  `supabase.rpc("auteur_soumission", { p_objet_type, p_objet_id })` ; e-mails aux
  auteurs (phases 5 et 6) par le client de service.
- Les liens saisis doivent être validés en `https://` par Zod AVANT l'écriture : sinon
  la base renvoie une violation de contrainte (23514) à traduire en message.

**Bilans exacts des commandes** : voir « Vérifications (relecture sécurité) »
ci-dessous (état à la fin de la relecture) et « Vérifications (correctifs et
reprise) » (état actuel).

### Vérifications (relecture sécurité)

- **`PG_DB=citesavante_relecture bash scripts/valider-base.sh`** : code 0 ; 7
  migrations appliquées puis rejouées sans erreur ; `seed.sql` et `seed_demo.sql`
  chargés ; **6 fichiers, 417 vérifications, 0 échec** (05 : 38, 10 : 170, 20 : 58,
  30 : 19, 40 : 6, 50 : 126 ; avant la relecture : 5 fichiers, 284). Base de départ
  identique rejouée avant toute modification : 284 vérifications, 0 échec.
- **`PG_DB=citesavante_relecture pnpm db:types`** puis Prettier : seul changement de
  `types.ts`, la fonction `auteur_soumission` (et le nom de la base source).
- **`pnpm typecheck`** : aucune erreur.
- **`pnpm test`** : 7 fichiers, 65 tests, tous passés (55 avant ; +10 de
  `securite.test.ts`).
- **`pnpm build`** (sans `.env.local` ni base) : réussi, routes `/`, `/_not-found`,
  `/charte`, `/icon.svg` statiques.
- **`pnpm lint`** : code 0, 0 erreur, 0 avertissement.

### Correctifs du coordinateur (après la relecture de sécurité)

Trois points signalés par la relecture ont été tranchés par le coordinateur le
29 septembre 2026 (numérotés comme dans sa consigne, le n° 1 étant la CLI Supabase
ci-dessus) et corrigés dans les migrations existantes (projet distant inexistant : rien
n'a été appliqué ailleurs qu'en local).

**Méthode.** Les nouveaux tests ont d'abord été exécutés sur la base construite avec
les migrations d'ORIGINE (`citesavante_correctifs`, validée au départ : 6 fichiers,
417 vérifications, 0 échec), où ils échouaient ; puis la migration a été corrigée ;
les tests sont conservés. Une copie non bloquante de `10_rls` et `20_declencheurs`
(sonde jetable, hors dépôt : chaque vérification en échec est notée au lieu d'arrêter
le fichier, chaque instruction acceptée à tort est annulée) a listé TOUTES les
vérifications en échec sur la base d'origine : 3 dans `10_rls`, 25 dans
`20_declencheurs`, plus le contrôle du catalogue de `05_structure`.

- **Correctif 2 — stockage** (migration 7). La politique de lecture sur
  `storage.objects` est supprimée (un `drop policy if exists` reste, pour
  l'idempotence). Un bucket public sert ses fichiers par son URL publique sans aucune
  politique ; celle-ci ne servait qu'à LISTER les objets par l'API, affiches
  d'événements non publiés ou refusés comprises.
  Tests qui échouaient avant et passent après : `05_structure` « storage.objects :
  aucune politique, pas même de lecture » ; `10_rls`, bloc G, « stockage : anonyme
  (anon) ne liste aucun objet des buckets logos, affiches, publicites », et de même
  pour un gestionnaire et un modérateur (`authenticated`), après un préalable qui
  vérifie que des objets existent dans les trois buckets.
- **Correctif 3 — événement refusé** (migration 4, `statut_evenement_gestionnaire`).
  À la modification par un connecté non modérateur, `refuse` devient TOUJOURS
  `en_attente`, même pour un profil de confiance : une retouche ne republie pas
  d'elle-même un événement refusé. Inchangés : `brouillon` et `en_attente` deviennent
  `publie` si le profil est de confiance, `en_attente` sinon ; `publie` reste
  `publie` ; `archive` reste `archive`. Conséquence de cette dernière règle (limite
  assumée, décision 4) : une SECONDE retouche par un profil de confiance publie
  l'événement refusé, sans modérateur.
  Tests qui échouaient avant et passent après (`20_declencheurs`, bloc D, profil de
  confiance) : « un événement refusé corrigé par un gestionnaire de confiance repasse
  en attente » (avant : `publie`) ; de même quand il envoie `statut = 'publie'`, et
  par `insert … on conflict (id) do update`. Profil ordinaire : « un événement refusé
  corrigé par un gestionnaire ordinaire repasse en attente » (passait déjà).
  Non-régression ajoutée : un événement en attente et un brouillon retouchés par un
  profil de confiance sont publiés.
- **Correctif 4 — colonnes figées** (migration 4, `proteger_societe` et
  `statut_evenement_gestionnaire`), pour un connecté non modérateur (même exemption
  que les autres protections, `current_user` compris) : `societes.soumis_par_nom`,
  `soumis_par_email` et `logo_path` (en plus de statut, mise_en_avant, slug,
  categorie) ; `evenements.soumis_par_nom`, `soumis_par_email` et `affiche_path` (en
  plus de slug, source, source_ref, cree_par) ; à la création d'un événement par un
  tel utilisateur, `soumis_par_nom` et `soumis_par_email` forcés à `null` (et
  `affiche_path` depuis la reprise après vérification). Messages distincts, en
  français, code 42501.
  Tests qui échouaient avant et passent après (`20_declencheurs`, bloc G, 22
  vérifications) : modifications ACCEPTÉES d'un gestionnaire ordinaire (8 sur son
  organisation : changement, effacement, `null` vers une valeur, modification mêlée à
  la description ; 6 sur un événement) et d'un profil de confiance (4) ; messages
  absents (2) ; `soumis_par_*` conservés à la création ; colonnes changées à la fin.
  Passent avant et après : le modérateur, le client de service (JWT de la clé de
  service, puis rôle `service_role` sans JWT) et `postgres` modifient ces colonnes ;
  réécriture à l'identique acceptée (pas de faux positif).

Noms des colonnes vérifiés dans la migration 3 (`societes.logo_path`,
`evenements.affiche_path`, `soumis_par_nom` et `soumis_par_email` sur les deux tables).
Le modérateur peut MODIFIER `soumis_par_*` mais toujours pas les LIRE directement
(privilèges de colonne, décision 22) : les tests vérifient les valeurs en `postgres`.

**Règle pour la phase 5 (images et coordonnées de l'auteur).**

- L'envoi d'un logo ou d'une affiche est une server action qui, dans l'ordre :
  vérifie les droits de l'utilisateur sur la fiche ou l'événement (avec son client de
  session : `gere_societe` / `gere_evenement`, ou modérateur) ; valide le fichier
  (PNG, JPEG ou WebP, taille maximale du bucket ; redimensionné en WebP) ; l'écrit avec
  le client de service (`logos/{societe_id}/{horodatage}.webp`,
  `affiches/{evenement_id}/{horodatage}.webp`) ; puis met à jour `logo_path` /
  `affiche_path` avec le client de service, DANS LA MÊME server action. Un gestionnaire
  ne peut plus écrire ces colonnes lui-même (42501). Un événement créé depuis
  l'espace gestionnaire naît sans affiche (`affiche_path` forcé à `null`) : son
  affiche s'envoie après la création, par cette même server action.
- Les modifications faites avec le client de session de l'utilisateur ne doivent
  jamais contenir `logo_path`, `affiche_path`, `soumis_par_nom` ni `soumis_par_email` :
  un formulaire qui renverrait, par exemple, `logo_path: null` pour un champ vide
  serait refusé dès que la fiche a un logo. Exclure ces colonnes du schéma Zod de
  modification.
- `soumis_par_nom` / `soumis_par_email` ne sont renseignés que par les formulaires
  publics (client de service) ; un événement créé depuis l'espace gestionnaire n'en a
  pas (forcés à `null`) : les e-mails de décision le concernant vont au compte
  créateur (`cree_par`), dont l'adresse se lit avec le client de service (usage
  « e-mails »).

### Reprise après vérification

Deux vérificateurs indépendants ont prouvé sept écarts (29 septembre 2026). Chacun a
été reproduit sur `citesavante_reprise` avant correction (base de départ : 6 fichiers,
460 vérifications, 0 échec).

- **Événement refusé, deux retouches** (gravité moyenne) : un profil de confiance
  republiait un événement refusé en deux retouches (1re : `en_attente`, 2e : `publie`),
  alors que le texte promettait qu'une retouche n'annule jamais un refus. Option
  retenue : assumer le comportement et corriger la garantie écrite (migration 4,
  décision 4, correctif 3, test 20). Nouveau test (`20_declencheurs`, bloc D) :
  `en_attente` après la 1re retouche, `publie` après la 2e. Variante pour fermer ce
  chemin : « À valider par le porteur (phase 1) ».
- **`affiche_path` à la création** : forcé à `null` à l'insertion par un connecté
  non modérateur (migration 4). Tests (`20_declencheurs`, bloc G) qui échouaient avant
  et passent après : `affiche_path` forcé à `null` pour un gestionnaire ordinaire et
  pour un profil de confiance (événement publié d'office). Ajoutés, passent avant et
  après : conservé pour le modérateur et pour le client de service (`postgres` : déjà
  couvert par les données du bloc).
- **Textes** : commentaire de `src/lib/securite.test.ts` (premier appelant du client
  de service : la passerelle /go, route handler de la phase 2) ; « cinq requêtes
  JSON » (générateur de types) ; renvoi de `src/lib/supabase/types.test.ts` vers la
  décision 17 ; décision 9 (droits d'exécution des fonctions de déclencheur, corrigés
  aussi dans les commentaires de la migration 4 et de `05_structure`) ; « donc » en
  double (CLI Supabase). Écarts de texte : aucun test ne peut les détecter.

### Vérifications (correctifs et reprise)

Dans l'ordre, le 29 septembre 2026, après la reprise, sans `.env.local` (absent,
vérifié avant `pnpm build`) :

- **`PG_DB=citesavante_reprise bash scripts/valider-base.sh`** (avec
  `seed_demo.sql`) : code 0 ; 7 migrations appliquées puis rejouées sans erreur ;
  `seed.sql` et `seed_demo.sql` chargés ; **6 fichiers, 466 vérifications, 0 échec**
  (05 : 38, 10 : 173, 20 : 104, 30 : 19, 40 : 6, 50 : 126) ; 36 s. Historique :
  417 vérifications avant les correctifs du coordinateur, 460 après, 466 après la
  reprise (6 ajoutées au test 20).
- **Types** : forme du schéma inchangée (seul le corps de
  `statut_evenement_gestionnaire` change). `PG_DB=citesavante_reprise pnpm db:types`
  puis Prettier : seule différence, le nom de la base source dans l'en-tête ;
  `types.ts` laissé tel quel.
- **`pnpm typecheck`** : code 0, aucune erreur.
- **`pnpm test`** : code 0, 7 fichiers, 65 tests, tous passés.
- **`pnpm build`** : code 0 ; routes `/`, `/_not-found`, `/charte`, `/icon.svg`
  statiques.
- **`pnpm lint`** (`eslint .`) : code 0, 0 erreur, 0 avertissement.

### À valider par le porteur (phase 1)

À contrôler sur le vrai projet Supabase (au premier branchement) :

- **Déclencheur sur `auth.users`** : invérifiable en local. Supabase restreint les
  modifications du schéma `auth` ; le premier `supabase db push` confirmera que la
  création du déclencheur `nouvel_utilisateur` (migration 4) est acceptée.
- **`!inner` et filtre imbriqué de PostgREST** (relecture, correction 4) : la
  sémantique attendue (le rattachement disparaît, l'événement reste) n'est pas
  vérifiable sans PostgREST ; la garde contre `null` protège quoi qu'il arrive.
- **`src/lib/supabase/types.ts` n'a pas été comparé à un vrai `supabase gen types`** :
  le format suit celui de la CLI, et `types.test.ts` vérifie l'inférence de
  `supabase-js` (colonnes générées, identités, jointure à deux niveaux), mais seule la
  comparaison de l'étape 5 de la liaison (`pnpm db:types:distant`, puis `git diff`)
  confirmera une correspondance exacte, notamment `__InternalSupabase.PostgrestVersion`
  (valeur d'exemple ici).

Choix restant à trancher ou à confirmer :

- **Sigles de démonstration sans préfixe `[DÉMO]`** : dans `seed_demo.sql`, seuls
  `nom_complet` (et le slug `demo-…`) portent le préfixe ; les sigles fictifs (SBMI,
  ABPN…) s'afficheront tels quels, par exemple sur le Plan de la Cité en développement.
  Décision : conservé (les sigles sont courts et la démonstration n'est jamais chargée
  en production).
- **Descriptions des 5 disciplines dans `seed.sql`** : une phrase chacune, texte ajouté
  hors de la section 5.6 (qui ne donne qu'ordre, slug et nom) — à relire ou à vider.
- **Lecture publique de `societe_disciplines`** : conforme au tableau de la section 6
  (« tous »), mais un visiteur anonyme lit ainsi les rattachements des organisations
  NON publiées (identifiant et disciplines d'une fiche en attente ou brouillon) ; une
  page qui compterait les organisations d'une discipline depuis cette table compterait
  aussi les non publiées. Proposition : « si l'organisation est visible »
  (`exists (select 1 from societes s where s.id = societe_id)`), comme pour les tables
  rattachées aux événements.
- **Insertion d'événements sans limite de débit par l'API** : conformément au tableau
  de la section 6 (« utilisateur connecté avec `cree_par = auth.uid()` »), n'importe qui
  crée un compte par lien magique puis insère autant d'événements qu'il veut par l'API
  REST (file de modération inondée), et peut réserver un slug avant l'organisateur
  légitime. À traiter en phase 5 avec Turnstile et une limite (par exemple un quota par
  compte et par heure, ou l'ajout réservé aux gestionnaires d'au moins une
  organisation acceptée).
- **Événement refusé, deux retouches par un profil de confiance** (décision 4) : la
  première le remet `en_attente`, la seconde le publie sans modérateur. Choix retenu
  à la reprise : l'assumer et le documenter (ce profil publie déjà d'office tout
  nouvel événement ; il ne récupère que la ligne et le slug refusés). Pour fermer ce
  chemin, la seule variante robuste est une colonne de `evenements` posée par le
  déclencheur à chaque passage à `refuse` (modérateur, client de service ou
  `postgres`), figée pour un gestionnaire, et qui maintient `en_attente` ensuite ;
  pas une lecture de `journal_moderation`, qui manque tout refus non journalisé
  (refus direct d'un modérateur par l'API, éditeur SQL). Coût : migrations 3 et 4,
  `types.ts`, tests 05 et 20, entrée dans « Adaptations ».
- **`reseaux`** : la base impose seulement un objet JSON ; le format de chaque valeur
  (lien `https://` ? numéro WhatsApp ?) n'est pas fixé par les spécifications et devra
  être validé par les server actions (phase 5).
- **`on delete set null`** sur `gestionnaires.decide_par` et
  `journal_moderation.auteur` : écart au SQL des spécifications (« Adaptations du SQL
  des spécifications »).
- **Qui modifie un événement** : conformément au tableau de la section 6, un
  utilisateur qui a créé un événement sans gérer d'organisation organisatrice ne peut
  plus le modifier ensuite (modification : modérateur ou `gere_evenement`) ; un
  gestionnaire ne peut ni retirer ni supprimer une demande de gestion (aucune politique
  de suppression). Si l'espace gestionnaire doit l'offrir, il faudra le prévoir.
- **Recherche « congres cotonou 2027 »** (section 11) : `websearch_to_tsquery` exige
  tous les mots, et la date n'est pas dans le vecteur de recherche ; un événement n'est
  trouvé par cette saisie que si « 2027 » figure dans son titre, sa ville, son résumé ou
  sa description (vérifié sur la grappe locale). À trancher avant le test de la
  section 16.
- **Invalidation du cache non testée de bout en bout** : `invalider()` (`updateTag`)
  n'est appelée nulle part encore (aucune server action avant la phase 5) ; son effet
  réel ne sera vérifiable qu'avec une première page publique et sa server action.
- **CLAUDE.md, section 3, n'est plus exact pour `pnpm db:types`** : il y est décrit
  comme « régénère src/lib/supabase/types.ts depuis Supabase », alors que `db:types`
  lit désormais la base locale (`scripts/generer-types.mjs`) et que c'est
  `db:types:distant` qui passe par le projet lié. CLAUDE.md n'a pas été modifié (fichier
  du porteur) : ligne à mettre à jour, avec `pnpm db:valider` parmi les commandes.
- **`unstable_cache` est marqué « replaced by 'use cache' »** dans la documentation
  Next 16 (toujours fonctionnel) : à surveiller au fil des versions de Next.js
  (migration décrite dans « Clients Supabase, types, cache et requêtes »).

## Phase 2 — annuaire et passerelle

**État : code fait ; relecture adversariale faite sur données réelles (API locale,
`next start`) ; ses constats corrigés (« Corrections après la relecture
adversariale »), sauf la page 404 d'une fiche vide sans JavaScript (limite de
Next 16.3.6), acceptée pour la phase 2 et à corriger en phase 5 (« Décisions »).
Vérification complète du 13 octobre 2026 : quatre constats, tous reproduits ;
`page_origine` corrigé ; les trois autres tranchés par le coordinateur le
14 octobre 2026 : 404 sans JavaScript et préchargements en 404 acceptés
(« Décisions »), monogramme des sigles longs corrigé par un resserrement de
15 % au plus (« Retouches du coordinateur », avec le journal de la passerelle
et la transition du contour de focus).** Les six points du
prompt de phase 2 (`docs/PROMPTS.md`) sont écrits :
annuaire `/societes`, monogramme, fiche `/societes/[slug]`, passerelle
`/go/[type]/[id]`, utilitaires testés (dates, slugs, liens), carte d'événement
minimale. Critère « un clic sur Site officiel crée une ligne dans `clics_sortants` »
vérifié avec le `.env.local` tel quel. Lighthouse (accessibilité ≥ 95) : 100 sur
les deux pages, mobile et ordinateur. Aucun choix bloquant ne reste : le commit
`feat(phase-2): annuaire et passerelle` peut être fait. Aucune dépendance ajoutée.

Travail mené par quatre agents (fondations, annuaire, fiche, passerelle), puis une
intégration (relecture d'ensemble, corrections, vérifications), une relecture
adversariale et une correction.

### Fait

- **Utilitaires purs et testés** (`src/lib/utils/`, un `.test.ts` chacun) :
  - `dates.ts` : `lireDateIso` (lève sur une date inexistante, jamais
    `new Date("AAAA-MM-JJ")`), `formaterDate` (« 12 mars 2027 », « 1er mai 2027 »),
    `formaterDateCourte`, `formaterPeriode` (les quatre formes de CLAUDE.md, « 1er »
    compris ; lève si la fin précède le début), `joursRestants`, `estUrgente`
    (7 jours ou moins, `SEUIL_URGENCE_JOURS`), `decrireJoursRestants`. Noms des mois
    par date-fns, locale `fr`.
  - `slugs.ts` : `slugifier`, `estSlugValide`, `slugSigle`, `slugSociete`, `slugEvenement`
    (`type-sigle-annee`, sinon `titre-annee`), `dedoublonnerSlug` (`-2`, `-3`…).
  - `urls.ts` : `estUrlHttpsSure`, `ajouterUtm`, `cheminOrigineValide`,
    `lirePageOrigine`, `cheminPasserelle` (contrat entre la fiche et la passerelle),
    `DESTINATIONS_PASSERELLE`, `urlAbsolue`, `hrefTelephone`, `hrefCourriel`.
  - `annuaire.ts` (lecture des filtres de l'URL, `cleRecherche`, filtrage, tri français par
    `Intl.Collator`, pagination par 24, villes), `evenements.ts` (types des cartes,
    conversion des lignes, à venir / passés), `reseaux.ts` (liens `https://` sûrs
    seulement ; WhatsApp `+international` → `https://wa.me/…`), `monogramme.ts`
    (disposition du sigle).
- **`src/lib/stockage.ts`** : `urlLogo` et `urlPubliqueStockage` ; chemin relatif au
  bucket, tout chemin suspect donne `null` (le monogramme s'affiche).
- **`next.config.ts`** : `images.remotePatterns` limités aux trois buckets publics de
  l'hôte de `NEXT_PUBLIC_SUPABASE_URL` (aucun motif sans variable : le build passe),
  `dangerouslyAllowLocalIP` seulement si cet hôte est sur la boucle locale, formats
  AVIF et WebP.
- **Lectures** (`src/lib/requetes/`, règles de la phase 1 respectées : colonnes
  listées, `statut = 'publie'` explicite, tables jointes comprises, `unstable_cache`
  étiqueté et borné à 5 minutes, « aujourd'hui » reçu en argument) :
  - `societes.ts` : `listerSocietesAnnuaire` (liste complète mise en cache puis
    filtrée en mémoire ; recherche texte par la fonction SQL `rechercher`, la même que
    `/recherche`, non mise en cache), `listerVillesAnnuaire`, `obtenirSocietePubliee`
    (slug exact et présent dans la liste des organisations publiées, sinon `null`),
    `listerSlugsSocietesPubliees` (slugs tirés de la même entrée de cache : fiche et
    passerelle), `compterSocietesPubliees` (`select("id", { count: "exact", head: true })`).
  - `evenements.ts` : `listerEvenementsSociete` (deux requêtes : rattachements
    organisateur ou co-organisateur, puis les événements publiés),
    `listerEvenementsAVenir` gagne le paramètre `aujourdhui`.
- **Composants** : `Monogramme` (cartouche de plan dessiné au trait, jetons de la
  charte seulement ; sigle sur deux lignes au-delà de 4 lettres environ ; ligne trop
  large resserrée de 15 % au plus pour garder 11 px), `LogoSociete` (`next/image`, monogramme à défaut),
  `CarteSociete` et `CarteEvenement` (un seul lien par carte, étendu à toute la carte,
  contour de focus sur la carte ; `CarteEvenement` sera enrichie en phase 3).
- **`/societes`** (`src/app/societes/page.tsx`, `src/components/societes/annuaire/`) :
  en-tête avec le nombre d'organisations publiées ; `<form method="get">` qui
  fonctionne sans JavaScript, enrichi côté client (envoi par `router.push`, listes
  envoyées seules après 300 ms, « Mise à jour des résultats… ») ; résumé
  `role="status"` ; cartes ; pagination par 24 qui garde les filtres ; état vide avec
  « Référencer une société » ; page hors limites redirigée (307) vers la dernière page.
- **`/societes/[slug]`** (`src/app/societes/[slug]/`, `src/components/societes/fiche/`) :
  fil d'Ariane, en-tête (logo, un seul `h1` avec sigle et nom complet, catégorie,
  disciplines, ville, année de création), boutons « Site officiel » et « Plateforme
  de congrès » par `/go` (balise `<a>` native, jamais `next/link`), présentation (texte
  libre affiché comme texte), contacts (`mailto:`, `tel:`, réseaux en
  `noopener noreferrer nofollow`), événements à venir en cartes, événements passés
  dans un `<details>` replié, lien « Gérer cette fiche » (`prefetch={false}`),
  JSON-LD `Organization` et `BreadcrumbList` sérialisés sans injection possible,
  métadonnées et canonique, page 404 (`not-found.tsx` ; vide sans JavaScript, limite
  acceptée pour la phase 2, voir « Décisions »).
- **`src/app/societes/error.tsx`** : erreur de chargement en français (annuaire et
  fiche), bouton « Réessayer » (`retry`, Next 16.3).
- **Passerelle** (`src/app/go/[type]/[id]/route.ts`, `src/lib/passerelle/`) : route
  mince (`force-dynamic`, `GET` et `HEAD`), logique pure dans `analyse.ts`, accès aux
  données dans `donnees.ts` (client reçu en paramètre ; lecture par le client anonyme,
  écriture du clic par le client de service), enchaînement dans `passerelle.ts`.
  Table de décision en tête de `passerelle.ts` ; toutes les réponses portent
  `X-Robots-Tag: noindex` et `Cache-Control: no-store`.
- **Tests Vitest ajoutés** : les sept fichiers de `src/lib/utils/`, `stockage.test.ts`,
  `src/components/cartes.test.tsx`, `annuaire/annuaire.test.tsx`,
  `fiche/utilitaires.test.ts`, `fiche/donneesStructurees.test.ts`,
  `fiche/fiche.test.tsx`, `passerelle/analyse.test.ts`,
  `passerelle/passerelle.test.ts` (faux client Supabase en mémoire).

### Intégration : corrections

- **`src/lib/securite.test.ts`** (demande de l'agent passerelle, acceptée) : la route
  `app/go/[type]/[id]/route.ts` devient le premier appelant autorisé du client de
  service (insertion dans `clics_sortants`, usage listé en tête de
  `supabase/service.ts`). Aucun autre fichier ne l'importe.
- **`src/lib/requetes/disciplines.ts`** : `select("*")` remplacé par la liste des six
  colonnes (même type renvoyé). La table n'a pas de privilèges par colonne, mais la
  règle « jamais `select("*")` » vaut pour toutes les lectures.
- **Typographie** : espace insécable avant « : » dans la ligne d'échéance de
  `CarteEvenement` ; apostrophe typographique dans « aujourd’hui »
  (`decrireJoursRestants`), comme dans tous les textes du site. Tests ajustés.

### Corrections après la relecture adversariale

Relecture adversariale du 12 octobre 2026 (dix constats prouvés), corrigée le
13 octobre 2026 selon les arbitrages du coordinateur. Chaque constat a été reproduit
(preuves de la relecture, ou ancien test qui attendait le comportement fautif) puis
vérifié après correction ; « 404 sans JavaScript » n'est PAS corrigé (point 2 :
accepté pour la phase 2, correction en phase 5, voir « Décisions »).

1. **Aucun clic enregistré avec le `.env.local` fourni** (gravité haute). Cause :
   `envServeur()` refusait les variables facultatives présentes mais vides
   (`RESEND_API_KEY=`, `ADMIN_NOTIFY_EMAIL=`, `FORM_HASH_SALT=`, `CRON_SECRET=`,
   comme dans `.env.example`), donc `creerClientService()` levait et la passerelle
   redirigeait sans enregistrer. Correction (`src/lib/env.ts`) : une variable
   facultative vide ou faite d'espaces vaut « absente » (`z.preprocess` vers
   `undefined`), y compris `ADMIN_NOTIFY_EMAIL` (`z.email()`) et
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ; une variable REQUISE vide reste refusée.
   Tests (`env.test.ts`) : « .env.local copié de .env.example » (le fichier
   `.env.example` est relu, seules les trois variables Supabase sont complétées) pour
   `envPublic()` et `envServeur()`, variables facultatives vides, requise vide ; les
   deux premiers échouaient sur l'ancien `env.ts` (vérifié). Vérifié sur
   `next start -p 3104` avec le `.env.local` TEL QUEL : un GET sur
   `/go/societe/de110000-…-0001?vers=site&from=/societes/demo-sbmi` → 302 vers
   `https://example.org/sbmi?utm_source=citesavante&utm_medium=referral`, UNE ligne
   (`societe`, l'identifiant, cette URL, `page_origine = /societes/demo-sbmi`), aucun
   « Clic non enregistré » dans le journal ; `HEAD` → 302 sans ligne. Lignes de test
   supprimées (`clics_sortants` revenu à 0).
2. **Page 404 d'une fiche vide sans JavaScript** : NON CORRIGÉ en phase 2, par
   décision du coordinateur du 14 octobre 2026 (« Décisions » : accepté, correction
   en phase 5 dans `proxy.ts`). Correction prescrite appliquée :
   `generateMetadata` ne lève plus `notFound()` (il renvoie « Organisation
   introuvable » et `robots: { index: false }`), seule la page le lève. Elle ne
   suffit pas : `curl` sur `/societes/inexistant`, `/societes/DEMO-SBMI`,
   `/societes/sobeped` (brouillon) et `/societes/demo-iehp` (en attente) donne
   toujours 404, le bon titre et `noindex`, mais `<html id="__next_error__">` sans
   `lang`, `<body>` vide, aucun `h1` (le texte n'est que dans les données du
   routeur, rendu par JavaScript). Cause racine : dans Next 16.3.6, tout `notFound()`
   levé pendant le rendu du shell d'une page dynamique passe par la reprise sur
   erreur de `renderToStream` (`next/dist/server/app-render/app-render.js`) ; la
   frontière `not-found.tsx` est un error boundary de classe, que le rendu serveur
   de React n'applique pas. La 404 générale (`/page-inexistante`) n'est pas
   touchée : c'est la route statique `/_not-found`. Remède documenté par Next
   (`loading.md`, « Status Codes ») : vérifier le slug dans `proxy.ts` et réécrire
   vers une page introuvable. Coûts : nouvelle convention de fichier ; lecture hors
   de `src/lib/requetes/` et sans `unstable_cache` ; un aller-retour à la base par
   requête `/societes/{slug}` (préchargements de l'annuaire compris, sauf à exclure
   l'en-tête `RSC`) ; la réécriture ne peut viser que la 404 générale statique
   (« Page introuvable ») ou une route statique réservée (`/societes/introuvable`,
   qui interdit ce slug).
3. **Entrées de cache créées à volonté par le visiteur** (slugs inventés, chaque
   texte `q`). Corrections : `obtenirSocietePubliee` cherche d'abord le slug dans
   `listerSocietesPubliees()` (une seule entrée de cache) et renvoie `null` sans
   lire ni mettre en cache s'il est inconnu ; la recherche texte de l'annuaire n'est
   plus mise en cache (choix justifié dans « Décisions »). Vérifié sur 3104,
   `.next/cache/fetch-cache` vidé au départ : six slugs inconnus → 1 seul fichier
   (la liste) ; six puis six recherches différentes (`zzrelecturea`,
   `ZZRELECTUREA`, `zzrélecturea`…) et quatre slugs inconnus de plus → nombre de
   fichiers inchangé ; seules les fiches existantes ajoutent leurs deux entrées.
4. **Données périmées jusqu'à un an** après une écriture hors server action.
   Correction : `revalidate: DUREE_VALIDITE_CACHE` (300 s, `src/lib/cache.ts`) sur
   les huit `unstable_cache` de `src/lib/requetes/`, en plus des étiquettes ; règle de
   rendu (décision 20) mise à jour aux deux endroits. Garde-fou statique :
   `src/lib/cache.test.ts` (chaque `unstable_cache` porte étiquettes et durée ;
   vérifié qu'il échoue si l'on retire la durée de `disciplines.ts`). Vérifié sur
   3104 : les 21 fichiers de cache créés pendant les essais portent tous
   `"revalidate":300` et leurs étiquettes.
5. **Clé de recherche non normalisée** (casse). Sans objet pour le cache depuis le
   point 3 (plus de clé) ; la forme envoyée à `rechercher()` est désormais
   normalisée par `cleRecherche` (`src/lib/utils/annuaire.ts` : NFC, minuscules,
   espaces et caractères invisibles), qui ne retire QUE ce que la fonction SQL
   ignore déjà : la casse (`websearch_to_tsquery` et `pg_trgm`, vérifié en SQL), pas
   les accents (`similarity('SOBÉPED','sobeped')` = 0,45 contre 1 pour
   `sobéped`). Le champ du formulaire garde la saisie du visiteur. Tests :
   `annuaire.test.ts` (« pediatrie », « Pediatrie », « PEDIATRIE », espaces → une
   seule forme ; « Pédiatrie » garde son accent ; accent décomposé composé).
6. **`page_origine` en texte libre** (un lien forgé `from=/jean.dupont@exemple.org`
   était enregistré). Correction : `pageOrigine` décode le chemin (sans paramètres
   ni fragment) et ne le garde que s'il a la forme d'une page publique du site
   (liste fermée : `/`, `/societes`, `/societes/{slug}`, `/agenda`, `/agenda/{slug}`,
   `/echeances`, `/disciplines/{slug}`, `/recherche`), sinon `null`. Tests
   (`analyse.test.ts`) : formes admises, chemin encodé décodé, adresse électronique,
   `/espace/…`, majuscules, barre finale, slug invalide → `null`. Vérifié sur 3104 :
   le lien forgé crée une ligne avec `page_origine` nul (puis supprimée). Complété
   après la vérification complète (la forme seule laissait passer un slug inventé) :
   voir « Suites de la vérification complète », point 3.
7. **`S.B.C.` donnait `s-b-c`** (l'ancien test l'attendait). Correction :
   `slugSigle` (`src/lib/utils/slugs.ts`) retire points, apostrophes (droite,
   typographiques) et espaces avant de slugifier : `S.B.C.`, `S B C` → `sbc`,
   `SOB’AN` → `soban`, `UAC FSS` → `uacfss` (et non plus `uac-fss`) ; le tiret reste
   (`UAC-FSS` → `uac-fss`). Partagée par `slugSociete` et `slugEvenement`
   (`congres-sbc-2027`). Tests ajoutés dans `slugs.test.ts`.
8. **Demi-emoji dans les descriptions coupées.** Correction : `resumerTexte`
   (`fiche/utilitaires.ts`) compte et coupe en graphèmes (`Intl.Segmenter`) ; le test
   de longueur aussi. Tests : emoji à la coupe (cas de la relecture), emoji à
   modificateur, accent combinant, description des métadonnées
   (`utilitaires.test.ts`) et du JSON-LD (`donneesStructurees.test.ts`) bien formées
   (`isWellFormed`) pour chaque décalage autour de la limite.
9. **Première requête des événements d'une organisation sans filtre de statut.**
   Correction (`requetes/evenements.ts`) : jointure
   `evenements!inner ( id )` et filtre `.eq("evenements.statut", "publie")`, comme
   l'annuaire. Vérifié sur l'API locale : avec la clé de service (RLS contournée),
   l'organisation `…0006` a deux rattachements organisateurs dont un événement en
   attente ; la requête filtrée n'en renvoie qu'un. La fiche `demo-sbmi` affiche
   toujours ses deux événements à venir et ses deux événements passés.
10. **Hors périmètre** : fil d'Ariane, `BreadcrumbList` et champs JSON-LD
    supplémentaires CONSERVÉS (arbitrage du coordinateur, voir « Décisions ») ;
    `scripts/api-locale.mjs` sera commité et documenté (« Décisions »).
11. **Badge d'échéance urgente** (arbitrage) : variante `urgent` de `Badge` en texte
    `encre` sur fond `or` (« badge or », section 7), rapport 5,66:1 calculé par
    `src/lib/utils/contraste.ts` ; couple ajouté à `couplesUtilises`
    (`src/lib/charte.ts`), testé (`charte.test.ts`, valeur attendue 5,66) ; classes
    vérifiées sur la carte d'événement (`cartes.test.tsx`) et à l'écran (fiche
    `demo-abde`, « Clôture dans 2 jours » : couleur `rgb(42, 26, 28)` sur
    `rgb(184, 145, 58)`). Légende de `/charte` mise à jour.
12. **Monogramme trop petit pour les sigles de 5 lettres et plus** (arbitrage :
    capitales d'au moins ~11 px sur la carte de 64 px, sigles jusqu'à
    8 caractères). Choix : deux lignes empilées dans le cartouche carré (voir
    « Décisions »). Vérifié par mesure dans Chrome (`getBBox` et
    `getComputedTextLength` sur 3104) et par captures regardées, à 1280 et 360 px :
    annuaire, capitales de 11,2 à 12,5 px (`SB / GEO`, `AB / ENV`, `SBA / GRO`,
    `SB / SHS` ; `SBMI`, `ABDE`, `ABIN`, `ABPN` sur une ligne), aucune ligne hors du
    cadre intérieur ; en-tête de fiche à 80 px (360) et 128 px (1280) : 14 et
    22,4 px ; aucun défilement horizontal. Tests (`monogramme.test.ts`) : seuil de
    11 px pour dix-sept sigles réalistes de 3 à 8 caractères, bloc de deux lignes
    entre les filets ornés, limites connues. Complété le 14 octobre 2026 par un
    resserrement de 15 % au plus pour les sigles encore sous 11 px (« Retouches du
    coordinateur », point 1).

### Suites de la vérification complète

Vérification complète du 13 octobre 2026 (quatre constats prouvés). Chacun a été
reproduit le même jour sur `next start -p 3106` (build à jour, `.env.local` tel
quel, API locale) ou par la fonction pure ; un seul relève du code de la phase 2
sans arbitrage (point 3), il est corrigé ; les trois autres ont été tranchés par le
coordinateur le 14 octobre 2026 : points 1 et 2 acceptés (« Décisions »), point 4
corrigé (« Retouches du coordinateur », point 1).

1. **404 d'une fiche vide sans JavaScript** (gravité haute ; accepté pour la
   phase 2, correction en phase 5 : voir « Décisions »). Reproduit : `/societes/inexistant`, `/societes/DEMO-SBMI`,
   `/societes/sobeped` (brouillon), `/societes/demo-iehp` (en attente),
   `/societes/demo-sbjur` → 404, titre « Organisation introuvable — Cité Savante »,
   `noindex`, mais `<html id="__next_error__">` sans `lang`, aucun `h1` et corps vide
   hors `<script>` ; témoin `/page-inexistante` → 404, `<html lang="fr">`, un `h1`,
   texte présent. Avec JavaScript (Chrome) : `lang="fr"` et
   `h1 = « Organisation introuvable »`. Cause relue dans Next 16.3.6 :
   `renderToStream` (`app-render.js`, « errorRecovery ») traite tout `notFound()`
   levé pendant le rendu du shell en renvoyant la coquille de `getErrorRSCPayload`
   (`<html id="__next_error__"><head/><body/>`) ; la frontière `not-found.tsx` est
   le composant client `HTTPAccessFallbackBoundary`, appliqué seulement dans le
   navigateur. Aucun réglage de la page ne l'évite sans perdre le statut 404 :
   seule une vérification AVANT le rendu (`proxy.ts`) le permet (documentation
   Next, `loading.md`, « Status Codes »). Ce proxy ne peut pas s'appuyer sur
   `unstable_cache` (`proxy.md` : « you should not attempt relying on shared
   modules or globals ») : une lecture de la base par affichage de fiche.
2. **Préchargements en 404 qui ne se terminent jamais** (gravité basse ; accepté :
   disparaît au fil des phases 3 à 5, voir « Décisions »). Reproduit dans Chrome
   (`/`, `/societes`, `/societes/demo-sbmi`, `/societes/demo-abde`, 6 s après
   `load`) : 27 réponses 404, 27 erreurs console « Failed to load resource », 27
   requêtes encore « en cours », toutes des préchargements RSC (`?_rsc=…`) de
   routes absentes : `/agenda`, `/echeances`, `/referencer`, `/visibilite` (en-tête,
   4 fois chacune), `/a-propos`, `/contact`, `/mentions-legales`, `/confidentialite`
   (pied de page, visible sur `/`), `/disciplines/{slug}` et `/agenda/{slug}`
   (fiches). `curl` avec les mêmes en-têtes : 404 complète en 5 ms (327 octets).
   Le serveur répond donc bien ; c'est le routeur de Next qui ne lit pas le corps
   d'une réponse de préchargement en 404, et Chrome laisse la requête ouverte.
   Correction écartée : `prefetch={false}` sur chaque lien vers une route absente,
   dans des composants des phases 0 et 2, à retirer phase par phase.
3. **`page_origine` : toute forme de fiche était enregistrée** (gravité basse ;
   CORRIGÉ). Reproduit : `from=/agenda/jean-dupont-exemple-org-0100000000` et
   `from=/societes/n-importe-quoi` → 302 et lignes avec ces chemins (supprimées).
   Cause : `estPageOrigineConnue` ne vérifiait que la FORME
   (`/societes|agenda|disciplines/{slug}`). Correction :
   - `src/lib/utils/urls.ts` : `lirePageOrigine` (remplace `estPageOrigineConnue`)
     renvoie la page reconnue, `{ chemin, fiche: null }` pour une page fixe (`/`,
     `/societes`, `/agenda`, `/echeances`, `/recherche`) ou
     `{ chemin, fiche: { rubrique, slug } }` pour `/societes/{slug}` ;
     `RUBRIQUES_ORIGINE_A_SLUG` ne contient plus que `societes` : `/agenda/{slug}` et
     `/disciplines/{slug}`, pages encore inexistantes, donnent `null` (à rouvrir en
     phase 3 et 4 avec leur propre vérification) ;
   - `src/lib/passerelle/passerelle.ts` : nouvelle dépendance `slugsPublies`
     (`Record<RubriqueOrigine, …>` : ajouter une rubrique oblige à fournir sa
     lecture) ; pour un clic COMPTÉ seulement, une fiche n'est enregistrée que si
     son slug figure parmi les fiches publiées, sinon `null` ; lecture impossible →
     `null`, journalisé sans le slug, redirection maintenue ;
   - `src/lib/requetes/societes.ts` : `listerSlugsSocietesPubliees` (slugs tirés de
     la liste en cache, aucune lecture de plus), utilisée aussi par
     `obtenirSocietePubliee` ; branchée dans `src/app/go/[type]/[id]/route.ts`.
     `passerelle.ts` n'importe pas `src/lib/requetes/` (`server-only`) : la lecture
     lui est fournie par la route.

   Tests : `analyse.test.ts` (pages fixes, fiche reconnue avec son slug,
   `/agenda/{slug}` et `/disciplines/{slug}` → `null`) ; `passerelle.test.ts`, nouveau
   bloc « page d'origine d'une fiche : slug publié exigé » (fiche publiée gardée avec
   une seule lecture ; slug inventé, nom en forme de slug, fiche non publiée → `null`
   sans journal ; `/agenda/…` et `/disciplines/…` → `null` sans lecture ; page fixe
   sans lecture ; lecture qui lève → `null`, journal sans le slug, 302 ; HEAD,
   préchargement et cible introuvable → aucune lecture). Contre-épreuve : en
   remplaçant la vérification par « toujours garder », les trois cas `null` du bloc
   échouent.

4. **Monogramme : capitales sous 11 px pour certains sigles longs** (gravité basse ;
   CORRIGÉ le 14 octobre 2026 par un resserrement de 15 % au plus : « Retouches du
   coordinateur », point 1). Reproduit par la fonction pure
   (`disposerMonogramme`, mêmes valeurs que la mesure dans Chrome) : `ZTESTMMW` →
   `ZTEST / MMW`, taille 22,2, capitales de 9,95 px à 64 px. Constat nouveau : un
   sigle RÉEL de `seed.sql`, `SOBENCHIR` (9 caractères, au-delà de l'arbitrage de
   8), donne `SOBE / NCHIR`, taille 21, capitales de 9,41 px (le `SOBENCHI` de la
   liste des tests n'est pas ce sigle). Les quatorze autres sigles de la base
   (démonstration comprise) restent entre 11,2 et 14,3 px. Aucune disposition sans
   déformation n'atteint 11 px pour ces sigles : à 24,6 (seuil de 11 px), `ZTEST`
   mesure 81,9 unités et `NCHIR` 86,4 pour 74 disponibles (cadre intérieur : 84) ;
   trois lignes plafonnent à la taille 21,4 entre les filets (9,6 px). Tests
   ajoutés alors (`monogramme.test.ts`), qui figeaient ces valeurs : `ZTESTMMW`
   (9,95 px, sans compression), `SOBENCHIR` (9,41 px), `MMWW` (`MM / WW`, 11,2 px,
   au seuil) ; les deux premiers sont remplacés par ceux du resserrement.

### Retouches du coordinateur

Le 14 octobre 2026, quatre retouches décidées par le coordinateur après la
vérification complète. Mesures dans Chromium 1234 sans interface
(`chrome-headless-shell` ; le `chrome.exe` de la même révision ne démarre pas sur ce
poste, « spawn UNKNOWN ») sur `next start -p 3107` (build à jour, `.env.local` tel
quel, API locale), avec le même script avant (13 octobre) et après.

1. **Monogramme : resserrement de 15 % au plus** (`src/lib/utils/monogramme.ts` ;
   `src/components/societes/Monogramme.tsx`, commentaire seulement). La disposition
   (une ou deux lignes, coupe, taille) est calculée comme avant ; si les capitales
   restent sous 11 px à 64 px, la taille passe à `TAILLE_LISIBLE` (24,6) à condition
   que CHAQUE ligne y tienne avec un resserrement d'au plus 15 %
   (`RESSERREMENT_MAX`, `resserrementNecessaire`), sinon rien n'est resserré. Seules
   les lignes qui déborderaient reçoivent `textLength="74"` et
   `lengthAdjust="spacingAndGlyphs"` sur leur `tspan` ; les autres gardent leur
   chasse. Fonction pure (largeurs estimées, marge de 2 % comprise) :
   - `SOBENCHIR` → `SOBE / NCHIR` : taille 21 → 24,6, capitales 9,41 → 11,02 px,
     `NCHIR` resserré de 14,3 %, `SOBE` intact ;
   - `ZTESTMMW` → `ZTEST / MMW` : 22,2 → 24,6, 9,95 → 11,02 px, `ZTEST` 9,6 %,
     `MMW` intact ;
   - `ABMHEPAT` → `ABMH / EPAT` : environ 10,3 → 11,02 px, `ABMH` 6,9 % ;
   - `MMWWMMWW` inchangé (taille 18,5, 8,29 px : il faudrait 25 %) ; les dix-sept
     sigles courants des tests inchangés, sans resserrement.

   Mesuré dans Chrome sur la carte de 64 px (organisation `[TEST]` publiée
   temporaire, sigle `SOBENCHIR`, supprimée ensuite), à 360 et 1280 px, ×1 et ×3 :
   avant, taille 21, capitales 9,41 px, aucun `textLength` ; après, taille 24,6,
   capitales 11,02 px ; `NCHIR` : `textLength="74"`, largeur naturelle 84,66, rendue
   74,64 (resserrement réel 11,8 %), de x = 13 à 87,6 dans le cadre intérieur
   (de 8 à 92) ; `SOBE` : sans `textLength`, 68,5 de large. Témoins identiques avant et
   après : `SBAGRO` (taille 25, 11,2 px, sans `textLength`) et `SBMI` (27,9,
   12,5 px). Aucun défilement horizontal. Fiche à 360 px (monogramme de 80 px) :
   même disposition, `textLength` sur `NCHIR` seul. Captures regardées (carte
   `SOBENCHIR` et carte `SBAGRO` à 360 et 1280 px, monogramme seul à ×6) : `NCHIR` se
   lit comme une chasse un peu plus étroite, sans déformation grossière des lettres,
   et la hauteur gagnée se voit nettement à côté de la capture d'avant. Tests
   (`monogramme.test.ts`) : `ZTESTMMW` et `SOBENCHIR` réécrits avec ces valeurs ;
   nouveaux : `ABMH / EPAT` resserré, `MMWWMMWW` non resserré, et resserrement borné
   (hors taille minimale, toute ligne resserrée l'est de 15 % au plus, et seulement à
   `TAILLE_LISIBLE`).

2. **Journal de la passerelle : délai d'écriture dépassé**
   (`src/lib/passerelle/donnees.ts`, `src/lib/passerelle/passerelle.ts`). Le délai
   de 2 s (`DELAI_MAX_ENREGISTREMENT_MS`) coupe l'attente, pas la transaction : la
   ligne peut être insérée quand même. `enregistrerClic` renvoie une issue
   (`enregistre`, `delai_depasse`, `erreur`) ; le délai est reconnu à son propre
   signal (`signal.aborted`), et non au texte de l'erreur. Vérifié avec supabase-js
   2.117.2 contre un serveur local qui accepte la connexion sans jamais répondre :
   l'interruption est RENVOYÉE (pas levée), `status` 0, `code` vide, message
   « TimeoutError: The operation was aborted due to timeout » (un test sur
   « AbortError » aurait donc échoué). Journal :
   - délai :
     `[passerelle] Clic (societe) : délai d'écriture dépassé (2000 ms), enregistrement non confirmé` ;
   - erreur renvoyée par l'API avant le délai : inchangé,
     `[passerelle] Clic non enregistré (societe) : 23514 — …` ;
   - exception (client de service impossible à créer, réseau avant le délai) :
     `Clic non enregistré`.

   Aucune donnée de la requête (URL, chemin, slug) dans ces messages. Tests
   (`passerelle.test.ts`) : le faux client garde le signal reçu ; deux cas de délai
   RÉEL (il attend le déclenchement de l'`AbortSignal.timeout` de 2 s, puis renvoie
   l'erreur comme supabase-js, ou la lève) → 302, aucune ligne, message exact, sans
   « non enregistré » ni l'URL ; erreur renvoyée et exceptions : message exact
   « Clic non enregistré ».

3. **Contour de focus sans transition** (`src/app/globals.css`,
   `src/components/mise-en-page/Bouton.tsx`, `src/components/societes/CarteSociete.tsx`,
   `src/components/evenements/CarteEvenement.tsx`,
   `src/components/societes/annuaire/PaginationAnnuaire.tsx`). `transition-colors`
   de Tailwind 4 anime aussi `outline-color` : le contour or passait 150 ms par des
   teintes brunes. Nouveau jeton `--transition-property-teintes` (`@theme`), qui
   donne la classe `transition-teintes` : `color`, `background-color`, `border-color`,
   `text-decoration-color`, `fill`, `stroke`, même courbe et même durée que
   `transition-colors`. Il remplace `transition-colors` à ses quatre emplois ; plus
   aucun `transition-colors` sous `src/` (restent deux `transition-transform`, lien
   d'évitement et chevron des événements passés, sans `outline-color`). CSS compilé :
   `.transition-teintes{transition-property:var(--transition-property-teintes);…}`,
   `motion-reduce:transition-none` inchangé ; aucune règle portée par un élément
   n'anime `outline-color` (`.transition` et `.transition-colors` restent générées,
   parce que leurs noms figurent dans ce fichier et dans un commentaire de
   `globals.css`, mais aucun élément ne porte ces classes).
   Mesuré dans Chrome à 1280 px, focus par Tab, couleur du contour lue au focus, à la
   première image, à +50 ms et à +300 ms. Avant : carte d'organisation
   `rgb(42, 26, 28)` (encre) puis `rgb(141, 109, 49)` à +50 ms ; bouton « Site
   officiel » `rgb(247, 241, 227)` (crème) puis `rgb(218, 197, 150)` ; carte
   d'événement encre et numéro de pagination bordeaux à la première image. Après :
   `rgb(184, 145, 58)` (or) dès le focus et à la première image sur ces quatre
   éléments (carte d'organisation, bouton « Site officiel », carte d'événement,
   numéro de pagination), aucune transition en cours sur `outline-color`. Témoin : le
   bouton « Lancer la recherche » (sans transition) était déjà or dès le focus, avant
   comme après.

4. **Décisions consignées** : 404 d'une fiche et préchargements (« Décisions »),
   correction de la 404 inscrite en phase 5 (« Reste à faire »), « À valider par le
   porteur (phase 2) » mis à jour.

### Décisions

- **Annuaire filtré en mémoire** : la liste complète des organisations publiées est
  lue une fois (cache, clé = date du jour) puis filtrée, triée et paginée par
  `utils/annuaire.ts` (seul `Intl.Collator("fr")` garantit le tri français ; filtre
  ville sur `slugifier(ville)`). Au-delà de 1 000 organisations publiées (plafond
  PostgREST par défaut), il faudra paginer côté base.
- **Filtres** : valeur inconnue ignorée sans erreur, recherche de moins de 2
  caractères ignorée, coupée à 100 ; `resultat.filtres` (filtres réellement
  appliqués) sert au formulaire, au résumé et à la pagination.
- **Canonique de l'annuaire** : toujours `/societes` ; variantes filtrées et pages 2 et
  suivantes en `noindex, follow`, décidé sur l'URL seule.
- **Pas de `loading.tsx` sous `app/societes/`**, ni de `<Suspense>` au-dessus des
  pages : sinon la redirection de page ne serait plus une vraie 307 et une fiche
  inexistante ne renverrait plus un vrai statut 404.
- **Filtres non repliés sur mobile** (pas de `<details>`) : outil principal de la page ;
  en contrepartie les cartes commencent plus bas à 360 px (à juger par le porteur).
- **Focus** : Next 16 fait défiler jusqu'à l'ancre `#resultats` mais ne déplace plus
  le focus ; `FocusResultats` le place sur le titre de la liste après un changement de
  page à filtres identiques. Next ne remonte pas la page quand seuls les paramètres de
  l'URL changent : le formulaire recopie les filtres appliqués dans ses champs.
- **Fiche** : slug exact exigé (`/societes/DEMO-SBMI` donne 404, sans redirection) ;
  `generateMetadata` et la page partagent une seule lecture (`cache` de React) ;
  titre « SIGLE — Nom complet », description de 160 caractères au plus (comptés en
  graphèmes). La fiche n'est lue, et mise en cache, que si son slug figure dans la
  liste en cache des organisations publiées ; sinon `null`, sans entrée de cache.
  Seule la page lève `notFound()` ; `generateMetadata` renvoie les métadonnées de la
  page introuvable.
- **Compteurs et listes d'événements d'une organisation** : organisateur et
  co-organisateur seulement, partenaires exclus.
- **Passerelle** : `vers` ne choisit qu'une colonne dans une liste fermée, l'URL vient
  toujours de la base ; lien non `https://` sûr → 404 ; lecture impossible → 503
  (journalisé, sans clic) ; échec d'écriture du clic → journalisé, la redirection
  part quand même ; délai d'écriture dépassé (2 s) → journalisé à part,
  « enregistrement non confirmé » (le délai coupe l'attente, pas la transaction),
  reconnu au signal et non au texte de l'erreur, alors qu'une erreur renvoyée par
  l'API reste « Clic non enregistré » ; `page_origine` = chemin seul, décodé, paramètres et fragment
  retirés, et seulement s'il désigne une page publique connue (`lirePageOrigine`,
  liste fermée) : une page fixe (`/`, `/societes`, `/agenda`, `/echeances`,
  `/recherche`, valeurs fixes) ou une fiche d'organisation PUBLIÉE (`/societes/{slug}`,
  slug vérifié dans la liste en cache des organisations publiées) ; sinon `null`.
  Aucune saisie du visiteur n'est donc enregistrée : seules des valeurs fixes ou le
  slug d'une fiche publiée. `/agenda/{slug}` et `/disciplines/{slug}` donnent `null`
  jusqu'aux phases 3 et 4, qui les ajouteront à `RUBRIQUES_ORIGINE_A_SLUG` avec la
  lecture de leurs slugs publiés. Cette vérification n'est faite que pour un clic
  compté, avant la redirection, sur la liste en cache que la fiche vient de lire :
  pas de délai mesurable, donc pas de délai maximal comme pour `lireDestination` ;
  `url` enregistrée = URL finale avec les UTM ;
  `HEAD`, en-têtes `RSC` / `Next-Router-Prefetch` et préchargements du navigateur
  reçoivent la redirection mais ne sont pas comptés. Lecture non mise en cache
  (l'identifiant vient du visiteur).
- **UTM** : chacun des deux paramètres n'est ajouté que s'il manque
  (`?utm_source=lettre` reçoit seulement `utm_medium`).
- **Règle d'import** : un fichier `"use client"` n'importe jamais `@/lib/requetes/`,
  même en `import type` (`securite.test.ts` regarde le chemin) ; les types et
  fonctions pures des composants clients viennent de `@/lib/utils/`.
- **Variables d'environnement facultatives vides** (correction de la phase 2) : vides
  ou faites d'espaces, elles valent « absentes » (`null`) ; un `.env.local` copié de
  `.env.example` est accepté tel quel. Les variables requises vides restent refusées.
- **Durée de validité du cache : 5 minutes** (arbitrage du coordinateur) :
  `revalidate: DUREE_VALIDITE_CACHE` (300 s) sur chaque `unstable_cache` de
  `src/lib/requetes/`, en plus des étiquettes. Les server actions invalident toujours
  immédiatement ; la durée ne sert qu'aux écritures faites hors server action
  (éditeur SQL, tableau de bord Supabase), qui apparaissent au plus tard à la deuxième
  visite après 5 minutes (relecture en arrière-plan). Utile dès maintenant : jusqu'aux
  phases 5 et 6, publier ou corriger une fiche se fait en SQL, et le parcours 2 de la
  phase 5 prévoit une action SQL de modération.
- **Recherche texte de l'annuaire non mise en cache** (choix demandé : « pas de cache,
  ou durée courte ») : pas de cache. Le texte vient du visiteur : chaque saisie
  créerait une entrée persistante, et une durée courte la ferait expirer sans la
  supprimer (en auto-hébergement, le fichier reste dans `.next/cache/fetch-cache`).
  Varier la saisie contournerait de toute façon le cache, qui ne protégerait donc pas
  la base. Coût : une requête indexée (GIN, trigrammes) par affichage filtré par texte ;
  la liste complète reste en cache. Même raisonnement que la passerelle. Exception à
  la règle de rendu, consignée dans la décision 20. La normalisation `cleRecherche`
  (casse, espaces, NFC ; accents gardés) n'a donc plus d'effet sur le cache : elle
  rend seulement la requête envoyée déterministe, et servirait de clé si un cache
  était un jour réintroduit.
- **Fil d'Ariane visible et JSON-LD `BreadcrumbList` conservés** (arbitrage du
  coordinateur) : prévus par la section 15 (« JSON-LD `Organization`, `Event`,
  `BreadcrumbList` ») et par le point 2 du prompt de la phase 7, ils sont livrés en
  avance sur la fiche ; la phase 7 n'aura qu'à les étendre aux autres pages. Les
  champs JSON-LD au-delà du minimum (`@id`, `sameAs` sans WhatsApp, `email`,
  `telephone`, `description`, `addressCountry: BJ`) sont conservés aussi.
- **Slug d'un sigle collé** (arbitrage, section 7 : « sigle en minuscules ») :
  points, apostrophes et espaces retirés (`S.B.C.` et `S B C` → `sbc`), tiret gardé.
  Effet visible : `UAC FSS` donne désormais `uacfss` (et non plus `uac-fss`).
  `slugSigle` est partagé avec `slugEvenement`, pour que la fiche et les événements
  écrivent le sigle de la même façon (`/societes/sbc`, `congres-sbc-2027`).
- **Badge d'échéance urgente** (arbitrage) : texte `encre` sur fond `or` (« badge
  or », section 7), 5,66:1, conforme AA ; distinct du badge de type (bordeaux sur
  or clair).
- **Monogramme : deux lignes empilées plutôt qu'un cartouche élargi** (arbitrage :
  capitales d'au moins ~11 px sur la carte de 64 px, sigles jusqu'à 8 caractères).
  À 64 px, une ligne ne peut porter que 4 capitales environ à 11 px (largeur de
  texte : 74 unités sur 100) ; un cartouche élargi à 8 capitales aurait dû mesurer
  environ 1,7 fois sa hauteur, donc une colonne de logo plus large sur toutes les
  cartes et environ 45 px de texte en moins à 360 px ; réduire l'interlettrage ne
  gagnait que quelques pour cent. Le sigle passe donc sur deux lignes dès qu'une
  ligne donnerait des capitales de moins de 11 px (`TAILLE_LISIBLE`), coupé à un
  espace ou un tiret, sinon là où les lignes s'équilibrent, première ligne la plus
  courte (`SB / GEO`, `SBA / GRO`, `SOB / EPED`) : un cachet gravé, cohérent avec le
  cartouche de plan. Même disposition à toutes les tailles (carte et fiche). Largeurs
  des lettres MESURÉES sur la Fraunces 500 servie (`measureText` dans Chrome, plus
  2 %), hauteur des capitales mesurée à 0,70 em.
- **Monogramme : resserrement de 15 % au plus** (décision du coordinateur, 14 octobre
  2026, option recommandée après la vérification complète) : quand la meilleure
  disposition donne des capitales de moins de 11 px (`ABMH / EPAT` environ 10,3 px,
  `ZTEST / MMW` 9,95 px, `SOBE / NCHIR` 9,41 px pour le sigle réel `SOBENCHIR` de
  `seed.sql`), la taille passe à `TAILLE_LISIBLE` si chaque ligne y tient resserrée de
  15 % au plus ; seules les lignes qui déborderaient sont resserrées (`textLength` sur
  leur `tspan`). La hauteur des capitales compte plus pour la lecture à 64 px qu'une
  chasse réduite d'environ 12 % (mesuré dans Chrome). Limite connue, testée : au-delà
  de 15 %, rien n'est resserré (pire cas théorique `MMWWMMWW`, environ 8 px) ; un
  sigle qui déborde même à la taille minimale reste compressé (`textLength`) pour
  tenir dans le cartouche.
- **404 d'une fiche vide sans JavaScript : acceptée pour la phase 2** (décision du
  coordinateur, 14 octobre 2026). Limite de Next.js 16.3.6, confirmée dans
  `node_modules/next/dist/server/app-render/app-render.js` : `getErrorRSCPayload`
  (lignes 1322 à 1336) rend, pour une erreur levée pendant le rendu du shell, dont
  `notFound()`, une charge d'erreur `<html id="__next_error__">` à `<head>` et
  `<body>` vides, et c'est le client qui dessine la page introuvable. Expérience du
  coordinateur : résultat identique sans `src/app/societes/error.tsx` ni
  `src/app/societes/[slug]/not-found.tsx`. Statut 404, titre et `noindex` sont
  corrects. À corriger en phase 5 dans `proxy.ts` (créé alors pour `/espace` et
  `/admin`, spécifications section 6) : vérifier le slug de `/societes/{slug}` et
  réécrire vers une page introuvable rendue côté serveur (« Reste à faire » ; options
  et coûts dans « Corrections après la relecture adversariale », point 2).
- **Préchargements `next/link` vers des pages pas encore construites : acceptés**
  (décision du coordinateur, 14 octobre 2026). Ils donnent des 404 dans la console et
  l'avertissement « Results may be incomplete » de Lighthouse ordinateur sur la fiche
  (« Suites de la vérification complète », point 2) ; ils disparaissent au fil des
  phases 3 à 5, qui créent ces pages, sans `prefetch={false}` à poser puis retirer.
  D'ici là, auditer avec `--blocked-url-patterns=*_rsc=*` ; après la phase 5,
  relancer Lighthouse ordinateur sans blocage.
- **`transition-teintes` plutôt que `transition-colors`** (retouche du coordinateur) :
  sur tout élément qui peut porter le contour de focus, la transition des couleurs
  exclut `outline-color`, pour que le contour or apparaisse dès la première image
  (jeton `--transition-property-teintes` de `globals.css`).
- **`scripts/api-locale.mjs` commité** (arbitrage) : API Supabase locale sans Docker
  pour vérifier les pages publiques sur des données réelles tant que le projet
  distant n'existe pas (Docker Desktop ne démarre pas sur ce poste). Relais Node
  (`node:http`, aucune dépendance) sur `http://127.0.0.1:54321` devant PostgREST
  16.3, la version embarquée par le CLI Supabase 2.118 (mêmes requêtes, même RLS,
  mêmes rôles `anon`, `authenticated`, `service_role` que Supabase) : `/rest/v1/*` →
  PostgREST (port 54320), base `citesavante_api` de la grappe PostgreSQL locale (port
  54390). Démarrage : `PG_DB=citesavante_api SANS_DEMO=0 bash scripts/valider-base.sh`
  (base à jour avec `seed_demo.sql`), puis `node scripts/api-locale.mjs cles` une
  fois, puis `node scripts/api-locale.mjs` (Ctrl+C pour arrêter). `cles` RÉÉCRIT
  `.env.local` (le crée depuis `.env.example` s'il manque) : `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (jetons HS256 de
  développement, 10 ans) et `API_LOCALE_JWT_SECRET` (secret aléatoire propre au poste,
  gardé s'il existe) ; les autres lignes sont conservées, fins de ligne ramenées à LF.
  Ces clés ne donnent accès qu'à la base locale. Le binaire PostgREST (et `libpq.dll`)
  est HORS du dépôt : chemins par défaut propres à ce poste
  (`C:/Users/agbot/Desktop/PROJETS/pgsql/postgrest/postgrest.exe`,
  `C:/Users/agbot/Desktop/PROJETS/pgsql/pgsql/bin`), à surcharger ailleurs par `POSTGREST_BIN`
  et `PG_BIN` (aussi `PG_HOST`, `PG_PORT`, `PG_DB`, `API_PORT`, `POSTGREST_PORT`). Non
  couvert : authentification (`/auth/v1/*` → 501) et stockage
  (`/storage/v1/*` → 404) ; les parcours connectés (phases 5 et 6) et les logos se
  vérifieront avec Supabase local sous Docker ou le projet distant.

### Points à vérifier sur données réelles

Faits par la relecture adversariale puis par la correction (`seed_demo.sql`, API
locale, `next start`) : statuts HTTP réels (404 des fiches inconnues, en majuscules,
en brouillon ou en attente ; 200 ; 307 de la page hors limites ; 308 de la barre
finale) ; passerelle (une ligne par clic avec le `.env.local` tel quel, aucune pour
`HEAD` et les préchargements, rejets en 404 indiscernables, aucune redirection
ouverte) ; filtres de l'annuaire avec et sans JavaScript ; 360 et 1280 px sans
défilement horizontal (annuaire et fiche) ; classes Tailwind 4 compilées ; échappement
du JSON-LD ; canonique, `robots` et Open Graph ; monogramme sans logo.

**Lighthouse accessibilité ≥ 95** sur `/societes` et `/societes/demo-sbmi` : fait
le 13 octobre 2026 (Lighthouse 13.5.0, Chrome sans interface), **100 sur les deux
pages, en mobile et en ordinateur**, aucun audit en échec (détail dans
« Vérifications (suites de la vérification complète) »). Seul l'audit ordinateur
de la fiche porte l'avertissement « Results may be incomplete » (préchargements en
404, « Suites de la vérification complète », point 2) ; relancé en bloquant
`*_rsc=*`, il finit sans avertissement, avec le même score. Sur ce poste,
`pnpm dlx lighthouse` échoue (module `configstore` introuvable) :
`pnpm --config.node-linker=hoisted dlx lighthouse@13.5.0 …` fonctionne, mais coûte
environ 4 min d'installation et 5 à 7 min de chargement des modules à chaque
lancement ; cinq des six audits ont donc été lancés dans un seul processus Node,
par l'API de Lighthouse (`lighthouse/core/index.js` et `chrome-launcher` de cette
même installation, `desktopConfig` pour l'ordinateur).

Restent à faire :

1. **JSON-LD** de la fiche passé à l'outil de test des résultats enrichis (en ligne).
2. **Logos** : l'API locale ne sert pas le stockage (404 sur `/storage/v1/…`) ; le
   chemin `next/image` (motifs distants, `dangerouslyAllowLocalIP`) ne sera vérifiable
   qu'avec Supabase local sous Docker ou le projet distant.
3. **404 d'une fiche sans JavaScript** : à revérifier en phase 5, après la correction
   dans `proxy.ts` (« Décisions »).

### À valider par le porteur (phase 2)

- **Page 404 d'une fiche vide sans JavaScript** (acceptée pour la phase 2 par le
  coordinateur, NON bloquante ; correction prévue en phase 5 dans `proxy.ts`, voir
  « Décisions » et « Reste à faire ») : statut 404, titre « Organisation
  introuvable » et `noindex` corrects ; sans JavaScript, corps vide (page blanche
  pendant l'attente du JavaScript, sensible en 3G). À confirmer par le porteur.
- **Monogramme** (choix faits selon les arbitrages, à regarder) : deux lignes
  empilées (`SB / GEO`, `SBA / GRO`) sur les cartes et l'en-tête de fiche ; pour les
  sigles les plus larges, une ligne resserrée de 15 % au plus (`SOBENCHIR` :
  `NCHIR` resserré d'environ 12 % à l'écran, capitales de 11 px au lieu de 9,4 px).
  À regarder sur la fiche `SOBENCHIR` quand elle sera publiée (encore en brouillon).
- **Panneau de filtres non replié à 360 px** : les premières cartes commencent vers
  1,7 hauteur d'écran (mesure de la relecture).
- **Slug d'un événement de type « autre »** : `titre-annee`, même avec un organisateur.
- **Convention `logo_path`** : chemin relatif au bucket (`{id}/{horodatage}.webp`),
  préfixe `logos/` toléré ; à respecter par les envois de la phase 5.
- **Lecture impossible → 503** sur la passerelle (et non 404).
- **Gonflement des compteurs** : sans IP (voulu par la section 15), rien n'empêche de
  répéter les requêtes vers `/go` ; limite connue.
- **Liens vers des pages pas encore construites** (acceptés par le coordinateur, NON
  bloquants, voir « Décisions ») : disciplines (`/disciplines/…`, phase 4), agenda
  (`/agenda/…`, phase 3), référencement (`/referencer/…`, phase 5), « Gérer cette
  fiche » (`/espace/reclamer/…`, phase 5) mènent à la page 404 du site jusqu'à leur
  phase, comme les liens de l'en-tête depuis la phase 0 ; leurs préchargements
  (`next/link`) donnent des 404 dans la console (27 sur quatre pages, vérification
  complète, point 2) jusqu'aux phases 3 à 5.

### Vérifications (intégration)

Le 7 octobre 2026, dans cet ordre, après les corrections d'intégration :

- **`pnpm typecheck`** (`tsc --noEmit`) : code 0, aucune erreur.
- **`pnpm test`** (`vitest run`) : code 0, **21 fichiers, 431 tests, tous passés**
  (296 s). `src/lib/passerelle/analyse.test.ts`, retouché pendant cette exécution
  (caractère de contrôle de direction écrit en échappement `\u202e` au lieu d'être
  tapé tel quel), relancé seul ensuite : 83 tests passés, code 0.
- **`pnpm build` avec `.env.local`** (API locale) : code 0 (« Environments:
  .env.local ») ; `/societes`, `/societes/[slug]` et `/go/[type]/[id]` en `ƒ`
  (dynamiques, jamais rendues au build) ; `/`, `/_not-found`, `/charte`, `/icon.svg`
  en `○`.
- **`pnpm build` sans `.env.local`** (renommé le temps du build, puis remis ; empreinte
  SHA-256 identique avant et après ; aucune variable Supabase dans l'environnement du
  shell) : code 0, même tableau des routes.
- **`pnpm lint`** (`eslint .`) : code 0, 0 erreur, 0 avertissement.
- **`pnpm exec prettier --check`** sur les 59 fichiers de la phase (code, tests,
  `next.config.ts`, `PROGRESS.md`) : code 0.
- Fins de ligne LF partout (aucun `\r` sous `src/` ni dans `PROGRESS.md`).
- Non vérifiable à cette étape (aucune page ouverte dans un navigateur) : voir « Points
  à vérifier sur données réelles ».

### Vérifications (correction après la relecture adversariale)

Le 13 octobre 2026, dans cet ordre, après les corrections :

- **`pnpm typecheck`** : code 0, aucune erreur.
- **`pnpm test`** : code 0, **22 fichiers, 504 tests, tous passés** (nouveau fichier :
  `src/lib/cache.test.ts`).
- **`pnpm build` avec `.env.local`** : code 0 (« Environments: .env.local ») ;
  `/societes`, `/societes/[slug]` et `/go/[type]/[id]` en `ƒ` ; `/`, `/_not-found`,
  `/charte`, `/icon.svg` en `○`.
- **`pnpm build` sans `.env.local`** (renommé le temps du build puis remis, empreinte
  SHA-256 identique, aucune variable Supabase dans l'environnement) : code 0, même
  tableau des routes.
- **`pnpm lint`** : code 0, 0 erreur, 0 avertissement.
- **`pnpm exec prettier --check`** sur les 28 fichiers modifiés ou créés (dont
  `scripts/api-locale.mjs` et `PROGRESS.md`) : code 0 ; aucun octet CR.
- **`PG_DB=citesavante_corr bash scripts/valider-base.sh`** : « VALIDATION RÉUSSIE »,
  7 migrations rejouées sans erreur, `seed.sql` et `seed_demo.sql` chargés, 6 fichiers,
  466 vérifications, 0 échec (base jetable supprimée ensuite).
- Sur `next start -p 3104` avec le `.env.local` tel quel (serveur arrêté ensuite) :
  preuves des points 1 à 4, 6, 9, 11 et 12 de « Corrections après la relecture
  adversariale » ; base `citesavante_api` laissée sans donnée de test
  (`clics_sortants` vide).

### Vérifications (suites de la vérification complète)

Le 13 octobre 2026, dans cet ordre, après la correction de `page_origine` et les
tests du monogramme :

- **`pnpm typecheck`** : code 0, aucune erreur.
- **`pnpm test`** : code 0, **22 fichiers, 518 tests, tous passés** (504 + 14 :
  11 dans `passerelle.test.ts`, 3 dans `monogramme.test.ts` ; `analyse.test.ts` à
  nombre égal).
- **`pnpm build` sans `.env.local`** (renommé le temps du build puis remis, empreinte
  SHA-256 identique avant et après, aucune variable Supabase dans l'environnement) :
  code 0 ; `/`, `/_not-found`, `/charte`, `/icon.svg` en `○` ; `/go/[type]/[id]`,
  `/societes`, `/societes/[slug]` en `ƒ`.
- **`pnpm build` avec `.env.local`** (« Environments: .env.local ») : code 0, même
  tableau des routes. Build gardé pour les parcours ci-dessous.
- **`pnpm lint`** : code 0, 0 erreur, 0 avertissement.
- **`pnpm exec prettier --check`** sur les 9 fichiers modifiés (`urls.ts`,
  `analyse.ts`, `analyse.test.ts`, `passerelle.ts`, `passerelle.test.ts`,
  `requetes/societes.ts`, `go/[type]/[id]/route.ts`, `monogramme.test.ts`,
  `PROGRESS.md`) : code 0 ; fins de ligne LF.
- Parcours rejoués sur `next start -p 3106` (`.env.local` tel quel, API locale ;
  serveur arrêté ensuite) :
  - **Passerelle, `page_origine`** (point 3) : sept GET sur
    `/go/societe/de110000-…-0001?vers=site&from=…`, tous 302 vers
    `https://example.org/sbmi?utm_source=citesavante&utm_medium=referral` ; lignes
    créées : `page_origine` NUL pour `/agenda/jean-dupont-exemple-org-0100000000`,
    `/societes/n-importe-quoi`, `/societes/sobeped` (brouillon), `/societes/demo-iehp`
    (en attente) et `/disciplines/sante` ; `/societes/demo-sbmi` (publiée) et
    `/societes` gardés ; un HEAD : 302, aucune ligne ; aucun message `[passerelle]`
    dans le journal du serveur. Les 7 lignes supprimées : `clics_sortants` revenu à 0.
  - **404 d'une fiche** (point 1, non corrigé) : inchangé, comme attendu. Sans
    JavaScript, les cinq adresses du constat → 404, titre et `noindex` justes,
    `<html id="__next_error__">`, aucun `h1`, corps vide ; `/page-inexistante` → 404,
    `<html lang="fr">`, un `h1`. Avec JavaScript (Chrome) : `/societes/inexistant` et
    `/societes/sobeped` → 404, `lang="fr"`, `h1` « Organisation introuvable ».
  - **Préchargements** (point 2, non corrigé) : inchangé, comme attendu. Chrome, `/`,
    `/societes`, `/societes/demo-sbmi`, `/societes/demo-abde` : 27 réponses 404, 27
    erreurs console, 27 requêtes `?_rsc=` encore ouvertes 6 s après `load`, aucune
    autre.
  - **Lighthouse 13.5.0** (accessibilité, Chrome sans interface) : `/societes`
    ordinateur 100 (29,1 s, sans avertissement), ordinateur avec `*_rsc=*` bloqué 100
    (22,7 s), mobile 100 (34,4 s) ; `/societes/demo-sbmi` ordinateur 100 (61,1 s,
    « The page loaded too slowly to finish within the time limit. Results may be
    incomplete. »), ordinateur avec `*_rsc=*` bloqué 100 (19,3 s, sans avertissement),
    mobile 100 (21,5 s). Aucun audit d'accessibilité en échec. Rapports JSON gardés
    hors du dépôt.
  - **Monogramme** (point 4) : fonction pure, `ZTESTMMW` → `ZTEST / MMW`, 9,95 px ;
    `SOBENCHIR` → `SOBE / NCHIR`, 9,41 px ; `MMWW` → `MM / WW`, 11,2 px ; autres
    sigles de la base de 11,2 à 14,3 px.

### Vérifications (retouches du coordinateur)

Le 14 octobre 2026, dans cet ordre, après les retouches :

- **`pnpm typecheck`** : code 0, aucune erreur.
- **`pnpm test`** : code 0, **22 fichiers, 522 tests, tous passés** (518 + 4 : 2 dans
  `monogramme.test.ts`, 2 dans `passerelle.test.ts`).
- **`pnpm build` avec `.env.local`** (« Environments: .env.local ») : code 0 ; `/`,
  `/_not-found`, `/charte`, `/icon.svg` en `○` ; `/go/[type]/[id]`, `/societes`,
  `/societes/[slug]` en `ƒ`. Build gardé pour les mesures de « Retouches du
  coordinateur » (serveur `next start -p 3107` arrêté ensuite ; organisation
  `[TEST]` supprimée : `societes` revenu à 15 lignes dont 8 publiées,
  `clics_sortants` à 0).
- **`pnpm build` sans `.env.local`** (renommé le temps du build puis remis, empreinte
  SHA-256 identique avant et après, aucune variable Supabase dans l'environnement) :
  code 0, sans ligne « Environments », même tableau des routes.
- **`pnpm lint`** : code 0, 0 erreur, 0 avertissement.
- **`pnpm exec prettier --check`** sur les 12 fichiers modifiés (`monogramme.ts`,
  `monogramme.test.ts`, `Monogramme.tsx`, `donnees.ts`, `passerelle.ts`,
  `passerelle.test.ts`, `globals.css`, `Bouton.tsx`, `CarteSociete.tsx`,
  `CarteEvenement.tsx`, `PaginationAnnuaire.tsx`, `PROGRESS.md`) : code 0 ; fins de
  ligne LF.

## Reste à faire

- Phase 0 : vérification visuelle de `/` et `/charte` à 360 px et 1280 px par le
  porteur.
- Phase 1 : une fois le projet Supabase créé, la liaison (« CLI Supabase et liaison au
  projet distant », étapes 1 à 7), puis les trois contrôles « sur le vrai projet » de
  « À valider par le porteur (phase 1) ».
- Phase 1 : trancher les choix restants de « À valider par le porteur (phase 1) ».
- Phase 2 : les « Points à vérifier sur données réelles » restants (JSON-LD en
  ligne, logos). Lighthouse (accessibilité ≥ 95) : fait, 100 sur les deux pages.
- Phase 2 : faire confirmer par le porteur « À valider par le porteur (phase 2) »
  (rien de bloquant).
- Phase 5 : **404 d'une fiche rendue côté serveur** (décision du coordinateur du
  14 octobre 2026, voir « Décisions »). Dans `proxy.ts`, créé en phase 5 pour
  `/espace` et `/admin` (spécifications, section 6) : vérifier le slug de
  `/societes/{slug}` et réécrire vers une page introuvable rendue côté serveur. Piste
  recommandée : une route statique réservée (`/societes/introuvable`, texte
  « Organisation introuvable » et bouton « Consulter l'annuaire », slug `introuvable`
  interdit aux organisations par contrainte ou validation des formulaires) plutôt
  que la 404 générale ; ne vérifier que les requêtes de document (sans en-tête
  `RSC` : une navigation dans le site rend déjà la page introuvable côté client), par
  une lecture d'une ligne sur l'index unique du slug (le proxy ne peut pas compter sur
  `unstable_cache`) ; vérifier qu'un module `server-only` de `src/lib/requetes/` peut
  être importé par le proxy. Puis revérifier sans JavaScript les cinq adresses de la
  vérification complète (point 1).
- Après la phase 5 : relancer Lighthouse ordinateur sur la fiche sans bloquer
  `*_rsc=*`, pour confirmer que les préchargements en 404 ont disparu.
- Phase 7 : `robots.ts` doit interdire `/go` (section 15) ; d'ici là, chaque réponse
  de la passerelle porte déjà `X-Robots-Tag: noindex`.
- Phases 3 à 7 et évolutions P1 (voir `docs/PROMPTS.md`).

## Décisions

- Projet déplacé dans `C:/Users/agbot/Desktop/cite-savante` : `pnpm install` échouait
  (EPERM) dans un chemin contenant un « é » (`Cité Savante`). Le 17/10/2026, le porteur
  l'a rangé dans `C:/Users/agbot/Desktop/PROJETS/cite-savante`, et PostgreSQL portable
  (binaires, grappe `data_citesavante`, PostgREST) dans `C:/Users/agbot/Desktop/PROJETS/pgsql` :
  les chemins par défaut des scripts suivent.
- Polices auto-hébergées via `@fontsource/fraunces` et `@fontsource/eb-garamond` plutôt
  que des fichiers de police déposés à la main : versions figées, sous-ensemble latin
  déjà séparé par fichier, et les `.woff` (non `.woff2`) des mêmes paquets serviront en
  phase 3 aux images Open Graph générées par `satori` (qui ne lit pas le `.woff2`).
- `@theme inline` (et non `@theme`) utilisé pour les jetons `--font-titre` /
  `--font-texte` : ces variables sont déjà déclarées par `next/font/local` sur `<html>`
  sous ce nom exact ; les redéclarer dans un `@theme` classique aurait produit une
  règle auto-référencée (valeur invalide au calcul). En mode `inline`, Tailwind
  réutilise directement la référence dans les classes utilitaires sans redéclarer la
  propriété. Vérifié sur le CSS compilé par `pnpm build` (pas seulement en dev) :
  `.font-titre` et `.font-texte` tombent dans `@layer utilities` et référencent bien
  `var(--font-titre)` / `var(--font-texte)`, qui reçoivent leur valeur réelle de la
  classe `variable` générée par next/font sur `<html>` — vérifié par un test temporaire
  (`className="font-titre"` sur le h1 de la page d'accueil, retiré ensuite) qui a
  confirmé un rendu avec la bonne police, avant de revenir à la page minimale demandée.
- Échelle `--text-*` de Tailwind entièrement remplacée (et non simplement complétée)
  par les 7 tailles de la charte, pour qu'aucune taille hors charte (ex. `text-9xl`) ne
  soit disponible par erreur.
- Les styles de base (`body`, `h1`–`h6`, `a`, `:focus-visible`, `::selection`, le
  `outline: none` global) sont placés dans `@layer base`, et non hors couche. Tailwind
  v4 émet `@layer theme, base, components, utilities` ; une règle écrite hors couche
  l'emporte toujours sur toute règle en couche, quelle que soit sa spécificité. Sans ce
  `@layer base`, un futur `class="text-creme"` dans un pied de page bordeaux-profond
  (charte, section 4.4) ne pourrait jamais l'emporter sur le `a { color: bordeaux }`
  global, et tout `outline-*` utilitaire serait mort site entier à cause du
  `* { outline: none }`. Vérifié sur le CSS compilé (`pnpm build`) : `body`, `a` et
  `:focus-visible` tombent bien dans `@layer base`, les classes utilitaires dans
  `@layer utilities` — les secondes reprennent donc la main comme attendu.
- `src/app/layout.tsx` : `RootLayout` typé `{ children: React.ReactNode }` plutôt que
  `LayoutProps<"/">` (pourtant généré par `create-next-app` pour Next 16). Ce type
  global n'existe qu'après génération dans `.next/types/` (par `next dev`, `next build`
  ou `next typegen`) ; sur un clone neuf, sans `.next/`, `pnpm typecheck` échouait avant
  même `pnpm build` (`Cannot find name 'LayoutProps'`), alors que CLAUDE.md exige
  `typecheck` avant `build`. Reproduit puis corrigé en supprimant `.next/` et en
  relançant les quatre vérifications, qui passent maintenant dans cet ordre sur un
  dépôt vierge.
- Clés Turnstile de test officielles Cloudflare utilisées dans `.env.example` pour le
  développement (`1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`),
  à remplacer en production.

- **Règle pour toutes les pages** : le layout racine rend le seul `<main id="contenu">` du
  site. Une page ne rend jamais son propre `<main>` ; elle commence directement par son
  contenu (en général un `<Conteneur>`).
- Échelle typographique : `--text-*: initial` a aussi supprimé les interlignes associés.
  Chaque titre précise donc son interligne (`leading-tight`, `leading-snug`…) et sa
  graisse (`font-medium` ou `font-bold` : Fraunces n'est chargée qu'en 500 et 700, sans
  italique ; ne jamais combiner `font-titre` et `italic`).
- Les liens posés sur un fond sombre portent leur couleur eux-mêmes (`text-creme`…) : la
  règle de base `a { color: bordeaux }` ne se transmet pas par héritage.
- Bordure des champs en `encre/60` (4,25:1 sur crème, seuil 3:1) et texte indicatif en
  `encre/70` (5,82:1, seuil 4,5:1) : des opacités plus faibles échouent.
- Deux `<nav aria-label="Navigation principale">` (bandeau et menu mobile), jamais
  affichées en même temps (l'autre est en `display: none`, donc hors de l'arbre
  d'accessibilité).
- Menu mobile en `<details>` non contrôlé : l'état React reflète le DOM (événement
  `toggle`), ce qui évite tout décalage si le menu est ouvert avant l'hydratation.
- Pas de `clsx` : une fonction `cx` de trois lignes suffit.
- Champs préremplis : l'aplat crème passe par `box-shadow: inset`, seul moyen de couvrir
  le fond imposé par Chrome ; ce n'est pas une ombre portée. Le contour de focus restant
  un `outline`, les deux ne se gênent pas.
- Icône `src/app/icon.svg` : couleurs écrites en hexadécimal (une icône ne lit pas les
  variables CSS), limitées à `bordeaux` et `creme`. Provisoire jusqu'au logo.
- La page 404 ne déclare pas de `robots` : Next.js ajoute déjà `noindex` aux réponses 404.

## Dépendances ajoutées

- `date-fns@4.4.0` — formatage et calculs de dates en français (phases 2 à 4).
- `zod@4.6.5` — validation systématique côté serveur des formulaires et server actions
  (phase 5 et suivantes).
- `prettier@3.9.9` (dev) — formatage de code homogène (`pnpm format`).
- `vitest@5.0.2` (dev) — tests unitaires (`pnpm test`).
- `@playwright/test@1.63.0` (dev) — tests de bout en bout (`pnpm test:e2e`).
- `@fontsource/fraunces@5.3.0` — police des titres, auto-hébergée (voir « Décisions »).
- `@fontsource/eb-garamond@5.3.0` — police du texte courant, auto-hébergée (idem).
- `@supabase/supabase-js@2.117.2` — client Supabase (Postgres via PostgREST, Auth,
  Storage) ; base de `src/lib/supabase/public.ts` et `service.ts` (phase 1 et
  suivantes).
- `@supabase/ssr@0.12.7` — clients Supabase liés aux cookies de la requête
  (`serveur.ts`, `navigateur.ts`), nécessaires dès l'authentification (phase 5).
- `server-only@0.0.1` — fait échouer le build si un module réservé au serveur est
  importé depuis du code client (CLAUDE.md, section 6 : « jamais dans un composant
  client ») : `supabase/service.ts` (clé de service), `supabase/public.ts`,
  `supabase/serveur.ts` et `requetes/*.ts`. `env.ts` ne l'importe PAS, et c'est
  voulu : `navigateur.ts` (code client) en importe `envPublic()`. La clé de service
  n'y est pas exposée pour autant : Next.js n'intègre au bundle navigateur que les
  valeurs des `NEXT_PUBLIC_*` ; seul le NOM de la variable y figure. Son usage reste
  confiné à `service.ts` (garde-fou : `src/lib/securite.test.ts`).
- `supabase@2.118.0` (dev) — CLI Supabase : liaison au projet distant, `db push` des
  migrations, types du projet lié (`pnpm db:types:distant`).

## À valider par le porteur

Points de la phase 0 ; ceux de la phase 1 sont dans « Phase 1 — base de données », « À
valider par le porteur (phase 1) ».

- **Contour de focus et contraste** : le contour or de 2 px imposé par la charte n'a qu'un
  rapport de 2,61:1 sur `creme` et de 2,30:1 sur `creme-soutenu`, sous le seuil de 3:1
  attendu d'un indicateur de focus (WCAG 2.1, critère 1.4.11). Il est conforme dans le
  pied de page (5,06:1 sur `bordeaux-profond`). Rien n'a été changé sans votre accord.
  Pistes : ajouter au contour or un liseré intérieur encre ou bordeaux de 2 px, ou passer
  le focus en bordeaux sur les fonds clairs. Détail calculé sur `/charte`, section
  « Contrastes ».
- **Texte or de grande taille sur crème** : la section 4.1 des spécifications l'autorise,
  mais le rapport (2,61:1) reste sous le seuil AA du grand texte (3:1). Aucun composant ne
  l'utilise ; à réserver aux éléments décoratifs.
- **Erreurs 404 dans la console** : les liens de l'en-tête et du pied de page mènent à des
  pages qui n'existent pas encore (`/societes`, `/a-propos`…) ; le préchargement de Next
  en production produit donc des 404 jusqu'aux phases qui les créent. Attendu. Un clic
  sur ces liens affiche la page « Page introuvable » du site, en français.
- **Petites capitales** : `font-variant-caps: all-small-caps`. Si le fichier EB Garamond
  auto-hébergé ne contient pas les vraies petites capitales, le navigateur les simule
  (capitales réduites) ; rendu correct à l'écran, à confirmer à l'œil.

- **Navigateur Playwright** : `@playwright/test@1.63.0` attend Chromium révision
  `1243`. Seules les révisions `1228` et `1234` sont déjà en cache local
  (`C:/Users/agbot/AppData/Local/ms-playwright`). Aucun téléchargement n'a été lancé
  et `pnpm test:e2e` n'a pas été exécuté. Pour l'utiliser, lancer manuellement :
  `pnpm exec playwright install chromium`.
- **Liste déroulante native** : la ligne survolée dans la liste ouverte d'un `<select>`
  est dessinée par le système d'exploitation (bleue sous Windows) et ne peut pas être
  stylée en CSS standard. Le champ fermé, lui, est aux couleurs de la charte. Si ce bleu
  gêne, il faudra une liste personnalisée (en phase 3, pour les filtres de l'agenda).
- **Icône d'onglet provisoire** (`src/app/icon.svg`) : bâtiment à colonnes crème sur
  bordeaux. Les anciennes versions de Safari n'affichent pas les icônes SVG ; le logo
  définitif et ses déclinaisons PNG sont à prévoir avant la mise en ligne.
- Convention Prettier choisie par défaut (guillemets doubles, points-virgules,
  largeur 100) : à ajuster si une autre convention est préférée.
