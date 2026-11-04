import { BadgeTypeEvenement } from "@/components/evenements/BadgeTypeEvenement";
import { cx } from "@/lib/utils/classes";
import type { EvenementFiche } from "@/lib/utils/evenements";

type EnTeteEvenementProps = {
  evenement: Pick<EvenementFiche, "titre" | "type" | "resume">;
  className?: string;
};

/**
 * En-tête de la fiche événement (spécifications 8.4) : badge du type, puis
 * le SEUL `h1` de la page (le titre de l'événement), puis le résumé s'il
 * existe (texte libre, affiché comme texte : React l'échappe).
 */
export function EnTeteEvenement({ evenement, className }: EnTeteEvenementProps) {
  return (
    <div className={cx("min-w-0", className)}>
      <BadgeTypeEvenement type={evenement.type} />
      <h1 className="mt-4 font-titre text-2xl leading-[1.15] font-medium tracking-[-0.01em] text-balance break-words text-bordeaux-profond md:text-3xl">
        {evenement.titre}
      </h1>
      {evenement.resume ? (
        <p className="mt-4 max-w-[68ch] text-lg leading-snug text-pretty md:text-xl">
          {evenement.resume}
        </p>
      ) : null}
    </div>
  );
}
