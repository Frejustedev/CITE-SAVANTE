/**
 * Calcul du contraste entre deux couleurs selon les WCAG 2.1
 * (luminance relative sRGB, rapport (L1 + 0,05) / (L2 + 0,05)).
 * Sert à la page /charte et aux tests qui garantissent le contraste AA des
 * couples texte/fond de la charte.
 */

export type Rvb = { r: number; v: number; b: number };

/** Convertit « #RRGGBB » (ou « #RGB ») en composantes 0–255. */
export function hexVersRvb(hex: string): Rvb {
  const brut = hex.trim().replace(/^#/, "");
  const complet =
    brut.length === 3
      ? brut
          .split("")
          .map((c) => c + c)
          .join("")
      : brut;
  if (!/^[0-9a-fA-F]{6}$/.test(complet)) {
    throw new Error(`Couleur hexadécimale invalide : ${hex}`);
  }
  return {
    r: parseInt(complet.slice(0, 2), 16),
    v: parseInt(complet.slice(2, 4), 16),
    b: parseInt(complet.slice(4, 6), 16),
  };
}

function lineariser(composante: number): number {
  const c = composante / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminance relative (0 = noir, 1 = blanc). */
export function luminanceRelative(couleur: string | Rvb): number {
  const { r, v, b } = typeof couleur === "string" ? hexVersRvb(couleur) : couleur;
  return 0.2126 * lineariser(r) + 0.7152 * lineariser(v) + 0.0722 * lineariser(b);
}

/** Rapport de contraste, de 1 (identiques) à 21 (noir sur blanc). */
export function rapportContraste(a: string | Rvb, b: string | Rvb): number {
  const la = luminanceRelative(a);
  const lb = luminanceRelative(b);
  const [claire, sombre] = la > lb ? [la, lb] : [lb, la];
  return (claire + 0.05) / (sombre + 0.05);
}

/**
 * Couleur obtenue en posant `premierPlan` avec l'opacité `opacite` (0–1) sur
 * `fond` opaque — ce que produit par exemple `border-encre/60` sur un fond
 * crème. Indispensable pour mesurer le contraste réel d'une couleur
 * semi-transparente.
 */
export function composer(premierPlan: string, opacite: number, fond: string): Rvb {
  const p = hexVersRvb(premierPlan);
  const f = hexVersRvb(fond);
  const melange = (x: number, y: number) => x * opacite + y * (1 - opacite);
  return { r: melange(p.r, f.r), v: melange(p.v, f.v), b: melange(p.b, f.b) };
}

/** Nature de l'élément mesuré, qui fixe le seuil WCAG 2.1 AA applicable. */
export type NatureContraste = "texte" | "grand-texte" | "non-textuel" | "decoratif";

/** Seuils AA : 4,5 texte courant, 3 grand texte (≥ 24 px, ou ≥ 18,66 px gras) et éléments d'interface. */
export const seuilsAA: Record<NatureContraste, number | null> = {
  texte: 4.5,
  "grand-texte": 3,
  "non-textuel": 3,
  decoratif: null,
};

export function respecteAA(rapport: number, nature: NatureContraste): boolean {
  const seuil = seuilsAA[nature];
  return seuil === null || rapport >= seuil;
}
