// Passerelle `GET /go/[type]/[id]` (spécifications, section 10.1) :
// enchaînement complet, de la requête reçue à la réponse. La route
// (src/app/go/[type]/[id]/route.ts) ne fait que fournir les clients
// Supabase et la date du jour ; tout le reste est ici, testé sans réseau
// avec un faux client (passerelle.test.ts).
//
// Table de décision (dans l'ordre) :
//   1. type, identifiant ou `vers` invalide        → 404, aucune lecture ;
//   2. lecture impossible (erreur, délai dépassé)   → 503 ;
//   3. cible absente, non publiée, emplacement
//      inactif ou hors période, lien absent         → 404 ;
//   4. lien qui n'est pas une URL `https://` sûre   → 404 ;
//   5. sinon : clic enregistré (si c'est un vrai clic, voir
//      `doitCompterClic`), puis 302 vers le lien complété des UTM. Un échec
//      de l'enregistrement est journalisé et n'empêche pas la redirection ;
//      un délai d'écriture dépassé aussi, mais comme « non confirmé » (le
//      délai coupe l'attente, pas la transaction, qui peut aboutir).
// Aucun clic n'est écrit dans les cas 1 à 4. Toutes les réponses portent
// `X-Robots-Tag: noindex` et `Cache-Control: no-store` (chaque clic doit
// atteindre le serveur pour être compté).
//
// Page d'origine (`page_origine`) : une page fixe reconnue (`/societes`,
// `/agenda`…) est enregistrée telle quelle ; une fiche (`/societes/{slug}`)
// seulement si son slug figure parmi les fiches publiées
// (`slugsPublies`, lecture mise en cache), sinon `null`. Vérification faite
// pour les seuls clics comptés ; si elle échoue, `null` et la redirection
// part quand même.
import { ajouterUtm, type PageOrigineConnue, type RubriqueOrigine } from "@/lib/utils/urls";

import { analyserRequete, doitCompterClic } from "./analyse";
import {
  DELAI_MAX_ENREGISTREMENT_MS,
  enregistrerClic,
  lireDestination,
  type ClientPasserelle,
} from "./donnees";

/** Message de la réponse 404, en texte brut. */
export const MESSAGE_INTROUVABLE =
  "Lien introuvable : cette destination n'existe pas ou n'est plus proposée par Cité Savante.";

/** Message de la réponse 503, en texte brut. */
export const MESSAGE_INDISPONIBLE =
  "Service momentanément indisponible : veuillez réessayer dans quelques instants.";

/** En-têtes communs à toutes les réponses de la passerelle. */
export const ENTETES_PASSERELLE = {
  "X-Robots-Tag": "noindex",
  "Cache-Control": "no-store",
} as const;

export type DependancesPasserelle = {
  /** Client de LECTURE (anonyme, soumis à la RLS), créé seulement si besoin. */
  clientLecture: () => ClientPasserelle;
  /** Client d'ÉCRITURE (service), créé seulement pour enregistrer un clic. */
  clientEcriture: () => ClientPasserelle;
  /** Date du jour à Porto-Novo, « AAAA-MM-JJ » (`aujourdhuiPortoNovo()`). */
  aujourdhui: string;
  /**
   * Slugs des fiches PUBLIÉES de chaque rubrique qui peut être une page
   * d'origine (`RUBRIQUES_ORIGINE_A_SLUG`, src/lib/utils/urls.ts) : une
   * lecture mise en cache, appelée seulement pour un clic compté venant
   * d'une fiche. Ajouter une rubrique à cette liste oblige à fournir ici sa
   * lecture (type `Record`).
   */
  slugsPublies: Record<RubriqueOrigine, () => Promise<ReadonlySet<string>>>;
  /** Journal des erreurs côté serveur (par défaut `console.error`). */
  journaliser?: (message: string) => void;
};

