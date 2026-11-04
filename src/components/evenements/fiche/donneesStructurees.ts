// Données structurées JSON-LD de la fiche événement (spécifications 8.4 et
// 15) : `Event` (schema.org). Le `BreadcrumbList` et la sérialisation sûre
// (`serialiserJsonLd`, balise `JsonLd`) sont ceux de la fiche organisation
// (src/components/societes/fiche/donneesStructurees.ts), réutilisés tels
// quels.
//
// Fonction pure : les adresses absolues (fiche, fiches des organisations,
// affiche) sont calculées par l'appelant (`urlAbsolue`, `urlAffiche`) et
// passées en argument, pour que ce module reste testable sans variables
// d'environnement.
//
// Aucune adresse de la passerelle `/go/…` n'est jamais écrite ici : un robot
// qui suivrait une URL des données structurées ferait enregistrer un faux
// clic dans `clics_sortants`. Les liens externes sont donc soit directs
// (`VirtualLocation.url` = site de l'événement, comme `sameAs` de la fiche
// organisation), soit la fiche elle-même (`offers.url`).
import type { DonneesJsonLd } from "@/components/societes/fiche/donneesStructurees";
import { estPaysBenin, resumerTexte } from "@/components/societes/fiche/utilitaires";
import type { Enums } from "@/lib/supabase/types";
import { ROLES_ORGANISATEURS, type EvenementFiche } from "@/lib/utils/evenements";
import { plageEvenement, type InstantLocal } from "@/lib/utils/ics";

/**
 * Décalage horaire de Porto-Novo : UTC+1 toute l'année, sans heure d'été
 * (même hypothèse que `VTIMEZONE_PORTO_NOVO`, src/lib/utils/ics.ts).
 */
export const DECALAGE_PORTO_NOVO = "+01:00";

/** Longueur maximale des textes repris dans le JSON-LD (description, tarifs). */
const LONGUEUR_MAX_TEXTE_JSON_LD = 300;

/** Mode de participation schema.org selon la modalité. */
export const MODES_PARTICIPATION: Record<Enums<"modalite_evenement">, string> = {
  presentiel: "https://schema.org/OfflineEventAttendanceMode",
  en_ligne: "https://schema.org/OnlineEventAttendanceMode",
  hybride: "https://schema.org/MixedEventAttendanceMode",
};

/** Instant local de Porto-Novo en ISO 8601 avec décalage : « 2027-03-12T08:30:00+01:00 ». */
function instantIso(instant: InstantLocal): string {
  return `${instant.date}T${instant.heure}${DECALAGE_PORTO_NOVO}`;
}

/**
 * `startDate` et `endDate` (ISO 8601), tirées de `plageEvenement` (la même
 * plage que le fichier .ics et le lien Google Agenda) :
 * - un seul jour avec une heure : début et fin datés-heure avec le décalage
 *   de Porto-Novo ; la fin est « début + 1 h », car la table `evenements`
 *   n'a PAS d'heure de fin (même choix que le .ics) ;
 * - journées entières : dates seules, `endDate` = dernier jour (INCLUS dans
 *   schema.org, contrairement à la fin exclusive du .ics) ; si une heure de
 *   début est connue (événement de plusieurs jours), `startDate` la porte,
 *   avec le décalage, et `endDate` reste une date (aucune heure de fin
 *   connue, rien n'est inventé).
 */
export function datesJsonLd(
  evenement: Pick<EvenementFiche, "dateDebut" | "dateFin" | "heureDebut">,
): { startDate: string; endDate: string } {
  const plage = plageEvenement(evenement);
  if (!plage.journeeEntiere) {
    return { startDate: instantIso(plage.debut), endDate: instantIso(plage.fin) };
  }
  return {
    startDate: plage.heureDebut
      ? instantIso({ date: evenement.dateDebut, heure: plage.heureDebut })
      : evenement.dateDebut,
    endDate: evenement.dateFin,
  };
}

/** Texte nettoyé (espaces normalisés), ou `undefined` s'il est vide (omis à la sérialisation). */
function texteOuAbsent(valeur: string | null | undefined): string | undefined {
  const propre = valeur?.replace(/\s+/g, " ").trim();
  return propre ? propre : undefined;
}

