import { Bouton } from "@/components/mise-en-page/Bouton";
import { CHEMIN_ANNONCER_EVENEMENT } from "@/config/site";
import { cx } from "@/lib/utils/classes";

export type EtatVideEcheancesProps = {
  /** Des filtres sont actifs : propose de les effacer. */
  filtresActifs: boolean;
  className?: string;
};

/**
 * Aucune échéance à afficher (spécifications 8.5) : ce que le visiteur peut
 * faire. Avec des filtres : les effacer ; sans filtre : consulter l'agenda,
 * ou annoncer un événement et ses dates limites. Le nombre de résultats et
 * les filtres sont déjà dits par le résumé au-dessus.
 */
export function EtatVideEcheances({ filtresActifs, className }: EtatVideEcheancesProps) {
  return (
    <div className={cx("border-t border-or bg-creme-soutenu p-5 md:p-6", className)}>
      {filtresActifs ? (
        <p className="max-w-[65ch]">
          Essayez un autre type d’échéance ou une autre discipline, ou effacez les filtres pour voir
          toutes les dates limites à venir.
        </p>
      ) : (
        <p className="max-w-[65ch]">
          Les dates limites des événements publiés (soumission des résumés, inscriptions, bourses,
          prix) apparaissent ici. Vous organisez un événement scientifique au Bénin ? Annoncez-le
          avec ses échéances.
        </p>
      )}
      <p className="mt-5 flex flex-wrap gap-3">
        {filtresActifs ? (
          <Bouton href="/echeances" variante="secondaire">
            Effacer les filtres
          </Bouton>
        ) : null}
        <Bouton href="/agenda" variante="secondaire">
          Voir l’agenda
        </Bouton>
        <Bouton href={CHEMIN_ANNONCER_EVENEMENT}>Annoncer un événement</Bouton>
      </p>
    </div>
  );
}
