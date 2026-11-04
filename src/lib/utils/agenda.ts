// Agenda (`/agenda`, spécifications section 8.3) et échéances (`/echeances`,
// section 8.5) : lecture et normalisation des filtres de l'URL, chemins,
// filtrage en mémoire. Fonctions pures, testées (`agenda.test.ts`), appelées
// par `src/lib/requetes/evenements.ts` (qui, lui, lit la base) et par les
// pages (formulaire GET, liens).
//
// Même principe que l'annuaire (`annuaire.ts`) : les listes d'événements
// publiés sont lues et mises en cache UNE fois par jour (à venir, archives,
// échéances), puis filtrées ici, en mémoire. Aucune entrée de cache ne
// dépend donc d'une saisie du visiteur (filtres, dates, mois, texte).
//
// Choix documentés :
//   - valeur inconnue ou mal formée : ignorée sans erreur (filtre absent) ;
//     discipline ou ville inconnue de la liste : retirée des filtres
//     EFFECTIFS renvoyés (`ResultatAgenda.filtres`) ;
//   - `du` et `au` : dates « AAAA-MM-JJ » existantes (`<input type="date">`),
//     sinon ignorées ; si `du` > `au`, les deux sont ÉCHANGÉES (le visiteur a
//     inversé les champs) ; un événement est retenu s'il CHEVAUCHE la
//     période (`date_fin >= du` et `date_debut <= au`) ;
//   - `gratuit` : seul « 1 » (case cochée), « true » ou « oui » l'active ;
//   - `modalite` : correspondance exacte (« en_ligne » ne retient pas les
//     événements hybrides) ;
//   - `vue=calendrier` : `periode` est ramenée à « a_venir » (le calendrier
//     montre un mois entier, passé ou non) et `mois` n'est gardé que dans
//     cette vue, s'il est dans la fenêtre de navigation (`calendrier.ts`) ;
//   - `q` : 2 à 100 caractères (`normaliserRecherche`), recherche par la
//     fonction SQL `rechercher` (non mise en cache, comme l'annuaire).
import { Constants, type Enums } from "@/lib/supabase/types";
import {
  normaliserRecherche,
  listerVilles,
  type ParametresUrl,
  type VilleAnnuaire,
} from "@/lib/utils/annuaire";
import {
  analyserParametreMois,
  estMoisDansFenetre,
  formaterParametreMois,
} from "@/lib/utils/calendrier";
import { lireDateIso } from "@/lib/utils/dates";
import { estSlugValide, slugifier } from "@/lib/utils/slugs";

export type { ParametresUrl } from "@/lib/utils/annuaire";

/** Vue de l'agenda (`?vue=`) : liste par défaut. */
export type VueAgenda = "liste" | "calendrier";

/** Période de la vue liste (`?periode=passes` pour les archives). */
export type PeriodeAgenda = "a_venir" | "passes";

export type TypeEvenement = Enums<"type_evenement">;
export type ModaliteEvenement = Enums<"modalite_evenement">;
export type TypeEcheance = Enums<"type_echeance">;

/** Une ville proposée par le filtre « ville » : `{ slug, nom, nombre }`. */
export type VilleAgenda = VilleAnnuaire;

/** Filtres de l'agenda, normalisés. `null` = filtre absent. */
export type FiltresAgenda = {
  vue: VueAgenda;
  /** Toujours « a_venir » en vue calendrier. */
  periode: PeriodeAgenda;
  /** « AAAA-MM » dans la fenêtre du calendrier, en vue calendrier seulement ; sinon `null` (mois courant). */
  mois: string | null;
  type: TypeEvenement | null;
  /** Slug d'une discipline (`sante`). */
  discipline: string | null;
  /** Slug d'une ville, au sens de `slugifier` (`porto-novo`). */
  ville: string | null;
  modalite: ModaliteEvenement | null;
  /** Vrai : événements gratuits seulement. */
  gratuit: boolean;
  /** « AAAA-MM-JJ », jamais après `au`. */
  du: string | null;
  /** « AAAA-MM-JJ », jamais avant `du`. */
  au: string | null;
  /** Texte recherché, 2 à 100 caractères. */
  q: string | null;
};

/** Filtres tels qu'on peut les recevoir (valeurs libres). `FiltresAgenda` en fait partie. */
export type FiltresAgendaEntree = {
  vue?: string | null;
  periode?: string | null;
  mois?: string | null;
  type?: string | null;
  discipline?: string | null;
  ville?: string | null;
  modalite?: string | null;
  gratuit?: string | boolean | null;
  du?: string | null;
  au?: string | null;
  q?: string | null;
};

