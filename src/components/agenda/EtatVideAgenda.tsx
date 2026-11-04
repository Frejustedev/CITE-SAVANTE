import { Bouton } from "@/components/mise-en-page/Bouton";
import { CHEMIN_ANNONCER_EVENEMENT } from "@/config/site";
import { cheminAgenda } from "@/lib/utils/agenda";
import { cx } from "@/lib/utils/classes";

export type EtatVideAgendaProps = {
  /** Vue affichée : liste à venir, archives ou mois du calendrier. */
  mode: "a_venir" | "passes" | "calendrier";
  /** Des filtres de contenu sont actifs (`aDesFiltresAgenda`) : propose de les effacer. */
  filtresActifs: boolean;
  /**
   * Agenda sans filtre de contenu, vue, période et mois gardés
   * (`cheminAgenda({ vue, periode, mois })`), cible de « Effacer les filtres ».
   */
  cheminEffacer: string;
  className?: string;
};

/**
 * Agenda sans résultat (spécifications 8.3) : ce que le visiteur peut faire
 * ensuite. Le nombre de résultats et les filtres sont déjà dits par le
 * résumé (`role="status"`) au-dessus ; ce bloc ne les répète pas.
 * - Filtres actifs : élargir la recherche ou « Effacer les filtres ».
 * - Sans filtre : selon la vue, consulter les archives, revenir aux
 *   événements à venir ou à la liste.
 * Toujours : « Annoncer un événement » (`/referencer/evenement`).
 */
export function EtatVideAgenda({
  mode,
  filtresActifs,
  cheminEffacer,
  className,
}: EtatVideAgendaProps) {
  return (
    <div className={cx("border-t border-or bg-creme-soutenu p-5 md:p-6", className)}>
      <p className="max-w-[65ch]">{texte(mode, filtresActifs)}</p>
      <p className="mt-5 flex flex-wrap gap-3">
        {filtresActifs ? (
          <Bouton href={cheminEffacer} variante="secondaire">
            Effacer les filtres
          </Bouton>
        ) : (
          <LienSansFiltre mode={mode} />
        )}
        <Bouton href={CHEMIN_ANNONCER_EVENEMENT}>Annoncer un événement</Bouton>
      </p>
    </div>
  );
}

function texte(mode: EtatVideAgendaProps["mode"], filtresActifs: boolean): string {
  if (filtresActifs) {
    return mode === "calendrier"
      ? "Changez de mois, choisissez d’autres filtres ou effacez-les pour voir tous les événements du mois. Si l’événement que vous cherchez n’est pas encore dans l’agenda, vous pouvez l’annoncer."
      : "Essayez un autre type, une autre discipline, une autre ville ou une autre période, ou effacez les filtres pour voir tous les événements. Si l’événement que vous cherchez n’est pas encore dans l’agenda, vous pouvez l’annoncer.";
  }
  switch (mode) {
    case "passes":
      return "Une fois terminés, les événements de l’agenda apparaissent ici, du plus récent au plus ancien, avec leur fiche complète.";
    case "calendrier":
      return "Changez de mois avec les liens ci-dessus, ou consultez la liste de tous les événements à venir.";
    default:
      return "Les événements apparaissent ici une fois validés. Si vous organisez un congrès, une journée scientifique, un séminaire ou une formation au Bénin, vous pouvez l’annoncer.";
  }
}

/** Lien utile quand la vue est vide sans filtre (aucun lien vers une vue elle-même vide). */
function LienSansFiltre({ mode }: { mode: EtatVideAgendaProps["mode"] }) {
  switch (mode) {
    case "passes":
      return (
        <Bouton href={cheminAgenda({})} variante="secondaire">
          Revenir aux événements à venir
        </Bouton>
      );
    case "calendrier":
      return (
        <Bouton href={cheminAgenda({})} variante="secondaire">
          Consulter la liste des événements
        </Bouton>
      );
    default:
      return (
        <Bouton href={cheminAgenda({ periode: "passes" })} variante="secondaire">
          Consulter les événements passés
        </Bouton>
      );
  }
}
