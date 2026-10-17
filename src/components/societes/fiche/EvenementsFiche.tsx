import Link from "next/link";

import { CarteEvenement } from "@/components/evenements/CarteEvenement";
import { classesBouton } from "@/components/mise-en-page/Bouton";
import { TitreSection } from "@/components/mise-en-page/TitreSection";
import { PictoFleche } from "@/components/pictos";
import { modaliteEvenementLabels, typeEvenementLabels } from "@/lib/textes";
import { cx } from "@/lib/utils/classes";
import { formaterPeriode } from "@/lib/utils/dates";
import type { EvenementResume } from "@/lib/utils/evenements";

type EvenementsAVenirProps = {
  evenements: readonly EvenementResume[];
  /** Date du jour à Porto-Novo (« AAAA-MM-JJ »), la même que celle de la requête. */
  aujourdhui: string;
  className?: string;
};

/**
 * Section « Événements à venir » de la fiche (spécifications 8.2) : cartes
 * `CarteEvenement` (titres `h3` sous le `h2` de la section), une colonne sur
 * mobile, deux puis trois au-delà. `aujourdhui` est transmis à chaque carte
 * pour que le badge d'échéance urgente utilise la même date que la requête.
 * Sans événement : une phrase sobre et un lien vers l'agenda.
 */
export function EvenementsAVenir({ evenements, aujourdhui, className }: EvenementsAVenirProps) {
  return (
    <section aria-labelledby="evenements-a-venir-titre" className={cx("min-w-0", className)}>
      <TitreSection id="evenements-a-venir-titre">Événements à venir</TitreSection>
      {evenements.length > 0 ? (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {evenements.map((evenement) => (
            <CarteEvenement
              key={evenement.id}
              evenement={evenement}
              aujourdhui={aujourdhui}
              as="li"
              niveauTitre="h3"
            />
          ))}
        </ul>
      ) : (
        <p className="mt-6">
          Aucun événement à venir n’est annoncé pour le moment.{" "}
          <Link href="/agenda">Consulter l’agenda</Link>
        </p>
      )}
    </section>
  );
}

type EvenementsPassesProps = {
  /** Du plus récent au plus ancien (ordre de `listerEvenementsSociete`). */
  evenements: readonly EvenementResume[];
  className?: string;
};

/** Texte du bouton qui déplie la liste, selon le nombre d'événements. */
export function texteDeplierEvenementsPasses(nombre: number, ouvert: boolean): string {
  const verbe = ouvert ? "Masquer" : "Afficher";
  return nombre === 1 ? `${verbe} l’événement passé` : `${verbe} les ${nombre} événements passés`;
}

/** « Congrès · Cotonou », « Webinaire · En ligne ». */
function complement(evenement: EvenementResume): string {
  const lieu =
    evenement.modalite === "en_ligne"
      ? modaliteEvenementLabels.en_ligne
      : evenement.ville?.trim() || null;
  return [typeEvenementLabels[evenement.type], lieu].filter(Boolean).join(" · ");
}

/**
 * Section « Événements passés » de la fiche (spécifications 8.2) : liste
 * compacte (période, titre en lien vers la fiche de l'événement, type et
 * ville), du plus récent au plus ancien, repliée par défaut dans un
 * `<details>` natif (aucun JavaScript ; état ouvert ou fermé annoncé par le
 * navigateur). Le bouton change de texte à l'ouverture (« Afficher » puis
 * « Masquer »). Sans événement passé : une phrase sobre.
 */
export function EvenementsPasses({ evenements, className }: EvenementsPassesProps) {
  const nombre = evenements.length;

  return (
    <section aria-labelledby="evenements-passes-titre" className={cx("min-w-0", className)}>
      <TitreSection id="evenements-passes-titre">Événements passés</TitreSection>
      {nombre > 0 ? (
        <details className="group mt-6">
          <summary
            className={classesBouton(
              "secondaire",
              "cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden",
            )}
          >
            <PictoFleche
              direction="bas"
              taille={18}
              className="shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
            />
            <span className="group-open:hidden">{texteDeplierEvenementsPasses(nombre, false)}</span>
            <span className="hidden group-open:inline">
              {texteDeplierEvenementsPasses(nombre, true)}
            </span>
          </summary>
          <ol className="mt-4 border-t border-or">
            {evenements.map((evenement) => (
              <li
                key={evenement.id}
                className="flex flex-col gap-1 border-b border-or/60 py-3 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span className="text-base tabular-nums sm:w-72 sm:shrink-0">
                  {formaterPeriode(evenement.dateDebut, evenement.dateFin)}
                </span>
                <span className="min-w-0">
                  <Link href={`/agenda/${evenement.slug}`} className="break-words">
                    {evenement.titre}
                  </Link>
                  <span className="block text-base">{complement(evenement)}</span>
                </span>
              </li>
            ))}
          </ol>
        </details>
      ) : (
        <p className="mt-6">Aucun événement passé n’est enregistré pour cette organisation.</p>
      )}
    </section>
  );
}
