import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Partage : un nœud d'origine relié par deux traits à deux nœuds destinataires. */
export function PictoPartage(props: PictoProps) {
  return (
    <Svg {...props}>
      <circle cx="6.5" cy="12" r="2.5" />
      <circle cx="17.5" cy="5.5" r="2.5" />
      <circle cx="17.5" cy="18.5" r="2.5" />
      <path d="M8.65 10.73 15.35 6.77M8.65 13.27l6.7 3.96" />
    </Svg>
  );
}
