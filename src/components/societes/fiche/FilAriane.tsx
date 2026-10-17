import Link from "next/link";

import { cx } from "@/lib/utils/classes";

/** Élément du fil d'Ariane : nom affiché et chemin interne (« /societes »). */
export type ElementFilAriane = { nom: string; chemin: string };

type FilArianeProps = {
  /** Du plus général au plus précis ; le dernier est la page courante (non cliquable). */
  elements: readonly ElementFilAriane[];
  className?: string;
};

/**
 * Fil d'Ariane visible (« Accueil > Annuaire > SOBEPED »), doublé par le
 * JSON-LD `BreadcrumbList` de la page. Navigation nommée, liste ordonnée,
 * page courante signalée par `aria-current="page"`. Les séparateurs sont de
 * petits losanges or, décoratifs (masqués aux technologies d'assistance).
 */
export function FilAriane({ elements, className }: FilArianeProps) {
  return (
    <nav aria-label="Fil d’Ariane" className={cx("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {elements.map((element, index) => {
          const courant = index === elements.length - 1;
          return (
            <li key={element.chemin} className="flex min-w-0 items-center gap-3">
              {index > 0 ? (
                <span aria-hidden="true" className="inline-block size-1.5 rotate-45 bg-or" />
              ) : null}
              {courant ? (
                <span aria-current="page" className="break-words">
                  {element.nom}
                </span>
              ) : (
                <Link href={element.chemin} className="inline-flex min-h-8 items-center">
                  {element.nom}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
