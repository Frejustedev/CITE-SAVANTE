import type { ReactNode } from "react";
import { cx } from "@/lib/utils/classes";

/**
 * Éléments partagés par les champs de formulaire (ChampTexte, Select,
 * CaseACocher). Module interne au dossier `formulaires`.
 *
 * Règles d'accessibilité communes :
 * - chaque champ a un `<label>` relié par `htmlFor` ;
 * - l'aide et le message d'erreur sont reliés au champ par
 *   `aria-describedby` (aide d'abord, erreur ensuite) ;
 * - en cas d'erreur, le champ porte `aria-invalid="true"` et le message
 *   commence par « Erreur : » pour ne pas reposer sur la seule couleur.
 */

export type ProprietesChampCommunes = {
  /** Libellé visible du champ. */
  libelle: string;
  /** Texte d'aide affiché sous le libellé. */
  aide?: ReactNode;
  /** Message d'erreur ; sa présence met le champ en état d'erreur. */
  erreur?: ReactNode;
  /** Identifiant du champ ; généré automatiquement s'il est absent. */
  id?: string;
  /** Classes de l'enveloppe du champ (marges, largeur). */
  className?: string;
};

export function identifiantsDescription(id: string, aide: unknown, erreur: unknown) {
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  const decritPar = [idAide, idErreur].filter(Boolean).join(" ") || undefined;
  return { idAide, idErreur, decritPar };
}

/** Enveloppe verticale ; un trait bordeaux à gauche signale l'erreur. */
export function EnveloppeChamp({
  enErreur,
  className,
  children,
}: {
  enErreur: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-1.5",
        enErreur && "border-l-2 border-bordeaux pl-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LibelleChamp({
  htmlFor,
  requis,
  children,
}: {
  htmlFor: string;
  requis?: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-base leading-snug font-medium text-encre">
      {children}
      {requis ? <span className="font-normal italic"> (obligatoire)</span> : null}
    </label>
  );
}

export function AideChamp({ id, children }: { id?: string; children: ReactNode }) {
  if (!id) return null;
  return (
    <p id={id} className="text-sm leading-snug text-encre italic">
      {children}
    </p>
  );
}

export function ErreurChamp({ id, children }: { id?: string; children: ReactNode }) {
  if (!id) return null;
  return (
    <p id={id} className="text-sm leading-snug text-bordeaux">
      <span className="font-medium">Erreur :</span> {children}
    </p>
  );
}

/**
 * Apparence commune des zones de saisie : fond crème, bordure encre à 60 %
 * (contraste d'au moins 3:1 avec le fond, calculé sur /charte), bordure
 * bordeaux de 2 px en erreur. Hauteur minimale de 44 px.
 */
export const classesZoneSaisie =
  "min-h-11 w-full rounded-[6px] border border-encre/60 bg-creme px-3 py-2 font-texte text-base text-encre placeholder:text-encre/70 placeholder:italic disabled:cursor-not-allowed disabled:bg-creme-soutenu disabled:opacity-70 aria-invalid:border-2 aria-invalid:border-bordeaux";
