import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Cadran d'horloge : quatre repères aux points cardinaux et deux aiguilles. */
export function PictoHorloge(props: PictoProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 5.5h.01M18.5 12h.01M12 18.5h.01M5.5 12h.01" />
      <path d="M12 8.5V12l2.75 2" />
    </Svg>
  );
}
