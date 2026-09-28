import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Repère de lieu : goutte posée sur le sol (arc d'ellipse), avec un œil central. */
export function PictoLieu(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d="M12 18.75C9.4 16.2 6 12.9 6 8.75a6 6 0 0 1 12 0c0 4.15-3.4 7.45-6 10Z" />
      <circle cx="12" cy="8.75" r="2.25" />
      <path d="M8.25 17.9c-1.4.4-2.25.95-2.25 1.6 0 .95 2.7 1.75 6 1.75s6-.8 6-1.75c0-.65-.85-1.2-2.25-1.6" />
    </Svg>
  );
}
