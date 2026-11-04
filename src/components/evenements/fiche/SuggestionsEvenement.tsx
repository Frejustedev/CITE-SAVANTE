import Link from "next/link";

import { CarteEvenement } from "@/components/evenements/CarteEvenement";
import { TitreSection } from "@/components/mise-en-page/TitreSection";
import { cx } from "@/lib/utils/classes";
import type { EvenementResume } from "@/lib/utils/evenements";

/** Identifiant de la section (ancre du bandeau « Cet événement a eu lieu »). */
export const ANCRE_SUGGESTIONS = "suggestions";

/**
 * Titre de la section, selon le nombre de disciplines de l'événement :
 * « Prochains événements de la même discipline » (une),
 * « Prochains événements dans les mêmes disciplines » (plusieurs).
 */
export function titreSuggestions(nombreDisciplines: number): string {
  return nombreDisciplines > 1
    ? "Prochains événements dans les mêmes disciplines"
    : "Prochains événements de la même discipline";
}

/** Texte du lien du bandeau vers la section : « Voir les prochains événements de la même discipline ». */
export function texteLienSuggestions(nombreDisciplines: number): string {
  const titre = titreSuggestions(nombreDisciplines);
  return `Voir les ${titre.charAt(0).toLocaleLowerCase("fr")}${titre.slice(1)}`;
}

type SuggestionsEvenementProps = {
  /** Suggestions (`listerSuggestions`) : à venir, même discipline, ordre chronologique. */
  evenements: readonly EvenementResume[];
  /** Nombre de disciplines de l'événement passé (titre ; 0 : aucune suggestion possible). */
  nombreDisciplines: number;
  /** Date du jour à Porto-Novo (« AAAA-MM-JJ »), la même que celle de la page. */
  aujourdhui: string;
  className?: string;
};

/**
 * Suggestions sur la fiche d'un événement PASSÉ (spécifications 8.4) : les
 * prochains événements qui partagent au moins une discipline avec lui, en
 * cartes (`CarteEvenement`, titres `h3` sous le `h2` de la section). Sans
 * suggestion (aucune discipline, ou rien d'annoncé) : une phrase sobre et un
 * lien vers l'agenda.
 */
export function SuggestionsEvenement({
  evenements,
  nombreDisciplines,
  aujourdhui,
  className,
}: SuggestionsEvenementProps) {
  const titre =
    nombreDisciplines > 0 ? titreSuggestions(nombreDisciplines) : "Prochains événements";
  return (
    <section
      id={ANCRE_SUGGESTIONS}
      aria-labelledby="suggestions-titre"
      className={cx("min-w-0 scroll-mt-6", className)}
    >
      <TitreSection id="suggestions-titre">{titre}</TitreSection>
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
          {nombreDisciplines > 0
            ? `Aucun événement à venir n’est annoncé dans ${
                nombreDisciplines > 1 ? "ces disciplines" : "cette discipline"
              } pour le moment.`
            : "Les prochains événements sont annoncés dans l’agenda."}{" "}
          <Link href="/agenda">Consulter l’agenda</Link>
        </p>
      )}
    </section>
  );
}
