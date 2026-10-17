// Passerelle `/go/[type]/[id]` (spécifications, section 10.1) : décisions
// PURES, sans réseau ni base, testées par analyse.test.ts.
//   - lecture et validation des paramètres reçus (`type`, `id`, `vers`,
//     `from`) ;
//   - choix de l'URL de destination dans la ligne lue en base, avec une
//     seconde vérification du statut (ou de la période d'un emplacement),
//     en plus des filtres de la requête et de la RLS ;
//   - décision de compter, ou non, la requête comme un clic.
//
// Aucune destination ne vient jamais d'un paramètre : `vers` choisit
// seulement une COLONNE parmi une liste fermée (`DESTINATIONS_PASSERELLE`,
// src/lib/utils/urls.ts) ; l'URL elle-même est toujours lue en base.
import { Constants, type Tables } from "@/lib/supabase/types";
import {
  cheminOrigineValide,
  estDestinationValide,
  lirePageOrigine,
  type CiblePasserelle,
  type DestinationPasserelle,
  type PageOrigineConnue,
  type TypeCiblePasserelle,
} from "@/lib/utils/urls";

// ── Paramètres reçus ─────────────────────────────────────────────────────────

/**
 * Identifiant au format canonique 8-4-4-4-12 (chiffres hexadécimaux, casse
 * indifférente). Aucune contrainte de version : les identifiants de
 * `seed_demo.sql` (`de110000-0000-0000-0000-000000000001`) ne sont pas des
 * UUID v4, et Postgres les accepte tous.
 */
const FORMAT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Vrai si `valeur` est un identifiant au format canonique. */
export function estUuid(valeur: unknown): valeur is string {
  return typeof valeur === "string" && FORMAT_UUID.test(valeur);
}

const TYPES_CIBLE: readonly string[] = Constants.public.Enums.type_cible;

/** Vrai si `valeur` est un type de cible connu (`type_cible` en base), casse exacte. */
export function estTypeCible(valeur: unknown): valeur is TypeCiblePasserelle {
  return typeof valeur === "string" && TYPES_CIBLE.includes(valeur);
}

/**
 * Page d'origine du clic : le CHEMIN seul (section 10.1 : « chemin de la
 * page d'origine »), sans paramètres ni fragment, DÉCODÉ, et seulement s'il
 * passe `cheminOrigineValide` PUIS est une page publique reconnue
 * (`lirePageOrigine` : `/societes`, `/agenda`… ou `/societes/{slug}`) ;
 * sinon `null`. Retirer la chaîne de requête et n'admettre que des pages
 * connues évite d'enregistrer une saisie libre du visiteur (`/recherche?q=…`,
 * ou un lien forgé `?from=/jean.dupont@exemple.org`) : aucune donnée
 * personnelle dans les clics (section 15).
 *
 * Pour une fiche (`fiche` non nul), le slug n'est encore qu'une FORME
 * valide : `traiterPasserelle` (passerelle.ts) n'enregistre le chemin que
 * si ce slug est celui d'une fiche publiée.
 */
