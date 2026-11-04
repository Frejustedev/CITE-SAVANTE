// Textes calculés de la page des échéances (`/echeances`, spécifications
// 8.5) : nombre d'échéances, description des filtres actifs, résumé lu par
// les lecteurs d'écran, jours restants et sous-titres des groupes.
// Fonctions pures, testées (`echeances.test.tsx`, même dossier). Espace
// insécable (U+00A0) avant « : » et à l'intérieur des guillemets, comme
// ailleurs sur le site.
import { entreGuillemets, formaterNombre } from "@/components/societes/annuaire/libelles";
import {
  ajouterJours,
  decrireJoursRestants,
  formaterDate,
  formaterPeriode,
  lundiDeLaSemaine,
  SEUIL_URGENCE_JOURS,
} from "@/lib/utils/dates";
import { premiereLettreMajuscule } from "@/lib/utils/texte";

/** Badge d'une échéance à 7 jours ou moins (section 7, « badge or »). */
export const MENTION_URGENTE = "Urgente";

/** Paragraphe d'introduction de la page (sous le titre). */
export function texteIntroductionEcheances(nomSite: string): string {
  return (
    `Cette page rassemble les dates limites des événements scientifiques publiés sur ${nomSite} : ` +
    "soumission des résumés, inscriptions, bourses et prix. Elles sont classées de la plus proche " +
    `à la plus lointaine ; celles qui tombent dans ${SEUIL_URGENCE_JOURS} jours ou moins ` +
    `portent la mention ${entreGuillemets(MENTION_URGENTE)}. ` +
    "Filtrez par type d’échéance ou par discipline."
  );
}

/** Invitation sous la liste, vers le formulaire « Annoncer un événement ». */
export const QUESTION_ECHEANCE_MANQUANTE = "Une date limite manque ?";

const listes = new Intl.ListFormat("fr", { style: "long", type: "conjunction" });

/**
 * Ligne d'en-tête : « Aucune échéance à venir pour le moment »,
 * « 1 échéance à venir », « 16 échéances à venir ».
 */
export function texteNombreEcheances(nombre: number): string {
  if (nombre <= 0) return "Aucune échéance à venir pour le moment";
  if (nombre === 1) return "1 échéance à venir";
  return `${formaterNombre(nombre)} échéances à venir`;
}

/** Filtres actifs, sous leur forme lisible (libellé du type, nom de la discipline). */
export type FiltresEcheancesLisibles = {
  type: string | null;
  discipline: string | null;
};

/**
 * Description de chaque filtre actif, dans l'ordre du formulaire :
 * « type « Bourse » », « discipline « Santé » ». Liste vide sans filtre.
 */
export function decrireFiltresEcheances(filtres: FiltresEcheancesLisibles): string[] {
  const descriptions: string[] = [];
  if (filtres.type) descriptions.push(`type ${entreGuillemets(filtres.type)}`);
  if (filtres.discipline) descriptions.push(`discipline ${entreGuillemets(filtres.discipline)}`);
  return descriptions;
}

/**
 * Résumé des résultats, annoncé poliment par les lecteurs d'écran à chaque
 * changement de filtre : nombre d'échéances (0, 1 et pluriel) et filtres
 * actifs (`decrireFiltresEcheances`).
 */
export function resumeEcheances({
  total,
  filtres,
}: {
  total: number;
  filtres: readonly string[];
}): string {
  if (filtres.length === 0) {
    if (total <= 0) return "Aucune échéance à venir pour le moment.";
    return total === 1
      ? "Aucun filtre appliqué : 1 échéance à venir."
      : `Aucun filtre appliqué : ${formaterNombre(total)} échéances à venir.`;
  }
  const criteres = listes.format(filtres);
  if (total <= 0) return `Aucune échéance à venir ne correspond à vos filtres : ${criteres}.`;
  if (total === 1) return `1 échéance à venir correspond à vos filtres : ${criteres}.`;
  return `${formaterNombre(total)} échéances à venir correspondent à vos filtres : ${criteres}.`;
}

/** « Clôture aujourd’hui », « Clôture demain », « Clôture dans 5 jours ». */
export function texteJoursRestants(jours: number): string {
  return `Clôture ${decrireJoursRestants(jours)}`;
}

/**
 * Précision sous le titre des deux premiers groupes (semaines du lundi au
 * dimanche, comme `grouperEcheancesParSemaine`) : « Jusqu’au dimanche
 * 1er novembre 2026 » pour « Cette semaine », « Du 2 au 8 novembre 2026 »
 * pour « Semaine prochaine » ; `null` pour un groupe mensuel.
 */
export function precisionGroupe(cle: string, aujourdhui: string): string | null {
  const lundi = lundiDeLaSemaine(aujourdhui);
  if (cle === "cette-semaine") {
    return `Jusqu’au dimanche ${formaterDate(ajouterJours(lundi, 6))}`;
  }
  if (cle === "semaine-prochaine") {
    return premiereLettreMajuscule(
      formaterPeriode(ajouterJours(lundi, 7), ajouterJours(lundi, 13)),
    );
  }
  return null;
}
