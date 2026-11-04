// Petites transformations de texte communes à plusieurs pages (agenda,
// échéances, fiche événement, images d'aperçu). Fonctions pures, testées
// (`texte.test.ts`).

/**
 * Première lettre en capitale (« du 12 au 14 mars 2027 » → « Du 12 au 14 mars
 * 2027 », « lundi 12 octobre » → « Lundi 12 octobre »). Découpe par points de
 * code (`Array.from`), et non par unités UTF-16 : un caractère hors du plan
 * de base n'est jamais coupé en deux. Texte vide : texte vide.
 */
export function premiereLettreMajuscule(texte: string): string {
  const [premiere, ...reste] = Array.from(texte);
  return premiere === undefined ? "" : premiere.toLocaleUpperCase("fr") + reste.join("");
}
