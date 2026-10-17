import Link from "next/link";

import { PictoFleche } from "@/components/pictos";
import { ANCRE_RESULTATS, elementsPagination } from "@/components/societes/annuaire/pagination";
import { cheminAnnuaire, type FiltresAnnuaire } from "@/lib/utils/annuaire";
import { cx } from "@/lib/utils/classes";

export type PaginationAnnuaireProps = {
  /** Page affichée (`resultat.page`). */
  page: number;
  /** Nombre de pages (`resultat.pages`). */
  pages: number;
  /** Filtres appliqués (`resultat.filtres`), conservés par chaque lien. */
  filtres: FiltresAnnuaire;
  className?: string;
};

const classesNumero =
  "inline-flex min-h-11 min-w-10 items-center justify-center rounded-[6px] border px-2 font-medium tabular-nums no-underline transition-teintes duration-150 motion-reduce:transition-none";

/**
 * Pagination de l'annuaire (24 organisations par page) : liens « Page
 * précédente » et « Page suivante », numéros de page (première, dernière, courante et ses
 * voisines). Chaque lien garde les filtres en cours. La page courante porte
 * `aria-current="page"`. Rien n'est rendu s'il n'y a qu'une page.
 *
 * Mobile : « Page précédente » et « Page suivante » sur une ligne, numéros en dessous ;
 * à partir de 768 px, tout sur une ligne.
 */
export function PaginationAnnuaire({ page, pages, filtres, className }: PaginationAnnuaireProps) {
  if (pages <= 1) return null;

  const lien = (numero: number) =>
    `${cheminAnnuaire({ ...filtres, page: numero })}#${ANCRE_RESULTATS}`;

  return (
    <nav aria-label="Pagination de l’annuaire" className={cx("border-t border-or pt-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="md:min-w-36">
          {page > 1 ? (
            <Link
              href={lien(page - 1)}
              rel="prev"
              className="inline-flex min-h-11 items-center gap-2 font-medium"
            >
              <PictoFleche direction="gauche" taille={18} className="shrink-0" />
              <span>Page précédente</span>
            </Link>
          ) : null}
        </div>

        <ol className="order-last flex w-full flex-wrap items-center justify-center gap-1 md:order-none md:w-auto">
          {elementsPagination(page, pages).map((element) =>
            element.type === "ellipse" ? (
              <li key={element.cle} aria-hidden="true" className="px-1 text-encre">
                …
              </li>
            ) : (
              <li key={element.numero}>
                <Link
                  href={lien(element.numero)}
                  aria-current={element.numero === page ? "page" : undefined}
                  className={cx(
                    classesNumero,
                    element.numero === page
                      ? "border-bordeaux bg-bordeaux text-creme hover:border-bordeaux-profond hover:bg-bordeaux-profond hover:text-creme"
                      : "border-or text-bordeaux hover:bg-creme-soutenu hover:text-bordeaux-profond",
                  )}
                >
                  <span className="sr-only">Page </span>
                  {element.numero}
                </Link>
              </li>
            ),
          )}
        </ol>

        <div className="flex justify-end md:min-w-36">
          {page < pages ? (
            <Link
              href={lien(page + 1)}
              rel="next"
              className="inline-flex min-h-11 items-center gap-2 font-medium"
            >
              <span>Page suivante</span>
              <PictoFleche direction="droite" taille={18} className="shrink-0" />
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
