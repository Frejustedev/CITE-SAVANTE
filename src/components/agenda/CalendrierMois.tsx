import Link from "next/link";
import type { ReactNode } from "react";

import { dateCase, deMois, titreJour } from "@/components/agenda/libelles";
import { BadgeTypeEvenement } from "@/components/evenements/BadgeTypeEvenement";
import { TitreSection } from "@/components/mise-en-page/TitreSection";
import { PictoFanion, PictoFleche } from "@/components/pictos";
import { MENTION_MIS_EN_AVANT } from "@/lib/textes";
import { cheminAgenda, type FiltresAgenda } from "@/lib/utils/agenda";
import {
  JOURS_SEMAINE,
  bornesMois,
  comparerMois,
  estMoisDansFenetre,
  formaterParametreMois,
  moisDeLaDate,
  moisPrecedent,
  moisSuivant,
  positionDansEvenement,
  repartirEvenementsParJour,
  titreMois,
  type GrilleMois,
  type JourGrille,
  type MoisCalendrier,
} from "@/lib/utils/calendrier";
import { cx } from "@/lib/utils/classes";
import { formaterPeriode } from "@/lib/utils/dates";
import { texteLieu, type EvenementResume } from "@/lib/utils/evenements";

/** Identifiant de la section du calendrier, cible des liens de mois (`…#calendrier`). */
export const ANCRE_CALENDRIER = "calendrier";

/** Identifiant du titre du mois affiché. */
const ID_TITRE = "titre-calendrier";

/** Espace insécable (U+00A0), avant « : ». */
const NBSP = " ";

/** Un événement placé sur un jour du calendrier. */
type Occurrence = {
  evenement: EvenementResume;
  /** Première apparition de l'événement dans cette présentation : seul lien atteint par Tab. */
  premiere: boolean;
  /** Deuxième jour de l'événement ou suivant : mention « Suite ». */
  suite: boolean;
};

/**
 * Occurrences de chaque jour, dans l'ordre chronologique des jours : un
 * événement de plusieurs jours figure sur chacun de ses jours ; seule sa
 * PREMIÈRE apparition (dans la grille, ou dans la liste mobile) est atteinte
 * par la touche Tab, les suivantes restent cliquables (`tabIndex={-1}`) et
 * lisibles par les lecteurs d'écran. Sans cela, un congrès de cinq jours
 * coûterait cinq arrêts de tabulation.
 */
function occurrencesParJour(parJour: Map<string, EvenementResume[]>): Map<string, Occurrence[]> {
  const deja = new Set<string>();
  const resultat = new Map<string, Occurrence[]>();
  for (const [date, evenements] of parJour) {
    resultat.set(
      date,
      evenements.map((evenement) => {
        const premiere = !deja.has(evenement.id);
        deja.add(evenement.id);
        const position = positionDansEvenement(evenement, date);
        return {
          evenement,
          premiere,
          suite: position === "intermediaire" || position === "dernier",
        };
      }),
    );
  }
  return resultat;
}

/**
 * Nombre d'événements qui ont au moins un jour dans le mois `mois` (bornes
 * du mois, pas celles de la grille, qui déborde sur les mois voisins) :
 * compteur du résumé de la vue calendrier.
 */
export function nombreEvenementsDuMois(
  evenements: readonly { dateDebut: string; dateFin: string }[],
  mois: MoisCalendrier,
): number {
  const { debut, fin } = bornesMois(mois);
  return evenements.filter((evenement) => evenement.dateDebut <= fin && evenement.dateFin >= debut)
    .length;
}

/**
 * Lien vers la vue calendrier d'un autre mois, filtres gardés, ancre
 * `#calendrier` (sans JavaScript, le navigateur revient au calendrier ;
 * avec, `Link` garde la position de défilement). Le mois en cours s'écrit
 * sans `mois=` : une seule adresse pour lui.
 */
function cheminMois(filtres: FiltresAgenda, mois: MoisCalendrier, aujourdhui: string): string {
  const courant = comparerMois(mois, moisDeLaDate(aujourdhui)) === 0;
  const chemin = cheminAgenda({
    ...filtres,
    vue: "calendrier",
    mois: courant ? null : formaterParametreMois(mois),
  });
  return `${chemin}#${ANCRE_CALENDRIER}`;
}

/**
 * Lien d'un événement dans une case de la grille. « Mis en avant » y est écrit
 * en clair, comme « Suite » : le fanion or, trop peu contrasté pour porter seul
 * l'information (spécifications, section 4.1), reste décoratif.
 */
