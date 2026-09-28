import { useId } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/utils/classes";
import {
  AideChamp,
  ErreurChamp,
  identifiantsDescription,
  type ProprietesChampCommunes,
} from "./commun";

export type CaseACocherProps = ProprietesChampCommunes &
  Omit<ComponentPropsWithoutRef<"input">, keyof ProprietesChampCommunes | "type">;

/**
 * Case à cocher native (clavier, lecteurs d'écran et formulaires sans script
 * fonctionnent tels quels), dessinée aux couleurs de la charte : carré de
 * 24 px bordé d'encre, rempli de bordeaux avec une coche crème une fois
 * cochée. En mode de contraste forcé (Windows), la case système reprend la
 * main pour rester visible.
 */
export function CaseACocher({
  libelle,
  aide,
  erreur,
  id: idFourni,
  className,
  ...attributs
}: CaseACocherProps) {
  const idAuto = useId();
  const id = idFourni ?? idAuto;
  const { idAide, idErreur, decritPar } = identifiantsDescription(id, aide, erreur);
  const enErreur = Boolean(erreur);

  return (
    <div
      className={cx(
        "flex flex-col gap-1.5",
        enErreur && "border-l-2 border-bordeaux pl-3",
        className,
      )}
    >
      <ErreurChamp id={idErreur}>{erreur}</ErreurChamp>
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 flex size-6 shrink-0">
          <input
            {...attributs}
            id={id}
            type="checkbox"
            aria-describedby={decritPar}
            aria-invalid={enErreur || undefined}
            className="peer size-6 cursor-pointer appearance-none rounded-[4px] border border-encre/60 bg-creme checked:border-bordeaux checked:bg-bordeaux disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-2 aria-invalid:border-bordeaux forced-colors:appearance-auto"
          />
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            className="pointer-events-none absolute inset-0 hidden size-6 text-creme peer-checked:block forced-colors:hidden"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6.5 12.5l3.5 3.5 7.5-8" />
          </svg>
        </span>
        <div className="flex flex-col gap-0.5">
          <label htmlFor={id} className="cursor-pointer text-base leading-snug text-encre">
            {libelle}
            {attributs.required ? <span className="italic"> (obligatoire)</span> : null}
          </label>
          <AideChamp id={idAide}>{aide}</AideChamp>
        </div>
      </div>
    </div>
  );
}
