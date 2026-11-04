// Calendrier de l'agenda et groupements (spécifications, sections 8.3 et
// 8.5) : grille mensuelle (semaines du LUNDI au dimanche), répartition des
// événements de plusieurs jours sur chacun de leurs jours, navigation de mois
// en mois, paramètre `?mois=AAAA-MM`, groupement par mois (vue liste) et des
// échéances par semaine. Logique pure, testée (`calendrier.test.ts`), sans
// fuseau : toutes les dates sont des chaînes « AAAA-MM-JJ » déjà ramenées à
// Porto-Novo (« aujourd'hui » vient de `aujourdhuiPortoNovo()`).
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import {
  ajouterJours,
  jourSemaineIso,
  lireDateIso,
  lundiDeLaSemaine,
  nombreJoursDuMois,
} from "@/lib/utils/dates";

/** Un mois du calendrier (mois de 1 à 12). */
export type MoisCalendrier = { annee: number; mois: number };

/**
 * Fenêtre de navigation du calendrier, en mois autour du mois courant de
 * Porto-Novo : 12 mois en arrière, 24 en avant. Un `?mois=` hors de la
 * fenêtre vaut le mois courant (comme une valeur invalide). Raisons : la vue
 * calendrier lit les événements passés dans la liste des archives, limitée
 * aux plus récents (`LIMITE_EVENEMENTS_PASSES`, src/lib/requetes/evenements.ts),
 * qui couvre largement 12 mois ; et aucune adresse ne fait afficher l'an 1
 * ou l'an 9999.
 */
export const FENETRE_CALENDRIER = { moisAvant: 12, moisApres: 24 } as const;

const FORMAT_PARAMETRE_MOIS = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Mois qui contient une date « AAAA-MM-JJ ». */
export function moisDeLaDate(date: string): MoisCalendrier {
  const d = lireDateIso(date);
  return { annee: d.annee, mois: d.mois };
}

/** Rang absolu d'un mois (pour comparer et décaler). */
function rangMois(m: MoisCalendrier): number {
  return m.annee * 12 + (m.mois - 1);
}

function depuisRang(rang: number): MoisCalendrier {
  return { annee: Math.floor(rang / 12), mois: (rang % 12) + 1 };
}

/** Décale un mois de `n` mois (négatif admis) : `decalerMois({2026, 12}, 1)` → janvier 2027. */
export function decalerMois(m: MoisCalendrier, n: number): MoisCalendrier {
  return depuisRang(rangMois(m) + n);
}

/** Mois précédent (janvier 2027 → décembre 2026). */
export function moisPrecedent(m: MoisCalendrier): MoisCalendrier {
  return decalerMois(m, -1);
}

/** Mois suivant (décembre 2026 → janvier 2027). */
export function moisSuivant(m: MoisCalendrier): MoisCalendrier {
  return decalerMois(m, 1);
}

/** Comparaison de deux mois (négatif si `a` précède `b`). */
export function comparerMois(a: MoisCalendrier, b: MoisCalendrier): number {
  return rangMois(a) - rangMois(b);
}

/** Valeur du paramètre d'URL : `{ annee: 2026, mois: 3 }` → « 2026-03 ». */
export function formaterParametreMois(m: MoisCalendrier): string {
  return `${String(m.annee).padStart(4, "0")}-${String(m.mois).padStart(2, "0")}`;
}

/**
 * Lit un paramètre « AAAA-MM » (forme exacte, mois 01 à 12), sans vérifier
 * la fenêtre ; `null` si la valeur est absente ou mal formée. Un tableau
 * (paramètre répété) donne sa première valeur.
 */
export function analyserParametreMois(valeur: unknown): MoisCalendrier | null {
  const brute = Array.isArray(valeur) ? valeur[0] : valeur;
  if (typeof brute !== "string") return null;
  const correspondance = FORMAT_PARAMETRE_MOIS.exec(brute.trim());
  if (!correspondance) return null;
  return { annee: Number(correspondance[1]), mois: Number(correspondance[2]) };
}

/**
 * Vrai si `m` est dans la fenêtre de navigation (`FENETRE_CALENDRIER`) autour
 * du mois de `aujourdhui` (« AAAA-MM-JJ ») : sert aussi à masquer les liens
 * « Mois précédent » / « Mois suivant » aux bords de la fenêtre.
 */
export function estMoisDansFenetre(m: MoisCalendrier, aujourdhui: string): boolean {
  const ecart = comparerMois(m, moisDeLaDate(aujourdhui));
  return ecart >= -FENETRE_CALENDRIER.moisAvant && ecart <= FENETRE_CALENDRIER.moisApres;
}

/**
 * Mois affiché par la vue calendrier : `?mois=AAAA-MM` s'il est bien formé
 * et dans la fenêtre, sinon le mois courant de Porto-Novo (mois de
 * `aujourdhui`). Ne lève jamais.
 */
export function lireParametreMois(valeur: unknown, aujourdhui: string): MoisCalendrier {
  const lu = analyserParametreMois(valeur);
  return lu && estMoisDansFenetre(lu, aujourdhui) ? lu : moisDeLaDate(aujourdhui);
}

