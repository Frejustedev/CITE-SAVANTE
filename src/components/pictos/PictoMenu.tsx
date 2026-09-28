import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Menu : trois traits horizontaux d'égale longueur (ouverture du menu mobile). */
export function PictoMenu(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </Svg>
  );
}
