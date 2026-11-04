// Fichier agenda `GET /agenda/[slug]/ics` (spécifications, section 10.2) :
// le fichier .ics d'un événement PUBLIÉ, généré sans bibliothèque
// (src/lib/utils/ics.ts). Toute la logique de la réponse est dans
// `./fichierAgenda.ts` (testée) ; ce fichier ne fournit que la lecture de
// l'événement, l'adresse absolue de la fiche et l'heure courante. Un fichier
// `route` ne peut exporter que des méthodes HTTP et des réglages de segment :
// d'où ce module voisin.
//
// Lecture : `obtenirEvenementPublie` (src/lib/requetes/evenements.ts), la
// même que la fiche : statut `publie` exigé, slug vérifié contre la liste en
// cache des slugs publiés avant toute lecture, donc aucune entrée de cache
// pour un slug inventé.
//
// `params` est une promesse depuis Next.js 15
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md).
// HEAD n'est pas déclarée : Next.js y répond par GET, sans corps.
import { obtenirEvenementPublie } from "@/lib/requetes/evenements";
import { urlAbsolue } from "@/lib/utils/urls";

import { repondreFichierAgenda } from "./fichierAgenda";

// Jamais tentée au build (aucune base à ce moment-là).
export const dynamic = "force-dynamic";

type ContexteRoute = { params: Promise<{ slug: string }> };

export async function GET(_requete: Request, { params }: ContexteRoute): Promise<Response> {
  const { slug } = await params;
  return repondreFichierAgenda(slug, {
    lireEvenement: obtenirEvenementPublie,
    urlFiche: (slugFiche) => urlAbsolue(`/agenda/${slugFiche}`),
    maintenant: new Date(),
  });
}