export function pageOrigine(from: unknown): PageOrigineConnue | null {
  const chemin = cheminOrigineValide(from);
  if (chemin === null) return null;
  // `cheminOrigineValide` renvoie chemin + paramètres + fragment, chemin
  // sérialisé par `URL` : « ? » et « # » n'y figurent jamais en clair.
  const fin = chemin.search(/[?#]/);
  const cheminSeul = fin === -1 ? chemin : chemin.slice(0, fin);
  let decode: string;
  try {
    decode = decodeURIComponent(cheminSeul);
  } catch {
    return null;
  }
  return lirePageOrigine(decode);
}

/** Paramètres bruts de la passerelle : segments de l'URL et chaîne de requête. */
export type ParametresPasserelle = {
  type: unknown;
  id: unknown;
  vers: unknown;
  from: unknown;
};

export type MotifRejet = "type_invalide" | "identifiant_invalide" | "destination_invalide";

export type RequeteAnalysee =
  | { valide: true; cible: CiblePasserelle; pageOrigine: PageOrigineConnue | null }
  | { valide: false; motif: MotifRejet };

/**
 * Valide les paramètres de la passerelle.
 * - `type` : `societe`, `evenement` ou `emplacement`, en minuscules ;
 * - `id` : identifiant au format canonique, ramené en minuscules ;
 * - `vers` : OBLIGATOIRE pour une organisation (`site`, `congres`) et un
 *   événement (`inscription`, `site`) — `cheminPasserelle` l'écrit toujours ;
 *   IGNORÉ pour un emplacement, qui n'a qu'un lien ;
 * - `from` : facultatif ; une valeur dangereuse ou invalide ne rejette pas
 *   la requête, elle est simplement enregistrée à `null` (`pageOrigine` ; le
 *   slug d'une fiche est vérifié ensuite par `traiterPasserelle`).
 */
export function analyserRequete(parametres: ParametresPasserelle): RequeteAnalysee {
  const { type, id, vers, from } = parametres;
  if (!estTypeCible(type)) return { valide: false, motif: "type_invalide" };
  if (!estUuid(id)) return { valide: false, motif: "identifiant_invalide" };
  const identifiant = id.toLowerCase();

  let cible: CiblePasserelle;
  switch (type) {
    case "societe":
      if (!estDestinationValide("societe", vers)) {
        return { valide: false, motif: "destination_invalide" };
      }
      cible = { type, id: identifiant, vers };
      break;
    case "evenement":
      if (!estDestinationValide("evenement", vers)) {
        return { valide: false, motif: "destination_invalide" };
      }
      cible = { type, id: identifiant, vers };
      break;
    case "emplacement":
      cible = { type, id: identifiant };
      break;
  }

  return { valide: true, cible, pageOrigine: pageOrigine(from) };
}

// ── Ligne lue en base → URL de destination ───────────────────────────────────

/** Colonnes lues pour une organisation (toutes accordées à `anon`, migration 6). */
export type LigneSociete = Pick<Tables<"societes">, "id" | "statut" | "site_web" | "site_congres">;

/** Colonnes lues pour un événement (toutes accordées à `anon`, migration 6). */
export type LigneEvenement = Pick<
  Tables<"evenements">,
  "id" | "statut" | "site_web" | "lien_inscription"
>;

/** Colonnes lues pour un emplacement publicitaire. */
export type LigneEmplacement = Pick<
  Tables<"emplacements_pub">,
  "id" | "actif" | "date_debut" | "date_fin" | "lien"
>;

/**
 * URL brute (non encore vérifiée ni complétée des UTM) d'une organisation :
 * `site` → `site_web`, `congres` → `site_congres`. `null` si la ligne
 * manque, ne correspond pas à l'identifiant demandé ou n'est pas publiée.
 */
export function destinationSociete(
  ligne: LigneSociete | null,
  id: string,
  vers: DestinationPasserelle<"societe">,
): string | null {
  if (!ligne || ligne.id.toLowerCase() !== id || ligne.statut !== "publie") return null;
  return vers === "site" ? ligne.site_web : ligne.site_congres;
}

/**
 * URL brute d'un événement : `inscription` → `lien_inscription`, `site` →
 * `site_web`. `null` si la ligne manque, ne correspond pas à l'identifiant
 * demandé ou n'est pas publiée.
 */
export function destinationEvenement(
  ligne: LigneEvenement | null,
  id: string,
  vers: DestinationPasserelle<"evenement">,
): string | null {
  if (!ligne || ligne.id.toLowerCase() !== id || ligne.statut !== "publie") return null;
  return vers === "inscription" ? ligne.lien_inscription : ligne.site_web;
}

/**
 * URL brute d'un emplacement publicitaire (`lien`), seulement s'il est actif
 * et que `aujourdhui` (date du jour à Porto-Novo, « AAAA-MM-JJ ») est dans
 * sa période, bornes comprises — même règle que la RLS
 * (`actif and aujourdhui() between date_debut and date_fin`). Les dates
 * « AAAA-MM-JJ » se comparent directement comme des chaînes.
 */
export function destinationEmplacement(
  ligne: LigneEmplacement | null,
  id: string,
  aujourdhui: string,
): string | null {
  if (!ligne || ligne.id.toLowerCase() !== id || ligne.actif !== true) return null;
  if (ligne.date_debut > aujourdhui || ligne.date_fin < aujourdhui) return null;
  return ligne.lien;
}

// ── Compter ou non la requête comme un clic ──────────────────────────────────

/**
 * Vrai si la requête est un vrai clic à enregistrer. Faux pour :
 * - toute méthode autre que GET : Next.js répond aux requêtes HEAD avec le
 *   gestionnaire GET s'il n'y en a pas d'autre
 *   (`next/dist/server/route-modules/app-route/helpers/auto-implement-methods.js`) ;
 *   les vérificateurs de liens et les robots d'aperçu en envoient ;
 * - une requête du routeur de Next.js (en-tête `RSC` ou
 *   `Next-Router-Prefetch`) : un `<Link href="/go/…">` préchargerait le lien
 *   sans clic, puis, la réponse n'étant pas du RSC, referait une navigation
 *   complète (`fetch-server-response.js`, `doMpaNavigation`) : le clic serait
 *   compté deux fois. Les liens vers la passerelle sont de simples `<a>` ;
 * - un préchargement du navigateur (`Sec-Purpose` ou `Purpose` contenant
 *   « prefetch », `X-Moz: prefetch`).
 * La redirection est servie dans tous les cas : seul l'enregistrement change.
 */
export function doitCompterClic(methode: string, entetes: Headers): boolean {
  if (methode.toUpperCase() !== "GET") return false;
  if (entetes.has("rsc") || entetes.has("next-router-prefetch")) return false;
  const intention = [entetes.get("sec-purpose"), entetes.get("purpose"), entetes.get("x-moz")]
    .filter((valeur): valeur is string => valeur !== null)
    .join(" ");
  return !/prefetch/i.test(intention);
}
