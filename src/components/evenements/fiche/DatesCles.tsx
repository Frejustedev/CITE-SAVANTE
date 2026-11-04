import { Badge } from "@/components/mise-en-page/Badge";
import { Carte } from "@/components/mise-en-page/Carte";
import { cx } from "@/lib/utils/classes";
import { decrireJoursRestants, formaterDate, joursRestants } from "@/lib/utils/dates";
import { libelleEcheance, type EcheanceEvenement } from "@/lib/utils/evenements";

import { etatEcheance } from "./utilitaires";

type DatesClesProps = {
  /** Toutes les échéances de l'événement, passées comprises, par date limite croissante. */
  echeances: readonly EcheanceEvenement[];
  /** Date du jour à Porto-Novo (« AAAA-MM-JJ »), la même que celle de la page. */
  aujourdhui: string;
  className?: string;
};

/**
 * Bloc « Dates clés » de la fiche événement (spécifications 8.4), en carte :
 * toutes les échéances, triées par date limite (ordre reçu de
 * `obtenirEvenementPublie`), chacune avec sa date (`<time>`) et son libellé
 * (`libelleEcheance` : libellé libre, sinon celui du type).
 * - Passée (date limite avant aujourd'hui) : date et libellé barrés (`<s>`)
 *   ET mention écrite « Date passée » — le barré n'est pas annoncé par les
 *   lecteurs d'écran, et la couleur n'est jamais le seul signal.
 * - Urgente (7 jours ou moins, aujourd'hui compris) : badge or « Clôture
 *   aujourd’hui », « Clôture dans 3 jours » (même texte que la carte
 *   d'événement).
 * - Plus lointaine : « Clôture dans 23 jours », en texte simple.
 * Sans échéance : une phrase sobre.
 */
export function DatesCles({ echeances, aujourdhui, className }: DatesClesProps) {
  return (
    <Carte as="section" aria-labelledby="dates-cles-titre" className={cx("min-w-0", className)}>
      <h2
        id="dates-cles-titre"
        className="font-titre text-lg leading-tight font-medium text-bordeaux-profond"
      >
        Dates clés
      </h2>

      {echeances.length === 0 ? (
        <p className="mt-3">Aucune date clé n’est annoncée pour cet événement.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {echeances.map((echeance) => {
            const etat = etatEcheance(echeance.dateLimite, aujourdhui);
            const jours = joursRestants(echeance.dateLimite, aujourdhui);
            const contenu = (
              <>
                <time
                  dateTime={echeance.dateLimite}
                  className="block font-medium text-bordeaux-profond tabular-nums"
                >
                  {formaterDate(echeance.dateLimite)}
                </time>
                <span className="block">{libelleEcheance(echeance)}</span>
              </>
            );
            return (
              <li
                key={echeance.id}
                data-etat={etat}
                className="border-t border-or/60 pt-3 first:border-t-0 first:pt-0"
              >
                {etat === "passee" ? <s className="block">{contenu}</s> : contenu}
                <span className="mt-1 block text-base">
                  {etat === "passee" ? (
                    <span className="petites-capitales">Date passée</span>
                  ) : etat === "urgente" ? (
                    <Badge variante="urgent">Clôture {decrireJoursRestants(jours)}</Badge>
                  ) : (
                    <>Clôture {decrireJoursRestants(jours)}</>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Carte>
  );
}
