import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Lien externe : cadre ouvert dans son angle supérieur droit, d'où sort une flèche oblique. */
export function PictoLienExterne(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d="M18.5 13.5v5a1.75 1.75 0 0 1-1.75 1.75h-11A1.75 1.75 0 0 1 4 18.5v-11a1.75 1.75 0 0 1 1.75-1.75h5" />
      <path d="M14 3.75h6.25V10M20.25 3.75 11.5 12.5" />
    </Svg>
  );
}
