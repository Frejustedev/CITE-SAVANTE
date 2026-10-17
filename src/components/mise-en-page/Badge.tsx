import type { ReactNode } from "react";
import { cx } from "@/lib/utils/classes";

export type VarianteBadge = "standard" | "urgent";

type BadgeProps = {
  /** « standard » : type d'événement. « urgent » : échéance proche. */
  variante?: VarianteBadge;
  className?: string;
  children: ReactNode;
};

const classesVariantes: Record<VarianteBadge, string> = {
  standard: "bg-or-clair text-bordeaux",
  urgent: "bg-or text-encre",
};

/**
 * Badge de la charte (section 4.3) : petites capitales, texte bordeaux sur
 * or clair. La variante « urgent » signale une échéance à 7 jours ou moins :
 * « badge or » (spécifications, section 7), texte encre sur fond or (rapport
 * 5,66:1, conforme AA ; couple vérifié par `charte.test.ts`). Le texte doit
 * dire pourquoi (« Clôture dans 3 jours ») : la couleur seule ne suffit pas.
 */
export function Badge({ variante = "standard", className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        "petites-capitales inline-flex items-center rounded-[3px] px-2 pt-0.5 pb-1 text-base leading-none font-medium whitespace-nowrap",
        classesVariantes[variante],
        className,
      )}
    >
      {children}
    </span>
  );
}
