import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/utils/classes";

type CarteProps = {
  /** Élément HTML rendu : `article` pour une fiche autonome, `li` dans une liste. */
  as?: "div" | "article" | "section" | "li";
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

/**
 * Carte de la charte (section 4.3) : fond crème soutenu, filet or de 1 px en
 * haut, angles droits, aucune ombre portée.
 */
export function Carte({ as = "div", className, children, ...reste }: CarteProps) {
  const Balise: ElementType = as;
  return (
    <Balise className={cx("border-t border-or bg-creme-soutenu p-5 md:p-6", className)} {...reste}>
      {children}
    </Balise>
  );
}
