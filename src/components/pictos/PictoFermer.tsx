import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Fermer : croix de Saint-André (fermeture du menu mobile et des fenêtres). */
export function PictoFermer(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d="M6.25 6.25l11.5 11.5M17.75 6.25 6.25 17.75" />
    </Svg>
  );
}
