# CLAUDE.md — Cité Savante

Ce fichier est lu au début de chaque session. Il fixe le contexte, les règles et les conventions du projet.
Le détail fonctionnel et technique est dans `docs/SPECIFICATIONS.md`. Les prompts de chaque phase sont dans `docs/PROMPTS.md`.
L'état d'avancement est dans `PROGRESS.md` (à tenir à jour à la fin de chaque phase).

## 1. Le projet en bref

**Cité Savante** (citesavante.com) réunit sur un seul site toutes les sociétés savantes et tous les congrès et événements scientifiques du Bénin.
Slogan : « Sociétés, congrès et événements scientifiques du Bénin ».

Quatre rôles :
- **Annuaire** : une fiche officielle par société savante ou institution organisatrice.
- **Agenda** : congrès, journées, colloques, séminaires, ateliers, webinaires, formations, avec leurs échéances.
- **Passerelle** : liens tracés vers les sites officiels et les plateformes de congrès des sociétés.
- **Vitrine** : mises en avant et emplacements publicitaires.

Public : médecins, chercheurs, enseignants, étudiants, bureaux des sociétés, sponsors. Beaucoup consultent sur téléphone, parfois en 3G.

## 2. Stack (ne pas en changer sans accord écrit)

- Next.js (dernière version stable), App Router, TypeScript en mode `strict`.
- Supabase : Postgres, Auth, Storage, RLS. Migrations SQL versionnées dans `supabase/migrations/`.
- Tailwind CSS, configuré avec les jetons de la charte (section 5).
- Validation : Zod, côté serveur systématiquement.
- Dates : `date-fns` avec la locale `fr`, fuseau `Africa/Porto-Novo`.
- E-mails : Resend. Anti-spam : Cloudflare Turnstile.
- Tests : Vitest (unitaires), Playwright (parcours de bout en bout).
- Hébergement : Vercel. Gestionnaire de paquets : pnpm.

Toute nouvelle dépendance doit être justifiée en une ligne dans `PROGRESS.md`. Préférer quelques lignes de code maison à une dépendance lourde (exemple : le fichier .ics est généré sans bibliothèque).

## 3. Commandes

```bash
pnpm dev            # serveur de développement
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest
pnpm test:e2e       # Playwright
pnpm build          # build de production
pnpm db:types       # régénère src/lib/supabase/types.ts depuis Supabase
```

## 4. Structure du projet

```
src/
  app/
    page.tsx                    # accueil (Plan de la Cité)
    societes/                   # annuaire + [slug]
    agenda/                     # agenda + [slug] (+ [slug]/ics/route.ts)
    echeances/
    disciplines/[slug]/
    recherche/
    referencer/                 # formulaires publics
    visibilite/
    a-propos/  contact/  mentions-legales/  confidentialite/
    espace/                     # espace gestionnaire (authentifié)
    admin/                      # back-office (modérateurs, administrateurs)
    go/[type]/[id]/route.ts     # passerelle : log du clic puis redirection
    sitemap.ts  robots.ts
  components/
    pictos/                     # pictogrammes SVG dessinés à la main, un fichier par picto
    cite/                       # Plan de la Cité
    societes/  evenements/  formulaires/  admin/  mise-en-page/
  lib/
    supabase/                   # clients serveur, navigateur, service ; types générés
    requetes/                   # toutes les lectures de données, typées
    actions/                    # server actions (écritures)
    validation/                 # schémas Zod
    utils/                      # dates, slugs, ics, urls
  config/site.ts                # nom, slogan, URL, signature, réseaux
supabase/
  migrations/  seed.sql  seed_demo.sql
docs/
  SPECIFICATIONS.md  PROMPTS.md
PROGRESS.md
```

## 5. Charte graphique — règles strictes

- **Palette** (jetons Tailwind, jamais de couleur en dur dans les composants) :
  - `bordeaux` #6B1E2E · `bordeaux-profond` #4A1420
  - `creme` #F7F1E3 (fond) · `creme-soutenu` #EDE3CC
  - `or` #B8913A · `or-clair` #D9BD72
  - `encre` #2A1A1C (texte)
