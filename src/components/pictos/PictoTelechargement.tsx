import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Téléchargement : flèche descendante qui se pose dans un plateau ouvert. */
export function PictoTelechargement(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.75v11M7.75 10.5 12 14.75l4.25-4.25" />
      <path d="M4 14.5v3.75c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V14.5" />
    </Svg>
  );
}
