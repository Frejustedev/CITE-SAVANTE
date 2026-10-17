// Étiquettes de cache des lectures publiques (spécifications, section 8) et
// fonction d'invalidation appelée par les server actions après une écriture.
//
// Règle de rendu (voir PROGRESS.md, phase 1, section Décisions, pour le
// détail et les raisons) : `cacheComponents` n'est PAS activé dans
// `next.config.ts` (c'est un choix d'architecture pour une phase ultérieure,
// pas celui de cette étape). `src/lib/requetes/*.ts` met donc en cache
// chaque lecture publique avec `unstable_cache` (le modèle « précédent »,
// toujours disponible en Next 16 même s'il est marqué comme remplacé par
// `use cache`), étiquetée avec une ou plusieurs des constantes ci-dessous et
// bornée par `DUREE_VALIDITE_CACHE` (garde-fou : `cache.test.ts`).
// `invalider(...)` est appelée depuis les server actions (phase 5 et
// suivantes) après chaque écriture qui touche des données publiques. Aucune
// lecture dont la clé viendrait d'une saisie libre du visiteur n'est mise en
// cache (recherche texte, passerelle) : une entrée par saisie s'accumulerait.
import { updateTag } from "next/cache";

/**
 * Durée de validité, en secondes, de CHAQUE lecture mise en cache
 * (`unstable_cache(..., { tags, revalidate: DUREE_VALIDITE_CACHE })`) : 5 minutes.
 * Filet de sécurité, en plus des étiquettes : une écriture faite HORS d'une
 * server action (éditeur SQL, tableau de bord Supabase, script) n'appelle pas
 * `invalider(...)` ; sans durée, elle resterait invisible sur le site tant
 * que le serveur garde l'entrée (un an par défaut). Les server actions, elles,
 * invalident immédiatement par étiquette. Passé ce délai, la lecture suivante
 * sert encore l'ancienne valeur et relance la lecture en arrière-plan
 * (« stale-while-revalidate ») : une écriture SQL apparaît donc au plus tard
 * à la deuxième visite après 5 minutes.
 */
export const DUREE_VALIDITE_CACHE = 300;

/** Une étiquette de cache, une par famille de données publiques (section 8). */
export type Etiquette = "societes" | "evenements" | "disciplines" | "emplacements";

export const ETIQUETTES = {
  SOCIETES: "societes",
  EVENEMENTS: "evenements",
  DISCIPLINES: "disciplines",
  EMPLACEMENTS: "emplacements",
} as const satisfies Record<string, Etiquette>;

/**
 * Invalide une ou plusieurs étiquettes de cache après une écriture.
 *
 * Utilise `updateTag` (et non `revalidateTag`) : la donnée est immédiatement
 * périmée et la prochaine lecture attend la version fraîche au lieu de
 * servir une version en cache (comportement « lecture de sa propre
 * écriture », qu'exige le critère d'acceptation de la phase 6 : « Une
 * publication apparaît immédiatement sur le site public »). `updateTag` ne
 * fonctionne QUE depuis une server action (`"use server"`), jamais depuis un
 * Route Handler : `src/lib/actions/` est le seul appelant prévu, conformément
 * à CLAUDE.md, section 6 (« toutes les écritures passent par des server
 * actions »). Si une invalidation doit un jour être déclenchée hors d'une
 * server action (webhook, tâche planifiée P1), utiliser directement
 * `revalidateTag(etiquette, { expire: 0 })` à cet endroit-là plutôt que
 * cette fonction.
 */
export function invalider(...etiquettes: Etiquette[]): void {
  for (const etiquette of etiquettes) {
    updateTag(etiquette);
  }
}
