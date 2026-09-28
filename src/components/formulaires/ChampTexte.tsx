import { useId } from "react";
import type { ComponentPropsWithoutRef } from "react";
import {
  AideChamp,
  EnveloppeChamp,
  ErreurChamp,
  LibelleChamp,
  classesZoneSaisie,
  identifiantsDescription,
  type ProprietesChampCommunes,
} from "./commun";

type AttributsLigne = Omit<ComponentPropsWithoutRef<"input">, keyof ProprietesChampCommunes>;
type AttributsMultiligne = Omit<
  ComponentPropsWithoutRef<"textarea">,
  keyof ProprietesChampCommunes
>;

type ChampLigneProps = ProprietesChampCommunes & {
  /** Zone de texte sur plusieurs lignes (`<textarea>`). */
  multiligne?: false;
} & AttributsLigne;

type ChampMultiligneProps = ProprietesChampCommunes & {
  multiligne: true;
} & AttributsMultiligne;

export type ChampTexteProps = ChampLigneProps | ChampMultiligneProps;

/**
 * Champ de saisie avec libellé, aide et message d'erreur reliés au champ.
 * `multiligne` rend un `<textarea>` (5 lignes par défaut). Les autres
 * propriétés (`name`, `type`, `required`, `autoComplete`…) sont transmises
 * au champ lui-même. Utilisable depuis un Server Component comme depuis un
 * composant client.
 */
export function ChampTexte({
  libelle,
  aide,
  erreur,
  id: idFourni,
  className,
  multiligne,
  ...attributs
}: ChampTexteProps) {
  const idAuto = useId();
  const id = idFourni ?? idAuto;
  const { idAide, idErreur, decritPar } = identifiantsDescription(id, aide, erreur);
  const enErreur = Boolean(erreur);
  const accessibilite = {
    id,
    "aria-describedby": decritPar,
    "aria-invalid": enErreur || undefined,
  };

  return (
    <EnveloppeChamp enErreur={enErreur} className={className}>
      <LibelleChamp htmlFor={id} requis={attributs.required}>
        {libelle}
      </LibelleChamp>
      <AideChamp id={idAide}>{aide}</AideChamp>
      <ErreurChamp id={idErreur}>{erreur}</ErreurChamp>
      {multiligne ? (
        <textarea
          rows={5}
          {...(attributs as AttributsMultiligne)}
          {...accessibilite}
          className={`${classesZoneSaisie} resize-y leading-normal`}
        />
      ) : (
        <input
          type="text"
          {...(attributs as AttributsLigne)}
          {...accessibilite}
          className={classesZoneSaisie}
        />
      )}
    </EnveloppeChamp>
  );
}