/** Nom du mois et année, en minuscules : « octobre 2026 » (date-fns, locale `fr`). */
export function libelleMois(m: MoisCalendrier): string {
  return format(new Date(m.annee, m.mois - 1, 1), "MMMM yyyy", { locale: fr });
}

/** Titre de section : « Octobre 2026 » (majuscule initiale). */
export function titreMois(m: MoisCalendrier): string {
  const libelle = libelleMois(m);
  return libelle.charAt(0).toLocaleUpperCase("fr") + libelle.slice(1);
}

/** Premier et dernier jour d'un mois (« AAAA-MM-JJ »). */
export function bornesMois(m: MoisCalendrier): { debut: string; fin: string } {
  const prefixe = formaterParametreMois(m);
  const dernier = String(nombreJoursDuMois(m.annee, m.mois)).padStart(2, "0");
  return { debut: `${prefixe}-01`, fin: `${prefixe}-${dernier}` };
}

/** Un jour de la grille mensuelle. */
export type JourGrille = {
  /** « AAAA-MM-JJ ». */
  date: string;
  /** Numéro du jour dans son mois (1 à 31). */
  jour: number;
  /** 1 = lundi … 7 = dimanche. */
  jourSemaine: number;
  /** Jour d'un mois voisin, affiché pour compléter la première ou la dernière semaine. */
  horsMois: boolean;
  /** Vrai si c'est `aujourdhui` (paramètre de `grilleMois`). */
  aujourdhui: boolean;
};

/** Grille d'un mois : semaines complètes, du lundi au dimanche. */
export type GrilleMois = {
  mois: MoisCalendrier;
  /** Premier jour affiché (un lundi, éventuellement du mois précédent). */
  debut: string;
  /** Dernier jour affiché (un dimanche, éventuellement du mois suivant). */
  fin: string;
  /** 4 à 6 semaines de 7 jours. */
  semaines: JourGrille[][];
};

/**
 * Grille du mois `m` : du lundi de la semaine du 1er au dimanche de la
 * semaine du dernier jour (4 semaines pour un février qui commence un lundi,
 * jusqu'à 6). Les jours des mois voisins sont marqués `horsMois`.
 * `aujourdhui` (« AAAA-MM-JJ », facultatif) marque le jour courant.
 * `debut` et `fin` sont les bornes à passer à `listerEvenementsMois` et
 * `repartirEvenementsParJour`.
 */
export function grilleMois(m: MoisCalendrier, aujourdhui?: string): GrilleMois {
  const { debut: premier, fin: dernier } = bornesMois(m);
  const debut = lundiDeLaSemaine(premier);
  const fin = ajouterJours(dernier, 7 - jourSemaineIso(dernier));
  const prefixe = formaterParametreMois(m);
  const semaines: JourGrille[][] = [];
  for (let date = debut; date <= fin; date = ajouterJours(date, 1)) {
    const jourSemaine = jourSemaineIso(date);
    if (jourSemaine === 1) semaines.push([]);
    semaines[semaines.length - 1].push({
      date,
      jour: lireDateIso(date).jour,
      jourSemaine,
      horsMois: !date.startsWith(`${prefixe}-`),
      aujourdhui: date === aujourdhui,
    });
  }
  return { mois: m, debut, fin, semaines };
}

/** Ce qu'il faut savoir d'un événement pour le placer dans un calendrier. */
export type EvenementDate = { dateDebut: string; dateFin: string };

/**
 * Place chaque événement sur CHACUN de ses jours compris entre `debut` et
 * `fin` (bornes incluses, « AAAA-MM-JJ ») : un congrès du 30 octobre au
 * 2 novembre apparaît les 30 et 31 octobre ET les 1er et 2 novembre, donc
 * dans les grilles des deux mois. Renvoie une `Map` date → événements, qui
 * ne contient QUE les jours qui ont au moins un événement, dans l'ordre
 * chronologique (vue mobile : « liste des jours qui ont des événements ») ;
 * pour chaque jour, les événements gardent l'ordre de la liste reçue.
 */
export function repartirEvenementsParJour<T extends EvenementDate>(
  evenements: readonly T[],
  debut: string,
  fin: string,
): Map<string, T[]> {
  lireDateIso(debut);
  lireDateIso(fin);
  const parJour = new Map<string, T[]>();
  if (fin < debut) return parJour;
  for (let date = debut; date <= fin; date = ajouterJours(date, 1)) {
    const duJour = evenements.filter(
      (evenement) => evenement.dateDebut <= date && evenement.dateFin >= date,
    );
    if (duJour.length > 0) parJour.set(date, duJour);
  }
  return parJour;
}

/** Place d'un jour dans un événement : seul jour, premier, intermédiaire ou dernier. */
export type PositionJour = "unique" | "premier" | "intermediaire" | "dernier";

/**
 * Place de `date` dans l'événement (pour dessiner un bandeau continu ou
 * écrire « suite ») : « unique » pour un événement d'un jour.
 */
