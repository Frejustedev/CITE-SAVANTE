/**
 * Lien d'évitement « Aller au contenu » : premier élément focalisable de la
 * page, hors écran tant qu'il n'a pas le focus, visible dès qu'on y arrive au
 * clavier. Il mène à `<main id="contenu">` (défini dans le layout racine).
 *
 * Masqué par translation plutôt que par `sr-only` : `sr-only` puis
 * `focus:not-sr-only` entrerait en conflit avec le positionnement au focus.
 */
export function LienEvitement() {
  return (
    <a
      href="#contenu"
      className="absolute top-0 left-4 z-50 -translate-y-[calc(100%+8px)] rounded-b-[6px] bg-bordeaux px-4 py-3 text-base font-medium text-creme no-underline hover:text-creme focus:translate-y-0 motion-safe:transition-transform"
    >
      Aller au contenu
    </a>
  );
}