/** Filtres absents : liste des événements à venir. */
export const FILTRES_AGENDA_VIDES: FiltresAgenda = {
  vue: "liste",
  periode: "a_venir",
  mois: null,
  type: null,
  discipline: null,
  ville: null,
  modalite: null,
  gratuit: false,
  du: null,
  au: null,
  q: null,
};

const TYPES_EVENEMENT: readonly string[] = Constants.public.Enums.type_evenement;
const MODALITES: readonly string[] = Constants.public.Enums.modalite_evenement;
const TYPES_ECHEANCE: readonly string[] = Constants.public.Enums.type_echeance;

function chaine(valeur: unknown): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

function dateOuNull(valeur: unknown): string | null {
  const brute = chaine(valeur);
  if (!brute) return null;
  try {
    lireDateIso(brute);
    return brute;
  } catch {
    return null;
  }
}

function slugOuNull(valeur: unknown): string | null {
  const slug = chaine(valeur).toLowerCase();
  return estSlugValide(slug) ? slug : null;
}

function villeOuNull(valeur: unknown): string | null {
  const slug = typeof valeur === "string" ? slugifier(valeur) : "";
  return estSlugValide(slug) ? slug : null;
}

function gratuitDemande(valeur: unknown): boolean {
  if (valeur === true) return true;
  return ["1", "true", "oui"].includes(chaine(valeur).toLowerCase());
}

/**
 * Valide et normalise des filtres reçus (voir l'en-tête du fichier pour les
 * choix). `aujourdhui` (« AAAA-MM-JJ », Porto-Novo) sert à la fenêtre du
 * paramètre `mois`. Ne lève jamais. Idempotente : normaliser un
 * `FiltresAgenda` le renvoie à l'identique.
 */
export function normaliserFiltresAgenda(
  entree: FiltresAgendaEntree,
  aujourdhui: string,
): FiltresAgenda {
  const vue: VueAgenda = chaine(entree.vue) === "calendrier" ? "calendrier" : "liste";
  const periode: PeriodeAgenda =
    vue === "liste" && chaine(entree.periode) === "passes" ? "passes" : "a_venir";
  const moisLu = vue === "calendrier" ? analyserParametreMois(entree.mois) : null;
  const mois =
    moisLu && estMoisDansFenetre(moisLu, aujourdhui) ? formaterParametreMois(moisLu) : null;
  const type = chaine(entree.type);
  const modalite = chaine(entree.modalite);
  let du = dateOuNull(entree.du);
  let au = dateOuNull(entree.au);
  if (du && au && du > au) [du, au] = [au, du];
  return {
    vue,
    periode,
    mois,
    type: TYPES_EVENEMENT.includes(type) ? (type as TypeEvenement) : null,
    discipline: slugOuNull(entree.discipline),
    ville: villeOuNull(entree.ville),
    modalite: MODALITES.includes(modalite) ? (modalite as ModaliteEvenement) : null,
    gratuit: gratuitDemande(entree.gratuit),
    du,
    au,
    q: normaliserRecherche(typeof entree.q === "string" ? entree.q : null),
  };
}

function premiereValeur(parametres: ParametresUrl, cle: string): string | undefined {
  if (parametres instanceof URLSearchParams) return parametres.get(cle) ?? undefined;
  const valeur = parametres[cle];
  return Array.isArray(valeur) ? valeur[0] : valeur;
}

/**
 * Lit les filtres de l'URL de l'agenda (`searchParams` après `await`, ou
 * `URLSearchParams`) : `vue`, `periode`, `mois`, `type`, `discipline`,
 * `ville`, `modalite`, `gratuit`, `du`, `au`, `q` (première valeur d'un
 * paramètre répété ; paramètres inconnus ignorés), puis
 * `normaliserFiltresAgenda`.
 */
export function lireFiltresAgenda(parametres: ParametresUrl, aujourdhui: string): FiltresAgenda {
  const cles = [
    "vue",
    "periode",
    "mois",
    "type",
    "discipline",
    "ville",
    "modalite",
    "gratuit",
    "du",
    "au",
    "q",
  ] as const;
  const entree: FiltresAgendaEntree = {};
  for (const cle of cles) entree[cle] = premiereValeur(parametres, cle);
  return normaliserFiltresAgenda(entree, aujourdhui);
}

