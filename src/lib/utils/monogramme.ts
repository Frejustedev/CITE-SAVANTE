// Disposition du texte du monogramme d'une organisation sans logo
// (`src/components/societes/Monogramme.tsx`, spécifications 8.1) : nombre de
// lignes, taille du sigle, resserrement ou compression éventuels, dans un `viewBox` de
// 100 × 100. Fonction pure, testée (`monogramme.test.ts`).
//
// Lisibilité (relecture de la phase 2) : le monogramme le plus petit est
// celui des cartes de l'annuaire, 64 px de côté. À cette taille, la hauteur
// des capitales du sigle doit atteindre 11 px (`HAUTEUR_CAPITALES_MIN_PX`).
// Sur une ligne, un sigle de 5 lettres ou plus n'y tient pas : il passe sur
// DEUX lignes, empilées comme sur un cachet (« SB / GEO », « SBA / GRO »),
// coupées à un espace ou à un tiret s'il y en a, sinon là où les deux lignes
// s'équilibrent. Le cartouche reste carré : les cartes gardent une colonne
// de logo de largeur fixe, et le texte de la carte toute sa largeur à 360 px.
// La disposition ne dépend pas de la taille d'affichage : le même sigle a le
// même monogramme sur la carte (64 px) et sur la fiche (80 à 128 px).
//
// Resserrement (décision du coordinateur, phase 2) : quand même la meilleure
// disposition donne des capitales de moins de 11 px (lettres très larges,
// « ABMH / EPAT », « ZTEST / MMW », sigle réel « SOBE / NCHIR »), le sigle
// passe à `TAILLE_LISIBLE` si chacune de ses lignes y tient avec un
// resserrement horizontal d'au plus 15 % (`RESSERREMENT_MAX`). Seules les
// lignes qui déborderaient sont resserrées (`compresser`) ; les autres gardent
// leur chasse. Au-delà de 15 %, rien n'est resserré : le sigle reste plus
// petit (pire cas théorique, « MMWWMMWW » : 8 px).
//
// Largeur des lettres : MESURÉE sur la police réellement servie (Fraunces 500,
// fichier `@fontsource/fraunces` de `src/app/layout.tsx`, `measureText` dans
// Chrome, en fraction de la taille de police), plus 2 % de marge. Une ligne
// trop large pour la taille retenue (resserrement ci-dessus ou, en dernier
// recours, taille minimale) est marquée `compresser` : le composant impose sa
// largeur (`textLength` + `lengthAdjust="spacingAndGlyphs"`), ce qui garantit
// que le sigle tient dans le cartouche quelle que soit la police réellement
// chargée.

/** Largeur disponible pour une ligne du sigle, en unités du `viewBox` (100 × 100). */
export const LARGEUR_TEXTE_MONOGRAMME = 74;

/** Tailles du sigle, en unités du `viewBox`. */
export const TAILLE_MAX_UNE_LIGNE = 32;
/** Limitée par la hauteur : deux lignes tiennent entre les deux filets ornés (y = 20 et y = 80). */
export const TAILLE_MAX_DEUX_LIGNES = 25;
export const TAILLE_MIN_MONOGRAMME = 12;

/** Distance entre les lignes de base de deux lignes, en fraction de la taille de police. */
export const INTERLIGNE_DEUX_LIGNES = 1.05;

/** Hauteur des capitales de Fraunces, en fraction de la taille de police (mesurée : 0,70). */
export const RAPPORT_CAPITALES = 0.7;

/** Plus petite taille d'affichage du monogramme, en pixels (cartes de l'annuaire). */
export const TAILLE_AFFICHAGE_MIN_PX = 64;

/** Hauteur minimale des capitales à `TAILLE_AFFICHAGE_MIN_PX`, en pixels. */
export const HAUTEUR_CAPITALES_MIN_PX = 11;

/**
 * Resserrement horizontal maximal d'une ligne (fraction de sa largeur), admis
 * seulement pour amener des capitales de moins de 11 px à `TAILLE_LISIBLE`.
 */
export const RESSERREMENT_MAX = 0.15;

/** Nombre maximal de caractères affichés (au-delà : coupé, avec « … »). */
export const CARACTERES_MAX_MONOGRAMME = 24;

/**
 * Hauteur des capitales, en pixels, pour une taille de police (unités du
 * `viewBox`) et un monogramme affiché sur `tailleAffichagePx` de côté.
 */
export function hauteurCapitalesPx(
  taillePolice: number,
  tailleAffichagePx: number = TAILLE_AFFICHAGE_MIN_PX,
): number {
  return taillePolice * RAPPORT_CAPITALES * (tailleAffichagePx / 100);
}

// Arrondi au dixième, INFÉRIEUR pour une taille (la taille arrondie ne fait
// jamais déborder la ligne), SUPÉRIEUR pour un seuil.
const arrondir = (taille: number) => Math.floor(taille * 10) / 10;
const arrondirAuDessus = (taille: number) => Math.ceil(taille * 10) / 10;

