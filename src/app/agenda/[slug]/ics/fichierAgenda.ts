// Route `GET /agenda/[slug]/ics` (spécifications, section 10.2) : logique de
// la réponse, testée sans réseau ni base (`fichierAgenda.test.ts`). La route
// (`./route.ts`) ne fait que fournir la lecture de l'événement, l'adresse de
// la fiche et l'heure courante ; ce module, voisin non routable de la route
// (seuls `page` et `route` le sont), ne lit ni la base ni l'environnement.
//
// Table de décision (dans l'ordre) :
//   1. slug mal formé (`estSlugValide`)          → 404, AUCUNE lecture ;
//   2. lecture impossible (erreur levée)          → 503, journalisé ;
//   3. événement absent ou non publié             → 404 ;
//   4. génération impossible (donnée invalide)    → 500, journalisé ;
//   5. sinon : 200, corps = `genererIcs` (src/lib/utils/ics.ts).
// Pas d'entrée de cache par slug inventé : la lecture fournie par la route,
// `obtenirEvenementPublie`, cherche d'abord le slug dans la liste en cache
// des slugs publiés et renvoie `null` sans lecture ni mise en cache s'il est
// inconnu ; le cas 1 évite même de consulter cette liste.
//
// Toutes les réponses portent `X-Robots-Tag: noindex` (fichier à
// télécharger, rien à indexer). Les textes d'erreur sont en français, en
// texte brut (sinon Next.js répondrait par une page en anglais).
import type { EvenementExportable } from "@/lib/utils/ics";
import { TYPE_CONTENU_ICS, genererIcs, nomFichierIcs } from "@/lib/utils/ics";
import { estSlugValide } from "@/lib/utils/slugs";

/** Message de la réponse 404, en texte brut. */
export const MESSAGE_ICS_INTROUVABLE =
  "Événement introuvable : aucun événement publié sur Cité Savante ne correspond à cette adresse.";

/** Message de la réponse 503, en texte brut. */
export const MESSAGE_ICS_INDISPONIBLE =
  "Service momentanément indisponible : veuillez réessayer dans quelques instants.";

/** Message de la réponse 500, en texte brut. */
export const MESSAGE_ICS_ERREUR =
  "Le fichier agenda de cet événement ne peut pas être créé pour le moment.";

/**
 * Durée de conservation du fichier par le navigateur : 5 minutes, comme la
 * durée de validité des lectures mises en cache (`DUREE_VALIDITE_CACHE`,
 * src/lib/cache.ts). `public` : le fichier ne dépend d'aucune donnée
 * personnelle et ne contient que des informations publiées. Seules les
 * réponses 200 sont conservables ; les erreurs portent `no-store`, pour
 * qu'un événement publié entre-temps ne reste pas introuvable.
 */
export const CACHE_CONTROL_ICS = "public, max-age=300";

/** Événement à exporter : ce qu'attend `genererIcs`, plus son slug (nom du fichier). */
export type EvenementFichierAgenda = EvenementExportable & { slug: string };

export type DependancesFichierAgenda = {
  /**
   * Fiche d'un événement PUBLIÉ, ou `null` (absent, non publié, slug inconnu) :
   * `obtenirEvenementPublie` (src/lib/requetes/evenements.ts).
   */
  lireEvenement: (slug: string) => Promise<EvenementFichierAgenda | null>;
  /** Adresse ABSOLUE de la fiche d'un slug (`urlAbsolue("/agenda/{slug}")`). */
  urlFiche: (slug: string) => string;
  /** Instant de génération (DTSTAMP) ; par défaut `new Date()`. */
  maintenant?: Date;
  /** Journal des erreurs côté serveur (par défaut `console.error`). */
  journaliser?: (message: string) => void;
};

function reponseTexte(status: 404 | 500 | 503, texte: string): Response {
  return new Response(texte, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

function messageErreur(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : String(erreur);
}

/**
 * Réponse de `GET /agenda/{slug}/ics` (voir la table de décision en tête du
 * fichier). En 200 : `Content-Type: text/calendar; charset=utf-8`,
 * `Content-Disposition: attachment; filename="{slug}.ics"`,
 * `Cache-Control: public, max-age=300`, `X-Robots-Tag: noindex`.
 */
export async function repondreFichierAgenda(
  slug: string,
  dependances: DependancesFichierAgenda,
): Promise<Response> {
  const journaliser = dependances.journaliser ?? ((message: string) => console.error(message));

  if (!estSlugValide(slug)) return reponseTexte(404, MESSAGE_ICS_INTROUVABLE);

  let evenement: EvenementFichierAgenda | null;
  try {
    evenement = await dependances.lireEvenement(slug);
  } catch (erreur) {
    journaliser(`Fichier agenda : lecture de l'événement impossible (${messageErreur(erreur)}).`);
    return reponseTexte(503, MESSAGE_ICS_INDISPONIBLE);
  }
  if (!evenement) return reponseTexte(404, MESSAGE_ICS_INTROUVABLE);

  let corps: string;
  let nomFichier: string;
  try {
    nomFichier = nomFichierIcs(evenement.slug);
    corps = genererIcs(evenement, {
      urlFiche: dependances.urlFiche(evenement.slug),
      maintenant: dependances.maintenant ?? new Date(),
    });
  } catch (erreur) {
    journaliser(
      `Fichier agenda de « ${evenement.slug} » impossible à créer (${messageErreur(erreur)}).`,
    );
    return reponseTexte(500, MESSAGE_ICS_ERREUR);
  }

  return new Response(corps, {
    status: 200,
    headers: {
      "Content-Type": TYPE_CONTENU_ICS,
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": CACHE_CONTROL_ICS,
      "X-Robots-Tag": "noindex",
    },
  });
}
