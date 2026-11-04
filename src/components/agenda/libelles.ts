// Textes calculés de l'agenda (`/agenda`, spécifications 8.3) : nombre
// d'événements de l'en-tête, description des filtres actifs, résumé des
// résultats lu par les lecteurs d'écran, titres des jours et des mois.
// Fonctions pures, testées (`agenda.test.tsx`, même dossier). Mêmes règles
// typographiques que l'annuaire (`src/components/societes/annuaire/libelles.ts`) :
// espace insécable (U+00A0) avant « : » et à l'intérieur des guillemets,
// apostrophe typographique.
import type { PeriodeAgenda } from "@/lib/utils/agenda";
import { JOURS_SEMAINE, libelleMois, type MoisCalendrier } from "@/lib/utils/calendrier";
import {
  formaterDate,
  formaterDateCourte,
  formaterPeriode,
  jourSemaineIso,
} from "@/lib/utils/dates";
import { premiereLettreMajuscule } from "@/lib/utils/texte";

/** Espace insécable (U+00A0). */
const NBSP = " ";

const nombres = new Intl.NumberFormat("fr-FR");
const listes = new Intl.ListFormat("fr", { style: "long", type: "conjunction" });

/** Nombre écrit à la française (« 1 234 », espace fine insécable). */
export function formaterNombre(nombre: number): string {
  return nombres.format(nombre);
}

/** Texte entre guillemets français, espaces insécables à l'intérieur. */
export function entreGuillemets(texte: string): string {
  return `«${NBSP}${texte}${NBSP}»`;
}

/** « 1 événement à venir », « 3 événements passés »… (`n` ≥ 1). */
function nombreEvenements(nombre: number, periode: PeriodeAgenda): string {
  const qualificatif = periode === "passes" ? (nombre === 1 ? "passé" : "passés") : "à venir";
  return nombre === 1
    ? `1 événement ${qualificatif}`
    : `${formaterNombre(nombre)} événements ${qualificatif}`;
}

/**
 * Ligne d'en-tête de l'agenda (événements publiés, sans filtre) :
 * « Aucun événement à venir pour le moment », « 1 événement à venir »,
 * « 15 événements à venir » ; archives : « 3 événements passés ».
 */
export function texteNombreEvenements(nombre: number, periode: PeriodeAgenda): string {
  if (nombre <= 0) {
    return periode === "passes"
      ? "Aucun événement passé pour le moment"
      : "Aucun événement à venir pour le moment";
  }
  return nombreEvenements(nombre, periode);
}

/** Mois précédé de « de » ou « d’ » : « de novembre 2026 », « d’octobre 2026 », « d’août 2027 ». */
export function deMois(mois: MoisCalendrier): string {
  const libelle = libelleMois(mois);
  // Seuls avril, août et octobre commencent par une voyelle.
  return /^[aeiouâéèêîôû]/i.test(libelle) ? `d’${libelle}` : `de ${libelle}`;
}

/** Filtres actifs, sous leur forme lisible (nom de la discipline, libellé du type…). */
export type FiltresAgendaLisibles = {
  type: string | null;
  discipline: string | null;
  ville: string | null;
  modalite: string | null;
  gratuit: boolean;
  /** « AAAA-MM-JJ ». */
  du: string | null;
  /** « AAAA-MM-JJ », jamais avant `du`. */
  au: string | null;
  q: string | null;
};

/** Période `du`–`au` en toutes lettres, ou `null` sans date. */
function decrirePeriode(du: string | null, au: string | null): string | null {
  if (du && au) {
    return du === au ? `date du ${formaterDate(du)}` : `période ${formaterPeriode(du, au)}`;
  }
  if (du) return `à partir du ${formaterDate(du)}`;
  if (au) return `jusqu’au ${formaterDate(au)}`;
  return null;
}

/**
 * Description de chaque filtre actif, dans l'ordre du formulaire de
 * l'agenda : « recherche « pédiatrie » », « type « Congrès » »,
 * « discipline « Santé » », « ville « Cotonou » », « modalité « En
 * ligne » », « période du 12 au 14 mars 2027 » (ou « à partir du… »,
 * « jusqu’au… », « date du… »), « événements gratuits ». Liste vide sans
 * filtre.
 */
