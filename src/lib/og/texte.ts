// Textes des images d'aperçu (Open Graph, spécifications 10.5) : ne garder
// que les caractères que les polices locales savent dessiner.
//
// Pourquoi : quand un caractère manque à TOUTES les polices fournies,
// `ImageResponse` (next/og, moteur satori) va chercher une police de secours
// sur le réseau (Google Fonts, ou un dépôt d'emoji), ce que la charte
// interdit (polices locales seulement, aucun appel réseau). Le texte est donc
// nettoyé AVANT le rendu :
//   1. forme composée (NFC) ;
//   2. espaces typographiques ramenées à leur équivalent couvert (espace fine
//      insécable → espace insécable, espace fine → espace…), tirets
//      insécables → trait d'union ;
//   3. caractères de contrôle et de format (invisibles) retirés ;
//   4. puis caractère PERÇU par caractère perçu (graphème : une lettre et ses
//      accents, un emoji entier) : gardé s'il tient en un seul caractère
//      couvert ; sinon décomposé (NFD) et, si sa lettre de base est couverte,
//      recomposé avec ceux de ses accents qui sont couverts, à condition que
//      le résultat soit lui-même un seul caractère couvert (« ẹ̀ » → « è »),
//      sinon réduit à sa lettre de base (« ș » → « s », « ź » → « z »,
//      « Ÿ » → « Y » : la recomposition redonnerait un caractère absent) ;
//      lettre de base absente : retiré avec ses accents (emoji, écritures
//      non latines, « ł », « ɔ̀ »…) ;
//   5. espaces multiples ramenées à une seule, bords retirés.
//
// Couverture MESURÉE (table `cmap` des fichiers .woff, 31 octobre 2026) :
// les sous-ensembles « latin » de Fraunces 500 et 700 couvrent exactement
// les plages ci-dessous ; ceux d'EB Garamond 400 et 500 les couvrent toutes
// (et un peu plus). La liste est donc celle de Fraunces, l'intersection des
// quatre polices : un texte nettoyé se dessine dans n'importe laquelle.
// Vérifié aussi par le rendu (`apercus.test.tsx` : aucun appel réseau pour
// un texte qui contient tous ces caractères).
//
// Limite connue : les lettres hors du sous-ensemble latin, dont celles du
// fon et du yoruba (ɖ, ɔ, ɛ ; ẹ, ọ, ṣ deviennent e, o, s), sont perdues sur
// l'image ; la page, elle, les affiche (police du navigateur en secours).

/** Plages de points de code couvertes par les quatre polices (bornes incluses). */
export const PLAGES_COUVERTES: readonly (readonly [number, number])[] = [
  [0x0020, 0x007e], // latin de base
  [0x00a0, 0x00ff], // latin-1 (é, è, à, ç, «, », espace insécable…)
  [0x0131, 0x0131], // ı
  [0x0152, 0x0153], // Œ, œ
  [0x02bc, 0x02bc], // ʼ
  [0x02c6, 0x02c6], // ˆ
  [0x02da, 0x02da], // ˚
  [0x02dc, 0x02dc], // ˜
  [0x0300, 0x0301], // accents grave et aigu combinants
  [0x0303, 0x0304], // tilde et macron combinants
  [0x0308, 0x0308], // tréma combinant
  [0x2013, 0x2014], // tirets demi-cadratin et cadratin
  [0x2018, 0x201a], // ‘ ’ ‚
  [0x201c, 0x201e], // “ ” „
  [0x2022, 0x2022], // •
  [0x2026, 0x2026], // …
  [0x2032, 0x2033], // ′ ″
  [0x2039, 0x203a], // ‹ ›
  [0x2044, 0x2044], // ⁄
  [0x20ac, 0x20ac], // €
  [0x2122, 0x2122], // ™
  [0x2212, 0x2212], // −
  [0x2215, 0x2215], // ∕
];

/** Vrai si le point de code est dessiné par les quatre polices des aperçus. */
export function estCaractereCouvert(pointDeCode: number): boolean {
  return PLAGES_COUVERTES.some(([debut, fin]) => pointDeCode >= debut && pointDeCode <= fin);
}

const ESPACE_INSECABLE = " ";

