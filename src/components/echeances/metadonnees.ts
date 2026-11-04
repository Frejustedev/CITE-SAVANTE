// Métadonnées de la page des échéances (`/echeances`, spécifications 8, 8.5
// et 15) : titre, description, canonique, robots, Open Graph. Fonctions
// pures, sans lecture de la base, testées (`echeances.test.tsx`, même
// dossier).
import type { Metadata } from "next";

import { site } from "@/config/site";
import type { FiltresEcheances } from "@/lib/utils/agenda";

/** Titre de la page (`h1`), suivi de « — Cité Savante » dans l'onglet (modèle du layout). */
export const TITRE_ECHEANCES = "Échéances des événements scientifiques";

export const DESCRIPTION_ECHEANCES =
  "Dates limites à venir des congrès et événements scientifiques du Bénin : soumission des résumés, inscriptions, bourses et prix, semaine par semaine.";

/** Au moins un filtre (type d'échéance ou discipline) est actif. */
export function aDesFiltresEcheances(filtres: FiltresEcheances): boolean {
  return Boolean(filtres.type || filtres.discipline);
}

/**
 * Métadonnées de la page des échéances pour des filtres lus dans l'URL
 * (`lireFiltresEcheances`). Canonique : toujours `/echeances`, sans filtre.
 * Les variantes filtrées sont en `noindex, follow` (même liste découpée ;
 * leurs liens vers les fiches restent suivis), comme l'annuaire et
 * l'agenda. Décision sur l'URL seule, sans requête : une discipline
 * inconnue (`?discipline=inconnue`) donne aussi `noindex`.
 */
export function metadonneesEcheances(filtres: FiltresEcheances): Metadata {
  return {
    title: TITRE_ECHEANCES,
    description: DESCRIPTION_ECHEANCES,
    alternates: { canonical: "/echeances" },
    ...(aDesFiltresEcheances(filtres) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: site.nom,
      url: "/echeances",
      title: `${TITRE_ECHEANCES} — ${site.nom}`,
      description: DESCRIPTION_ECHEANCES,
    },
  };
}
