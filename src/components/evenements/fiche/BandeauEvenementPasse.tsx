import { PictoHorloge } from "@/components/pictos";
import { cx } from "@/lib/utils/classes";

import { periodeEnPhrase } from "./utilitaires";

type BandeauEvenementPasseProps = {
  dateDebut: string;
  dateFin: string;
  /** Lien vers la section des suggestions, si elle propose au moins un événement. */
  lienSuggestions?: { ancre: string; texte: string } | null;
  className?: string;
};

/**
 * Bandeau d'un événement passé (spécifications 8.4) : « Cet événement a eu
 * lieu le 1er août 2026. » (ou « du 13 au 15 avril 2026 »), suivi, s'il y a
 * des suggestions, d'un lien vers elles. Texte encre sur crème soutenu,
 * filet or à gauche : le message est écrit, pas porté par la couleur.
 */
export function BandeauEvenementPasse({
  dateDebut,
  dateFin,
  lienSuggestions = null,
  className,
}: BandeauEvenementPasseProps) {
  return (
    <div
      className={cx(
        "flex items-start gap-3 border-l-4 border-or bg-creme-soutenu px-4 py-3 md:px-5",
        className,
      )}
    >
      <PictoHorloge taille={22} className="mt-0.5 shrink-0 text-bordeaux" />
      <p className="min-w-0">
        <strong className="font-medium">Cet événement a eu lieu</strong>{" "}
        <span className="tabular-nums">{periodeEnPhrase(dateDebut, dateFin)}</span>.
        {lienSuggestions ? (
          <>
            {" "}
            <a href={`#${lienSuggestions.ancre}`}>{lienSuggestions.texte}</a>
          </>
        ) : null}
      </p>
    </div>
  );
}
