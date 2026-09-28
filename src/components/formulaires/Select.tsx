import { useId } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { PictoFleche } from "@/components/pictos";
import { cx } from "@/lib/utils/classes";
import {
  AideChamp,
  EnveloppeChamp,
  ErreurChamp,
  LibelleChamp,
  classesZoneSaisie,
  identifiantsDescription,
  type ProprietesChampCommunes,
} from "./commun";

export type OptionSelect = {
  valeur: string;
  libelle: string;
};

export type SelectProps = ProprietesChampCommunes & {
  options: readonly OptionSelect[];
  /**
   * Libellé d'une première option vide (valeur ""), par exemple « Toutes les
   * disciplines » dans un filtre ou « Choisir… » dans un formulaire.
   */
  optionVide?: string;
} & Omit<ComponentPropsWithoutRef<"select">, keyof ProprietesChampCommunes | "children">;

/**
 * Liste déroulante native (accessible au clavier et aux lecteurs d'écran
 * sans script), habillée aux couleurs de la charte : la flèche système est
 * remplacée par le pictogramme maison.
 */
export function Select({
  libelle,
  aide,
  erreur,
  id: idFourni,
  className,
  options,
  optionVide,
  ...attributs
}: SelectProps) {
  const idAuto = useId();
  const id = idFourni ?? idAuto;
  const { idAide, idErreur, decritPar } = identifiantsDescription(id, aide, erreur);
  const enErreur = Boolean(erreur);

  return (
    <EnveloppeChamp enErreur={enErreur} className={className}>
      <LibelleChamp htmlFor={id} requis={attributs.required}>
        {libelle}
      </LibelleChamp>
      <AideChamp id={idAide}>{aide}</AideChamp>
      <ErreurChamp id={idErreur}>{erreur}</ErreurChamp>
      <div className="relative">
        <select
          {...attributs}
          id={id}
          aria-describedby={decritPar}
          aria-invalid={enErreur || undefined}
          className={cx(classesZoneSaisie, "cursor-pointer appearance-none pr-11")}
        >
          {optionVide !== undefined ? <option value="">{optionVide}</option> : null}
          {options.map((option) => (
            <option key={option.valeur} value={option.valeur}>
              {option.libelle}
            </option>
          ))}
        </select>
        <PictoFleche
          direction="bas"
          taille={18}
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-bordeaux"
        />
      </div>
    </EnveloppeChamp>
  );
}