/**
 * Plus petite taille de police (unités du `viewBox`) qui donne des capitales
 * de `HAUTEUR_CAPITALES_MIN_PX` à `TAILLE_AFFICHAGE_MIN_PX` (≈ 24,6).
 */
export const TAILLE_LISIBLE = arrondirAuDessus(
  HAUTEUR_CAPITALES_MIN_PX / (RAPPORT_CAPITALES * (TAILLE_AFFICHAGE_MIN_PX / 100)),
);

export type LigneMonogramme = {
  texte: string;
  /**
   * Vrai : imposer `textLength = LARGEUR_TEXTE_MONOGRAMME` à cette ligne (elle
   * déborderait) : resserrement d'au plus 15 % à `TAILLE_LISIBLE`, ou
   * compression de dernier recours à la taille minimale.
   */
  compresser: boolean;
};

export type DispositionMonogramme = {
  /** Lignes à écrire : 0 (sigle vide : ornement seul), 1 ou 2. */
  lignes: LigneMonogramme[];
  /** Taille de police, en unités du `viewBox`. */
  taillePolice: number;
};

/** Avance de chaque caractère de Fraunces 500, en fraction de la taille de police (mesurée). */
// prettier-ignore
const LARGEURS_FRAUNCES: Record<string, number> = {
  A: 0.724, B: 0.693, C: 0.699, D: 0.79, E: 0.653, F: 0.604, G: 0.761, H: 0.84, I: 0.394,
  J: 0.491, K: 0.776, L: 0.623, M: 0.912, N: 0.776, O: 0.796, P: 0.681, Q: 0.796, R: 0.733,
  S: 0.599, T: 0.686, U: 0.747, V: 0.709, W: 1.046, X: 0.728, Y: 0.686, Z: 0.64,
  a: 0.551, b: 0.6, c: 0.515, d: 0.613, e: 0.527, f: 0.38, g: 0.568, h: 0.631, i: 0.309,
  j: 0.309, k: 0.605, l: 0.311, m: 0.948, n: 0.631, o: 0.589, p: 0.616, q: 0.601, r: 0.465,
  s: 0.478, t: 0.376, u: 0.618, v: 0.555, w: 0.823, x: 0.54, y: 0.562, z: 0.483,
  "0": 0.662, "1": 0.458, "2": 0.606, "3": 0.552, "4": 0.611, "5": 0.576, "6": 0.605,
  "7": 0.516, "8": 0.599, "9": 0.609,
  " ": 0.221, ".": 0.256, "-": 0.413, "'": 0.168, "’": 0.223, "&": 0.753, "/": 0.494,
  // Non mesurées (absentes des sigles courants) : estimations prudentes.
  Æ: 1.05, Œ: 1.1, æ: 0.85, œ: 0.9, "…": 0.9,
};

/** Marge ajoutée aux largeurs mesurées (arrondis du rendu, crénage). */
const MARGE_LARGEUR = 1.02;

/** Largeur estimée d'un caractère, en fraction de la taille de police. */
function largeurCaractere(caractere: string): number {
  const connue =
    LARGEURS_FRAUNCES[caractere] ??
    // Lettre accentuée : largeur de sa lettre de base (« É » → « E »).
    LARGEURS_FRAUNCES[caractere.normalize("NFD").replace(/\p{M}+/gu, "")];
  if (connue !== undefined) return connue;
  if (/\s/.test(caractere)) return 0.25;
  if (/\p{Ll}/u.test(caractere)) return 0.65;
  return 0.85; // capitale, chiffre ou signe inconnus : au plus large
}

/** Largeur estimée d'un texte, en « em ». */
export function largeurEstimee(texte: string): number {
  return (
    Array.from(texte).reduce((somme, caractere) => somme + largeurCaractere(caractere), 0) *
    MARGE_LARGEUR
  );
}

/**
 * Resserrement horizontal (fraction de la largeur, 0 si aucun) nécessaire
 * pour qu'une ligne tienne dans `LARGEUR_TEXTE_MONOGRAMME` à `taillePolice`.
 */
export function resserrementNecessaire(texte: string, taillePolice: number): number {
  const largeur = largeurEstimee(texte) * taillePolice;
  return largeur <= LARGEUR_TEXTE_MONOGRAMME ? 0 : 1 - LARGEUR_TEXTE_MONOGRAMME / largeur;
}

function taillePour(texte: string, tailleMax: number): number {
  const largeur = largeurEstimee(texte);
  if (largeur === 0) return tailleMax;
  return Math.min(tailleMax, LARGEUR_TEXTE_MONOGRAMME / largeur);
}

type Coupe = { lignes: [string, string]; taille: number; ecart: number; premiereCourte: boolean };

/**
 * Coupe le sigle avant le caractère `index`. Une espace en bord de ligne
 * disparaît (`trim`) ; un tiret coupé après lui reste en fin de première ligne.
 */
