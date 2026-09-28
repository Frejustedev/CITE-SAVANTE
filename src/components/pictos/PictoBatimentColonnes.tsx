import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/**
 * Tracé du bâtiment à colonnes (façon faculté), vu de face, en grille 24 × 24.
 * Exporté pour être réutilisé tel quel dans un <symbol> du Plan de la Cité.
 */
export const traceBatimentColonnes =
  "M3 8.75 12 3.5l9 5.25ZM12 6.6h.01M4.5 10.75h15M6.5 10.75v7M10.17 10.75v7M13.83 10.75v7M17.5 10.75v7M4.5 17.75h15M3 20.25h18";

/** Bâtiment à colonnes : fronton triangulaire percé d'un oculus, architrave, quatre colonnes et deux degrés. */
export function PictoBatimentColonnes(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d={traceBatimentColonnes} />
    </Svg>
  );
}
