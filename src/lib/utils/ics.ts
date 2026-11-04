// Fichier agenda d'un événement (spécifications, section 10.2), généré SANS
// bibliothèque (CLAUDE.md, section 2), conforme à la RFC 5545 :
//   - VCALENDAR (VERSION:2.0, PRODID, CALSCALE:GREGORIAN, METHOD:PUBLISH) et
//     un seul VEVENT : UID `{id}@citesavante.com`, DTSTAMP (UTC), DTSTART et
//     DTEND, SUMMARY, LOCATION (si un lieu est connu), DESCRIPTION (résumé,
//     heure de début s'il y a lieu, puis « Détails : {URL de la fiche} »), URL ;
//   - valeurs TEXT échappées (« \ », « ; », « , », retour à la ligne → « \n »),
//     caractères de contrôle remplacés par une espace ; URL (type URI) non
//     échappée ;
//   - lignes pliées à 75 OCTETS UTF-8 (CRLF suivi d'une espace), sans jamais
//     couper un caractère multi-octets ; toutes les lignes, la dernière
//     comprise, finissent par CRLF.
//
// Plage horaire (`plageEvenement`, partagée avec le lien Google Agenda de
// `partage.ts` pour que les deux donnent toujours la même chose) :
//   - sans heure de début, OU sur plusieurs jours : journées entières,
//     `DTSTART;VALUE=DATE` = premier jour, `DTEND;VALUE=DATE` = LENDEMAIN du
//     dernier jour (fin exclusive, RFC 5545 3.6.1). Choix pour un événement de
//     plusieurs jours avec une heure de début : la RFC interdit de mélanger un
//     DTSTART daté-heure et un DTEND date, et la base n'a pas d'heure de fin ;
//     un congrès de trois jours s'affiche mieux en bandeau « journée entière »
//     sur chacun de ses jours qu'en bloc horaire inventé. L'heure de début est
//     alors écrite dans la DESCRIPTION (« Début le 12 mars 2027 à 8 h 30. ») ;
//   - un seul jour AVEC une heure : `DTSTART;TZID=Africa/Porto-Novo` et
//     `DTEND;TZID=Africa/Porto-Novo`, avec un bloc VTIMEZONE (UTC+1 toute
//     l'année, sans heure d'été) pour que Google Agenda et les téléphones
//     placent l'événement à la bonne heure. HEURE DE FIN : la table
//     `evenements` n'a PAS de colonne `heure_fin` ; la fin est donc toujours
//     « début + 1 h » (`DUREE_PAR_DEFAUT_MINUTES`, durée par défaut de Google
//     Agenda), passage à minuit compris (23 h 30 → 0 h 30 le lendemain).
//   - une heure de 24 h ou plus compte comme absente (`heureConnue`).
import { site } from "@/config/site";
import {
  formaterDate,
  formaterHeure,
  ajouterJours,
  heureConnue,
  lireDateIso,
  lireHeure,
} from "@/lib/utils/dates";
import { lieuAgenda, type LieuEvenement } from "@/lib/utils/evenements";
import { estSlugValide } from "@/lib/utils/slugs";

/** Fuseau horaire des événements (Bénin : UTC+1, sans heure d'été). */
export const FUSEAU_HORAIRE = "Africa/Porto-Novo";

/** Durée attribuée à un événement d'un jour avec une heure de début (aucune heure de fin en base). */
export const DUREE_PAR_DEFAUT_MINUTES = 60;

/**
 * Domaine des identifiants `UID` : `site.domaine`, valeur fixe (jamais
 * `site.url`) — un même événement garde le même UID dans tous les
 * environnements, et un agenda qui réimporte le fichier le met à jour au
 * lieu de le dupliquer.
 */
export const DOMAINE_UID = site.domaine;

/** En-tête `Content-Type` de la route `/agenda/[slug]/ics` (section 10.2). */
export const TYPE_CONTENU_ICS = "text/calendar; charset=utf-8";

