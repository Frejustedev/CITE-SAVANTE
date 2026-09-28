import { PictoRecherche } from "@/components/pictos";
import { cx } from "@/lib/utils/classes";

type FormulaireRechercheProps = {
  className?: string;
};

/**
 * Recherche du site, présente dans l'en-tête de toutes les pages.
 * Simple formulaire GET vers `/recherche?q=…` : fonctionne sans JavaScript.
 * Le libellé est masqué visuellement mais lu par les lecteurs d'écran ; le
 * bouton d'envoi porte lui aussi un nom accessible.
 */
export function FormulaireRecherche({ className }: FormulaireRechercheProps) {
  return (
    <form
      action="/recherche"
      method="get"
      role="search"
      aria-label="Recherche sur le site"
      className={cx("relative", className)}
    >
      <label htmlFor="recherche-site" className="sr-only">
        Rechercher une société savante, un congrès ou un événement
      </label>
      <input
        id="recherche-site"
        name="q"
        type="search"
        enterKeyHint="search"
        placeholder="Société, congrès, discipline…"
        className="min-h-11 w-full rounded-[6px] border border-encre/60 bg-creme py-2 pr-12 pl-3 font-texte text-base text-encre placeholder:text-encre/70 placeholder:italic [&::-webkit-search-cancel-button]:appearance-none"
      />
      <button
        type="submit"
        className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[4px] text-bordeaux hover:bg-creme-soutenu hover:text-bordeaux-profond"
      >
        <PictoRecherche taille={20} />
        <span className="sr-only">Lancer la recherche</span>
      </button>
    </form>
  );
}