function couperA(caracteres: string[], index: number): Coupe | null {
  const premiere = caracteres.slice(0, index).join("").trim();
  const seconde = caracteres.slice(index).join("").trim();
  if (!premiere || !seconde) return null;
  const n1 = Array.from(premiere).length;
  const n2 = Array.from(seconde).length;
  return {
    lignes: [premiere, seconde],
    taille: Math.min(
      taillePour(premiere, TAILLE_MAX_DEUX_LIGNES),
      taillePour(seconde, TAILLE_MAX_DEUX_LIGNES),
    ),
    ecart: Math.abs(n1 - n2),
    premiereCourte: n1 <= n2,
  };
}

/**
 * Meilleure coupe en deux lignes : à un séparateur (espace ou tiret) s'il y
 * en a, sinon entre deux caractères quelconques. Critères, dans l'ordre : la
 * plus grande taille de police, puis les lignes les plus équilibrées, puis la
 * première ligne la plus courte (« SB / GEO » plutôt que « SBG / EO »).
 */
function meilleureCoupe(texte: string): Coupe | null {
  const caracteres = Array.from(texte);
  const separateurs = caracteres
    .map((caractere, index) =>
      index > 0 && index < caracteres.length - 1 && /[\s-]/.test(caractere) ? index : -1,
    )
    .filter((index) => index !== -1);

  const candidates: Coupe[] = [];
  if (separateurs.length > 0) {
    for (const index of separateurs) {
      // Espace : coupé avant lui (il disparaît au `trim`) ; tiret : coupé après lui.
      const coupe = couperA(caracteres, caracteres[index] === "-" ? index + 1 : index);
      if (coupe) candidates.push(coupe);
    }
  } else {
    for (let index = 1; index < caracteres.length; index += 1) {
      const coupe = couperA(caracteres, index);
      if (coupe) candidates.push(coupe);
    }
  }

  let meilleure: Coupe | null = null;
  for (const coupe of candidates) {
    if (
      meilleure === null ||
      arrondir(coupe.taille) > arrondir(meilleure.taille) ||
      (arrondir(coupe.taille) === arrondir(meilleure.taille) &&
        (coupe.ecart < meilleure.ecart ||
          (coupe.ecart === meilleure.ecart && coupe.premiereCourte && !meilleure.premiereCourte)))
    ) {
      meilleure = coupe;
    }
  }
  return meilleure;
}

function disposer(textes: string[], taille: number): DispositionMonogramme {
  let taillePolice = arrondir(Math.max(taille, TAILLE_MIN_MONOGRAMME));
  // Capitales de moins de 11 px : resserrement d'au plus 15 % des lignes qui
  // déborderaient à `TAILLE_LISIBLE`, si TOUTES y tiennent ainsi ; sinon rien.
  if (
    taillePolice < TAILLE_LISIBLE &&
    textes.every((texte) => resserrementNecessaire(texte, TAILLE_LISIBLE) <= RESSERREMENT_MAX)
  ) {
    taillePolice = TAILLE_LISIBLE;
  }
  return {
    lignes: textes.map((texte) => ({
      texte,
      compresser: largeurEstimee(texte) * taillePolice > LARGEUR_TEXTE_MONOGRAMME + 0.01,
    })),
    taillePolice,
  };
}

/**
 * Dispose un sigle dans le monogramme : espaces normalisés, coupé au-delà de
 * 24 caractères. Une ligne (taille 12 à 32) si les capitales y atteignent
 * 11 px sur la carte de 64 px (`TAILLE_LISIBLE`) ; sinon deux lignes (taille
 * 12 à 25) si elles donnent un sigle plus grand. Encore sous 11 px : taille
 * portée à `TAILLE_LISIBLE` si un resserrement d'au plus 15 % y suffit (lignes
 * débordantes marquées `compresser`) ; une ligne qui déborde même à la taille
 * minimale est aussi marquée `compresser`. Sigle vide : aucune ligne.
 */
export function disposerMonogramme(sigle: string): DispositionMonogramme {
  let texte = sigle.replace(/\s+/g, " ").trim();
  if (texte === "") {
    return { lignes: [], taillePolice: TAILLE_MAX_UNE_LIGNE };
  }
  const caracteres = Array.from(texte);
  if (caracteres.length > CARACTERES_MAX_MONOGRAMME) {
    texte = `${caracteres
      .slice(0, CARACTERES_MAX_MONOGRAMME - 1)
      .join("")
      .trimEnd()}…`;
  }

  const tailleUneLigne = taillePour(texte, TAILLE_MAX_UNE_LIGNE);
  if (arrondir(tailleUneLigne) >= TAILLE_LISIBLE) {
    return disposer([texte], tailleUneLigne);
  }

  const deuxLignes = meilleureCoupe(texte);
  if (deuxLignes && arrondir(deuxLignes.taille) > arrondir(tailleUneLigne)) {
    return disposer(deuxLignes.lignes, deuxLignes.taille);
  }

  return disposer([texte], tailleUneLigne);
}
