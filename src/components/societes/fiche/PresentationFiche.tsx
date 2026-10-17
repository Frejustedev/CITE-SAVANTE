import { Fragment } from "react";

import { TitreSection } from "@/components/mise-en-page/TitreSection";
import { cx } from "@/lib/utils/classes";

import { paragraphes } from "./utilitaires";

type PresentationFicheProps = {
  /** `societes.description`, texte libre (jamais du HTML). */
  description: string | null;
  className?: string;
};

/**
 * Section « Présentation » de la fiche (spécifications 8.2). Le texte libre
 * est découpé en paragraphes (lignes vides) et en lignes (retours à la ligne
 * simples, rendus par `<br>`), puis affiché comme du TEXTE : React l'échappe,
 * aucun HTML saisi n'est interprété. Largeur de lecture limitée à 68
 * caractères. Sans présentation : une phrase sobre.
 */
export function PresentationFiche({ description, className }: PresentationFicheProps) {
  const blocs = paragraphes(description);

  return (
    <section aria-labelledby="presentation-titre" className={cx("min-w-0", className)}>
      <TitreSection id="presentation-titre">Présentation</TitreSection>
      {blocs.length > 0 ? (
        <div className="mt-6 max-w-[68ch] space-y-4 text-pretty">
          {blocs.map((lignes, index) => (
            <p key={index}>
              {lignes.map((ligne, rang) => (
                <Fragment key={rang}>
                  {rang > 0 ? <br /> : null}
                  {ligne}
                </Fragment>
              ))}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-6">Aucune présentation n’est disponible pour le moment.</p>
      )}
    </section>
  );
}
