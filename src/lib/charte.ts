/**
 * Données de la charte graphique utilisées par la page /charte et par les
 * tests de contraste.
 *
 * Les valeurs de `couleursCharte` reproduisent les jetons déclarés dans
 * `src/app/globals.css` (`@theme`) ; un test (`charte.test.ts`) vérifie que
 * les deux restent identiques.
 */
import { composer, rapportContraste, type NatureContraste } from "@/lib/utils/contraste";

export const couleursCharte = [
  {
    jeton: "bordeaux",
    valeur: "#6B1E2E",
    usage: "Couleur principale, liens, boutons principaux",
  },
  {
    jeton: "bordeaux-profond",
    valeur: "#4A1420",
    usage: "Survol, pied de page, titres forts",
  },
  { jeton: "creme", valeur: "#F7F1E3", usage: "Fond général" },
  {
    jeton: "creme-soutenu",
    valeur: "#EDE3CC",
    usage: "Cartes, zones secondaires, quartiers du plan",
  },
  {
    jeton: "or",
    valeur: "#B8913A",
    usage: "Accents, fanions, contour de focus, filets",
  },
  { jeton: "or-clair", valeur: "#D9BD72", usage: "Fonds d'accent légers, badges" },
  { jeton: "encre", valeur: "#2A1A1C", usage: "Texte courant" },
] as const;

export type JetonCouleur = (typeof couleursCharte)[number]["jeton"];

export const valeurCouleur = Object.fromEntries(
  couleursCharte.map((couleur) => [couleur.jeton, couleur.valeur]),
) as Record<JetonCouleur, string>;

/** Couple premier plan / fond réellement employé dans l'interface. */
export type CoupleCouleurs = {
  premierPlan: JetonCouleur;
  /** Opacité du premier plan (1 par défaut), par exemple 0,6 pour `border-encre/60`. */
  opacite?: number;
  fond: JetonCouleur;
  nature: NatureContraste;
  usage: string;
};

/**
 * Tous les couples texte/fond et bordure/fond utilisés par les composants
 * de la phase 0. À compléter à chaque nouvel usage : les tests vérifient
 * que chacun respecte le seuil AA de sa nature.
 */
export const couplesUtilises: CoupleCouleurs[] = [
  {
    premierPlan: "encre",
    fond: "creme",
    nature: "texte",
    usage: "Texte courant, aides des champs",
  },
  { premierPlan: "encre", fond: "creme-soutenu", nature: "texte", usage: "Texte des cartes" },
  {
    premierPlan: "bordeaux",
    fond: "creme",
    nature: "texte",
    usage: "Liens, navigation, bouton secondaire, messages d'erreur",
  },
  {
    premierPlan: "bordeaux",
    fond: "creme-soutenu",
    nature: "texte",
    usage: "Liens dans les cartes",
  },
  {
    premierPlan: "bordeaux-profond",
    fond: "creme",
    nature: "texte",
    usage: "Titres, logotype, survol des liens",
  },
  {
    premierPlan: "bordeaux-profond",
    fond: "creme-soutenu",
    nature: "texte",
    usage: "Survol du bouton secondaire, titres dans les cartes",
  },
  {
    premierPlan: "creme",
    fond: "bordeaux",
    nature: "texte",
    usage: "Bouton principal, lien d'évitement",
  },
  {
    premierPlan: "encre",
    fond: "or",
    nature: "texte",
    usage: "Badge « urgent » des échéances à 7 jours ou moins (« badge or », section 7)",
  },
  {
    premierPlan: "creme",
    fond: "bordeaux-profond",
    nature: "texte",
    usage: "Pied de page, survol du bouton principal",
  },
  {
    premierPlan: "or-clair",
    fond: "bordeaux-profond",
    nature: "texte",
    usage: "Intertitres et survol des liens du pied de page",
  },
  { premierPlan: "bordeaux", fond: "or-clair", nature: "texte", usage: "Badges de type" },
  {
    premierPlan: "encre",
    opacite: 0.7,
    fond: "creme",
    nature: "texte",
    usage: "Texte indicatif des champs (encre à 70 %)",
  },
  {
    premierPlan: "encre",
    opacite: 0.6,
    fond: "creme",
    nature: "non-textuel",
    usage: "Bordure des champs et des cases (encre à 60 %)",
  },
  {
    premierPlan: "bordeaux",
    fond: "creme",
    nature: "non-textuel",
    usage: "Bordure en erreur, case cochée, bouton « Menu »",
  },
  {
    premierPlan: "or",
    fond: "bordeaux-profond",
    nature: "non-textuel",
    usage: "Contour de focus dans le pied de page",
  },
  {
    premierPlan: "or",
    fond: "creme",
    nature: "decoratif",
    usage: "Filets, graduations et ornements (aucun seuil : jamais porteurs d'information)",
  },
  {
    premierPlan: "or",
    fond: "creme-soutenu",
    nature: "decoratif",
    usage: "Filet supérieur des cartes",
  },
];

/**
 * Couples à signaler : utilisés par la charte mais sous le seuil AA de leur
 * nature. Affichés sur /charte et listés dans PROGRESS.md (« À valider par
 * le porteur ») ; ils ne doivent pas être étendus à de nouveaux usages.
 */
export const couplesASignaler: CoupleCouleurs[] = [
  {
    premierPlan: "or",
    fond: "creme",
    nature: "non-textuel",
    usage: "Contour de focus (or, 2 px) sur le fond crème",
  },
  {
    premierPlan: "or",
    fond: "creme",
    nature: "grand-texte",
    usage: "Texte or de grande taille sur crème (autorisé par la charte, section 4.1)",
  },
  {
    premierPlan: "or",
    fond: "creme-soutenu",
    nature: "non-textuel",
    usage: "Contour de focus (or, 2 px) à l'intérieur d'une carte",
  },
];

/** Rapport de contraste d'un couple, opacité du premier plan comprise. */
export function rapportDuCouple(couple: CoupleCouleurs): number {
  const fond = valeurCouleur[couple.fond];
  const premierPlan = composer(valeurCouleur[couple.premierPlan], couple.opacite ?? 1, fond);
  return rapportContraste(premierPlan, fond);
}
