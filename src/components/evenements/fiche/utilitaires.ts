// Fonctions pures de la fiche événement (`/agenda/[slug]`, spécifications
// 8.4) : description des métadonnées, période dite dans une phrase, état
// d'une échéance, lignes du lieu, modalité, répartition des organisations.
//
// Aucune dépendance serveur : les types viennent de `@/lib/utils/evenements`
// (jamais de `@/lib/requetes/`), donc testables sous Vitest
// (`utilitaires.test.ts`). Les fonctions de la fiche organisation qui servent
// aussi ici (`resumerTexte`, `estPaysBenin`) sont importées telles quelles.
import {
  LONGUEUR_MAX_DESCRIPTION_META,
  estPaysBenin,
  resumerTexte,
} from "@/components/societes/fiche/utilitaires";
import type { Enums } from "@/lib/supabase/types";
import { modaliteEvenementLabels, typeEvenementLabels } from "@/lib/textes";
import { estUrgente, formaterDate, formaterPeriode, joursRestants } from "@/lib/utils/dates";
import {
  ROLES_ORGANISATEURS,
  siglesOrganisateurs,
  type EvenementFiche,
  type OrganisateurFiche,
} from "@/lib/utils/evenements";

/** Mention visible des liens qui quittent Cité Savante dans un nouvel onglet. */
export const MENTION_SITE_EXTERNE_NOUVEL_ONGLET = "site externe, nouvel onglet";

const listeFrancaise = new Intl.ListFormat("fr", { style: "long", type: "conjunction" });

/**
 * Période placée dans une phrase : « le 12 mars 2027 » pour un seul jour,
 * sinon la forme de `formaterPeriode` (« du 12 au 14 mars 2027 »).
 */
export function periodeEnPhrase(dateDebut: string, dateFin: string): string {
  return dateDebut === dateFin
    ? `le ${formaterDate(dateDebut)}`
    : formaterPeriode(dateDebut, dateFin);
}

/** Lieu glissé dans la phrase de description : « à Cotonou », « en ligne »… (chaîne vide sinon). */
function lieuEnPhrase(evenement: Pick<EvenementFiche, "modalite" | "ville">): string {
  const ville = evenement.ville?.trim();
  switch (evenement.modalite) {
    case "en_ligne":
      return " en ligne";
    case "hybride":
      return ville ? ` à ${ville} et en ligne` : " en présentiel et en ligne";
    default:
      return ville ? ` à ${ville}` : "";
  }
}

/**
 * Description des métadonnées (balise `description`, Open Graph) : le résumé
 * de l'événement, sinon sa description, ramenés à 160 caractères ; à défaut,
 * une phrase construite à partir des seules données de la fiche (aucun fait
 * inventé) : « Congrès du 29 au 31 mars 2027 à Cotonou. Organisé par
 * SOBEPED. Dates clés, participation et ajout à votre agenda. »
 */
export function descriptionEvenement(
  evenement: Pick<
    EvenementFiche,
    | "type"
    | "resume"
    | "description"
    | "dateDebut"
    | "dateFin"
    | "modalite"
    | "ville"
    | "organisateurs"
  >,
): string {
  const resume = resumerTexte(
    evenement.resume ?? evenement.description,
    LONGUEUR_MAX_DESCRIPTION_META,
  );
  if (resume !== "") return resume;

  const sigles = siglesOrganisateurs(evenement);
  const phrase =
    `${typeEvenementLabels[evenement.type]} ${periodeEnPhrase(evenement.dateDebut, evenement.dateFin)}` +
    `${lieuEnPhrase(evenement)}.` +
    (sigles.length > 0 ? ` Organisé par ${listeFrancaise.format(sigles)}.` : "") +
    " Dates clés, participation et ajout à votre agenda.";
  return resumerTexte(phrase, LONGUEUR_MAX_DESCRIPTION_META);
}

/** État d'une échéance à la date `aujourdhui` (« AAAA-MM-JJ », Porto-Novo). */
export type EtatEcheance = "passee" | "urgente" | "a_venir";

/**
 * « passee » si la date limite est avant `aujourdhui` (le jour même, elle
 * n'est pas passée : elle est urgente) ; « urgente » à 7 jours ou moins
 * (`estUrgente`, section 7) ; « a_venir » au-delà. Lève une erreur si une
 * date est invalide.
 */
export function etatEcheance(dateLimite: string, aujourdhui: string): EtatEcheance {
  if (joursRestants(dateLimite, aujourdhui) < 0) return "passee";
  return estUrgente(dateLimite, aujourdhui) ? "urgente" : "a_venir";
}

/** Pays à afficher, ou `null` pour le Bénin (le site est béninois : on ne l'écrit pas). */
export function paysEtranger(pays: string | null | undefined): string | null {
  if (!pays || estPaysBenin(pays)) return null;
  return pays.replace(/\s+/g, " ").trim() || null;
}

/**
 * Lignes du lieu d'un événement en présentiel ou hybride, dans l'ordre :
 * nom du lieu, adresse, puis ville (suivie du pays s'il n'est pas le Bénin ;
 * le pays seul s'il n'y a pas de ville). Espaces normalisés, lignes vides et
 * répétitions (casse ignorée) retirées. Liste vide si rien n'est connu.
 */
export function lignesLieu(
  evenement: Pick<EvenementFiche, "lieuNom" | "adresse" | "ville" | "pays">,
): string[] {
  const propre = (valeur: string | null | undefined) => valeur?.replace(/\s+/g, " ").trim() || null;
  const ville = propre(evenement.ville);
  const pays = paysEtranger(evenement.pays);
  const derniere = ville && pays ? `${ville}, ${pays}` : (ville ?? pays);
  const vues = new Set<string>();
  return [propre(evenement.lieuNom), propre(evenement.adresse), derniere].filter(
    (ligne): ligne is string => {
      if (!ligne) return false;
      const cle = ligne.toLocaleLowerCase("fr");
      if (vues.has(cle)) return false;
      vues.add(cle);
      return true;
    },
  );
}

/** Modalité dite en toutes lettres : « En présentiel », « En ligne », « Hybride : en présentiel et en ligne ». */
export function libelleModalite(modalite: Enums<"modalite_evenement">): string {
  return modalite === "hybride"
    ? // Espace insécable avant « : », comme partout sur le site.
      `${modaliteEvenementLabels.hybride} : en présentiel et en ligne`
    : modaliteEvenementLabels[modalite];
}

/**
 * Sépare les organisations rattachées : organisatrices et co-organisatrices
 * d'un côté (dans l'ordre reçu : organisateurs, puis co-organisateurs, par
 * sigle), partenaires de l'autre.
 */
export function separerOrganisations(organisations: readonly OrganisateurFiche[]): {
  organisateurs: OrganisateurFiche[];
  partenaires: OrganisateurFiche[];
} {
  const roles: readonly string[] = ROLES_ORGANISATEURS;
  return {
    organisateurs: organisations.filter((organisation) => roles.includes(organisation.role)),
    partenaires: organisations.filter((organisation) => !roles.includes(organisation.role)),
  };
}

/**
 * Nom complet à écrire après le sigle, ou `null` s'il est absent ou
 * identique au sigle (casse et espaces indifférents).
 */
export function nomCompletOrganisation(
  organisation: Pick<OrganisateurFiche, "sigle" | "nomComplet">,
): string | null {
  const nom = organisation.nomComplet?.replace(/\s+/g, " ").trim();
  if (!nom) return null;
  return nom.toLocaleLowerCase("fr") ===
    organisation.sigle.replace(/\s+/g, " ").trim().toLocaleLowerCase("fr")
    ? null
    : nom;
}
