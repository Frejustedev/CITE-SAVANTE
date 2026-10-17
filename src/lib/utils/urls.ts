// Liens et adresses : liens sortants tracés (passerelle /go, spécifications
// section 10.1), chemins internes reçus en paramètre, adresses absolues du
// site, liens « tel: » et « mailto: » des fiches.
//
// Toutes ces fonctions sont pures et sans dépendance serveur : utilisables
// dans un route handler, un Server Component ou un composant client.
import { site } from "@/config/site";
import type { Enums } from "@/lib/supabase/types";
import { estSlugValide } from "@/lib/utils/slugs";

// Espaces (y compris insécables et séparateurs Unicode), caractères de
// contrôle C0/C1 et caractères invisibles de mise en forme (largeur nulle,
// contrôle de la direction du texte) : jamais acceptés dans une URL ou un
// chemin reçu de l'extérieur. Le parseur WHATWG (`new URL`) SUPPRIME
// silencieusement tabulations et retours à la ligne : il faut donc les
// refuser AVANT de l'appeler.
const CARACTERES_INTERDITS =
  /[\s\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069]/;

/** Longueur maximale d'une URL de destination acceptée par `ajouterUtm`. */
export const LONGUEUR_MAX_URL = 2048;

/** Paramètres ajoutés à toute URL de destination de la passerelle (section 10.1). */
export const PARAMETRES_UTM = { utm_source: "citesavante", utm_medium: "referral" } as const;

/**
 * Vrai si `url` est un lien externe sûr : `https://` (casse indifférente,
 * comme les contraintes de la base), sans espace ni caractère de contrôle,
 * avec un nom d'hôte et sans identifiants (`https://utilisateur@…`).
 */
