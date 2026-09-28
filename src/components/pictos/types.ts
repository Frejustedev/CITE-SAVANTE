import type { SVGProps } from "react";

/**
 * Propriétés communes à tous les pictogrammes de la charte.
 * - `titre` : si fourni, le pictogramme devient une image accessible (role="img" + <title>) ;
 *   sinon il est décoratif (aria-hidden).
 * - `taille` : largeur et hauteur (nombre en px ou valeur CSS), 20 par défaut.
 */
export type PictoProps = SVGProps<SVGSVGElement> & {
  titre?: string;
  taille?: number | string;
};
