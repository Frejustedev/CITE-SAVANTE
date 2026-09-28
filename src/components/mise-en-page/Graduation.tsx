import { useId } from "react";
import { cx } from "@/lib/utils/classes";

type GraduationProps = {
  className?: string;
};

/**
 * Filet or gradué, à la manière de l'échelle d'un plan d'architecte :
 * un trait de 1 px et des graduations régulières (une longue tous les
 * 64 px). Purement décoratif, masqué aux technologies d'assistance.
 */
export function Graduation({ className }: GraduationProps) {
  // Identifiant du motif, nettoyé pour être utilisable dans `url(#…)`.
  const idMotif = `graduation-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cx("block h-2 w-full text-or", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={idMotif} width="64" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M0.5 0V7M16.5 0V3M32.5 0V5M48.5 0V3"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="100%" height="8" fill={`url(#${idMotif})`} />
      <rect width="100%" height="1" fill="currentColor" />
    </svg>
  );
}
