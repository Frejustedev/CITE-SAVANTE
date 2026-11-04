// Enchaînement commun des routes `opengraph-image.tsx` (fiche événement,
// fiche organisation) :
//   - fiche publiée → son image (`CACHE_APERCU`) ;
//   - slug inconnu, mal formé ou non publié (`null`), ou contenu sans aucun
//     caractère dessinable → image générique « Cité Savante », statut 200,
//     même cache (le slug n'a été vérifié que contre la liste en cache des
//     slugs publiés : aucune lecture ni entrée de cache par slug inventé) ;
//   - lecture ou rendu impossible → image générique, `no-store` (jamais
//     gardée), erreur journalisée : un aperçu ne renvoie jamais d'erreur 500
//     pour une base indisponible. Seule l'absence des fichiers de police
//     (déploiement incomplet) fait échouer la route, image générique comprise.
import { unstable_rethrow } from "next/navigation";
import type { ReactElement } from "react";

import {
  CACHE_APERCU,
  CACHE_APERCU_SECOURS,
  pngGenerique,
  rendrePng,
  reponsePng,
} from "@/lib/og/apercus";

/**
 * Lit la fiche (`lire`, une lecture publique mise en cache de
 * `src/lib/requetes/`), en tire l'élément à dessiner (`construire`, `null`
 * pour l'image générique), puis répond par le PNG (voir l'en-tête).
 */
export async function repondreApercu<T>(
  lire: () => Promise<T | null>,
  construire: (donnees: T) => ReactElement | null,
): Promise<Response> {
  try {
    const donnees = await lire();
    const element = donnees === null ? null : construire(donnees);
    const png = element ? await rendrePng(element) : await pngGenerique();
    return reponsePng(png, CACHE_APERCU);
  } catch (erreur) {
    // Laisse passer les interruptions propres à Next.js (aucune n'est
    // attendue ici : route dynamique, sans `notFound()` ni redirection).
    unstable_rethrow(erreur);
    console.error("Image d'aperçu impossible à produire : image générique servie.", erreur);
    return reponsePng(await pngGenerique(), CACHE_APERCU_SECOURS);
  }
}
