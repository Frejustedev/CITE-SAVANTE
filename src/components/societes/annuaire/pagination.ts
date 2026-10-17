// Pagination de l'annuaire (`/societes`, spécifications 8.1) : liste des
// numéros de page à proposer. Fonction pure, testée (`annuaire.test.tsx`,
// même dossier). Module sans dépendance : importable aussi bien par la page
// que par les composants serveur et client de l'annuaire.

/**
 * Identifiant du titre de la liste des organisations, cible des liens de
 * pagination (`…&page=2#resultats`).
 *
 * - Sans JavaScript : le navigateur charge la page et défile jusqu'au titre ;
 *   la navigation au clavier reprend à partir de lui.
 * - Avec JavaScript : Next.js 16 défile jusqu'au titre mais ne déplace PAS
 *   le focus (nouveau gestionnaire de défilement, `appNewScrollHandler`, actif
 *   par défaut) ; `FocusResultats` le place sur le titre après un changement
 *   de page.
 */
export const ANCRE_RESULTATS = "resultats";

/** Un élément de la pagination : un numéro de page, ou « … » pour des pages omises. */
export type ElementPagination =
  { type: "page"; numero: number } | { type: "ellipse"; cle: "ellipse-debut" | "ellipse-fin" };

/**
 * Numéros à afficher : la première et la dernière page, la page courante et
 * ses deux voisines. Un trou d'une seule page affiche cette page plutôt
 * qu'un « … » (qui ne ferait rien gagner) ; un trou plus grand devient
 * « … ». Au plus 7 éléments, ce qui tient sur une ligne à 360 px.
 *
 * `pages` ≤ 0 : liste vide. `page` est ramenée dans [1, pages].
 */
export function elementsPagination(page: number, pages: number): ElementPagination[] {
  if (!Number.isInteger(pages) || pages <= 0) return [];
  const courante = Math.min(Math.max(1, Math.trunc(page) || 1), pages);

  const retenues = [...new Set([1, courante - 1, courante, courante + 1, pages])]
    .filter((numero) => numero >= 1 && numero <= pages)
    .sort((a, b) => a - b);

  const elements: ElementPagination[] = [];
  let precedente = 0;
  for (const numero of retenues) {
    const ecart = numero - precedente;
    if (ecart === 2) {
      elements.push({ type: "page", numero: numero - 1 });
    } else if (ecart > 2) {
      elements.push({ type: "ellipse", cle: precedente === 1 ? "ellipse-debut" : "ellipse-fin" });
    }
    elements.push({ type: "page", numero });
    precedente = numero;
  }
  return elements;
}