function LienEvenementCase({
  occurrence,
  horsMois,
}: {
  occurrence: Occurrence;
  horsMois: boolean;
}) {
  const { evenement, premiere, suite } = occurrence;
  return (
    <Link
      href={`/agenda/${evenement.slug}`}
      tabIndex={premiere ? undefined : -1}
      className={cx(
        "block border-l-[3px] px-1.5 py-1 text-xs leading-snug no-underline hover:underline lg:text-sm",
        suite ? "border-or" : "border-bordeaux",
        horsMois ? "bg-creme-soutenu" : "bg-creme",
      )}
    >
      {suite ? (
        <span className="petites-capitales block text-bordeaux-profond">
          Suite<span className="sr-only">{`${NBSP}: `}</span>
        </span>
      ) : null}
      {evenement.miseEnAvant ? (
        <span className="petites-capitales block text-bordeaux">
          <PictoFanion taille={14} className="mr-1 inline-block align-[-2px] text-or" />
          {MENTION_MIS_EN_AVANT}
          <span className="sr-only">{`${NBSP}: `}</span>
        </span>
      ) : null}
      <span className="line-clamp-3">{evenement.titre}</span>
    </Link>
  );
}

function CaseJour({ jour, occurrences }: { jour: JourGrille; occurrences: Occurrence[] }) {
  return (
    <td
      aria-current={jour.aujourdhui ? "date" : undefined}
      className={cx(
        "h-28 p-1.5 align-top",
        jour.aujourdhui ? "border-2 border-bordeaux" : "border border-or",
        jour.horsMois ? "bg-creme" : "bg-creme-soutenu",
      )}
    >
      <span className="sr-only">{dateCase(jour.date, jour.aujourdhui)}</span>
      <span
        aria-hidden="true"
        className={cx(
          "inline-flex size-7 items-center justify-center text-sm leading-none tabular-nums",
          jour.aujourdhui && "rounded-full bg-bordeaux font-medium text-creme",
          jour.horsMois && !jour.aujourdhui && "italic",
        )}
      >
        {jour.jour}
      </span>
      {occurrences.length > 0 ? (
        <ul className="mt-1 space-y-1">
          {occurrences.map((occurrence) => (
            <li key={occurrence.evenement.id}>
              <LienEvenementCase occurrence={occurrence} horsMois={jour.horsMois} />
            </li>
          ))}
        </ul>
      ) : null}
    </td>
  );
}

