import { Svg } from "./Svg";
import type { PictoProps } from "./types";

/** Courrier électronique : enveloppe vue de dos, rabat en V et coutures latérales. */
export function PictoEmail(props: PictoProps) {
  return (
    <Svg {...props}>
      <path d="M4.75 5.5h14.5c.97 0 1.75.78 1.75 1.75v9.5c0 .97-.78 1.75-1.75 1.75H4.75C3.78 18.5 3 17.72 3 16.75v-9.5C3 6.28 3.78 5.5 4.75 5.5Z" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
      <path d="M3.75 17.75l6.1-6.35M20.25 17.75l-6.1-6.35" />
    </Svg>
  );
}
