import { Svg } from "./Svg";
import type { PictoProps } from "./types";

export type DirectionFleche = "droite" | "gauche" | "haut" | "bas";

export type PictoFlecheProps = Omit<PictoProps, "direction"> & {
  /** Sens de la flèche, « droite » par défaut. */
  direction?: DirectionFleche;
};

const rotations: Record<DirectionFleche, number> = {
  droite: 0,
  bas: 90,
  gauche: 180,
  haut: 270,
};

/** Flèche : hampe droite et pointe aux flancs incurvés, orientable dans les quatre directions. */
export function PictoFleche({ direction = "droite", ...props }: PictoFlecheProps) {
  const angle = rotations[direction];

  return (
    <Svg {...props}>
      <g transform={angle ? `rotate(${angle} 12 12)` : undefined}>
        <path d="M3.75 12h16.25" />
        <path d="M14.25 6.25c1.15 2.75 3.35 4.85 6 5.75-2.65.9-4.85 3-6 5.75" />
      </g>
    </Svg>
  );
}
