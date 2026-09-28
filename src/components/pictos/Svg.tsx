import type { ReactNode } from "react";
import type { PictoProps } from "./types";

type SvgProps = PictoProps & { children: ReactNode };

/**
 * Enveloppe interne commune à tous les pictogrammes (non exportée par le barrel).
 * Grille 24 × 24 avec 2 px de marge, trait de 1,5, extrémités et jonctions arrondies,
 * couleur héritée du texte (currentColor), fond transparent.
 * Les propriétés passées par l'appelant sont appliquées en dernier et peuvent donc
 * surcharger les valeurs par défaut (className, strokeWidth, etc.).
 */
export function Svg({ titre, taille, children, ...reste }: SvgProps) {
  const dimension = taille ?? 20;
  const accessible = Boolean(titre);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={dimension}
      height={dimension}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={accessible ? "img" : undefined}
      aria-hidden={accessible ? undefined : true}
      focusable={accessible ? undefined : "false"}
      {...reste}
    >
      {accessible ? <title>{titre}</title> : null}
      {children}
    </svg>
  );
}
