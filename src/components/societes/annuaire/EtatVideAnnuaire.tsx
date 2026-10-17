import { Bouton } from "@/components/mise-en-page/Bouton";
import { cx } from "@/lib/utils/classes";

export type EtatVideAnnuaireProps = {
  /** Des filtres sont actifs : propose de les effacer. */
  filtresActifs: boolean;
  className?: string;
};

/**
 * Annuaire sans résultat (spécifications 8.1, « état vide ») : ce que le
 * visiteur peut faire, un bouton « Effacer les filtres » si des filtres sont
 * actifs et un lien « Référencer une société ». Le nombre de résultats et
 * les filtres sont déjà dits par le résumé au-dessus de la liste.
 */
export function EtatVideAnnuaire({ filtresActifs, className }: EtatVideAnnuaireProps) {
  return (
    <div className={cx("border-t border-or bg-creme-soutenu p-5 md:p-6", className)}>
      {filtresActifs ? (
        <p className="max-w-[65ch]">
          Essayez une autre discipline, une autre ville ou une autre catégorie, ou effacez les
          filtres pour voir toutes les organisations. Si l’organisation que vous cherchez n’est pas
          encore dans l’annuaire, vous pouvez la référencer.
        </p>
      ) : (
        <p className="max-w-[65ch]">
          Les fiches des organisations apparaissent ici une fois validées. Si vous faites partie
          d’une société savante, d’une institution académique ou d’une association professionnelle
          du Bénin, vous pouvez la référencer.
        </p>
      )}
      <p className="mt-5 flex flex-wrap gap-3">
        {filtresActifs ? (
          <Bouton href="/societes" variante="secondaire">
            Effacer les filtres
          </Bouton>
        ) : null}
        <Bouton href="/referencer/societe">Référencer une société</Bouton>
      </p>
    </div>
  );
}
