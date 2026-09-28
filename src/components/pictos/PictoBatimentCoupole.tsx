import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/**
 * Tracé de l'édifice à coupole, vu de face, en grille 24 × 24.
 * Exporté pour être réutilisé tel quel dans un <symbol> du Plan de la Cité.
 */
export const traceBatimentCoupole =
  "M2.75 20.75h18.5M4.5 20.75V13M19.5 20.75V13M3.5 13h17M7.5 13v-2h9v2M8 11a4 4 0 0 1 8 0M12 7V3.75M10.75 20.75v-2.5a1.25 1.25 0 0 1 2.5 0v2.5M7.25 15.5V18M16.75 15.5V18";

/** Édifice à coupole : corps sous corniche, tambour, dôme en demi-cercle surmonté d'une flèche, porte cintrée. */
export function PictoBatimentCoupole(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d={traceBatimentCoupole} />
    </Svg>
  );
}
