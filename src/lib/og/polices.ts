// Polices des images d'aperçu (Open Graph, spécifications 10.5) : Fraunces
// (titres) et EB Garamond (textes), lues depuis les copies de `assets/polices/`,
// sous-ensemble latin, sans aucun appel réseau.
//
// `@fontsource` reste la source des polices du site (`next/font`,
// src/app/layout.tsx) et la référence de ces copies : `polices.test.ts` échoue
// si elles ne sont plus identiques, octet pour octet, aux fichiers du paquet
// installé (à recopier après une mise à jour du paquet). Raison de la copie :
// ne pas dépendre, au déploiement, du lien symbolique pnpm
// `node_modules/@fontsource/…`. Le traçage du build contenait déjà les vrais
// chemins `.pnpm`, mais ce point ne se vérifie qu'au premier déploiement.
// La licence SIL OFL de chaque police est à côté des fichiers.
//
// Format .woff et non .woff2 : le moteur de next/og (satori) ne lit que
// ttf, otf et woff (documentation `image-response.md`). Graisses : celles de
// la charte (section 4.2) dont les images ont besoin, Fraunces 500 et 700,
// EB Garamond 400 et 500 (environ 100 Ko en tout).
//
// Lecture par `fs` (moteur Node.js : `runtime = "nodejs"` dans les routes),
// une seule fois par processus : la promesse est gardée, puis oubliée si la
// lecture échoue (un échec passager ne condamne pas le processus). Chemins
// relatifs à la racine du projet (`process.cwd()`, comme dans l'exemple de la
// documentation `opengraph-image.md`), écrits en toutes lettres pour que le
// traçage des fichiers du déploiement les retrouve.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ImageResponse } from "next/og";

/** Une police passée à `ImageResponse` (`options.fonts`). */
export type PoliceApercu = NonNullable<
  NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]
>[number];

/** Familles à nommer dans `fontFamily` (styles des images). */
export const FAMILLE_TITRE = "Fraunces";
export const FAMILLE_TEXTE = "EB Garamond";

async function lirePolices(): Promise<PoliceApercu[]> {
  const [fraunces500, fraunces700, garamond400, garamond500] = await Promise.all([
    readFile(join(process.cwd(), "assets/polices/fraunces-latin-500-normal.woff")),
    readFile(join(process.cwd(), "assets/polices/fraunces-latin-700-normal.woff")),
    readFile(join(process.cwd(), "assets/polices/eb-garamond-latin-400-normal.woff")),
    readFile(join(process.cwd(), "assets/polices/eb-garamond-latin-500-normal.woff")),
  ]);
  return [
    { name: FAMILLE_TITRE, data: fraunces500, weight: 500, style: "normal" },
    { name: FAMILLE_TITRE, data: fraunces700, weight: 700, style: "normal" },
    { name: FAMILLE_TEXTE, data: garamond400, weight: 400, style: "normal" },
    { name: FAMILLE_TEXTE, data: garamond500, weight: 500, style: "normal" },
  ];
}

let chargement: Promise<PoliceApercu[]> | null = null;

/** Les quatre polices des aperçus, lues une fois puis gardées en mémoire. */
export function chargerPolicesApercu(): Promise<PoliceApercu[]> {
  if (!chargement) {
    chargement = lirePolices().catch((erreur: unknown) => {
      chargement = null;
      throw erreur;
    });
  }
  return chargement;
}
