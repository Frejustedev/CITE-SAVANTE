// Données structurées JSON-LD de la fiche organisation (spécifications 8.2 et
// 15) : `Organization` et `BreadcrumbList`, plus leur sérialisation sûre dans
// une balise `<script type="application/ld+json">`.
//
// Fonctions pures : les adresses absolues (fiche, logo) sont calculées par
// l'appelant (`urlAbsolue`, `urlLogo`) et passées en argument, pour que ce
// module reste testable sans variables d'environnement.
import type { SocieteFiche } from "@/lib/requetes/societes";
import { estUrlHttpsSure, hrefCourriel } from "@/lib/utils/urls";

import {
  estPaysBenin,
  hrefTelephoneInternational,
  nomCompletDistinct,
  resumerTexte,
} from "./utilitaires";

/** Objet JSON-LD (sérialisable par `JSON.stringify`). */
export type DonneesJsonLd = Record<string, unknown>;

// Caractères échappés en `\uXXXX` dans le texte de la balise : `<`, `>` et `&`
// (une valeur saisie contenant `</script>` ou `<!--` ne peut ni fermer la
// balise ni ouvrir un commentaire HTML), U+2028 et U+2029 (fins de ligne pour
// certains interpréteurs JavaScript). Ces caractères n'apparaissent que dans
// des chaînes JSON, où `\uXXXX` est un échappement valide : le JSON relu est
// identique à l'objet d'origine.
// Écrits en échappements `\u2028` / `\u2029` : ces deux caractères, tapés tels
// quels, sont des fins de ligne pour TypeScript et coupent l'expression.
const CARACTERES_A_ECHAPPER = /[<>&\u2028\u2029]/g;

/**
 * Sérialise des données JSON-LD pour `dangerouslySetInnerHTML` d'une balise
 * `<script type="application/ld+json">` : `JSON.stringify` (qui n'échappe
 * pas le HTML, documentation Next.js « JSON-LD ») suivi de l'échappement de
 * `<`, `>`, `&`, U+2028 et U+2029.
 */
export function serialiserJsonLd(donnees: DonneesJsonLd): string {
  return JSON.stringify(donnees).replace(
    CARACTERES_A_ECHAPPER,
    (caractere) => `\\u${caractere.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** Longueur maximale de la description reprise dans le JSON-LD. */
const LONGUEUR_MAX_DESCRIPTION_JSON_LD = 300;

export type ParametresJsonLdOrganisation = {
  societe: SocieteFiche;
  /** Adresse absolue de la fiche (`urlAbsolue("/societes/{slug}")`). */
  urlFiche: string;
  /** Adresse absolue du logo (`urlLogo(logoPath)`), ou `null` sans logo. */
  urlLogo: string | null;
};

/**
 * `Organization` (schema.org) d'une fiche publiée :
 * - `name` : nom complet (à défaut le sigle), `alternateName` : le sigle ;
 * - `url` : la fiche sur Cité Savante, `@id` : la fiche suivie de `#organisation` ;
 * - `sameAs` : le site officiel, puis les profils de réseaux sociaux (liens
 *   `https://` sûrs ; WhatsApp exclu, ce n'est pas une page de profil) ;
 * - `foundingDate` : l'année de création (« 1998 », date ISO 8601 réduite) ;
 * - `address` : ville (`addressLocality`) et pays (`BJ` pour le Bénin) ;
 * - `logo`, `email`, `telephone` (format international) et `description`
 *   (résumée) quand ils existent.
 * Les champs absents sont omis (`undefined` disparaît à la sérialisation).
 */
export function jsonLdOrganisation({
  societe,
  urlFiche,
  urlLogo,
}: ParametresJsonLdOrganisation): DonneesJsonLd {
  const nom = nomCompletDistinct(societe);

  const sameAs = [
    societe.siteWeb,
    ...societe.reseaux.filter((lien) => lien.reseau !== "whatsapp").map((lien) => lien.url),
  ].filter((url): url is string => estUrlHttpsSure(url));

  const ville = societe.ville?.trim() || null;
  const pays = societe.pays.trim();
  const codePays = estPaysBenin(pays) ? "BJ" : pays || undefined;
  const adresse =
    ville || codePays
      ? {
          "@type": "PostalAddress",
          addressLocality: ville ?? undefined,
          addressCountry: codePays,
        }
      : undefined;

  const courriel = hrefCourriel(societe.email);
  const telephone = hrefTelephoneInternational(societe.telephone, societe.pays);
  const description = resumerTexte(societe.description, LONGUEUR_MAX_DESCRIPTION_JSON_LD);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${urlFiche}#organisation`,
    name: nom ?? societe.sigle,
    alternateName: nom ? societe.sigle : undefined,
    url: urlFiche,
    sameAs: sameAs.length > 0 ? [...new Set(sameAs)] : undefined,
    foundingDate: societe.anneeCreation === null ? undefined : String(societe.anneeCreation),
    address: adresse,
    logo: urlLogo ?? undefined,
    email: courriel ? courriel.slice("mailto:".length) : undefined,
    telephone: telephone ? telephone.slice("tel:".length) : undefined,
    description: description === "" ? undefined : description,
  };
}

/** Élément d'un fil d'Ariane : nom affiché et adresse absolue. */
export type ElementFilArianeJsonLd = { nom: string; url: string };

/** `BreadcrumbList` (schema.org) : un `ListItem` par élément, positions à partir de 1. */
export function jsonLdFilAriane(elements: readonly ElementFilArianeJsonLd[]): DonneesJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elements.map((element, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: element.nom,
      item: element.url,
    })),
  };
}