function EntreeJour({ occurrence }: { occurrence: Occurrence }) {
  const { evenement, premiere, suite } = occurrence;
  return (
    <li className="relative border-t border-or bg-creme-soutenu p-4 has-[a:focus-visible]:anneau-focus">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <BadgeTypeEvenement type={evenement.type} />
        {suite ? (
          <span className="petites-capitales text-base text-bordeaux-profond">Suite</span>
        ) : null}
        {evenement.miseEnAvant ? (
          <span className="petites-capitales inline-flex items-center gap-1 text-base text-bordeaux">
            <PictoFanion taille={18} className="shrink-0 text-or" />
            {MENTION_MIS_EN_AVANT}
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-titre text-base leading-tight font-medium">
        <Link
          href={`/agenda/${evenement.slug}`}
          tabIndex={premiere ? undefined : -1}
          className="no-underline after:absolute after:inset-0 hover:underline focus-visible:outline-none"
        >
          {evenement.titre}
        </Link>
      </p>
      <p className="mt-2 text-base tabular-nums">
        <span className="sr-only">
          {evenement.dateDebut === evenement.dateFin ? `Date${NBSP}: ` : `Dates${NBSP}: `}
        </span>
        {formaterPeriode(evenement.dateDebut, evenement.dateFin)}
      </p>
      <p className="text-base">
        <span className="sr-only">{`Lieu${NBSP}: `}</span>
        {texteLieu(evenement)}
      </p>
    </li>
  );
}

export type CalendrierMoisProps = {
  /** Grille du mois affiché (`grilleMois(mois, aujourdhui)`). */
  grille: GrilleMois;
  /**
   * Événements qui chevauchent la grille (`listerEvenementsMois(grille.debut,
   * grille.fin, …)`), par ordre chronologique.
   */
  evenements: readonly EvenementResume[];
  /** Filtres réellement appliqués (`resultat.filtres`) : gardés par les liens de mois. */
  filtres: FiltresAgenda;
  /** Date du jour à Porto-Novo (« AAAA-MM-JJ ») : jour marqué, fenêtre de navigation. */
  aujourdhui: string;
  /** Affiché à la place de la liste des jours (et sous la grille) si le mois n'a aucun événement. */
  etatVide?: ReactNode;
  className?: string;
};

/**
 * Vue calendrier de l'agenda (spécifications 8.3), en HTML et CSS seulement :
 * - titre du mois (`h2`) et navigation « mois précédent », « mois
 *   suivant » (liens qui gardent les filtres), absents aux bords de la
 *   fenêtre de navigation (`estMoisDansFenetre` : 12 mois en arrière, 24 en
 *   avant), et « Revenir au mois en cours » quand celui-ci n'est ni affiché
 *   ni voisin ;
 * - à partir de 768 px, une grille mensuelle : `<table>` du lundi au
 *   dimanche, en-têtes de colonnes (`th scope="col"`, nom complet pour les
 *   lecteurs d'écran), date complète de chaque case en texte masqué (le
 *   numéro seul est ambigu pour les jours des mois voisins), jour courant
 *   marqué (`aria-current="date"`, cadre et pastille bordeaux), jours des
 *   mois voisins sur fond crème et en italique ;
 * - en dessous de 768 px, la grille est remplacée (CSS seul, aucun
 *   JavaScript) par la liste des jours DU MOIS qui ont au moins un
 *   événement, chacun sous un titre `h3`.
 * Un événement de plusieurs jours figure sur chacun de ses jours, y compris
 * à cheval sur deux mois (il apparaît dans les deux grilles) ; à partir de
 * son deuxième jour, il porte la mention « Suite » (filet or au lieu du
 * filet bordeaux dans la grille). Les deux présentations sont dans le HTML ;
 * celle qui est masquée (`display: none`) n'est lue par aucun lecteur
 * d'écran, et aucun `id` n'y est répété.
 */
export function CalendrierMois({
  grille,
  evenements,
  filtres,
  aujourdhui,
  etatVide,
  className,
}: CalendrierMoisProps) {
  const { mois } = grille;
  const bornes = bornesMois(mois);
  const casesGrille = occurrencesParJour(
    repartirEvenementsParJour(evenements, grille.debut, grille.fin),
  );
  const joursDuMois = [
    ...occurrencesParJour(repartirEvenementsParJour(evenements, bornes.debut, bornes.fin)),
  ];

  const precedent = moisPrecedent(mois);
  const suivant = moisSuivant(mois);
  const moisCourant = moisDeLaDate(aujourdhui);
  // « Revenir au mois en cours » seulement s'il n'est ni affiché, ni déjà
  // atteint par le lien « mois précédent » ou « mois suivant » (sinon deux
  // liens consécutifs mèneraient à la même adresse).
  const afficherRetour = [mois, precedent, suivant].every(
    (voisin) => comparerMois(voisin, moisCourant) !== 0,
  );

  return (
    <section
      id={ANCRE_CALENDRIER}
      aria-labelledby={ID_TITRE}
      className={cx("scroll-mt-6", className)}
    >
      <TitreSection id={ID_TITRE}>{titreMois(mois)}</TitreSection>

      {/* Aux bords de la fenêtre de navigation, le lien absent n'est pas
          remplacé par un élément de liste vide ; « mois suivant » reste à
          droite (`ml-auto`). */}
      <nav aria-label="Changer de mois" className="mt-4">
        <ul className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {estMoisDansFenetre(precedent, aujourdhui) ? (
            <li>
              <Link
                href={cheminMois(filtres, precedent, aujourdhui)}
                className="inline-flex min-h-11 items-center gap-2"
              >
                <PictoFleche direction="gauche" taille={18} className="shrink-0" />
                <span className="sr-only">{`Mois précédent${NBSP}: `}</span>
                {titreMois(precedent)}
              </Link>
            </li>
          ) : null}
          {afficherRetour ? (
            <li>
              <Link
                href={cheminMois(filtres, moisCourant, aujourdhui)}
                className="inline-flex min-h-11 items-center"
              >
                Revenir au mois en cours
              </Link>
            </li>
          ) : null}
          {estMoisDansFenetre(suivant, aujourdhui) ? (
            <li className="ml-auto">
              <Link
                href={cheminMois(filtres, suivant, aujourdhui)}
                className="inline-flex min-h-11 items-center gap-2"
              >
                <span className="sr-only">{`Mois suivant${NBSP}: `}</span>
                {titreMois(suivant)}
                <PictoFleche taille={18} className="shrink-0" />
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>

      <table className="mt-4 hidden w-full table-fixed border-collapse md:table">
        <caption className="sr-only">{`Calendrier des événements ${deMois(mois)}`}</caption>
        <thead>
          <tr>
            {JOURS_SEMAINE.map((jour) => (
              <th
                key={jour.long}
                scope="col"
                className="petites-capitales px-1.5 pb-2 text-left text-sm font-medium text-bordeaux-profond"
              >
                <span aria-hidden="true">{jour.court}</span>
                <span className="sr-only">{jour.long}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grille.semaines.map((semaine) => (
            <tr key={semaine[0].date}>
              {semaine.map((jour) => (
                <CaseJour
                  key={jour.date}
                  jour={jour}
                  occurrences={casesGrille.get(jour.date) ?? []}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {joursDuMois.length > 0 ? (
        <>
          <ol className="mt-6 space-y-8 md:hidden">
            {joursDuMois.map(([date, occurrences]) => (
              <li key={date}>
                <h3 className="flex flex-wrap items-baseline gap-x-3 border-b border-or pb-1 font-titre text-lg leading-tight font-medium text-bordeaux-profond">
                  {titreJour(date)}
                  {date === aujourdhui ? (
                    <span className="petites-capitales font-texte text-base font-normal text-bordeaux">
                      Aujourd’hui
                    </span>
                  ) : null}
                </h3>
                <ul className="mt-3 space-y-3">
                  {occurrences.map((occurrence) => (
                    <EntreeJour key={occurrence.evenement.id} occurrence={occurrence} />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm italic">
            Un événement de plusieurs jours figure sur chacun de ses jours ; à partir du deuxième,
            il porte la mention «{NBSP}Suite{NBSP}».
          </p>
        </>
      ) : (
        etatVide
      )}
    </section>
  );
}