export function positionDansEvenement(evenement: EvenementDate, date: string): PositionJour {
  if (evenement.dateDebut === evenement.dateFin) return "unique";
  if (date <= evenement.dateDebut) return "premier";
  if (date >= evenement.dateFin) return "dernier";
  return "intermediaire";
}

/** Un groupe de la vue liste : les événements d'un mois. */
export type GroupeMois<T> = {
  /** « AAAA-MM » (clé React, ancre). */
  cle: string;
  mois: MoisCalendrier;
  /** « Octobre 2026 ». */
  titre: string;
  evenements: T[];
};

/**
 * Groupe des événements par mois (vue liste de l'agenda, section 8.3). Choix
 * documenté : un événement à cheval sur deux mois apparaît UNE fois, dans le
 * mois de son DÉBUT (même s'il est en cours et que ce mois est passé : sa
 * période, affichée sur la carte, lève l'ambiguïté). Mois dans l'ordre
 * `croissant` (à venir, par défaut) ou `decroissant` (archives) ; dans un
 * mois, les événements gardent l'ordre de la liste reçue (mis en avant
 * d'abord, si la liste est ainsi triée).
 */
export function grouperParMois<T extends { dateDebut: string }>(
  evenements: readonly T[],
  ordre: "croissant" | "decroissant" = "croissant",
): GroupeMois<T>[] {
  const groupes = new Map<string, GroupeMois<T>>();
  for (const evenement of evenements) {
    const mois = moisDeLaDate(evenement.dateDebut);
    const cle = formaterParametreMois(mois);
    const groupe = groupes.get(cle) ?? { cle, mois, titre: titreMois(mois), evenements: [] };
    groupe.evenements.push(evenement);
    groupes.set(cle, groupe);
  }
  const sens = ordre === "croissant" ? 1 : -1;
  return [...groupes.values()].sort((a, b) => sens * comparerMois(a.mois, b.mois));
}

/** Un groupe de la page des échéances. */
export type GroupeEcheances<T> = {
  /** « cette-semaine », « semaine-prochaine » ou « AAAA-MM ». */
  cle: string;
  /** « Cette semaine », « Semaine prochaine » ou « Décembre 2026 ». */
  titre: string;
  echeances: T[];
};

/**
 * Groupe des échéances (section 8.5) : « Cette semaine » (jusqu'au dimanche
 * de la semaine d'`aujourdhui`), « Semaine prochaine » (du lundi au dimanche
 * suivants), puis un groupe par mois de la date limite pour les suivantes
 * (un mois peut donc commencer après la semaine prochaine : « Novembre
 * 2026 » ne contient alors que la fin du mois). Semaines du lundi au
 * dimanche ; dates déjà ramenées à Porto-Novo. Une échéance n'apparaît que
 * dans un groupe ; les échéances passées (avant `aujourdhui`) sont ignorées ;
 * groupes vides omis ; dans chaque groupe, tri par date limite (ordre reçu
 * conservé à égalité).
 */
export function grouperEcheancesParSemaine<T extends { dateLimite: string }>(
  echeances: readonly T[],
  aujourdhui: string,
): GroupeEcheances<T>[] {
  const lundi = lundiDeLaSemaine(aujourdhui);
  const dimanche = ajouterJours(lundi, 6);
  const dimancheProchain = ajouterJours(lundi, 13);

  const cetteSemaine: T[] = [];
  const semaineProchaine: T[] = [];
  const parMois = new Map<string, GroupeEcheances<T>>();

  const triees = [...echeances]
    .filter((echeance) => echeance.dateLimite >= aujourdhui)
    .sort((a, b) => a.dateLimite.localeCompare(b.dateLimite));

  for (const echeance of triees) {
    if (echeance.dateLimite <= dimanche) {
      cetteSemaine.push(echeance);
    } else if (echeance.dateLimite <= dimancheProchain) {
      semaineProchaine.push(echeance);
    } else {
      const mois = moisDeLaDate(echeance.dateLimite);
      const cle = formaterParametreMois(mois);
      const groupe = parMois.get(cle) ?? { cle, titre: titreMois(mois), echeances: [] };
      groupe.echeances.push(echeance);
      parMois.set(cle, groupe);
    }
  }

  const groupes: GroupeEcheances<T>[] = [];
  if (cetteSemaine.length > 0) {
    groupes.push({ cle: "cette-semaine", titre: "Cette semaine", echeances: cetteSemaine });
  }
  if (semaineProchaine.length > 0) {
    groupes.push({
      cle: "semaine-prochaine",
      titre: "Semaine prochaine",
      echeances: semaineProchaine,
    });
  }
  return [...groupes, ...parMois.values()];
}

/** Noms des jours, du lundi au dimanche : en-têtes de la grille (`court`) et lecteurs d'écran (`long`). */
export const JOURS_SEMAINE: readonly { court: string; long: string }[] = [
  { court: "lun.", long: "lundi" },
  { court: "mar.", long: "mardi" },
  { court: "mer.", long: "mercredi" },
  { court: "jeu.", long: "jeudi" },
  { court: "ven.", long: "vendredi" },
  { court: "sam.", long: "samedi" },
  { court: "dim.", long: "dimanche" },
];