/** Longueur maximale d'une ligne, en octets, hors CRLF (RFC 5545, 3.1). */
export const OCTETS_MAX_PAR_LIGNE = 75;

const CRLF = "\r\n";

/**
 * Ce qu'il faut pour exporter un événement vers un agenda (.ics, Google
 * Agenda, WhatsApp). `EvenementFiche` (src/lib/utils/evenements.ts) le
 * satisfait directement.
 */
export type EvenementExportable = LieuEvenement & {
  id: string;
  titre: string;
  /** Résumé (repris dans la description), ou `null`. */
  resume?: string | null;
  /** « AAAA-MM-JJ ». */
  dateDebut: string;
  /** « AAAA-MM-JJ ». */
  dateFin: string;
  /** « HH:MM:SS » ou `null`. */
  heureDebut: string | null;
};

/** Un instant « local » à Porto-Novo : date « AAAA-MM-JJ » et heure « HH:MM:SS ». */
export type InstantLocal = { date: string; heure: string };

/**
 * Plage d'un événement pour un agenda externe (voir l'en-tête du fichier).
 * - journées entières : `debut` (premier jour) et `finExclusive` (lendemain
 *   du dernier jour), au format « AAAA-MM-JJ » ; `heureDebut` = heure de
 *   début connue mais non utilisée (événement de plusieurs jours), à écrire
 *   dans la description, sinon `null` ;
 * - horaire : `debut` et `fin` (= début + `DUREE_PAR_DEFAUT_MINUTES`), heure
 *   locale de Porto-Novo.
 */
export type PlageEvenement =
  | { journeeEntiere: true; debut: string; finExclusive: string; heureDebut: string | null }
  | { journeeEntiere: false; debut: InstantLocal; fin: InstantLocal };

const deuxChiffres = (nombre: number) => String(nombre).padStart(2, "0");

/** Ajoute des minutes à un instant local (calcul en UTC « flottant » : aucun effet de fuseau). */
function ajouterMinutes(instant: InstantLocal, minutes: number): InstantLocal {
  const d = lireDateIso(instant.date);
  const h = lireHeure(instant.heure);
  const base = new Date(0);
  base.setUTCFullYear(d.annee, d.mois - 1, d.jour);
  base.setUTCHours(h.heures, h.minutes + minutes, h.secondes, 0);
  const date = `${String(base.getUTCFullYear()).padStart(4, "0")}-${deuxChiffres(base.getUTCMonth() + 1)}-${deuxChiffres(base.getUTCDate())}`;
  const heure = `${deuxChiffres(base.getUTCHours())}:${deuxChiffres(base.getUTCMinutes())}:${deuxChiffres(base.getUTCSeconds())}`;
  return { date, heure };
}

/** Heure normalisée « HH:MM:SS ». */
function heureNormalisee(heure: string): string {
  const h = lireHeure(heure);
  return `${deuxChiffres(h.heures)}:${deuxChiffres(h.minutes)}:${deuxChiffres(h.secondes)}`;
}

/**
 * Plage d'un événement (voir `PlageEvenement` et l'en-tête du fichier).
 * Lève une erreur si une date ou l'heure est invalide, ou si la fin précède
 * le début.
 */
export function plageEvenement(
  evenement: Pick<EvenementExportable, "dateDebut" | "dateFin" | "heureDebut">,
): PlageEvenement {
  lireDateIso(evenement.dateDebut);
  lireDateIso(evenement.dateFin);
  if (evenement.dateFin < evenement.dateDebut) {
    throw new Error(
      `Période invalide : la date de fin (${evenement.dateFin}) précède la date de début (${evenement.dateDebut}).`,
    );
  }
  const heure = heureConnue(evenement.heureDebut);
  if (heure === null || evenement.dateDebut !== evenement.dateFin) {
    return {
      journeeEntiere: true,
      debut: evenement.dateDebut,
      finExclusive: ajouterJours(evenement.dateFin, 1),
      heureDebut: heure,
    };
  }
  const debut = { date: evenement.dateDebut, heure };
  return {
    journeeEntiere: false,
    debut,
    fin: ajouterMinutes(debut, DUREE_PAR_DEFAUT_MINUTES),
  };
}

