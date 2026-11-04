// Contenu des images d'aperçu (Open Graph, spécifications 10.5) : ce qui est
// écrit sur l'image d'un événement ou d'une organisation, et la taille des
// textes longs. Fonctions pures, sans lecture de la base, testées
// (`donnees.test.ts`).
//
// Textes longs : le titre (et le sigle) est d'abord nettoyé
// (`nettoyerTexteApercu`, caractères couverts par les polices locales), puis
// coupé à `LONGUEUR_MAX_TITRE` caractères (graphèmes) à la fin d'un mot, puis
// dessiné dans une taille qui décroît avec sa longueur ; le rendu
// (`apercus.tsx`) le borne enfin à quelques lignes, avec « … » (`lineClamp`).
// Un titre de 120 caractères tient ainsi en trois lignes de 46 px.
import { resumerTexte } from "@/components/societes/fiche/utilitaires";
import type { Enums } from "@/lib/supabase/types";
import { categorieOrganisationLabels, typeEvenementLabels } from "@/lib/textes";
import { formaterDate, formaterHeure, formaterPeriode, heureConnue } from "@/lib/utils/dates";
import { siglesOrganisateurs, texteLieu, type EvenementFiche } from "@/lib/utils/evenements";
import { nettoyerSegmentApercu, nettoyerTexteApercu } from "@/lib/og/texte";
import { premiereLettreMajuscule } from "@/lib/utils/texte";

/** Longueur maximale d'un titre sur l'image (graphèmes, « … » compris). */
export const LONGUEUR_MAX_TITRE = 200;

/** Longueur maximale d'un nom complet d'organisation sur l'image. */
export const LONGUEUR_MAX_NOM = 160;

/** Longueur maximale d'un sigle sur l'image. */
export const LONGUEUR_MAX_SIGLE = 40;

/** Nombre maximal de sigles d'organisateurs nommés ; au-delà, « et N autres ». */
export const SIGLES_MAX = 4;

const segmenteur = new Intl.Segmenter("fr", { granularity: "grapheme" });
const listeFrancaise = new Intl.ListFormat("fr", { style: "long", type: "conjunction" });

/** Nombre de caractères perçus (un emoji, une lettre accentuée comptent pour un). */
export function longueurGraphemes(texte: string): number {
  let longueur = 0;
  for (const morceau of segmenteur.segment(texte)) {
    if (morceau.segment) longueur += 1;
  }
  return longueur;
}

/** Taille d'un titre d'événement (px) et nombre de lignes au plus. */
export type TailleTitre = { taille: number; lignes: number };

/**
 * Taille du titre d'un événement selon sa longueur (graphèmes), pour une
 * colonne de texte de 1 044 px : court en grand, long en plus petit, et au
 * plus 3 ou 4 lignes.
 */
export function tailleTitreEvenement(longueur: number): TailleTitre {
  if (longueur <= 40) return { taille: 68, lignes: 2 };
  if (longueur <= 70) return { taille: 60, lignes: 3 };
  if (longueur <= 100) return { taille: 52, lignes: 3 };
  return { taille: 46, lignes: 4 };
}

/** Taille du sigle d'une organisation (px), sur une seule ligne. */
export function tailleSigle(longueur: number): number {
  if (longueur <= 4) return 160;
  if (longueur <= 6) return 140;
  if (longueur <= 8) return 116;
  if (longueur <= 12) return 92;
  return 76;
}

/** « Organisé par A, B et C » ; au-delà de `SIGLES_MAX`, « Organisé par A, B, C, D et 2 autres ». */
export function texteOrganisateurs(sigles: readonly string[]): string | null {
  const propres = sigles.map(nettoyerSegmentApercu).filter((sigle) => sigle !== "");
  if (propres.length === 0) return null;
  if (propres.length <= SIGLES_MAX) return `Organisé par ${listeFrancaise.format(propres)}`;
  const autres = propres.length - SIGLES_MAX;
  const nommes = propres.slice(0, SIGLES_MAX);
  return `Organisé par ${nommes.join(", ")} et ${autres === 1 ? "1 autre" : `${autres} autres`}`;
}

/**
 * Dates de l'image : période (`formaterPeriode`, première lettre en
 * capitale), et l'heure de début pour un événement d'un seul jour qui en a
 * une (« 12 mars 2027 à 8 h 30 »).
 */
