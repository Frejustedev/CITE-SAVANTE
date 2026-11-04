/**
 * Configuration générale du site : nom, slogan, URL canonique, coordonnées
 * et navigation principale. Centralisé ici pour éviter toute valeur en dur
 * ailleurs dans le code (voir CLAUDE.md, section 3).
 */

const DOMAINE = "citesavante.com";

function urlSansSlashFinal(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * URL publique du site. `NEXT_PUBLIC_SITE_URL` (obligatoire sur Vercel) prime ;
 * absente ou vide : le domaine officiel en production, pour qu'aucune adresse
 * localhost ne sorte dans les balises, le .ics ou les liens de partage (les
 * pages sans lecture de la base n'appellent jamais `envPublic()`, qui refuserait
 * la variable manquante), et localhost en développement.
 */
export function resoudreUrlSite(
  variable: string | undefined,
  environnement: string | undefined,
): string {
  const valeur = variable?.trim();
  if (valeur) return urlSansSlashFinal(valeur);
  return environnement === "production" ? `https://${DOMAINE}` : "http://localhost:3000";
}

export const site = {
  nom: "Cité Savante",
  slogan: "Sociétés, congrès et événements scientifiques du Bénin",
  /**
   * Nom de domaine officiel, valeur FIXE, indépendante de
   * `NEXT_PUBLIC_SITE_URL` (qui vaut localhost en développement) : mention
   * des images d'aperçu et domaine des `UID` du fichier .ics
   * (`{id}@citesavante.com`), qui ne doivent jamais changer d'un
   * environnement à l'autre.
   */
  domaine: DOMAINE,
  // Références littérales : Next.js les remplace au build, y compris côté client.
  url: resoudreUrlSite(process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV),
  emailContact: "contact@citesavante.com",
  signature: {
    texte: "Conception : Dr Fréjuste AGBOTON",
    url: "https://frejusteagboton.info",
  },
  reseaux: {},
} as const;

export type ElementNavigation = {
  libelle: string;
  href: string;
};

export const navigation: ElementNavigation[] = [
  { libelle: "Sociétés", href: "/societes" },
  { libelle: "Agenda", href: "/agenda" },
  { libelle: "Échéances", href: "/echeances" },
  { libelle: "Référencer", href: "/referencer" },
  { libelle: "Visibilité", href: "/visibilite" },
];

/**
 * Formulaire public « Annoncer un événement » (spécifications 12.3, créé en
 * phase 5) : agenda, échéances, fiche événement introuvable.
 */
export const CHEMIN_ANNONCER_EVENEMENT = "/referencer/evenement";
