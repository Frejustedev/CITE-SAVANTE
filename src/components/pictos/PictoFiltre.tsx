import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Filtre : entonnoir en perspective, buvant en ellipse, cône et goulot cylindrique. */
export function PictoFiltre(props: PictoProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="5.5" rx="8.5" ry="1.75" />
      <path d="M3.5 5.5 10 13v6.25c0 .55.9 1 2 1s2-.45 2-1V13l6.5-7.5" />
    </Svg>
  );
}