function reponseTexte(status: 404 | 503, texte: string): Response {
  return new Response(texte, {
    status,
    headers: { ...ENTETES_PASSERELLE, "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Redirection 302. `Response.redirect()` n'est pas utilisée : ses en-têtes
 * sont immuables. `Referrer-Policy` (même valeur que la politique du site,
 * spécifications section 6) s'applique à la requête redirigée : le site de
 * destination ne reçoit que l'origine de Cité Savante, jamais le chemin.
 */
function reponseRedirection(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      ...ENTETES_PASSERELLE,
      Location: url,
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

/** Décrit une erreur levée sans reprendre de donnée de la requête. */
function decrireErreur(erreur: unknown): string {
  return erreur instanceof Error ? `${erreur.name} : ${erreur.message}` : "erreur inconnue";
}

/**
 * Chemin à enregistrer dans `page_origine` : une page fixe telle quelle ;
 * une fiche seulement si son slug est celui d'une fiche publiée de sa
 * rubrique ; sinon `null`. Lecture impossible : `null`, journalisé sans le
 * slug (reçu du visiteur).
 */
async function confirmerPageOrigine(
  page: PageOrigineConnue | null,
  slugsPublies: DependancesPasserelle["slugsPublies"],
  journaliser: (message: string) => void,
): Promise<string | null> {
  if (page === null) return null;
  if (page.fiche === null) return page.chemin;
  try {
    const slugs = await slugsPublies[page.fiche.rubrique]();
    return slugs.has(page.fiche.slug) ? page.chemin : null;
  } catch (erreur) {
    journaliser(
      `[passerelle] Page d'origine non vérifiée (${page.fiche.rubrique}) : ${decrireErreur(erreur)}`,
    );
    return null;
  }
}

/**
 * Traite une requête de la passerelle. `parametres` : segments dynamiques
 * de la route (`await params`). Les paramètres `vers` et `from` sont lus
 * dans l'URL de la requête (première valeur s'ils sont répétés) ; tout
 * autre paramètre est ignoré.
 */
export async function traiterPasserelle(
  requete: Request,
  parametres: { type: string; id: string },
  dependances: DependancesPasserelle,
): Promise<Response> {
  const journaliser = dependances.journaliser ?? ((message: string) => console.error(message));
  const recherche = new URL(requete.url).searchParams;

  const analyse = analyserRequete({
    type: parametres.type,
    id: parametres.id,
    vers: recherche.get("vers"),
    from: recherche.get("from"),
  });
  if (!analyse.valide) return reponseTexte(404, MESSAGE_INTROUVABLE);
  const { cible } = analyse;

  let urlBrute: string | null;
  try {
    const lecture = await lireDestination(
      dependances.clientLecture(),
      cible,
      dependances.aujourdhui,
    );
    if (!lecture.ok) {
      journaliser(
        `[passerelle] Lecture impossible (${cible.type}) : ${lecture.erreur.code ?? "sans code"} — ${lecture.erreur.message}`,
      );
      return reponseTexte(503, MESSAGE_INDISPONIBLE);
    }
    urlBrute = lecture.url;
  } catch (erreur) {
    journaliser(`[passerelle] Lecture impossible (${cible.type}) : ${decrireErreur(erreur)}`);
    return reponseTexte(503, MESSAGE_INDISPONIBLE);
  }

  // `ajouterUtm` refuse (null) toute URL qui n'est pas `https://` sûre.
  const destination = urlBrute === null ? null : ajouterUtm(urlBrute);
  if (destination === null) return reponseTexte(404, MESSAGE_INTROUVABLE);

  if (doitCompterClic(requete.method, requete.headers)) {
    const page_origine = await confirmerPageOrigine(
      analyse.pageOrigine,
      dependances.slugsPublies,
      journaliser,
    );
    try {
      const resultat = await enregistrerClic(dependances.clientEcriture(), {
        cible_type: cible.type,
        cible_id: cible.id,
        url: destination,
        page_origine,
      });
      if (resultat.statut === "delai_depasse") {
        journaliser(
          `[passerelle] Clic (${cible.type}) : délai d'écriture dépassé (${DELAI_MAX_ENREGISTREMENT_MS} ms), enregistrement non confirmé`,
        );
      } else if (resultat.statut === "erreur") {
        journaliser(
          `[passerelle] Clic non enregistré (${cible.type}) : ${resultat.erreur.code ?? "sans code"} — ${resultat.erreur.message}`,
        );
      }
    } catch (erreur) {
      journaliser(`[passerelle] Clic non enregistré (${cible.type}) : ${decrireErreur(erreur)}`);
    }
  }

  return reponseRedirection(destination);
}