export function estUrlHttpsSure(url: unknown): boolean {
  if (typeof url !== "string" || url.length > LONGUEUR_MAX_URL) return false;
  // Le parseur accepte `https:exemple.org` (barres obliques facultatives
  // pour les schémas spéciaux) : on exige le préfixe littéral.
  if (!/^https:\/\//i.test(url) || CARACTERES_INTERDITS.test(url)) return false;
  try {
    const analyse = new URL(url);
    return (
      analyse.protocol === "https:" &&
      analyse.hostname !== "" &&
      analyse.username === "" &&
      analyse.password === ""
    );
  } catch {
    return false;
  }
}

/**
 * Ajoute `utm_source=citesavante` et `utm_medium=referral` à une URL de
 * destination (spécifications, section 10.1).
 * - Seules les URL `https://` sûres sont acceptées (`estUrlHttpsSure`) ;
 *   sinon `null` : la passerelle répond alors 404 au lieu de rediriger.
 * - Un paramètre UTM déjà présent n'est jamais écrasé : chacun des deux
 *   n'est ajouté que s'il manque (choix : `?utm_campaign=x` reçoit les deux,
 *   `?utm_source=lettre` ne reçoit que `utm_medium`).
 * - Les autres paramètres sont conservés tels quels (ajout en fin de chaîne,
 *   sans réencodage), ainsi que le fragment (`#programme`).
 * L'URL renvoyée est sérialisée par `URL` (hôte en minuscules, « / » final
 * ajouté à un chemin vide).
 */
export function ajouterUtm(url: string): string | null {
  if (!estUrlHttpsSure(url)) return null;
  const analyse = new URL(url);
  const ajouts = Object.entries(PARAMETRES_UTM)
    .filter(([cle]) => !analyse.searchParams.has(cle))
    .map(([cle, valeur]) => `${cle}=${valeur}`);
  if (ajouts.length > 0) {
    const existants = analyse.search.replace(/^\?/, "");
    const prefixe = existants === "" || existants.endsWith("&") ? existants : `${existants}&`;
    analyse.search = `?${prefixe}${ajouts.join("&")}`;
  }
  return analyse.toString();
}

/** Longueur maximale d'un chemin d'origine accepté par `cheminOrigineValide`. */
export const LONGUEUR_MAX_CHEMIN_ORIGINE = 512;

const ORIGINE_FICTIVE = "https://origine.invalid";

/**
 * Valide un chemin interne reçu de l'extérieur (paramètre `from` de la
 * passerelle, future redirection après connexion) et le renvoie normalisé
 * (chemin + paramètres + fragment), ou `null` s'il n'est pas sûr.
 * Accepté : commence par « / », sans « // » ni « /\ » en tête, sans schéma,
 * sans barre oblique inverse, sans espace ni caractère de contrôle, 512
 * caractères au plus, et résolu sur la même origine (ce qui écarte aussi
 * les formes encodées, comme `/%2F%2Fexemple.org`). Toute autre valeur
 * (tableau, nombre, `undefined`) donne `null`.
 */
export function cheminOrigineValide(from: unknown): string | null {
  if (typeof from !== "string") return null;
  if (from.length === 0 || from.length > LONGUEUR_MAX_CHEMIN_ORIGINE) return null;
  if (!from.startsWith("/") || from.startsWith("//")) return null;
  if (from.includes("\\") || CARACTERES_INTERDITS.test(from)) return null;

  let analyse: URL;
  try {
    analyse = new URL(from, ORIGINE_FICTIVE);
  } catch {
    return null;
  }
  if (analyse.origin !== ORIGINE_FICTIVE) return null;

  let cheminDecode: string;
  try {
    cheminDecode = decodeURIComponent(analyse.pathname);
  } catch {
    return null; // séquence « % » invalide
  }
  if (
    cheminDecode.startsWith("//") ||
    cheminDecode.includes("\\") ||
    CARACTERES_INTERDITS.test(cheminDecode)
  ) {
    return null;
  }

  const normalise = `${analyse.pathname}${analyse.search}${analyse.hash}`;
  return normalise.length <= LONGUEUR_MAX_CHEMIN_ORIGINE ? normalise : null;
}

/**
 * Pages publiques SANS paramètre d'où peut partir un lien de la passerelle
 * (listes, accueil et pages qui afficheront un emplacement publicitaire :
 * spécifications, sections 8 et 9). Valeurs fixes : les enregistrer ne
 * reprend aucune saisie du visiteur. Liste fermée : à compléter quand une
 * nouvelle page publique portera un lien `/go` (P1 : `/actualites`).
 */
const PAGES_ORIGINE_FIXES: readonly string[] = [
  "/",
  "/societes",
  "/agenda",
  "/echeances",
  "/recherche",
];

/**
 * Rubriques dont les pages de détail (`/{rubrique}/{slug}`) sont des
 * origines admises, À CONDITION que le slug soit celui d'une fiche publiée :
 * la passerelle le vérifie (`DependancesPasserelle.slugsPublies`,
 * src/lib/passerelle/passerelle.ts), sinon `page_origine` vaut `null`. Sans
 * cette vérification, un lien forgé ferait enregistrer jusqu'à 120
 * caractères libres en forme de slug (vérification complète de la phase 2).
 * Seules les fiches d'organisation existent en phase 2. À compléter quand la
 * page de détail existera et portera un lien `/go`, avec la liste de ses
 * slugs publiés : `agenda` en phase 3, `disciplines` en phase 4. D'ici là,
 * `/agenda/{slug}` et `/disciplines/{slug}` donnent `null`.
 */
export const RUBRIQUES_ORIGINE_A_SLUG = ["societes"] as const;

/** Rubrique dont une fiche peut être une page d'origine (`/{rubrique}/{slug}`). */
export type RubriqueOrigine = (typeof RUBRIQUES_ORIGINE_A_SLUG)[number];

/**
 * Page d'origine reconnue : son chemin et, pour une fiche, la rubrique et le
 * slug dont l'existence reste à vérifier avant d'enregistrer le chemin.
 */
export type PageOrigineConnue =
  | { chemin: string; fiche: null }
  | { chemin: string; fiche: { rubrique: RubriqueOrigine; slug: string } };

function estRubriqueOrigine(valeur: string): valeur is RubriqueOrigine {
  const rubriques: readonly string[] = RUBRIQUES_ORIGINE_A_SLUG;
  return rubriques.includes(valeur);
}

/**
 * Reconnaît une page publique du site dans `chemin` (déjà DÉCODÉ, sans
 * paramètres ni fragment) : `/`, `/societes`, `/agenda`, `/echeances`,
 * `/recherche` (`fiche: null`), ou `/societes/{slug}` (`fiche` : slug à
 * vérifier par l'appelant). Casse exacte, aucune barre finale (Next.js la
 * redirige), slug au format du site (`estSlugValide`). Toute autre valeur
 * (texte libre, adresse électronique, `/espace/…`, rubrique sans
 * vérification d'existence) donne `null` : la passerelle n'enregistre jamais
 * une saisie libre dans `clics_sortants.page_origine` (section 15 : aucune
 * donnée personnelle dans les clics).
 */
export function lirePageOrigine(chemin: string): PageOrigineConnue | null {
  if (PAGES_ORIGINE_FIXES.includes(chemin)) return { chemin, fiche: null };
  const morceaux = chemin.split("/");
  // « /societes/sobeped » → ["", "societes", "sobeped"]
  if (morceaux.length !== 3 || morceaux[0] !== "") return null;
  const [, rubrique, slug] = morceaux;
  if (!estRubriqueOrigine(rubrique) || !estSlugValide(slug)) return null;
  return { chemin, fiche: { rubrique, slug } };
}

/**
 * Adresse absolue d'une page du site, à partir de `site.url`
 * (`NEXT_PUBLIC_SITE_URL`) : `urlAbsolue("/societes/sobeped")` →
 * « https://citesavante.com/societes/sobeped ». Pour le JSON-LD, les
 * images d'aperçu et les liens partagés ; les métadonnées Next
 * (`alternates.canonical`) acceptent directement le chemin relatif grâce à
 * `metadataBase`. Lève une erreur si `chemin` n'est pas un chemin interne.
 */
export function urlAbsolue(chemin: string): string {
  if (!chemin.startsWith("/") || chemin.startsWith("//") || chemin.startsWith("/\\")) {
    throw new Error(`Chemin interne attendu (commençant par « / ») : « ${chemin} ».`);
  }
  return `${site.url}${chemin}`;
}

/** Type de cible de la passerelle (`type_cible` en base). */
export type TypeCiblePasserelle = Enums<"type_cible">;

/**
 * Destinations admises par type de cible (paramètre `vers`, section 10.1).
 * Correspondance avec les colonnes : société `site` → `societes.site_web`,
 * `congres` → `societes.site_congres` ; événement `inscription` →
 * `evenements.lien_inscription`, `site` → `evenements.site_web` ;
 * emplacement : pas de `vers`, `emplacements_pub.lien`.
 */
export const DESTINATIONS_PASSERELLE = {
  societe: ["site", "congres"],
  evenement: ["inscription", "site"],
  emplacement: [],
} as const satisfies Record<TypeCiblePasserelle, readonly string[]>;

/** Destination admise pour un type de cible donné. */
export type DestinationPasserelle<T extends TypeCiblePasserelle = TypeCiblePasserelle> =
  (typeof DESTINATIONS_PASSERELLE)[T][number];

/** Cible d'un lien de la passerelle : le type impose les destinations possibles. */
export type CiblePasserelle =
  | { type: "societe"; id: string; vers: DestinationPasserelle<"societe"> }
  | { type: "evenement"; id: string; vers: DestinationPasserelle<"evenement"> }
  | { type: "emplacement"; id: string };

/** Vrai si `vers` est une destination admise pour `type` (validation du paramètre reçu). */
export function estDestinationValide<T extends TypeCiblePasserelle>(
  type: T,
  vers: unknown,
): vers is DestinationPasserelle<T> {
  const admises: readonly string[] = DESTINATIONS_PASSERELLE[type];
  return typeof vers === "string" && admises.includes(vers);
}

/**
 * Chemin d'un lien sortant tracé :
 * `cheminPasserelle({ type: "societe", id, vers: "site" }, "/societes/sobeped")`
 * → « /go/societe/{id}?vers=site&from=/societes/sobeped ». `from` est
 * validé par `cheminOrigineValide` et omis s'il n'est pas sûr. Contrat
 * commun entre les pages (qui construisent le lien) et la route
 * `/go/[type]/[id]` (qui le lit).
 */
export function cheminPasserelle(cible: CiblePasserelle, from?: string | null): string {
  const parametres: string[] = [];
  if ("vers" in cible) {
    parametres.push(`vers=${encodeURIComponent(cible.vers)}`);
  }
  const origine = from == null ? null : cheminOrigineValide(from);
  if (origine) {
    // « / » est permis tel quel dans une chaîne de requête (RFC 3986) : le
    // laisser visible garde la forme de la section 10.1.
    parametres.push(`from=${encodeURIComponent(origine).replace(/%2F/gi, "/")}`);
  }
  const requete = parametres.length > 0 ? `?${parametres.join("&")}` : "";
  return `/go/${cible.type}/${encodeURIComponent(cible.id)}${requete}`;
}

/**
 * Lien « tel: » d'un numéro saisi librement (« +229 01 97 00 00 00 » →
 * « tel:+2290197000000 »), ou `null` s'il ne ressemble pas à un numéro
 * (6 à 15 chiffres, « + » initial facultatif ; espaces, points, tirets,
 * barres et parenthèses ignorés).
 */
export function hrefTelephone(numero: string | null | undefined): string | null {
  if (!numero) return null;
  const compact = numero.trim().replace(/[\s.()/-]/g, "");
  return /^\+?\d{6,15}$/.test(compact) ? `tel:${compact}` : null;
}

/**
 * Lien « mailto: » d'une adresse électronique, ou `null` si l'adresse n'a
 * pas une forme simple et sûre (caractères qui pourraient ajouter des
 * en-têtes au message, comme « ? » ou « & », refusés). Une adresse refusée
 * peut toujours être affichée en texte.
 */
export function hrefCourriel(email: string | null | undefined): string | null {
  if (!email) return null;
  const adresse = email.trim();
  if (adresse.length > 254) return null;
  return /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(adresse)
    ? `mailto:${adresse}`
    : null;
}
