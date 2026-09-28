# Cité Savante — Prompts pour Claude Code

Ce fichier contient le mode d'emploi et un prompt par phase. Copiez-collez chaque prompt dans Claude Code, une phase à la fois.

---

## Mode d'emploi

### Avant de commencer (une seule fois)

1. Créez un dossier vide `cite-savante` et placez-y :
   - `CLAUDE.md` à la racine ;
   - `docs/SPECIFICATIONS.md` ;
   - `docs/PROMPTS.md` (ce fichier).
2. Créez un projet Supabase « cite-savante » (région Europe, la plus proche du Bénin) et notez l'URL, la clé publique et la clé de service.
3. Créez un compte Resend et un site Cloudflare Turnstile (vous pourrez le faire plus tard : la phase 5 en a besoin, pas avant).
4. Ouvrez un terminal dans le dossier et lancez `claude`.

### Pour chaque phase

1. Collez le prompt de la phase.
2. Claude Code présente un plan : lisez-le, corrigez-le si besoin, puis répondez « OK, vas-y ».
3. À la fin, vérifiez vous-même les points listés dans son résumé (ouvrez le site avec `pnpm dev`).
4. Si tout est bon, passez à la phase suivante dans une **nouvelle conversation** (commande `/clear`) : `CLAUDE.md` et `PROGRESS.md` suffisent pour reprendre le contexte.
5. Si quelque chose ne va pas, utilisez le prompt de correction (en bas de ce fichier).

---

## Phase 0 — Fondations

```
Nous démarrons le projet Cité Savante. Lis entièrement CLAUDE.md, puis les sections 1 à 4 et 18 de docs/SPECIFICATIONS.md.

Objectif de la phase 0 : un projet Next.js propre, configuré, avec la charte graphique et la mise en page générale, sans aucune donnée.

À faire :
1. Initialiser le projet Next.js (App Router, TypeScript strict, ESLint, Tailwind CSS, pnpm) dans le dossier courant, sans écraser CLAUDE.md ni docs/.
2. Configurer Prettier, Vitest et Playwright, avec les scripts de CLAUDE.md section 3 (db:types peut rester un script préparé, la base viendra en phase 1).
3. Déclarer les jetons de couleur de la charte dans Tailwind et supprimer toute couleur par défaut susceptible de produire du bleu (liens, focus, anneaux).
4. Charger Fraunces et EB Garamond avec next/font (sous-ensemble latin), définir l'échelle typographique.
5. Créer src/config/site.ts et src/lib/textes.ts (section 3 des spécifications).
6. Dessiner à la main, en SVG, les pictogrammes listés en 4.3 dans src/components/pictos/ (un composant par picto, currentColor, trait 1,5 px). Aucune bibliothèque d'icônes.
7. Créer la mise en page : en-tête (logotype texte, navigation, champ de recherche, menu mobile), pied de page (liens institutionnels, slogan, signature), lien d'évitement.
8. Créer les composants de base : Bouton (principal, secondaire), Carte, Badge, ChampTexte, Select, Case à cocher, Titre de section.
9. Créer une page /charte (non indexée, à supprimer en phase 7) qui montre couleurs, typographie, pictogrammes et composants.
10. Créer une page d'accueil provisoire avec seulement le h1 prévu et la mention « Site en construction ».
11. Créer .env.example (section 18), .gitignore, PROGRESS.md (structure : Fait / Reste à faire / Décisions / À valider par le porteur), initialiser git.

Critères d'acceptation :
- pnpm lint, typecheck, test (au moins un test d'exemple) et build passent.
- La page /charte est fidèle à la charte à 360 px et 1280 px ; aucun bleu nulle part, focus visible en or.
- Aucune dépendance d'icônes dans package.json.

Avant d'écrire du code, présente-moi ton plan en quelques points et attends mon accord. À la fin : vérifications, mise à jour de PROGRESS.md, commit « feat(phase-0): fondations et charte », puis un résumé avec ce que je dois vérifier moi-même.
```

---

## Phase 1 — Base de données

