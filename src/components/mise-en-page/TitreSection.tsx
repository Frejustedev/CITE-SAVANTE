import type { ReactNode } from "react";
import { cx } from "@/lib/utils/classes";

type TitreSectionProps = {
  /** Identifiant du titre, à relier à la section par `aria-labelledby`. */
  id?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Titre de section (`h2`) : Fraunces, bordeaux profond, posé sur un filet or
 * de 1 px renforcé à gauche par un trait plus épais, à la manière d'un
 * cartouche de plan.
 */
export function TitreSection({ id, className, children }: TitreSectionProps) {
  return (
    <h2
      id={id}
      className={cx(
        "relative border-b border-or pb-3 font-titre text-xl leading-tight font-medium text-bordeaux-profond after:absolute after:-bottom-0.5 after:left-0 after:h-[3px] after:w-16 after:bg-or md:text-2xl",
        className,
      )}
    >
      {children}
    </h2>
  );
}