export function texteDatesApercu(
  evenement: Pick<EvenementFiche, "dateDebut" | "dateFin" | "heureDebut">,
): string {
  const heure = heureConnue(evenement.heureDebut);
  if (evenement.dateDebut === evenement.dateFin && heure) {
    return `${formaterDate(evenement.dateDebut)} à ${formaterHeure(heure)}`;
  }
  return premiereLettreMajuscule(formaterPeriode(evenement.dateDebut, evenement.dateFin));
}

/** Ce qu'écrit l'image d'un événement. */
export type ApercuEvenement = {
  /** Libellé du type (« Congrès »), affiché dans le badge. */
  type: string;
  titre: string;
  tailleTitre: TailleTitre;
  /** « Du 12 au 14 mars 2027 », « 12 mars 2027 à 8 h 30 ». */
  dates: string;
  /** Lieu ou « En ligne » (`texteLieu`, sans adresse ni pays). */
  lieu: string;
  /** « Organisé par SOBEPED et SBMI », ou `null` sans organisatrice publiée. */
  organisateurs: string | null;
};

/** Champs de la fiche dont l'image d'un événement a besoin. */
export type EvenementApercu = Pick<
  EvenementFiche,
  | "type"
  | "titre"
  | "dateDebut"
  | "dateFin"
  | "heureDebut"
  | "modalite"
  | "lieuNom"
  | "ville"
  | "organisateurs"
>;

/**
 * Contenu de l'image d'un événement publié, ou `null` si son titre ne
 * contient aucun caractère dessinable (l'image générique est alors servie).
 */
export function apercuEvenement(evenement: EvenementApercu): ApercuEvenement | null {
  const titre = resumerTexte(nettoyerTexteApercu(evenement.titre), LONGUEUR_MAX_TITRE);
  if (!titre) return null;
  return {
    type: typeEvenementLabels[evenement.type],
    titre,
    tailleTitre: tailleTitreEvenement(longueurGraphemes(titre)),
    dates: texteDatesApercu(evenement),
    // Chaque morceau est nettoyé AVANT l'assemblage : un morceau vide est écarté
    // par `texteLieu` (jamais « , Ouidah ») ; sans aucun morceau, sa forme sans
    // lieu connu (« Lieu à préciser », « En présentiel et en ligne »).
    lieu: texteLieu({
      modalite: evenement.modalite,
      lieuNom: nettoyerSegmentApercu(evenement.lieuNom),
      ville: nettoyerSegmentApercu(evenement.ville),
    }),
    organisateurs: texteOrganisateurs(siglesOrganisateurs(evenement)),
  };
}

/** Ce qu'écrit l'image d'une organisation. */
export type ApercuSociete = {
  /** Libellé de la catégorie (« Société savante »), affiché dans le badge. */
  categorie: string;
  sigle: string;
  tailleSigle: number;
  /** Nom complet, ou `null` s'il est absent. */
  nomComplet: string | null;
  /** « Santé, Agronomie et Environnement », ou `null` sans discipline. */
  disciplines: string | null;
};

/** Champs de la fiche dont l'image d'une organisation a besoin. */
export type SocieteApercu = {
  sigle: string;
  nomComplet: string | null;
  categorie: Enums<"categorie_organisation">;
  disciplines: readonly { nom: string }[];
};

/**
 * Contenu de l'image d'une organisation publiée, ou `null` si son sigle ne
 * contient aucun caractère dessinable (l'image générique est alors servie).
 */
export function apercuSociete(societe: SocieteApercu): ApercuSociete | null {
  const sigle = resumerTexte(nettoyerTexteApercu(societe.sigle), LONGUEUR_MAX_SIGLE);
  if (!sigle) return null;
  const nom = resumerTexte(nettoyerTexteApercu(societe.nomComplet), LONGUEUR_MAX_NOM);
  const disciplines = societe.disciplines
    .map((discipline) => nettoyerSegmentApercu(discipline.nom))
    .filter((nomDiscipline) => nomDiscipline !== "");
  return {
    categorie: categorieOrganisationLabels[societe.categorie],
    sigle,
    tailleSigle: tailleSigle(longueurGraphemes(sigle)),
    nomComplet: nom || null,
    disciplines: disciplines.length > 0 ? listeFrancaise.format(disciplines) : null,
  };
}