```
Phase 1 de Cité Savante. Lis CLAUDE.md, PROGRESS.md, puis les sections 5, 6 et 7 de docs/SPECIFICATIONS.md.

Voici mes informations Supabase (à mettre dans .env.local, jamais dans le code ni dans git) :
- URL : [À COLLER]
- Clé publique (anon) : [À COLLER]
- Clé de service : [À COLLER]

Objectif : le schéma complet du MVP, sécurisé, avec les données initiales et les données de démonstration.

À faire :
1. Installer et configurer la CLI Supabase dans le projet, relier le projet distant.
2. Écrire les migrations numérotées : extensions et configuration fr_unaccent, types énumérés, les 14 tables du MVP, index, déclencheurs (updated_at, création de profil, protections), fonctions de rôles, fonction rechercher, politiques RLS de la section 6, buckets de stockage et leurs règles. Ne pas créer les tables P1.
3. Écrire supabase/seed.sql exactement selon la section 5.6 (aucune donnée inventée).
4. Écrire supabase/seed_demo.sql : une dizaine d'organisations et une vingtaine d'événements fictifs préfixés [DÉMO], toutes disciplines, sur les six prochains mois, avec échéances et organisateurs.
5. Créer les clients Supabase : serveur (cookies), navigateur, service (serveur uniquement), et générer les types TypeScript (pnpm db:types).
6. Créer src/lib/requetes/ avec les premières fonctions de lecture typées (disciplines, organisations publiées, événements à venir) et leurs étiquettes de cache.
7. Écrire des tests qui prouvent la RLS : un visiteur anonyme ne voit ni brouillon ni événement en attente, ne peut rien écrire ; un gestionnaire ne peut pas changer un statut.
8. Documenter dans PROGRESS.md la requête SQL qui désigne le premier administrateur.

Critères d'acceptation :
- Les migrations s'appliquent sur une base vide sans erreur, puis seed.sql et seed_demo.sql.
- La fonction rechercher trouve « pédiatrie » avec la saisie « pediatrie » et la SBC avec « sbc ».
- Les tests RLS passent.
- Toute adaptation du SQL des spécifications est signalée dans PROGRESS.md avec sa raison.

Avant d'écrire du code, présente-moi ton plan et attends mon accord. À la fin : vérifications, PROGRESS.md, commit « feat(phase-1): base de données et sécurité », résumé.
```

---

## Phase 2 — Annuaire des organisations

```
Phase 2 de Cité Savante. Lis CLAUDE.md, PROGRESS.md, puis les sections 7, 8.1, 8.2 et 10.1 de docs/SPECIFICATIONS.md.

Objectif : l'annuaire et les fiches des organisations, avec la passerelle tracée.

À faire :
1. Page /societes : en-tête avec compteur, filtres dans l'URL (formulaire GET fonctionnel sans JavaScript, enrichi côté client), cartes, tri (mises en avant puis sigle), pagination par 24, état vide.
2. Monogramme SVG généré à partir du sigle quand il n'y a pas de logo (style de la charte, pas un cercle coloré générique).
3. Page /societes/[slug] : tout le contenu de la section 8.2, événements à venir et passés, JSON-LD Organization, métadonnées et canonique ; 404 propre si non publiée.
4. Route /go/[type]/[id] complète (section 10.1) avec ses tests unitaires (UTM, cible non publiée, paramètre vers invalide).
5. Utilitaires testés : formatage des dates en français (tous les cas de CLAUDE.md), slugs.
6. Composant CarteEvenement minimal, réutilisé en phase 3.

Critères d'acceptation :
- Avec seed_demo.sql, l'annuaire filtre correctement par discipline, ville, catégorie et texte.
- Un clic sur « Site officiel » crée une ligne dans clics_sortants puis redirige avec les UTM.
- Pages vérifiées à 360 px et 1280 px ; Lighthouse accessibilité d'au moins 95 sur les deux pages.

Présente d'abord ton plan et attends mon accord. À la fin : vérifications, PROGRESS.md, commit « feat(phase-2): annuaire et passerelle », résumé.
```

---

## Phase 3 — Agenda et échéances

