# Cité Savante

Annuaire des sociétés savantes et agenda des congrès et événements scientifiques du Bénin.

Construit avec Next.js (App Router, TypeScript strict), Tailwind CSS et Supabase.

## Démarrer

```bash
pnpm install
pnpm dev
```

Le site est alors disponible sur [http://localhost:3000](http://localhost:3000).

## Commandes

```bash
pnpm dev            # serveur de développement
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest (tests unitaires)
pnpm test:e2e       # Playwright (parcours de bout en bout)
pnpm format         # Prettier
pnpm build          # build de production
pnpm db:types       # régénère src/lib/supabase/types.ts depuis Supabase (phase 1)
```

## Documentation du projet

- [`CLAUDE.md`](./CLAUDE.md) — contexte, stack, charte graphique, règles de code et méthode de travail.
- [`docs/SPECIFICATIONS.md`](./docs/SPECIFICATIONS.md) — spécifications techniques complètes.
- [`docs/PROMPTS.md`](./docs/PROMPTS.md) — découpage du développement en phases.
- [`PROGRESS.md`](./PROGRESS.md) — avancement du projet, phase par phase.

Ces fichiers font autorité ; les lire avant toute modification importante.
