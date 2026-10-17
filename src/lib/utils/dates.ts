// Dates de Cité Savante : date du jour à Porto-Novo et formatage en français.
//
// ── Date du jour ─────────────────────────────────────────────────────────────
// Date du jour dans le fuseau Africa/Porto-Novo (UTC+1, sans heure d'été),
// pour le code TypeScript qui doit correspondre à `public.aujourdhui()` côté
// SQL (supabase/migrations/20260928000400_fonctions_declencheurs.sql,
// PROGRESS.md, phase 1, décision 2) : le serveur tourne en UTC, et
// `current_date`/`new Date()` y donnent encore la veille entre minuit et 1 h
// à Porto-Novo.
//
// `maintenant` est un paramètre (par défaut `new Date()`) plutôt qu'un appel
// interne : cela rend la fonction testable (voir dates.test.ts) et permet de
// la passer en argument à une fonction mise en cache (`unstable_cache`), où
// elle doit être calculée AVANT l'entrée en cache pour faire partie de la
// clé (src/lib/requetes/evenements.ts).
//
// ── Formatage ────────────────────────────────────────────────────────────────
// Les colonnes `date` de Postgres arrivent en chaînes « AAAA-MM-JJ ». Elles
// sont lues ICI par une expression régulière, jamais par
// `new Date("AAAA-MM-JJ")` : ce constructeur interprète la chaîne en UTC
// minuit, et l'affichage en heure locale d'un serveur ou d'un navigateur à
// l'ouest de Greenwich donnerait la veille. Aucune notion de fuseau
// n'intervient donc dans le formatage d'une date calendaire : « 2027-03-12 »
// s'affiche « 12 mars 2027 » partout. Le nom du mois vient de date-fns
// (locale `fr`, CLAUDE.md section 2) ; le « 1er » est ajouté à la main, car
// le jeton `do` de date-fns donnerait aussi « 2e », « 3e »…, contraire à la
// typographie française des dates.
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/** Date du jour à Porto-Novo, au format « AAAA-MM-JJ ». */
export function aujourdhuiPortoNovo(maintenant: Date = new Date()): string {
  const parties = new Intl.DateTimeFormat("fr", {
    timeZone: "Africa/Porto-Novo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(maintenant);

  const valeur = (type: "year" | "month" | "day") =>
    parties.find((partie) => partie.type === type)?.value ?? "";

  return `${valeur("year")}-${valeur("month")}-${valeur("day")}`;
}

/** Une date calendaire décomposée (mois de 1 à 12). */
export type DateCalendaire = { annee: number; mois: number; jour: number };

const FORMAT_DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function joursDansLeMois(annee: number, mois: number): number {
  // Jour 0 du mois suivant = dernier jour du mois demandé (calcul en UTC,
  // donc sans effet de fuseau). Gère les années bissextiles.
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/**
 * Lit une date « AAAA-MM-JJ » (colonne `date` de Postgres) et vérifie
 * qu'elle existe au calendrier. Lève une erreur en français sinon
 * (« 2027-02-29 », « 2027-13-01 », « 12/03/2027 »…).
 */
export function lireDateIso(date: string): DateCalendaire {
  const correspondance = FORMAT_DATE_ISO.exec(date);
  if (!correspondance) {
    throw new Error(`Date invalide : « ${date} » (format attendu : AAAA-MM-JJ).`);
  }
  const annee = Number(correspondance[1]);
  const mois = Number(correspondance[2]);
  const jour = Number(correspondance[3]);
  if (mois < 1 || mois > 12 || jour < 1 || jour > joursDansLeMois(annee, mois)) {
    throw new Error(`Date invalide : « ${date} » n'existe pas au calendrier.`);
  }
  return { annee, mois, jour };
}

/** Nom du mois en français, en minuscules (« mars »), via date-fns. */
function nomDuMois(date: DateCalendaire): string {
  // Date LOCALE construite à partir des composantes : `format` relit les
  // mêmes composantes locales, aucun décalage possible.
  return format(new Date(date.annee, date.mois - 1, date.jour), "MMMM", { locale: fr });
}

/** « 1er » pour le premier jour du mois, sinon le nombre seul. */
function numeroDuJour(jour: number): string {
  return jour === 1 ? "1er" : String(jour);
}

/**
 * Date complète en français : `formaterDate("2027-03-12")` → « 12 mars 2027 »,
 * `formaterDate("2027-05-01")` → « 1er mai 2027 ».
 */
export function formaterDate(date: string): string {
  const d = lireDateIso(date);
  return `${numeroDuJour(d.jour)} ${nomDuMois(d)} ${d.annee}`;
}

/**
 * Forme courte, sans l'année, pour les cartes et le Plan de la Cité :
 * `formaterDateCourte("2027-03-12")` → « 12 mars » ; « 1er mai ».
 */
export function formaterDateCourte(date: string): string {
  const d = lireDateIso(date);
  return `${numeroDuJour(d.jour)} ${nomDuMois(d)}`;
}

/**
 * Période d'un événement (CLAUDE.md, section 6) :
 * - même jour : « 12 mars 2027 » ;
 * - même mois : « du 12 au 14 mars 2027 » ;
 * - même année : « du 30 avril au 2 mai 2027 » ;
 * - années différentes : « du 30 décembre 2026 au 2 janvier 2027 ».
 * Le premier jour d'un mois s'écrit « 1er » (« du 1er au 3 mars 2027 »).
 * Lève une erreur si la fin précède le début ou si une date est invalide.
 */
export function formaterPeriode(debut: string, fin: string): string {
  const d = lireDateIso(debut);
  const f = lireDateIso(fin);
  if (fin < debut) {
    // Comparaison lexicographique valable : deux chaînes AAAA-MM-JJ validées.
    throw new Error(
      `Période invalide : la date de fin (${fin}) précède la date de début (${debut}).`,
    );
  }
  if (fin === debut) {
    return formaterDate(debut);
  }
  if (d.annee === f.annee && d.mois === f.mois) {
    return `du ${numeroDuJour(d.jour)} au ${numeroDuJour(f.jour)} ${nomDuMois(f)} ${f.annee}`;
  }
  if (d.annee === f.annee) {
    return `du ${formaterDateCourte(debut)} au ${formaterDate(fin)}`;
  }
  return `du ${formaterDate(debut)} au ${formaterDate(fin)}`;
}

const MILLISECONDES_PAR_JOUR = 86_400_000;

function joursDepuisEpoque(date: string): number {
  const d = lireDateIso(date);
  return Date.UTC(d.annee, d.mois - 1, d.jour) / MILLISECONDES_PAR_JOUR;
}

/**
 * Nombre de jours entre `aujourdhui` et `dateLimite` (deux dates
 * « AAAA-MM-JJ ») : 0 le jour même, 1 la veille de la date limite, négatif
 * une fois la date passée. `aujourdhui` vient de `aujourdhuiPortoNovo()`.
 */
export function joursRestants(dateLimite: string, aujourdhui: string): number {
  return joursDepuisEpoque(dateLimite) - joursDepuisEpoque(aujourdhui);
}

/** Seuil d'urgence d'une échéance, en jours (spécifications, section 7). */
export const SEUIL_URGENCE_JOURS = 7;

/**
 * Une échéance est « urgente » si sa date limite n'est pas passée et tombe
 * dans 7 jours ou moins (spécifications, section 7) : de 0 (aujourd'hui) à
 * 7 jours inclus. Une échéance passée n'est pas urgente.
 */
export function estUrgente(dateLimite: string, aujourdhui: string): boolean {
  const jours = joursRestants(dateLimite, aujourdhui);
  return jours >= 0 && jours <= SEUIL_URGENCE_JOURS;
}

/**
 * Écart en jours dit en toutes lettres, à composer dans une phrase
 * (« Clôture {texte} ») : 0 → « aujourd’hui », 1 → « demain »,
 * 3 → « dans 3 jours », -1 → « hier », -4 → « il y a 4 jours ».
 */
export function decrireJoursRestants(jours: number): string {
  if (!Number.isInteger(jours)) {
    throw new Error(`Nombre de jours invalide : ${jours} (entier attendu).`);
  }
  if (jours === 0) return "aujourd’hui";
  if (jours === 1) return "demain";
  if (jours === -1) return "hier";
  if (jours > 1) return `dans ${jours} jours`;
  return `il y a ${-jours} jours`;
}