export type ParametresJsonLdEvenement = {
  evenement: EvenementFiche;
  /** Adresse absolue de la fiche (`urlAbsolue("/agenda/{slug}")`). */
  urlFiche: string;
  /** Adresse absolue de la fiche d'une organisation (`(slug) => urlAbsolue("/societes/{slug}")`). */
  urlOrganisation: (slug: string) => string;
  /** Adresse absolue de l'affiche (`urlAffiche(affichePath)`), ou `null` sans affiche. */
  urlImage: string | null;
};

/**
 * `Event` (schema.org) d'un événement publié :
 * - `name`, `description` (résumé, sinon description, 300 caractères au
 *   plus), `url` (la fiche) et `@id` (la fiche suivie de `#evenement`) ;
 * - `startDate`, `endDate` : `datesJsonLd` ;
 * - `eventAttendanceMode` : hors ligne, en ligne ou mixte selon la modalité ;
 * - `eventStatus` : `EventScheduled` (le schéma n'a ni annulation ni report ;
 *   un événement passé reste « programmé », c'est sa date qui le date) ;
 * - `location` : `Place` (nom du lieu, `PostalAddress` : adresse, ville,
 *   pays — `BJ` pour le Bénin) en présentiel, `VirtualLocation` (site de
 *   l'événement, sinon la fiche) en ligne, les deux pour un événement
 *   hybride ;
 * - `organizer` : les organisatrices et co-organisatrices (partenaires
 *   exclus), `Organization` dont `url` est leur fiche sur Cité Savante et
 *   `@id` celui du JSON-LD de cette fiche (`{url}#organisation`) ;
 * - `image` : l'affiche, si elle existe ;
 * - `offers` : gratuit → `Offer` à 0 XOF ; sinon tarifs saisis (texte libre)
 *   → `Offer` avec `description` ; `url` de l'offre = la fiche, qui porte le
 *   bouton « S'inscrire ».
 * Les champs absents sont omis (`undefined` disparaît à la sérialisation).
 */
export function jsonLdEvenement({
  evenement,
  urlFiche,
  urlOrganisation,
  urlImage,
}: ParametresJsonLdEvenement): DonneesJsonLd {
  const { startDate, endDate } = datesJsonLd(evenement);
  const pays = evenement.pays.replace(/\s+/g, " ").trim();

  const lieuPhysique = {
    "@type": "Place",
    name: texteOuAbsent(evenement.lieuNom),
    address: {
      "@type": "PostalAddress",
      streetAddress: texteOuAbsent(evenement.adresse),
      addressLocality: texteOuAbsent(evenement.ville),
      addressCountry: estPaysBenin(pays) ? "BJ" : pays || undefined,
    },
  };
  const lieuVirtuel = { "@type": "VirtualLocation", url: evenement.siteWeb ?? urlFiche };
  const location =
    evenement.modalite === "en_ligne"
      ? lieuVirtuel
      : evenement.modalite === "hybride"
        ? [lieuPhysique, lieuVirtuel]
        : lieuPhysique;

  const roles: readonly string[] = ROLES_ORGANISATEURS;
  const organisateurs = evenement.organisateurs
    .filter((organisation) => roles.includes(organisation.role))
    .map((organisation) => {
      const url = urlOrganisation(organisation.slug);
      const nom = texteOuAbsent(organisation.nomComplet);
      return {
        "@type": "Organization",
        "@id": `${url}#organisation`,
        name: nom ?? organisation.sigle,
        alternateName: nom ? organisation.sigle : undefined,
        url,
      };
    });

  const tarifs = resumerTexte(evenement.tarifs, LONGUEUR_MAX_TEXTE_JSON_LD);
  const offre = evenement.gratuit
    ? {
        "@type": "Offer",
        price: "0",
        priceCurrency: "XOF",
        description: tarifs === "" ? undefined : tarifs,
        url: urlFiche,
      }
    : tarifs !== ""
      ? { "@type": "Offer", description: tarifs, url: urlFiche }
      : undefined;

  const description = resumerTexte(
    evenement.resume ?? evenement.description,
    LONGUEUR_MAX_TEXTE_JSON_LD,
  );

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${urlFiche}#evenement`,
    name: evenement.titre.replace(/\s+/g, " ").trim(),
    description: description === "" ? undefined : description,
    url: urlFiche,
    startDate,
    endDate,
    eventAttendanceMode: MODES_PARTICIPATION[evenement.modalite],
    eventStatus: "https://schema.org/EventScheduled",
    location,
    organizer: organisateurs.length > 0 ? organisateurs : undefined,
    image: urlImage ? [urlImage] : undefined,
    offers: offre,
  };
}
