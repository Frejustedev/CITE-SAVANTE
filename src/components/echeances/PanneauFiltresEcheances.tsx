import Link from "next/link";

import { FormulaireFiltresEcheances } from "@/components/echeances/FormulaireFiltresEcheances";
import { Select, type OptionSelect } from "@/components/formulaires/Select";
import { Bouton } from "@/components/mise-en-page/Bouton";
import { PictoFiltre } from "@/components/pictos";
import type { FiltresEcheances } from "@/lib/utils/agenda";
import { cx } from "@/lib/utils/classes";

const ID_TITRE = "titre-filtres-echeances";

export type PanneauFiltresEcheancesProps = {
  /** Filtres réellement appliqués (`resultat.filtres`) : valeurs présélectionnées. */
  filtres: FiltresEcheances;
  /** Types d'échéance (valeur : énumération ; libellé : `typeEcheanceLabels`). */
  types: readonly OptionSelect[];
  /** Disciplines (valeur : slug ; libellé : nom), dans l'ordre de la base. */
  disciplines: readonly OptionSelect[];
  /** Au moins un filtre actif : affiche le lien « Effacer les filtres ». */
  filtresActifs: boolean;
  className?: string;
};

/**
 * Filtres de la page des échéances (spécifications 8.5) : type d'échéance
 * et discipline de l'événement, dans l'URL. Champs rendus par le serveur
 * avec les valeurs en cours (le formulaire fonctionne sans JavaScript) ;
 * `FormulaireFiltresEcheances` y ajoute l'envoi automatique. Champs empilés
 * sur mobile, côte à côte à partir de 768 px.
 */
export function PanneauFiltresEcheances({
  filtres,
  types,
  disciplines,
  filtresActifs,
  className,
}: PanneauFiltresEcheancesProps) {
  return (
    <div className={cx("border-y border-or py-6", className)}>
      <h2
        id={ID_TITRE}
        className="petites-capitales flex items-center gap-2 font-titre text-lg leading-tight font-medium text-bordeaux-profond"
      >
        <PictoFiltre taille={20} className="shrink-0 text-bordeaux" />
        Filtrer les échéances
      </h2>

      <FormulaireFiltresEcheances
        type={filtres.type ?? ""}
        discipline={filtres.discipline ?? ""}
        idTitre={ID_TITRE}
        className="mt-4"
        actions={
          <>
            <Bouton type="submit">Filtrer</Bouton>
            {filtresActifs ? <Link href="/echeances">Effacer les filtres</Link> : null}
          </>
        }
      >
        <Select
          id="filtre-type"
          name="type"
          libelle="Type d’échéance"
          optionVide="Tous les types"
          options={types}
          defaultValue={filtres.type ?? ""}
        />
        <Select
          id="filtre-discipline"
          name="discipline"
          libelle="Discipline de l’événement"
          optionVide="Toutes les disciplines"
          options={disciplines}
          defaultValue={filtres.discipline ?? ""}
        />
      </FormulaireFiltresEcheances>
    </div>
  );
}