```
Phase 3 de Cité Savante. Lis CLAUDE.md, PROGRESS.md, puis les sections 7, 8.3, 8.4, 8.5 et 10 de docs/SPECIFICATIONS.md.

Objectif : l'agenda complet, les fiches événements, les échéances, l'ajout à l'agenda et le partage.

À faire :
1. Page /agenda : vue liste groupée par mois, vue calendrier mensuelle en HTML/CSS (liste des jours sur mobile), filtres dans l'URL, mise en avant via emplacements evenement_en_avant, archives (?periode=passes), bannière banniere_agenda signalée « Publicité ».
2. Page /agenda/[slug] : tout le contenu de la section 8.4, JSON-LD Event, bandeau pour un événement passé et suggestions.
3. Route /agenda/[slug]/ics : générateur RFC 5545 maison, avec tests unitaires (journée entière, plusieurs jours, heure et fuseau, échappements, pliage des lignes).
4. Liens Google Agenda et WhatsApp (fonctions testées) ; menu « Ajouter à mon agenda ».
5. Images Open Graph (next/og) pour la fiche événement et la fiche organisation, polices locales.
6. Page /echeances : groupement par semaine puis par mois, badge « urgente » à 7 jours ou moins, filtres.
7. Afficher la prochaine échéance sur les cartes d'événements.

Critères d'acceptation :
- Le fichier .ics s'importe correctement dans Google Agenda et dans l'agenda d'un téléphone (je le testerai ; donne-moi la marche à suivre).
- Partager une fiche sur WhatsApp affiche l'image d'aperçu (à tester après déploiement : note-le dans PROGRESS.md).
- Un événement de plusieurs jours sur deux mois s'affiche correctement dans les deux vues.

Présente d'abord ton plan et attends mon accord. À la fin : vérifications, PROGRESS.md, commit « feat(phase-3): agenda, échéances et partage », résumé.
```

---

## Phase 4 — Accueil « Plan de la Cité » et recherche

```
Phase 4 de Cité Savante. Lis CLAUDE.md, PROGRESS.md, puis les sections 8.6, 8.7, 9 et 11 de docs/SPECIFICATIONS.md.

Objectif : la page d'accueil définitive, avec le Plan de la Cité, les pages disciplines et la recherche globale.

À faire :
1. Écrire d'abord la fonction de disposition du plan (quartiers, lots, bâtiments, fanions) comme une fonction pure, testée : positions déterministes, aucun chevauchement, îlot vide, 1 à 100 organisations, version mobile en une colonne.
2. Dessiner à la main les trois silhouettes de bâtiments, le fanion et la plaque de quartier en SVG (dans <defs>, réutilisés avec <use>), style plan d'architecte de la section 9.2. Montre-moi un rendu du plan avec seed_demo.sql avant de finir le reste de la page.
3. Composant serveur PlanDeLaCite, liens focalisables avec aria-label complet, infobulle en amélioration progressive, liste alternative dans <details>.
4. Page d'accueil complète selon la section 9.1 (dans cet ordre), compte à rebours léger côté client, chiffres calculés en direct. Pas de héros classique.
5. Page /disciplines/[slug].
6. Page /recherche et branchement du champ de recherche de l'en-tête ; états « trop court » et « aucun résultat ».
7. Image Open Graph de l'accueil et de l'agenda ; JSON-LD WebSite avec SearchAction.

Critères d'acceptation :
- Le plan s'affiche sans JavaScript, pèse moins de 60 Ko pour 100 organisations, et reste lisible à 360 px.
- Navigation au clavier possible sur tous les bâtiments ; la liste alternative contient les mêmes informations.
- Lighthouse mobile de l'accueil : performance d'au moins 90, accessibilité d'au moins 95.

Présente d'abord ton plan et attends mon accord. À la fin : vérifications, PROGRESS.md, commit « feat(phase-4): accueil plan de la cité et recherche », résumé.
```

---

## Phase 5 — Contributions, comptes et espace gestionnaire

