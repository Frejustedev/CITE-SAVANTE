import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/**
 * Tracé du bâtiment à tour (trois étages en retrait), vu de face, en grille 24 × 24.
 * Exporté pour être réutilisé tel quel dans un <symbol> du Plan de la Cité.
 */
export const traceBatimentTour =
  "M2.75 20.75h18.5M4.25 20.75v-5.5h15.5v5.5M7 15.25v-5h10v5M9.5 10.25v-4L12 3.5l2.5 2.75v4M10.75 20.75v-2.25a1.25 1.25 0 0 1 2.5 0v2.25M7.25 17.5V19M16.75 17.5V19M9.75 12v1.5M14.25 12v1.5M12 7.5v1.25";

/** Bâtiment à tour : trois étages en gradins sur une ligne de sol, porte cintrée, fenêtres étroites et toit en pointe. */
export function PictoBatimentTour(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d={traceBatimentTour} />
    </Svg>
  );
}
