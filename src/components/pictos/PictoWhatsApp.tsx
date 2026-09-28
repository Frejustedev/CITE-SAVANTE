import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/**
 * Partage par WhatsApp, en tracé simplifié (ce n'est pas le logo officiel) :
 * bulle de conversation ronde à pointe basse, combiné téléphonique réduit à un crochet.
 */
export function PictoWhatsApp(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d="M5 14.07A8.25 8.25 0 1 1 9.26 18.73L3.5 20.5Z" />
      <path d="M12.5 7.75h-2.25a6 6 0 0 0 6 6V11.5" />
    </Svg>
  );
}
