// Slugs (adresses publiques) des organisations et des événements.
//
// Règles (spécifications, section 7 ; CLAUDE.md, section 6) : URL en
// français, en minuscules, sans accents. Organisation : le sigle en
// minuscules (`sobeped`). Événement : `type-sigle-annee` si possible
// (`congres-sobeped-2027`), sinon `titre-annee`. En cas de collision,
// suffixe `-2`, `-3`… Un slug publié ne change plus (garanti côté base par
// les déclencheurs de la migration 4).
//
// Fonctions pures, sans accès à la base : l'appelant (server actions des
// phases 5 et 6) lit les slugs existants et les passe à `dedoublonnerSlug`.
import type { Enums } from "@/lib/supabase/types";

/** Format d'un slug valide : minuscules ASCII et chiffres, séparés par un tiret simple. */
export const FORMAT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Longueur maximale acceptée par `estSlugValide` (garde-fou des paramètres d'URL). */
export const LONGUEUR_MAX_SLUG = 120;

/** Longueur maximale de la partie « titre » d'un slug d'événement. */
export const LONGUEUR_MAX_TITRE_SLUG = 80;

// Lettres que la décomposition Unicode (NFKD) ne ramène pas à l'ASCII.
const LETTRES_SPECIALES: Record<string, string> = {
  œ: "oe",
  Œ: "oe",
  æ: "ae",
  Æ: "ae",
  ß: "ss",
  ø: "o",
  Ø: "o",
  đ: "d",
  Đ: "d",
  ł: "l",
  Ł: "l",
  ı: "i",
};

/**
 * Transforme un texte en slug : minuscules, sans accents (« é » → « e »,
 * « œ » → « oe »), tout autre caractère remplacé par un tiret, tirets
 * répétés fusionnés, aucun tiret au début ni à la fin. Peut renvoyer une
 * chaîne vide (texte sans lettre ni chiffre).
 *
 * Sert aussi à comparer des valeurs saisies librement (villes de l'annuaire).
 */
export function slugifier(texte: string): string {
  return texte
    .replace(/[œŒæÆßøØđĐłŁı]/g, (lettre) => LETTRES_SPECIALES[lettre] ?? lettre)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Vrai si `slug` a le format d'un slug du site (paramètre d'URL à valider avant toute requête). */
export function estSlugValide(slug: string): boolean {
  return slug.length > 0 && slug.length <= LONGUEUR_MAX_SLUG && FORMAT_SLUG.test(slug);
}

/** Coupe un slug à `longueurMax` caractères au plus, sur une limite de mot (tiret). */
function tronquerSlug(slug: string, longueurMax: number): string {
  if (slug.length <= longueurMax) return slug;
  const coupe = slug.slice(0, longueurMax + 1);
  const dernierTiret = coupe.lastIndexOf("-");
  const resultat = dernierTiret > 0 ? coupe.slice(0, dernierTiret) : slug.slice(0, longueurMax);
  return resultat.replace(/-+$/, "");
}

// Ponctuation interne d'un sigle, retirée avant de le slugifier : points,
// apostrophes (droite, typographiques, lettre modificative) et espaces de
// toute sorte. Le tiret, séparateur voulu par l'organisation, est gardé.
const PONCTUATION_SIGLE = /[.'\u2018\u2019\u02BC\s]+/g;

/**
 * Forme « slug » d'un sigle : le sigle en minuscules, sans accents, COLLÉ
 * (section 7 : « sigle en minuscules ») : `S.B.C.`, `S B C` et `SBC` → `sbc`,
 * `SOB’AN` → `soban`, `UAC FSS` → `uacfss` ; un tiret reste un tiret
 * (`UAC-FSS` → `uac-fss`), tout autre signe aussi (`A&B` → `a-b`). Partagée
 * par `slugSociete` et `slugEvenement` : la fiche `/societes/sbc` et
 * l'événement `congres-sbc-2027` écrivent le sigle de la même façon. Peut
 * renvoyer une chaîne vide.
 */
export function slugSigle(sigle: string): string {
  return slugifier(sigle.replace(PONCTUATION_SIGLE, ""));
}

/**
 * Slug d'une organisation : `slugSigle` (`SOBEPED` → `sobeped`, `SOBÉPED` →
 * `sobeped`, `S.B.C.` → `sbc`), coupé à 80 caractères. Lève une erreur si
 * le sigle ne contient ni lettre ni chiffre.
 */
export function slugSociete(sigle: string): string {
  const slug = tronquerSlug(slugSigle(sigle), LONGUEUR_MAX_TITRE_SLUG);
  if (!slug) {
    throw new Error(
      `Impossible de construire l'adresse de l'organisation : le sigle « ${sigle} » ne contient ni lettre ni chiffre.`,
    );
  }
  return slug;
}

/** Données nécessaires au slug d'un événement. */
export type DonneesSlugEvenement = {
  type: Enums<"type_evenement">;
  /** Sigle de l'organisation organisatrice principale, s'il y en a une. */
  sigleOrganisateur?: string | null;
  /** Année de début de l'événement (entier, 1800 à 2100). */
  annee: number;
  titre: string;
};

/**
 * Slug d'un événement (spécifications, section 7) :
 * - `type-sigle-annee` quand un sigle d'organisateur est connu et que le type
 *   n'est pas « autre » (`congres-sobeped-2027`) ;
 * - sinon `titre-annee` (`journees-scientifiques-de-parakou-2027`), titre
 *   coupé à 80 caractères sur une limite de mot, sans répéter l'année si le
 *   titre la contient déjà (« Congrès 2027 » → `congres-2027`) ;
 * - en dernier recours (titre sans lettre ni chiffre) : `type-sigle-annee`
 *   avec les parties disponibles (`autre-2027`).
 * Choix : pour le type « autre », `autre-sobeped-2027` ne dirait rien de
 * l'événement ; le titre est préféré. Le slug obtenu n'est pas forcément
 * libre : le passer ensuite à `dedoublonnerSlug`.
 */
export function slugEvenement({
  type,
  sigleOrganisateur,
  annee,
  titre,
}: DonneesSlugEvenement): string {
  if (!Number.isInteger(annee) || annee < 1800 || annee > 2100) {
    throw new Error(`Année invalide pour l'adresse de l'événement : ${annee}.`);
  }
  const typeSlug = slugifier(type);
  const sigle = sigleOrganisateur ? tronquerSlug(slugSigle(sigleOrganisateur), 40) : "";
  const anneeTexte = String(annee);

  if (sigle && type !== "autre") {
    return `${typeSlug}-${sigle}-${anneeTexte}`;
  }

  const titreSlug = tronquerSlug(slugifier(titre), LONGUEUR_MAX_TITRE_SLUG);
  if (titreSlug) {
    const contientAnnee = titreSlug.split("-").includes(anneeTexte);
    return contientAnnee ? titreSlug : `${titreSlug}-${anneeTexte}`;
  }

  return [typeSlug, sigle, anneeTexte].filter(Boolean).join("-");
}

/**
 * Rend un slug unique : renvoie `slug` s'il est libre, sinon le premier de
 * `slug-2`, `slug-3`… absent de `existants`. Le suffixe est toujours AJOUTÉ :
 * un nombre déjà présent à la fin du slug (une année, par exemple) n'est
 * jamais pris pour un suffixe (`congres-sobeped-2027` → `congres-sobeped-2027-2`).
 */
export function dedoublonnerSlug(slug: string, existants: Iterable<string>): string {
  const pris = new Set(existants);
  if (!pris.has(slug)) return slug;
  for (let numero = 2; numero <= 10_000; numero += 1) {
    const candidat = `${slug}-${numero}`;
    if (!pris.has(candidat)) return candidat;
  }
  throw new Error(`Impossible de trouver une adresse libre à partir de « ${slug} ».`);
}
