import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Feuillet de calendrier : deux anneaux de reliure, bandeau d'en-tête et six jours pointés. */
export function PictoCalendrier(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d="M5.25 5.5h13.5a1.75 1.75 0 0 1 1.75 1.75v11.5a1.75 1.75 0 0 1-1.75 1.75H5.25a1.75 1.75 0 0 1-1.75-1.75V7.25A1.75 1.75 0 0 1 5.25 5.5Z" />
      <path d="M3.5 10h17" />
      <path d="M6.75 7.25V4.5a1.25 1.25 0 0 1 2.5 0v2.75M14.75 7.25V4.5a1.25 1.25 0 0 1 2.5 0v2.75" />
      <path d="M8 13.75h.01M12 13.75h.01M16 13.75h.01M8 17.25h.01M12 17.25h.01M16 17.25h.01" />
    </Svg>
  );
}
