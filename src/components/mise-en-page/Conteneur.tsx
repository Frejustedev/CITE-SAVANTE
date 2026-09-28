import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cx } from "@/lib/utils/classes";

type ConteneurProps = {
  /** Élément HTML rendu (`div` par défaut). */
  as?: ElementType;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children">;

/**
 * Colonne de contenu centrée : 1200 px de contenu au maximum, gouttière de
 * 16 px sur mobile et de 32 px à partir de 768 px (charte, section 4.4).
 * La largeur maximale inclut les gouttières (1200 + 2 × 32 = 1264 px) pour
 * que le contenu lui-même mesure exactement 1200 px sur grand écran.
 */
export function Conteneur({ as: Balise = "div", className, children, ...reste }: ConteneurProps) {
  return (
    <Balise className={cx("mx-auto w-full max-w-[1264px] px-4 md:px-8", className)} {...reste}>
      {children}
    </Balise>
  );
}