/**
 * Chemin de l'agenda pour des filtres donnés (liens de vue, de période, de
 * mois, retrait d'un filtre). Paramètres dans l'ordre vue, periode, mois,
 * type, discipline, ville, modalite, gratuit, du, au, q ; valeurs par défaut
 * omises (`vue=liste`, `periode=a_venir`, `gratuit` faux) ; `periode`
 * omise en vue calendrier, `mois` omis hors vue calendrier.
 * `cheminAgenda({})` → « /agenda » ; archives : `cheminAgenda({ periode:
 * "passes" })` → « /agenda?periode=passes ».
 */
export function cheminAgenda(filtres: Partial<FiltresAgenda>): string {
  const parametres = new URLSearchParams();
  const calendrier = filtres.vue === "calendrier";
  if (calendrier) parametres.set("vue", "calendrier");
  if (!calendrier && filtres.periode === "passes") parametres.set("periode", "passes");
  if (calendrier && filtres.mois) parametres.set("mois", filtres.mois);
  if (filtres.type) parametres.set("type", filtres.type);
  if (filtres.discipline) parametres.set("discipline", filtres.discipline);
  if (filtres.ville) parametres.set("ville", filtres.ville);
  if (filtres.modalite) parametres.set("modalite", filtres.modalite);
  if (filtres.gratuit) parametres.set("gratuit", "1");
  if (filtres.du) parametres.set("du", filtres.du);
  if (filtres.au) parametres.set("au", filtres.au);
  if (filtres.q) parametres.set("q", filtres.q);
  const requete = parametres.toString();
  return requete ? `/agenda?${requete}` : "/agenda";
}

/**
 * Vrai si au moins un filtre de CONTENU est actif (type, discipline, ville,
 * modalité, gratuit, dates, texte) : bouton « Effacer les filtres »,
 * `noindex` des variantes filtrées. La vue, la période et le mois n'en sont
 * pas.
 */
export function aDesFiltresAgenda(filtres: FiltresAgenda): boolean {
  return Boolean(
    filtres.type ||
    filtres.discipline ||
    filtres.ville ||
    filtres.modalite ||
    filtres.gratuit ||
    filtres.du ||
    filtres.au ||
    filtres.q,
  );
}

/** Le minimum qu'il faut savoir d'un événement pour le filtrer. */
export type EvenementFiltrable = {
  id: string;
  type: TypeEvenement;
  dateDebut: string;
  dateFin: string;
  modalite: ModaliteEvenement;
  gratuit: boolean;
  ville: string | null;
  disciplines: readonly { slug: string }[];
};

/** Contexte de `appliquerFiltresAgenda`, fourni par la couche de lecture. */
export type ContexteFiltresAgenda = {
  /** Slugs de toutes les disciplines existantes : une discipline inconnue est ignorée. */
  disciplinesConnues: Iterable<string>;
  /**
   * Identifiants des événements trouvés par la recherche texte de
   * `filtres.q` (fonction SQL `rechercher`), ou `null` si aucune recherche
   * n'a été faite (le filtre `q` est alors ignoré).
   */
  idsRecherche: ReadonlySet<string> | null;
  /**
   * Événements dont on tire les villes connues et proposées (filtre
   * « ville ») ; par défaut, la liste filtrée elle-même. La vue calendrier
   * passe toute la liste (à venir et archives), pour qu'un mois sans
   * événement à Parakou n'efface pas le filtre « Parakou ».
   */
  referenceVilles?: readonly { ville: string | null }[];
};

/** Résultat d'une lecture de l'agenda. */
export type ResultatAgenda<T> = {
  /** Événements retenus, dans l'ordre de la vue (voir la fonction de lecture). */
  evenements: T[];
  /** Nombre d'événements retenus. */
  total: number;
  /**
   * Filtres EFFECTIVEMENT appliqués (discipline ou ville inconnue remise à
   * `null`, `q` remis à `null` sans recherche) : à reprendre tels quels dans
   * le formulaire et les liens (`cheminAgenda`).
   */
  filtres: FiltresAgenda;
  /** Villes proposées par le filtre « ville », triées (ordre alphabétique français). */
  villes: VilleAgenda[];
};

/**
 * Filtre en mémoire (type, discipline, ville, modalité, gratuit, période
 * `du`–`au`, recherche : combinables, cumulatifs) SANS trier : l'ordre reçu
 * est conservé. Ne tient compte ni de `vue`, ni de `periode`, ni de `mois`,
 * appliqués par la lecture. Renvoie aussi les filtres effectifs et les
 * villes proposées.
 */