export function decrireFiltresAgenda(filtres: FiltresAgendaLisibles): string[] {
  const descriptions: string[] = [];
  if (filtres.q) descriptions.push(`recherche ${entreGuillemets(filtres.q)}`);
  if (filtres.type) descriptions.push(`type ${entreGuillemets(filtres.type)}`);
  if (filtres.discipline) descriptions.push(`discipline ${entreGuillemets(filtres.discipline)}`);
  if (filtres.ville) descriptions.push(`ville ${entreGuillemets(filtres.ville)}`);
  if (filtres.modalite) descriptions.push(`modalité ${entreGuillemets(filtres.modalite)}`);
  const periode = decrirePeriode(filtres.du, filtres.au);
  if (periode) descriptions.push(periode);
  if (filtres.gratuit) descriptions.push("événements gratuits");
  return descriptions;
}

/** Données du résumé : liste (à venir ou archives) ou calendrier d'un mois. */
export type DonneesResumeAgenda =
  | {
      mode: PeriodeAgenda;
      /** Nombre d'événements retenus. */
      total: number;
      /** Descriptions des filtres actifs (`decrireFiltresAgenda`). */
      filtres: readonly string[];
    }
  | {
      mode: "calendrier";
      /** Nombre d'événements qui ont au moins un jour dans le mois. */
      total: number;
      filtres: readonly string[];
      mois: MoisCalendrier;
    };

/**
 * Résumé des résultats, annoncé poliment par les lecteurs d'écran à chaque
 * changement de filtre, de vue ou de mois :
 * - liste : « Aucun filtre appliqué : 15 événements à venir. »,
 *   « 3 événements à venir correspondent à vos filtres : type « Congrès » et
 *   ville « Cotonou ». », « Aucun événement passé ne correspond à vos
 *   filtres : … » ;
 * - calendrier : « 6 événements en novembre 2026. », « 1 événement
 *   correspond à vos filtres en novembre 2026 : … », « Aucun événement en
 *   novembre 2026. ».
 */
export function resumeAgenda(donnees: DonneesResumeAgenda): string {
  const { total, filtres } = donnees;
  const criteres = listes.format(filtres);

  if (donnees.mode === "calendrier") {
    const mois = libelleMois(donnees.mois);
    const evenements = total === 1 ? "1 événement" : `${formaterNombre(total)} événements`;
    if (filtres.length === 0) {
      return total <= 0 ? `Aucun événement en ${mois}.` : `${evenements} en ${mois}.`;
    }
    if (total <= 0)
      return `Aucun événement ne correspond à vos filtres en ${mois}${NBSP}: ${criteres}.`;
    const verbe = total === 1 ? "correspond" : "correspondent";
    return `${evenements} ${verbe} à vos filtres en ${mois}${NBSP}: ${criteres}.`;
  }

  const passes = donnees.mode === "passes";
  if (filtres.length === 0) {
    if (total <= 0) {
      return passes
        ? "Aucun événement passé n’est encore archivé."
        : "Aucun événement à venir n’est annoncé pour le moment.";
    }
    return `Aucun filtre appliqué${NBSP}: ${nombreEvenements(total, donnees.mode)}.`;
  }
  if (total <= 0) {
    const aucun = passes ? "Aucun événement passé" : "Aucun événement à venir";
    return `${aucun} ne correspond à vos filtres${NBSP}: ${criteres}.`;
  }
  const verbe = total === 1 ? "correspond" : "correspondent";
  return `${nombreEvenements(total, donnees.mode)} ${verbe} à vos filtres${NBSP}: ${criteres}.`;
}

/** Nom du jour de la semaine d'une date « AAAA-MM-JJ » (« lundi »). */
function nomDuJour(date: string): string {
  return JOURS_SEMAINE[jourSemaineIso(date) - 1].long;
}

/** Titre d'un jour de la liste mobile du calendrier : « Lundi 12 octobre », « Dimanche 1er novembre ». */
export function titreJour(date: string): string {
  return premiereLettreMajuscule(`${nomDuJour(date)} ${formaterDateCourte(date)}`);
}

/**
 * Date complète d'une case du calendrier, pour les lecteurs d'écran (le
 * numéro seul est ambigu pour les jours des mois voisins) : « lundi
 * 12 octobre 2026 », suivie de « , aujourd’hui » pour le jour courant.
 */
export function dateCase(date: string, aujourdhui: boolean): string {
  const texte = `${nomDuJour(date)} ${formaterDate(date)}`;
  return aujourdhui ? `${texte}, aujourd’hui` : texte;
}