/** « 2027-03-12 » → « 20270312 » (DATE de la RFC 5545, `dates` de Google Agenda). */
export function dateCompacte(date: string): string {
  lireDateIso(date);
  return date.replaceAll("-", "");
}

/** Instant local → « 20270312T090000 » (DATE-TIME local, sans « Z »). */
export function instantCompact(instant: InstantLocal): string {
  return `${dateCompacte(instant.date)}T${heureNormalisee(instant.heure).replaceAll(":", "")}`;
}

/** Instant UTC → « 20261030T081500Z » (DTSTAMP). */
export function instantUtcCompact(instant: Date): string {
  if (Number.isNaN(instant.getTime())) throw new Error("Horodatage invalide pour DTSTAMP.");
  return (
    `${String(instant.getUTCFullYear()).padStart(4, "0")}${deuxChiffres(instant.getUTCMonth() + 1)}` +
    `${deuxChiffres(instant.getUTCDate())}T${deuxChiffres(instant.getUTCHours())}` +
    `${deuxChiffres(instant.getUTCMinutes())}${deuxChiffres(instant.getUTCSeconds())}Z`
  );
}

/**
 * Texte de description commun au .ics et au lien Google Agenda : le résumé
 * (s'il existe), l'heure de début d'un événement de plusieurs jours (que la
 * plage « journées entières » ne porte pas), puis « Détails : {urlFiche} ».
 * Paragraphes séparés par une ligne vide ; espace insécable avant « : »,
 * comme partout sur le site.
 */
export function descriptionAgenda(evenement: EvenementExportable, urlFiche: string): string {
  const plage = plageEvenement(evenement);
  const paragraphes: string[] = [];
  const resume = evenement.resume?.trim();
  if (resume) paragraphes.push(resume);
  if (plage.journeeEntiere && plage.heureDebut) {
    paragraphes.push(
      `Début le ${formaterDate(evenement.dateDebut)} à ${formaterHeure(plage.heureDebut)}.`,
    );
  }
  paragraphes.push(`Détails : ${urlFiche}`);
  return paragraphes.join("\n\n");
}

// Caractères de contrôle interdits dans une valeur TEXT (RFC 5545, 3.3.11),
// hors retours à la ligne, traités à part. La tabulation est remplacée elle
// aussi (admise par la norme, mais mal affichée par certains agendas).
const CONTROLES = /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Échappe une valeur TEXT (RFC 5545, 3.3.11) : « \ » → « \\ », « ; » → « \; »,
 * « , » → « \, », retour à la ligne (CRLF, LF ou CR) → « \n » ; autres
 * caractères de contrôle → espace. Les « : » et les guillemets ne
 * s'échappent pas.
 */
