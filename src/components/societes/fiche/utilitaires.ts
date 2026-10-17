// Fonctions pures de la fiche organisation (`/societes/[slug]`, spécifications
// 8.2) : titre et description des métadonnées, découpage de la présentation
// en paragraphes, numéro de téléphone au format international, nom d'hôte
// affiché sous les boutons de la passerelle.
//
// Aucune dépendance serveur (pas de `@/lib/requetes/` à l'exécution : le type
// `SocieteFiche` n'est importé qu'en `import type`, effacé à la compilation),
// donc testables sous Vitest (`utilitaires.test.ts`).
import type { SocieteFiche } from "@/lib/requetes/societes";
import type { Enums } from "@/lib/supabase/types";
import { categorieOrganisationLabels } from "@/lib/textes";
import { slugifier } from "@/lib/utils/slugs";
import { hrefTelephone } from "@/lib/utils/urls";

/** Longueur maximale de la description des métadonnées (balise `description`, Open Graph). */
export const LONGUEUR_MAX_DESCRIPTION_META = 160;

/**
 * Découpe un texte libre en paragraphes (séparés par au moins une ligne
 * vide), chacun en lignes (retours à la ligne simples conservés). Espaces de
 * début et de fin retirés, lignes et paragraphes vides ignorés. Le texte
 * reste du texte : il est affiché par React (échappé), jamais interprété
 * comme du HTML.
 */
export function paragraphes(texte: string | null | undefined): string[][] {
  if (!texte) return [];
  return texte
    .replace(/\r\n?/g, "\n")
    .split(/\n[^\S\n]*\n/)
    .map((paragraphe) =>
      paragraphe
        .split("\n")
        .map((ligne) => ligne.replace(/\s+/g, " ").trim())
        .filter((ligne) => ligne !== ""),
    )
    .filter((lignes) => lignes.length > 0);
}

/** Découpe en graphèmes (caractères perçus) : un emoji, une lettre accentuée décomposée restent entiers. */
const segmenteurGraphemes = new Intl.Segmenter("fr", { granularity: "grapheme" });

function graphemes(texte: string): string[] {
  return Array.from(segmenteurGraphemes.segment(texte), (morceau) => morceau.segment);
}

/**
 * Résume un texte sur une seule ligne, en `max` caractères au plus (points
 * de suspension compris) : espaces et retours à la ligne ramenés à une
 * espace, coupure à la fin d'un mot quand c'est possible, ponctuation finale
 * retirée avant « … ». Texte vide : chaîne vide.
 *
 * « Caractère » = graphème (`Intl.Segmenter`), jamais une unité UTF-16 : la
 * coupe ne sépare jamais une paire de substitution (emoji, caractère hors du
 * plan de base) ni une lettre de son accent combinant ; sinon un
 * demi-caractère isolé finissait dans la meta description, Open Graph et le
 * JSON-LD (relecture de la phase 2).
 */
export function resumerTexte(texte: string | null | undefined, max: number): string {
  if (!Number.isInteger(max) || max < 2) {
    throw new Error(`Longueur maximale invalide : ${max} (entier d'au moins 2 attendu).`);
  }
  const uni = (texte ?? "").replace(/\s+/g, " ").trim();
  const caracteres = graphemes(uni);
  if (caracteres.length <= max) return uni;

  // `max - 1` caractères, plus « … ».
  const coupe = caracteres.slice(0, max - 1);
  const finDeMot = caracteres[max - 1] === " ";
  const derniereEspace = coupe.lastIndexOf(" ");
  // Si la coupe tombe au milieu d'un mot, revenir à l'espace précédente, mais
  // seulement si l'on garde l'essentiel du texte : un premier mot démesuré
  // est coupé au caractère près.
  const garde = finDeMot || derniereEspace < max * 0.6 ? coupe : coupe.slice(0, derniereEspace);
  return `${garde.join("").replace(/[\s,;:.!?…'’\-–—(«]+$/u, "")}…`;
}

/** Vrai si `pays` désigne le Bénin (casse, accents et espaces indifférents). */
export function estPaysBenin(pays: string | null | undefined): boolean {
  return pays ? slugifier(pays) === "benin" : false;
}

/** Indicatif téléphonique du Bénin. */
const INDICATIF_BENIN = "+229";

