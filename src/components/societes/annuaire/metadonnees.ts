// Métadonnées de l'annuaire (`/societes`, spécifications 8 et 15) : titre,
// description, canonique, robots, Open Graph. Fonctions pures, sans lecture
// de la base, testées (`annuaire.test.tsx`, même dossier).
import type { Metadata } from "next";

import { site } from "@/config/site";
import type { FiltresAnnuaire } from "@/lib/utils/annuaire";

/** Titre de la page (`h1`), suivi de « — Cité Savante » dans l'onglet (modèle du layout). */
export const TITRE_ANNUAIRE = "Annuaire des sociétés savantes";

export const DESCRIPTION_ANNUAIRE =
  "Annuaire des sociétés savantes, institutions académiques et associations professionnelles du Bénin, à filtrer par discipline, ville ou catégorie.";

/** Au moins un filtre (discipline, ville, catégorie ou recherche) est actif. */
export function aDesFiltres(filtres: FiltresAnnuaire): boolean {
  return Boolean(filtres.discipline || filtres.ville || filtres.categorie || filtres.q);
}

/**
 * Métadonnées de l'annuaire pour des filtres lus dans l'URL.
 *
 * Canonique : toujours `/societes`, sans filtre ni page. Les variantes
 * filtrées et les pages 2 et suivantes sont en `noindex, follow` : elles ne
 * font que découper ou réordonner la même liste (contenu dupliqué), mais
 * leurs liens vers les fiches restent suivis. Les fiches sont, elles,
 * indexées par leur propre page et par le plan du site (`sitemap.ts`,
 * section 15). La décision ne lit que l'URL, sans requête : une variante
 * dont le filtre est inconnu (`?discipline=inconnue`) est aussi en
 * `noindex`.
 */
export function metadonneesAnnuaire(filtres: FiltresAnnuaire): Metadata {
  const variante = aDesFiltres(filtres) || filtres.page > 1;

  return {
    title: TITRE_ANNUAIRE,
    description: DESCRIPTION_ANNUAIRE,
    alternates: { canonical: "/societes" },
    ...(variante ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: site.nom,
      url: "/societes",
      title: `${TITRE_ANNUAIRE} — ${site.nom}`,
      description: DESCRIPTION_ANNUAIRE,
    },
  };
}
