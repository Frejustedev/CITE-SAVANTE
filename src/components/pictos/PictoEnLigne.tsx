import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Événement en ligne : écran sur pied trapézoïdal, d'où partent deux ondes de diffusion. */
export function PictoEnLigne(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d="M4.75 4.5h14.5A1.75 1.75 0 0 1 21 6.25v8.5a1.75 1.75 0 0 1-1.75 1.75H4.75A1.75 1.75 0 0 1 3 14.75v-8.5A1.75 1.75 0 0 1 4.75 4.5Z" />
      <path d="M10.5 16.5 10 19.75M13.5 16.5l.5 3.25M8 19.75h8" />
      <path d="M12 13.25h.01M9.7 11.32a3 3 0 0 1 4.6 0M7.4 9.39a6 6 0 0 1 9.2 0" />
    </Svg>
  );
}
