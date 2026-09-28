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

## Reste à faire

- Vérification visuelle de `/` et `/charte` à 360 px et 1280 px par le porteur.
- Premier commit `feat(phase-0): fondations et charte`.
- Phases 1 à 7 et évolutions P1 (voir `docs/PROMPTS.md`).

## Décisions

- Projet déplacé dans `C:/Users/agbot/Desktop/cite-savante` : `pnpm install` échouait
  (EPERM) dans un chemin contenant un « é » (`Cité Savante`).
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

## À valider par le porteur

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
- Le script `db:types` échoue tant que la CLI `supabase` n'est pas installée et que le
  projet n'est pas lié (`supabase link --project-ref …`) : normal avant la phase 1.
- **Liste déroulante native** : la ligne survolée dans la liste ouverte d'un `<select>`
  est dessinée par le système d'exploitation (bleue sous Windows) et ne peut pas être
  stylée en CSS standard. Le champ fermé, lui, est aux couleurs de la charte. Si ce bleu
  gêne, il faudra une liste personnalisée (en phase 3, pour les filtres de l'agenda).
- **Icône d'onglet provisoire** (`src/app/icon.svg`) : bâtiment à colonnes crème sur
  bordeaux. Les anciennes versions de Safari n'affichent pas les icônes SVG ; le logo
  définitif et ses déclinaisons PNG sont à prévoir avant la mise en ligne.
- Convention Prettier choisie par défaut (guillemets doubles, points-virgules,
  largeur 100) : à ajuster si une autre convention est préférée.
