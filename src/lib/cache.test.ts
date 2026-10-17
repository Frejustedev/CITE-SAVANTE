import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { DUREE_VALIDITE_CACHE, ETIQUETTES } from "./cache";

// Garde-fou statique de la règle de rendu (PROGRESS.md, décision 20) : chaque
// lecture mise en cache de `src/lib/requetes/` porte des étiquettes ET la durée
// de validité commune (filet de sécurité pour les écritures faites hors
// server action : éditeur SQL, tableau de bord Supabase).

const DOSSIER_REQUETES = fileURLToPath(new URL("./requetes/", import.meta.url));

const FICHIERS_REQUETES = readdirSync(DOSSIER_REQUETES)
  .filter((nom) => nom.endsWith(".ts") && !nom.endsWith(".test.ts"))
  .map((nom) => ({ nom, contenu: readFileSync(join(DOSSIER_REQUETES, nom), "utf8") }));

/**
 * Options (troisième argument) de chaque appel `unstable_cache(...)` d'un
 * fichier, espaces normalisés et virgules finales retirées (indépendant de la
 * mise en forme de Prettier).
 */
function optionsUnstableCache(contenu: string): string[] {
  const appels = contenu.split("unstable_cache(").slice(1);
  return appels.map((appel) => {
    // Le troisième argument est le dernier objet `{ ... }` avant la fermeture `);`.
    const fin = appel.indexOf("\n);");
    const corps = (fin === -1 ? appel : appel.slice(0, fin))
      .replace(/\s+/g, " ")
      .replace(/,\s*([\]}])/g, " $1")
      .replace(/\s+([\]}])/g, "$1")
      .trim();
    const debutOptions = corps.lastIndexOf("{ tags:");
    return debutOptions === -1 ? "" : corps.slice(debutOptions).replace(/,$/, "");
  });
}

describe("cache des lectures publiques", () => {
  it("durée de validité de 5 minutes", () => {
    expect(DUREE_VALIDITE_CACHE).toBe(300);
  });

  it("les fichiers de requêtes sont bien trouvés", () => {
    expect(FICHIERS_REQUETES.map(({ nom }) => nom)).toEqual(
      expect.arrayContaining(["disciplines.ts", "evenements.ts", "societes.ts"]),
    );
  });

  it.each(FICHIERS_REQUETES.map(({ nom, contenu }) => [nom, contenu]))(
    "%s : chaque unstable_cache a des étiquettes et revalidate: DUREE_VALIDITE_CACHE",
    (_nom, contenu) => {
      const options = optionsUnstableCache(contenu);
      expect(options.length).toBeGreaterThan(0);
      for (const option of options) {
        expect(option).toMatch(/^\{ tags: \[ETIQUETTES\.[A-Z]+(?:, ETIQUETTES\.[A-Z]+)*\],/);
        expect(option).toMatch(/\], revalidate: DUREE_VALIDITE_CACHE\}$/);
      }
    },
  );

  it("les étiquettes utilisées existent", () => {
    const utilisees = new Set(
      FICHIERS_REQUETES.flatMap(({ contenu }) =>
        [...contenu.matchAll(/ETIQUETTES\.([A-Z]+)/g)].map(([, nom]) => nom),
      ),
    );
    for (const nom of utilisees) {
      expect(Object.keys(ETIQUETTES)).toContain(nom);
    }
  });
});
