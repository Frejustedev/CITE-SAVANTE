import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Garde-fous statiques de la relecture de sécurité (phase 1) sur le code de
// `src/` : ils échouent dès qu'une règle de CLAUDE.md, section 6, est enfreinte
// par un fichier, avant même un build.
//   - la clé `service_role` n'est lue que par `src/lib/env.ts` et utilisée que
//     par `src/lib/supabase/service.ts` ;
//   - les modules qui touchent aux clients serveur commencent par
//     `import "server-only"` ;
//   - aucun composant client (`"use client"`) n'importe un client serveur ni
//     une lecture de `src/lib/requetes/`.

const SRC = fileURLToPath(new URL("..", import.meta.url));
const CE_FICHIER = fileURLToPath(import.meta.url);

/** Chemin relatif à `src/`, séparateurs « / » quel que soit le système. */
function cheminRelatif(chemin: string): string {
  return relative(SRC, chemin).split(sep).join("/");
}

const FICHIERS = readdirSync(SRC, { recursive: true, encoding: "utf8" })
  .filter((nom) => /\.(ts|tsx|js|jsx|mjs)$/.test(nom))
  .map((nom) => join(SRC, nom))
  .filter((chemin) => chemin !== CE_FICHIER)
  .map((chemin) => ({ chemin: cheminRelatif(chemin), contenu: readFileSync(chemin, "utf8") }));

describe("clé service_role", () => {
  it("n'apparaît que dans env.ts (lecture), son test et supabase/service.ts (usage)", () => {
    const fichiers = FICHIERS.filter(({ contenu }) =>
      /SUPABASE_SERVICE_ROLE_KEY|supabaseServiceRoleKey|service_role/.test(contenu),
    ).map(({ chemin }) => chemin);
    expect(fichiers.sort()).toEqual(["lib/env.test.ts", "lib/env.ts", "lib/supabase/service.ts"]);
  });

  it("le client de service n'est créé que par supabase/service.ts", () => {
    const fichiers = FICHIERS.filter(
      ({ chemin, contenu }) =>
        chemin !== "lib/supabase/service.ts" &&
        /creerClientService|supabase\/service["']/.test(contenu),
    ).map(({ chemin }) => chemin);
    // Premier appelant (phase 2) : la passerelle /go (spécifications 10.1,
    // route handler), pour l'insertion dans `clics_sortants` — usage listé en
    // tête de service.ts. Viendront ensuite les server actions de la phase 5.
    // Ajouter ici chaque nouvel appelant, après avoir vérifié qu'il fait
    // partie des usages autorisés listés en tête de service.ts.
    expect(fichiers).toEqual(["app/go/[type]/[id]/route.ts"]);
  });
});

describe('import "server-only"', () => {
  const MODULES_SERVEUR = FICHIERS.filter(
    ({ chemin }) =>
      !chemin.endsWith(".test.ts") &&
      (["lib/supabase/service.ts", "lib/supabase/public.ts", "lib/supabase/serveur.ts"].includes(
        chemin,
      ) ||
        chemin.startsWith("lib/requetes/")),
  );

  it("les modules serveur sont bien trouvés", () => {
    expect(MODULES_SERVEUR.map(({ chemin }) => chemin)).toEqual(
      expect.arrayContaining([
        "lib/supabase/service.ts",
        "lib/supabase/public.ts",
        "lib/supabase/serveur.ts",
      ]),
    );
  });

  it.each(MODULES_SERVEUR.map(({ chemin, contenu }) => [chemin, contenu]))(
    '%s commence par import "server-only"',
    (_chemin, contenu) => {
      const premiereInstruction = contenu
        .split("\n")
        .map((ligne) => ligne.trim())
        .find((ligne) => ligne !== "" && !ligne.startsWith("//"));
      expect(premiereInstruction).toBe('import "server-only";');
    },
  );
});

describe("composants clients", () => {
  it('aucun fichier "use client" n\'importe un client serveur ni une lecture de requetes/', () => {
    const fautifs = FICHIERS.filter(
      ({ contenu }) =>
        /^\s*["']use client["']/.test(contenu) &&
        /from\s+["']@\/lib\/(supabase\/(service|public|serveur)|requetes\/)/.test(contenu),
    ).map(({ chemin }) => chemin);
    expect(fautifs).toEqual([]);
  });
});
