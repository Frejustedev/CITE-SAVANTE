import Link from "next/link";

import { CarteEvenement } from "@/components/evenements/CarteEvenement";
import { TitreSection } from "@/components/mise-en-page/TitreSection";
import { grouperParMois } from "@/lib/utils/calendrier";
import { cx } from "@/lib/utils/classes";
import type { EvenementResume } from "@/lib/utils/evenements";

/** Identifiant du titre du bloc des événements mis en avant. */
export const ID_MIS_EN_AVANT = "mis-en-avant";

/** Identifiant du titre d'un mois de la liste (« mois-2026-11 »). */
export function idTitreMois(cle: string): string {
  return `mois-${cle}`;
}

const CLASSES_GRILLE = "mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3";

export type ListeAgendaProps = {
  /**
   * Événements retenus, déjà triés par la lecture (`listerEvenementsAgenda`) :
   * à venir, mis en avant d'abord puis par date de début ; archives, du plus
   * récent au plus ancien.
   */
  evenements: readonly EvenementResume[];
  /** Archives (`?periode=passes`) : mois du plus récent au plus ancien, aucun bloc « mis en avant ». */
  archives: boolean;
  /** Date du jour à Porto-Novo (« AAAA-MM-JJ »), transmise aux cartes (échéance urgente). */
  aujourdhui: string;
  className?: string;
};

/**
 * Vue liste de l'agenda (spécifications 8.3) :
 * - en tête, les événements mis en avant (emplacement `evenement_en_avant`
 *   actif, section 7), sous le titre « Événements mis en avant », avec une
 *   phrase qui dit pourquoi ils sont là (offre de visibilité, section 8.9) ;
 *   chaque carte porte la mention « Mis en avant » ;
 * - puis les autres événements groupés par mois de DÉBUT (`grouperParMois` :
 *   un événement à cheval sur deux mois figure dans le mois de son début, sa
 *   période écrite sur la carte), un titre `h2` par mois, cartes en `h3`.
 *   Un événement mis en avant n'est pas répété dans son mois.
 * Archives : mois du plus récent au plus ancien, jamais de mise en avant.
 * Rien n'est rendu sans événement (l'état vide est affiché par la page).
 */
export function ListeAgenda({ evenements, archives, aujourdhui, className }: ListeAgendaProps) {
  if (evenements.length === 0) return null;

  const misEnAvant = archives ? [] : evenements.filter((evenement) => evenement.miseEnAvant);
  const autres = archives ? evenements : evenements.filter((evenement) => !evenement.miseEnAvant);
  const groupes = grouperParMois(autres, archives ? "decroissant" : "croissant");

  return (
    <div className={cx("space-y-10 md:space-y-12", className)}>
      {misEnAvant.length > 0 ? (
        <section aria-labelledby={ID_MIS_EN_AVANT}>
          <TitreSection id={ID_MIS_EN_AVANT}>Événements mis en avant</TitreSection>
          <p className="mt-3 text-sm italic">
            Ces événements sont présentés en premier au titre d’une offre de{" "}
            <Link href="/visibilite">visibilité</Link>.
          </p>
          <ul className={CLASSES_GRILLE}>
            {misEnAvant.map((evenement) => (
              <CarteEvenement
                key={evenement.id}
                as="li"
                niveauTitre="h3"
                evenement={evenement}
                aujourdhui={aujourdhui}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {groupes.map((groupe) => (
        <section key={groupe.cle} aria-labelledby={idTitreMois(groupe.cle)}>
          <TitreSection id={idTitreMois(groupe.cle)}>{groupe.titre}</TitreSection>
          <ul className={CLASSES_GRILLE}>
            {groupe.evenements.map((evenement) => (
              <CarteEvenement
                key={evenement.id}
                as="li"
                niveauTitre="h3"
                evenement={evenement}
                aujourdhui={aujourdhui}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
