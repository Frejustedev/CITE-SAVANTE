import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Loupe : lentille ronde avec un reflet gravé, manche oblique vers le bas à droite. */
export function PictoRecherche(props: PictoProps) {
  return (
    <Svg {...props}>
      <circle cx="10.25" cy="10.25" r="6.5" />
      <path d="M6.73 8.97a3.75 3.75 0 0 1 2.24-2.24" />
      <path d="M14.85 14.85l5.4 5.4" />
    </Svg>
  );
}
