// Métadonnées de l'agenda (`/agenda`, spécifications 8, 8.3 et 15) : titre,
// description, canonique, robots, Open Graph. Fonctions pures, sans lecture
// de la base, testées (`agenda.test.tsx`, même dossier).
import type { Metadata } from "next";

import { deMois } from "@/components/agenda/libelles";
import { site } from "@/config/site";
import { aDesFiltresAgenda, type FiltresAgenda } from "@/lib/utils/agenda";
import { lireParametreMois } from "@/lib/utils/calendrier";

/** Titre de la page (`h1`) en liste et en calendrier, suivi de « — Cité Savante » dans l'onglet. */
export const TITRE_AGENDA = "Agenda des événements scientifiques";

/** Titre de la page (`h1`) des archives (`?periode=passes`). */
export const TITRE_ARCHIVES = "Archives de l’agenda";

export const DESCRIPTION_AGENDA =
  "Congrès, journées, colloques, séminaires, ateliers, webinaires et formations scientifiques à venir au Bénin, avec leurs dates limites, en liste par mois ou en calendrier.";

export const DESCRIPTION_ARCHIVES =
  "Congrès, journées, colloques et autres événements scientifiques passés du Bénin, du plus récent au plus ancien.";

/** Canonique des archives : page distincte de l'agenda, indexée sans filtre. */
export const CHEMIN_ARCHIVES = "/agenda?periode=passes";

/** Titre `h1` de la page pour des filtres donnés. */
export function titreAgenda(filtres: Pick<FiltresAgenda, "periode" | "vue">): string {
  return filtres.vue === "liste" && filtres.periode === "passes" ? TITRE_ARCHIVES : TITRE_AGENDA;
}

/**
 * Métadonnées de l'agenda pour des filtres lus dans l'URL
 * (`lireFiltresAgenda`) ; `aujourdhui` (« AAAA-MM-JJ », Porto-Novo) sert
 * seulement au mois affiché par le calendrier. Décision sur l'URL seule,
 * sans requête (comme l'annuaire) :
 * - liste à venir sans filtre : indexée, canonique `/agenda` ;
 * - liste à venir filtrée : `noindex, follow`, canonique `/agenda` (même
 *   liste découpée ; ses liens vers les fiches restent suivis) ;
 * - archives sans filtre : indexées, canonique `/agenda?periode=passes`.
 *   Écart volontaire avec « canonique /agenda » de la consigne : les
 *   archives sont un contenu distinct (événements terminés) ; un canonique
 *   vers `/agenda` les ferait traiter comme un doublon, donc ne jamais
 *   indexer, alors que la consigne ne les met en `noindex` que filtrées ;
 * - archives filtrées : `noindex, follow`, canonique des archives ;
 * - calendrier (tout mois, filtré ou non) : `noindex, follow`, canonique
 *   `/agenda` (même contenu que la liste, présenté autrement ; un mois
 *   par adresse multiplierait les pages quasi vides).
 * Les fiches d'événement sont, elles, indexées par leur propre page et par
 * le plan du site (`sitemap.ts`, section 15).
 */
export function metadonneesAgenda(filtres: FiltresAgenda, aujourdhui: string): Metadata {
  const calendrier = filtres.vue === "calendrier";
  const archives = !calendrier && filtres.periode === "passes";
  const filtree = aDesFiltresAgenda(filtres);

  const titre = calendrier
    ? `Calendrier des événements ${deMois(lireParametreMois(filtres.mois, aujourdhui))}`
    : archives
      ? TITRE_ARCHIVES
      : TITRE_AGENDA;
  const description = archives ? DESCRIPTION_ARCHIVES : DESCRIPTION_AGENDA;
  const canonique = archives ? CHEMIN_ARCHIVES : "/agenda";
  const variante = calendrier || filtree;

  return {
    title: titre,
    description,
    alternates: { canonical: canonique },
    ...(variante ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: site.nom,
      url: canonique,
      title: `${titre} — ${site.nom}`,
      description,
    },
  };
}