```
Phase 5 de Cité Savante. Lis CLAUDE.md, PROGRESS.md, puis les sections 8.8, 8.9, 8.10 (contact seulement), 12 et 14 de docs/SPECIFICATIONS.md.

Voici mes clés (à mettre dans .env.local) :
- Resend : [À COLLER] · adresse de notification de l'équipe : [À COLLER]
- Turnstile : clé de site [À COLLER] · clé secrète [À COLLER]

Objectif : permettre à tous de proposer une organisation ou un événement, et aux bureaux de gérer leur fiche.

À faire :
1. Protections communes des formulaires (section 12.1) : Turnstile côté serveur, champ piège, limitation par empreinte, purge, consentement.
2. /referencer, /referencer/societe (avec contrôle de doublon), /referencer/evenement (recherche des organisateurs, échéances dynamiques, envoi d'affiche redimensionnée en WebP).
3. /visibilite (offres, chiffres réels, formulaire de devis) et /contact.
4. Envoi des e-mails de la section 14 (modèles HTML aux couleurs de la charte + version texte), y compris le modèle de lien de connexion en français.
5. Authentification par lien magique, pages /espace/connexion et callback, middleware de protection.
6. Espace gestionnaire complet (section 12.5) : tableau de bord, réclamation d'une fiche, modification de fiche et logo, création et modification d'événements avec échéances.
7. Tests Playwright des parcours 2 et 3 de la section 16 (la partie modérateur du parcours 2 peut passer par une action SQL de test en attendant la phase 6).

Critères d'acceptation :
- Un formulaire envoyé sans Turnstile valide ou au-delà de 5 envois par heure est refusé avec un message clair.
- Un gestionnaire ne peut modifier que les organisations qui lui ont été accordées (tester une tentative sur une autre).
- Tous les e-mails s'affichent correctement dans Gmail sur téléphone (donne-moi la liste des cas à tester).

Présente d'abord ton plan et attends mon accord. À la fin : vérifications, PROGRESS.md, commit « feat(phase-5): contributions et espace gestionnaire », résumé.
```

---

## Phase 6 — Back-office

```
Phase 6 de Cité Savante. Lis CLAUDE.md, PROGRESS.md, puis les sections 7 et 13 de docs/SPECIFICATIONS.md.

Objectif : le back-office de modération et d'administration.

À faire :
1. Garde d'accès /admin côté serveur (modérateur ou administrateur), navigation du back-office.
2. Tous les écrans du tableau de la section 13, dans cet ordre de priorité : Tableau de bord, Modération, Organisations, Événements, Demandes de gestion, Emplacements publicitaires, Statistiques (avec export CSV), Demandes de contact, Disciplines, Utilisateurs, Prospection, Journal.
3. Chaque décision : écriture dans journal_moderation, e-mail correspondant, invalidation des étiquettes de cache concernées.
4. Proposition « de confiance » après trois événements validés sans modification (décision manuelle).
5. Flux « Modifications récentes » des gestionnaires non « de confiance ».
6. Compléter le test Playwright du parcours 2 avec la vraie publication par un modérateur.

Critères d'acceptation :
- Un modérateur ne voit pas les écrans réservés aux administrateurs (Disciplines, Emplacements, Utilisateurs) et ne peut pas y accéder par l'URL.
- Une publication apparaît immédiatement sur le site public.
- L'export CSV des clics s'ouvre correctement dans Excel (UTF-8 avec BOM, séparateur point-virgule).

Présente d'abord ton plan et attends mon accord. À la fin : vérifications, PROGRESS.md, commit « feat(phase-6): back-office », résumé.
```

---

## Phase 7 — Mise en ligne

```
Phase 7 de Cité Savante. Lis CLAUDE.md, PROGRESS.md, puis les sections 8.10, 15, 16 et 19 de docs/SPECIFICATIONS.md.

Objectif : un site prêt pour le lancement public sur citesavante.com.

À faire :
1. Pages /a-propos, /mentions-legales et /confidentialite, avec les champs à compléter entre crochets (liste-les dans ton résumé).
2. sitemap.ts, robots.ts, canoniques, JSON-LD BreadcrumbList ; vérifier les métadonnées de chaque page.
3. En-têtes de sécurité et CSP (section 6).
4. Audit de performance et d'accessibilité : Lighthouse mobile sur l'accueil, l'agenda, une fiche événement, une fiche organisation, un formulaire ; corriger jusqu'aux seuils de la section 15.
5. Passer tout le site en revue selon la définition de « terminé » (section 19) : couleurs, pictogrammes, textes en anglais résiduels, pages à 360 px.
6. Supprimer la page /charte.
7. Faire passer le parcours 1 de la section 16 et toute la suite de tests.
8. Préparer le déploiement Vercel : liste des variables d'environnement à saisir, configuration du domaine citesavante.com, vérification du domaine d'envoi dans Resend, URL de redirection Supabase Auth en production. Donne-moi une liste de vérification pas à pas.
9. Vérifier que seed_demo.sql ne peut pas être exécuté en production (documenter la procédure de mise en production de la base).

Critères d'acceptation :
- Tous les seuils Lighthouse de la section 15 atteints, rapport résumé dans PROGRESS.md.
- La suite complète de tests passe.
- La liste de vérification de déploiement est claire pour quelqu'un qui n'a pas suivi le développement.

Présente d'abord ton plan et attends mon accord. À la fin : vérifications, PROGRESS.md, commit « feat(phase-7): prêt pour la mise en ligne », résumé.
```