export function appliquerFiltresAgenda<T extends EvenementFiltrable>(
  evenements: readonly T[],
  filtres: FiltresAgenda,
  contexte: ContexteFiltresAgenda,
): ResultatAgenda<T> {
  const disciplinesConnues = new Set(contexte.disciplinesConnues);
  const villes = listerVilles(contexte.referenceVilles ?? evenements);
  const villesConnues = new Set(villes.map((ville) => ville.slug));

  const effectifs: FiltresAgenda = {
    ...filtres,
    discipline:
      filtres.discipline && disciplinesConnues.has(filtres.discipline) ? filtres.discipline : null,
    ville: filtres.ville && villesConnues.has(filtres.ville) ? filtres.ville : null,
    q: contexte.idsRecherche ? filtres.q : null,
  };

  const retenus = evenements.filter(
    (evenement) =>
      (!effectifs.type || evenement.type === effectifs.type) &&
      (!effectifs.discipline ||
        evenement.disciplines.some((discipline) => discipline.slug === effectifs.discipline)) &&
      (!effectifs.ville || slugifier(evenement.ville ?? "") === effectifs.ville) &&
      (!effectifs.modalite || evenement.modalite === effectifs.modalite) &&
      (!effectifs.gratuit || evenement.gratuit) &&
      (!effectifs.du || evenement.dateFin >= effectifs.du) &&
      (!effectifs.au || evenement.dateDebut <= effectifs.au) &&
      (!contexte.idsRecherche || contexte.idsRecherche.has(evenement.id)),
  );

  return { evenements: retenus, total: retenus.length, filtres: effectifs, villes };
}

// ── Échéances (section 8.5) ──────────────────────────────────────────────────

/** Filtres de la page des échéances, normalisés. `null` = filtre absent. */
export type FiltresEcheances = {
  type: TypeEcheance | null;
  /** Slug d'une discipline. */
  discipline: string | null;
};

/** Filtres tels qu'on peut les recevoir. */
export type FiltresEcheancesEntree = { type?: string | null; discipline?: string | null };

/** Valide et normalise : type parmi l'énumération `type_echeance`, discipline au format slug. */
export function normaliserFiltresEcheances(entree: FiltresEcheancesEntree = {}): FiltresEcheances {
  const type = chaine(entree.type);
  return {
    type: TYPES_ECHEANCE.includes(type) ? (type as TypeEcheance) : null,
    discipline: slugOuNull(entree.discipline),
  };
}

/** Lit `?type=…&discipline=…` (première valeur), puis `normaliserFiltresEcheances`. */
export function lireFiltresEcheances(parametres: ParametresUrl): FiltresEcheances {
  return normaliserFiltresEcheances({
    type: premiereValeur(parametres, "type"),
    discipline: premiereValeur(parametres, "discipline"),
  });
}

/** Chemin de la page des échéances : `cheminEcheances({})` → « /echeances ». */
export function cheminEcheances(filtres: Partial<FiltresEcheances>): string {
  const parametres = new URLSearchParams();
  if (filtres.type) parametres.set("type", filtres.type);
  if (filtres.discipline) parametres.set("discipline", filtres.discipline);
  const requete = parametres.toString();
  return requete ? `/echeances?${requete}` : "/echeances";
}

/** Le minimum qu'il faut savoir d'une échéance pour la filtrer. */
export type EcheanceFiltrable = {
  type: TypeEcheance;
  disciplines: readonly { slug: string }[];
};

/** Résultat d'une lecture des échéances. */
export type ResultatEcheances<T> = {
  /** Échéances retenues, par date limite croissante. */
  echeances: T[];
  total: number;
  /** Filtres effectivement appliqués (discipline inconnue remise à `null`). */
  filtres: FiltresEcheances;
};

/** Filtre en mémoire (type, discipline de l'événement), sans trier. */
export function appliquerFiltresEcheances<T extends EcheanceFiltrable>(
  echeances: readonly T[],
  filtres: FiltresEcheances,
  contexte: { disciplinesConnues: Iterable<string> },
): ResultatEcheances<T> {
  const disciplinesConnues = new Set(contexte.disciplinesConnues);
  const effectifs: FiltresEcheances = {
    type: filtres.type,
    discipline:
      filtres.discipline && disciplinesConnues.has(filtres.discipline) ? filtres.discipline : null,
  };
  const retenues = echeances.filter(
    (echeance) =>
      (!effectifs.type || echeance.type === effectifs.type) &&
      (!effectifs.discipline ||
        echeance.disciplines.some((discipline) => discipline.slug === effectifs.discipline)),
  );
  return { echeances: retenues, total: retenues.length, filtres: effectifs };
}
