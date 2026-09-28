import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/**
 * Téléphone : combiné d'appareil fixe incliné à 45°, écouteur en haut à gauche,
 * micro en bas à droite, poignée galbée côté extérieur.
 * Le combiné est dessiné à l'horizontale puis pivoté autour du centre de la grille.
 */
export function PictoTelephone(props: PictoProps) {
  return (
    <Svg {...props}>
      <path
        transform="rotate(45 12 12)"
        d="M3 9.9h3.5a.75.75 0 0 1 .75.75v1.75h9.5v-1.75a.75.75 0 0 1 .75-.75H21a.75.75 0 0 1 .75.75v1.75c0 2.2-4.4 3.9-9.75 3.9s-9.75-1.7-9.75-3.9v-1.75A.75.75 0 0 1 3 9.9Z"
      />
    </Svg>
  );
}