---

## P1 — Évolutions après le lancement

Lancez ces prompts séparément, après quelques semaines d'usage réel.

### P1-a — Lettre hebdomadaire

```
Évolution P1-a de Cité Savante. Lis CLAUDE.md, PROGRESS.md, puis les sections 5.5 (table abonnes) et 17.1 de docs/SPECIFICATIONS.md.
Crée la migration de la table abonnes avec sa RLS, le formulaire d'inscription (pied de page et agenda) avec double confirmation, la désinscription par jeton, le modèle d'e-mail « L'agenda de la semaine » et la route planifiée du lundi matin protégée par CRON_SECRET (vercel.json). Ajoute un bouton « Envoyer un test à moi-même » dans le back-office.
Présente d'abord ton plan et attends mon accord. À la fin : vérifications, PROGRESS.md, commit « feat(p1-a): lettre hebdomadaire », résumé.
```

### P1-b — Synchronisation des sites partenaires

```
Évolution P1-b de Cité Savante. Lis CLAUDE.md, PROGRESS.md, puis les sections 5.5 (table sources_synchro) et 17.2 de docs/SPECIFICATIONS.md.
Avant tout code, pose-moi les questions nécessaires sur le format exposé par mes plateformes de congrès WordPress (MedCongress) : je te fournirai un exemple de flux ou d'API.
Ensuite : migration, écran de gestion des sources dans le back-office, importeurs ICS, RSS et WordPress REST testés sur des exemples, tâche planifiée toutes les 6 heures, mise à jour idempotente, journal des résultats.
À la fin : vérifications, PROGRESS.md, commit « feat(p1-b): synchronisation des sources », résumé.
```

### P1-c — Actualités, flux et archives

```
Évolution P1-c de Cité Savante. Lis CLAUDE.md, PROGRESS.md, puis les sections 5.5 (table actualites) et 17.3 de docs/SPECIFICATIONS.md.
Crée la migration actualites avec sa RLS, les pages /actualites et /actualites/[slug], la soumission par les gestionnaires et la modération, les flux /flux/agenda.xml, /flux/agenda.ics et /flux/[discipline].ics, et les archives /agenda/archives/[annee].
Présente d'abord ton plan et attends mon accord. À la fin : vérifications, PROGRESS.md, commit « feat(p1-c): actualités, flux et archives », résumé.
```

---

## Prompt de correction (à tout moment)

```
Problème constaté sur Cité Savante : [décrivez ce que vous voyez, sur quelle page, à quelle largeur d'écran, et ce que vous attendiez].
Lis CLAUDE.md et PROGRESS.md. Trouve la cause avant de corriger, explique-la-moi en deux phrases, corrige sans toucher au reste, ajoute un test qui aurait détecté le problème, puis relance les vérifications et fais un commit « fix: ... ».
```

## Prompt de revue générale (avant le lancement)

```
Fais une revue complète de Cité Savante sans rien modifier. Lis CLAUDE.md, PROGRESS.md et docs/SPECIFICATIONS.md.
Compare le site aux spécifications et donne-moi un tableau : section, ce qui est conforme, ce qui manque ou s'écarte, gravité (bloquant, important, mineur). Vérifie en particulier la RLS, la charte (aucun bleu, aucune bibliothèque d'icônes), les textes en anglais résiduels et l'affichage à 360 px.
```
