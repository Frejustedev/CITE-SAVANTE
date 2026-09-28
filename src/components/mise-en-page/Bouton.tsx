import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@/lib/utils/classes";

export type VarianteBouton = "principal" | "secondaire";

type ProprietesCommunes = {
  /** « principal » : plein bordeaux, texte crème. « secondaire » : contour bordeaux. */
  variante?: VarianteBouton;
  className?: string;
  children: ReactNode;
};

type BoutonLienProps = ProprietesCommunes &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof ProprietesCommunes>;

type BoutonNatifProps = ProprietesCommunes &
  Omit<ComponentPropsWithoutRef<"button">, keyof ProprietesCommunes> & { href?: undefined };

/** Avec `href` : lien Next (`<a>`). Sans `href` : `<button>` (type « button » par défaut). */
export type BoutonProps = BoutonLienProps | BoutonNatifProps;

const classesCommunes =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border px-5 py-2 text-center font-texte text-base leading-tight font-medium no-underline transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60";

const classesVariantes: Record<VarianteBouton, string> = {
  principal:
    "border-bordeaux bg-bordeaux text-creme hover:border-bordeaux-profond hover:bg-bordeaux-profond hover:text-creme",
  secondaire:
    "border-bordeaux bg-transparent text-bordeaux hover:border-bordeaux-profond hover:bg-creme-soutenu hover:text-bordeaux-profond",
};

/**
 * Classes d'un bouton de la charte, pour styler un élément qui ne peut pas
 * être un `<Bouton>` (par exemple un `<summary>`).
 */
export function classesBouton(variante: VarianteBouton = "principal", className?: string): string {
  return cx(classesCommunes, classesVariantes[variante], className);
}

function estUnLien(props: BoutonProps): props is BoutonLienProps {
  return "href" in props && props.href !== undefined;
}

/**
 * Bouton de la charte (section 4.3) : coins arrondis de 6 px, hauteur
 * minimale de 44 px (cible tactile confortable). Rendu en lien Next quand
 * `href` est fourni, en `<button>` sinon.
 */
export function Bouton(props: BoutonProps) {
  if (estUnLien(props)) {
    const { variante = "principal", className, children, ...reste } = props;
    return (
      <Link {...reste} className={classesBouton(variante, className)}>
        {children}
      </Link>
    );
  }

  const { variante = "principal", className, children, type = "button", ...reste } = props;
  return (
    <button {...reste} type={type} className={classesBouton(variante, className)}>
      {children}
    </button>
  );
}
