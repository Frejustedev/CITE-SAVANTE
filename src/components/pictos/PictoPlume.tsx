import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Plume d'écriture : penne asymétrique traversée par son rachis, deux barbes gravées, trait d'encre ondulé sous le bec. */
export function PictoPlume(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d="M8.25 15.75C7.2 10.5 13.5 3.2 20.25 3.75 19.9 8.2 14.5 13.6 8.25 15.75Z" />
      <path d="M4.5 19.5 16.25 7.75" />
      <path d="M10.72 13.28 10.79 9.81M13.91 10.09 13.83 6.49" />
      <path d="M7.25 20.25c.9-.8 1.85-.8 2.75 0s1.85.8 2.75 0" />
    </Svg>
  );
}