/**
 * Lien « tel: » au format international (« tel:+229… ») d'un numéro saisi
 * librement, ou `null` si le pays du numéro ne peut pas être établi :
 * - « +229 01 97 00 00 00 » : gardé tel quel (séparateurs retirés) ;
 * - « 00229 01 97… » : « 00 » remplacé par « + » ;
 * - sans indicatif : « +229 » ajouté seulement si l'organisation est au
 *   Bénin ET que le numéro a 10 chiffres (numérotation béninoise en vigueur
 *   depuis le 30 novembre 2024) ; sinon `null` (le numéro reste affiché en
 *   texte, sans lien).
 * Le contrôle final (6 à 15 chiffres après « + ») est celui de
 * `hrefTelephone` (src/lib/utils/urls.ts).
 */
export function hrefTelephoneInternational(
  numero: string | null | undefined,
  pays: string | null | undefined,
): string | null {
  if (!numero) return null;
  const compact = numero.trim().replace(/[\s.()/-]/g, "");
  if (compact.startsWith("+")) return hrefTelephone(compact);
  if (compact.startsWith("00")) return hrefTelephone(`+${compact.slice(2)}`);
  if (estPaysBenin(pays) && /^\d{10}$/.test(compact)) {
    return hrefTelephone(`${INDICATIF_BENIN}${compact}`);
  }
  return null;
}

/**
 * Nom d'hôte lisible d'une URL (« https://www.sobeped.org/accueil » →
 * « sobeped.org »), affiché près des boutons de la passerelle : le lien
 * `/go/…` ne montre pas la destination au survol. `null` si l'URL est
 * illisible.
 */
export function nomHote(url: string): string | null {
  try {
    const hote = new URL(url).hostname.replace(/^www\./i, "");
    return hote === "" ? null : hote;
  } catch {
    return null;
  }
}

/**
 * Nom complet à afficher à côté du sigle, ou `null` s'il est absent ou
 * identique au sigle (casse et espaces indifférents) : on ne l'écrit pas
 * deux fois.
 */
export function nomCompletDistinct(
  societe: Pick<SocieteFiche, "sigle" | "nomComplet">,
): string | null {
  const nom = societe.nomComplet?.trim();
  if (!nom) return null;
  const comparable = (texte: string) => texte.replace(/\s+/g, " ").trim().toLocaleLowerCase("fr");
  return comparable(nom) === comparable(societe.sigle) ? null : nom;
}

/** Titre de la page (« SIGLE — Nom complet ») ; le gabarit du site ajoute « — Cité Savante ». */
export function titreFiche(societe: Pick<SocieteFiche, "sigle" | "nomComplet">): string {
  const nom = nomCompletDistinct(societe);
  return nom ? `${societe.sigle} — ${nom}` : societe.sigle;
}

/** Catégorie en minuscules, à placer dans une phrase (« autre » devient « organisation »). */
export function categorieDansUnePhrase(categorie: Enums<"categorie_organisation">): string {
  if (categorie === "autre") return "organisation";
  const libelle = categorieOrganisationLabels[categorie];
  return libelle.charAt(0).toLocaleLowerCase("fr") + libelle.slice(1);
}

/**
 * Description des métadonnées : la présentation de l'organisation résumée en
 * 160 caractères ; à défaut, une phrase construite à partir des seules
 * données de la fiche (aucun fait inventé) : « SOBEPED, Société … :
 * société savante à Cotonou. Présentation, contacts et événements. »
 */
export function descriptionFiche(
  societe: Pick<SocieteFiche, "sigle" | "nomComplet" | "categorie" | "ville" | "description">,
): string {
  const resume = resumerTexte(societe.description, LONGUEUR_MAX_DESCRIPTION_META);
  if (resume !== "") return resume;

  const nom = nomCompletDistinct(societe);
  const identite = nom ? `${societe.sigle}, ${nom}` : societe.sigle;
  const ville = societe.ville?.trim();
  const phrase = `${identite} : ${categorieDansUnePhrase(societe.categorie)}${
    ville ? ` à ${ville}` : ""
  }. Présentation, contacts et événements.`;
  return resumerTexte(phrase, LONGUEUR_MAX_DESCRIPTION_META);
}