export function echapperTexteIcs(texte: string): string {
  return texte
    .replace(CONTROLES, " ")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encodeur = new TextEncoder();

/**
 * Plie une ligne de contenu à 75 octets UTF-8 (RFC 5545, 3.1) : coupe entre
 * deux caractères (points de code), jamais au milieu d'une séquence
 * multi-octets (accents : 2 octets, emoji : 4) ; chaque suite commence par
 * une espace, qui compte dans ses 75 octets. Renvoie la ligne pliée, avec des
 * CRLF internes, sans CRLF final.
 */
export function plierLigneIcs(ligne: string): string {
  const morceaux: string[] = [];
  let courant = "";
  let octets = 0;
  let limite = OCTETS_MAX_PAR_LIGNE;
  for (const caractere of ligne) {
    const taille = encodeur.encode(caractere).length;
    if (octets + taille > limite) {
      morceaux.push(courant);
      courant = "";
      octets = 0;
      limite = OCTETS_MAX_PAR_LIGNE - 1; // l'espace de continuation compte
    }
    courant += caractere;
    octets += taille;
  }
  morceaux.push(courant);
  return morceaux.join(`${CRLF} `);
}

/** Bloc VTIMEZONE du fuseau de Porto-Novo : UTC+1 toute l'année, sans heure d'été. */
export const VTIMEZONE_PORTO_NOVO: readonly string[] = [
  "BEGIN:VTIMEZONE",
  `TZID:${FUSEAU_HORAIRE}`,
  `X-LIC-LOCATION:${FUSEAU_HORAIRE}`,
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0100",
  "TZNAME:WAT",
  "DTSTART:19700101T000000",
  "END:STANDARD",
  "END:VTIMEZONE",
];

// Adresse absolue sans espace ni caractère de contrôle (valeur URI non échappée).
const URL_ABSOLUE = /^https?:\/\/[^\s\u0000-\u001F\u007F]+$/i;

/** Options de `genererIcs`. */
export type OptionsIcs = {
  /** Adresse ABSOLUE de la fiche (`urlAbsolue(`/agenda/${slug}`)`, src/lib/utils/urls.ts). */
  urlFiche: string;
  /** Instant de génération, pour DTSTAMP (UTC) ; par défaut `new Date()`. */
  maintenant?: Date;
};

/**
 * Fichier .ics complet d'un événement (voir l'en-tête du fichier) : lignes
 * pliées, fins de ligne CRLF partout (dernière ligne comprise). Lève une
 * erreur si `urlFiche` n'est pas une adresse absolue http(s) sans espace, ou
 * si les dates ou l'heure sont invalides.
 */
export function genererIcs(evenement: EvenementExportable, options: OptionsIcs): string {
  const { urlFiche, maintenant = new Date() } = options;
  if (!URL_ABSOLUE.test(urlFiche)) {
    throw new Error(`Adresse de fiche invalide pour le fichier agenda : « ${urlFiche} ».`);
  }
  const plage = plageEvenement(evenement);
  const lieu = lieuAgenda(evenement);

  const lignes: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cite Savante//Agenda//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(plage.journeeEntiere ? [] : VTIMEZONE_PORTO_NOVO),
    "BEGIN:VEVENT",
    `UID:${echapperTexteIcs(`${evenement.id}@${DOMAINE_UID}`)}`,
    `DTSTAMP:${instantUtcCompact(maintenant)}`,
    ...(plage.journeeEntiere
      ? [
          `DTSTART;VALUE=DATE:${dateCompacte(plage.debut)}`,
          `DTEND;VALUE=DATE:${dateCompacte(plage.finExclusive)}`,
        ]
      : [
          `DTSTART;TZID=${FUSEAU_HORAIRE}:${instantCompact(plage.debut)}`,
          `DTEND;TZID=${FUSEAU_HORAIRE}:${instantCompact(plage.fin)}`,
        ]),
    `SUMMARY:${echapperTexteIcs(evenement.titre.replace(/\s+/g, " ").trim())}`,
    ...(lieu ? [`LOCATION:${echapperTexteIcs(lieu)}`] : []),
    `DESCRIPTION:${echapperTexteIcs(descriptionAgenda(evenement, urlFiche))}`,
    `URL:${urlFiche}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lignes.map((ligne) => `${plierLigneIcs(ligne)}${CRLF}`).join("");
}

/**
 * Nom du fichier téléchargé (section 10.2 : « nom de fichier = slug ») :
 * `nomFichierIcs("congres-sobeped-2027")` → « congres-sobeped-2027.ics ».
 * Pour l'en-tête `Content-Disposition: attachment; filename="…"` : le slug,
 * vérifié au format du site, ne contient ni guillemet ni caractère non ASCII.
 * Lève une erreur pour un slug mal formé.
 */
export function nomFichierIcs(slug: string): string {
  if (!estSlugValide(slug)) throw new Error(`Slug invalide pour un fichier agenda : « ${slug} ».`);
  return `${slug}.ics`;
}