/** Équivalents couverts de caractères fréquents mais absents des polices. */
const SUBSTITUTIONS: ReadonlyMap<number, string> = new Map([
  [0x0009, " "], // tabulation
  [0x000a, " "], // retour à la ligne
  [0x000d, " "],
  [0x0085, " "],
  [0x2028, " "],
  [0x2029, " "],
  [0x1680, " "],
  [0x2000, " "],
  [0x2001, " "],
  [0x2002, " "],
  [0x2003, " "],
  [0x2004, " "],
  [0x2005, " "],
  [0x2006, " "],
  [0x2008, " "],
  [0x2009, " "], // espace fine
  [0x200a, " "],
  [0x205f, " "],
  [0x3000, " "],
  [0x2007, ESPACE_INSECABLE], // espace tabulaire
  [0x202f, ESPACE_INSECABLE], // espace fine insécable (séparateur des milliers)
  [0x2010, "-"], // trait d'union typographique
  [0x2011, "-"], // trait d'union insécable
  [0x2012, "–"], // tiret numérique → demi-cadratin
  [0x2015, "—"], // barre horizontale → cadratin
]);

/** Contrôle (Cc) ou format (Cf : espaces sans chasse, marques de sens, trait d'union conditionnel…). */
const INVISIBLE = /^[\p{Cc}\p{Cf}]$/u;

/** Équivalent couvert d'un caractère (espaces, tirets), ou rien pour un caractère invisible. */
function substituer(caractere: string): string {
  const substitut = SUBSTITUTIONS.get(caractere.codePointAt(0) ?? 0);
  if (substitut !== undefined) return substitut;
  return INVISIBLE.test(caractere) ? "" : caractere;
}

const estCouvert = (caractere: string) => estCaractereCouvert(caractere.codePointAt(0) ?? 0);

/** Un seul caractère, et couvert : se dessine sans accent flottant ni police de secours. */
const estUnCaractereCouvert = (texte: string) => {
  const caracteres = Array.from(texte);
  return caracteres.length === 1 && estCouvert(caracteres[0] ?? "");
};

const segmenteur = new Intl.Segmenter("fr", { granularity: "grapheme" });

/** Garde un caractère perçu, sa forme recomposée couverte, sa lettre de base, ou rien (étape 4). */
function graphemeCouvert(grapheme: string): string {
  if (estUnCaractereCouvert(grapheme)) return grapheme;
  const [base, ...marques] = Array.from(grapheme.normalize("NFD"));
  if (base === undefined || !estCouvert(base)) return "";
  const recomposee = (base + marques.filter(estCouvert).join("")).normalize("NFC");
  return estUnCaractereCouvert(recomposee) ? recomposee : base;
}

/**
 * Texte prêt pour une image d'aperçu : uniquement des caractères couverts
 * par les polices locales (voir l'en-tête), sur une ligne, espaces
 * multiples réduites, bords retirés. Les espaces insécables sont gardées.
 * `null`, `undefined` ou texte sans caractère dessinable : chaîne vide.
 */
export function nettoyerTexteApercu(texte: string | null | undefined): string {
  if (!texte) return "";
  const substitue = Array.from(texte.normalize("NFC"), substituer).join("");
  const couverts = Array.from(segmenteur.segment(substitue), (morceau) =>
    graphemeCouvert(morceau.segment),
  ).join("");
  return couverts.replace(/ {2,}/g, " ").replace(/^[  ]+|[  ]+$/g, "");
}

/** Séparateurs qui n'ont de sens qu'entre deux mots. */
const SEPARATEUR = "[,;:·•/|–—-]";
const SEPARATEURS_REPETES = new RegExp(`(${SEPARATEUR})(?:\\s*${SEPARATEUR})+`, "g");
const SEPARATEURS_DES_BORDS = new RegExp(`^(?:\\s|${SEPARATEUR})+|(?:\\s|${SEPARATEUR})+$`, "g");
const LETTRE_OU_CHIFFRE = /[\p{L}\p{N}]/u;

/**
 * Morceau d'un texte assemblé (nom du lieu, ville, sigle, discipline), à
 * nettoyer AVANT l'assemblage : un mot retiré par `nettoyerTexteApercu` peut
 * laisser un séparateur orphelin (« ɖɔ, Ouidah » → « , Ouidah », « ɖ-ɔ » →
 * « - »). Séparateurs des bords et séparateurs répétés retirés ; sans aucune
 * lettre ni aucun chiffre dessinable : chaîne vide (le morceau est écarté).
 */
export function nettoyerSegmentApercu(texte: string | null | undefined): string {
  const propre = nettoyerTexteApercu(texte);
  if (!LETTRE_OU_CHIFFRE.test(propre)) return "";
  return propre.replace(SEPARATEURS_REPETES, "$1").replace(SEPARATEURS_DES_BORDS, "");
}

/** Vrai si tous les caractères du texte sont couverts (aucun appel réseau au rendu). */
export function estTexteCouvert(texte: string): boolean {
  return Array.from(texte).every((caractere) => estCaractereCouvert(caractere.codePointAt(0) ?? 0));
}
