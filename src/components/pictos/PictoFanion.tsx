import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/**
 * Tracé du fanion (hampe à pommeau et flamme triangulaire ondulée), en grille 24 × 24.
 * Exporté pour être réutilisé tel quel dans un <symbol> du Plan de la Cité.
 */
export const traceFanion =
  "M6 21.25V5.35M6 5.35a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 1 1 0 2.2ZM6 6.25c3.2-.3 7.5 1.4 13 3.5-5.5 2.1-9.8 3.8-13 3.5";

/** Fanion : hampe coiffée d'un pommeau, flamme triangulaire aux bords légèrement ondulés. */
export function PictoFanion(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d={traceFanion} />
    </Svg>
  );
}
