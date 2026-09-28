/**
 * Configuration générale du site : nom, slogan, URL canonique, coordonnées
 * et navigation principale. Centralisé ici pour éviter toute valeur en dur
 * ailleurs dans le code (voir CLAUDE.md, section 3).
 */

function urlSansSlashFinal(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const site = {
  nom: "Cité Savante",
  slogan: "Sociétés, congrès et événements scientifiques du Bénin",
  url: urlSansSlashFinal(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
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