- **Aucun bleu**, nulle part : ni lien, ni focus, ni graphique. Les liens sont bordeaux, le focus est un contour or de 2 px.
- **Typographie** : Fraunces pour les titres, EB Garamond pour les textes. Auto-hébergées avec `next/font`, sous-ensemble latin uniquement.
- **Pictogrammes** : dessinés à la main en SVG dans `src/components/pictos/`, trait fin façon gravure ou plan d'architecte. **Interdit** : lucide, heroicons, font-awesome, material icons ou toute autre bibliothèque d'icônes.
- **Pas de héros classique** (grand titre + paragraphe + deux boutons). L'accueil repose sur le Plan de la Cité (spécifications, section 9).
- **Pas d'esthétique « générée par IA »** : pas de dégradés violets, pas de cartes flottantes génériques, pas d'emoji dans l'interface, pas d'illustrations 3D.
- **Ton des textes** : français, clair, direct, sérieux ; vouvoiement du visiteur. Aucune formule abstraite ou poétique. On dit ce que fait la page.
- **Signature** : dans le pied de page, crédit de conception avec lien vers https://frejusteagboton.info (texte et lien définis dans `src/config/site.ts`).

## 6. Règles de code

- Server Components par défaut ; `"use client"` uniquement pour l'interactivité réelle (filtres dynamiques, compte à rebours, infobulles, formulaires).
- Toutes les lectures passent par `src/lib/requetes/`, toutes les écritures par des server actions dans `src/lib/actions/`, chacune validée par un schéma Zod.
- La clé `service_role` n'est utilisée que côté serveur, dans `src/lib/supabase/service.ts`, et seulement pour les cas listés dans les spécifications (formulaires publics, passerelle, e-mails). Jamais dans un composant client.
- RLS activée sur **toutes** les tables, sans exception.
- Seul le statut `publie` est visible du public. Toute requête publique filtre explicitement sur ce statut, même si la RLS le fait déjà.
- Dates : stockées en `date` ou `timestamptz`, affichées dans le fuseau `Africa/Porto-Novo`. Format : « 12 mars 2027 », « du 12 au 14 mars 2027 », « du 30 avril au 2 mai 2027 ».
- URLs en français, en minuscules, sans accents (`/societes/sobeped`, `/agenda/congres-sobeped-2027`).
- Mobile d'abord : chaque page est vérifiée à 360 px de large avant d'être considérée comme finie.
- Accessibilité : HTML sémantique, un seul `h1` par page, libellés sur tous les champs, contraste AA, navigation au clavier.
- Images : `next/image`, formats AVIF ou WebP, dimensions explicites. Aucun upload SVG accepté (risque XSS).
- Pas de données inventées dans `seed.sql`. Les données fictives vont uniquement dans `seed_demo.sql`, avec le préfixe `[DÉMO]`, et ne sont jamais chargées en production.
- Commentaires et noms métier en français (`societes`, `evenements`, `echeances`) ; mots-clés techniques en anglais.

## 7. Méthode de travail

1. Travailler **une phase à la fois**, uniquement sur le périmètre du prompt reçu.
2. Avant d'écrire du code : lire `PROGRESS.md` et les sections des spécifications citées par le prompt, puis présenter un plan court et attendre l'accord.
3. En cas d'ambiguïté ou de contradiction dans les spécifications : poser la question plutôt que deviner.
4. À la fin de chaque phase :
   - `pnpm lint`, `pnpm typecheck`, `pnpm test` et `pnpm build` passent sans erreur ;
   - `PROGRESS.md` est mis à jour (fait, reste à faire, décisions prises, points à valider) ;
   - un commit est créé : `feat(phase-N): résumé court` ;
   - un résumé est donné, avec la liste de ce que le porteur du projet doit vérifier lui-même.
5. Ne jamais supprimer ni réécrire une migration déjà appliquée : créer une nouvelle migration.
