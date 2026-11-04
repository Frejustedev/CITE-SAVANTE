// Annuaire des organisations (`/societes`, spécifications section 8.1) :
// lecture et normalisation des filtres de l'URL, filtrage, tri, pagination et
// liste des villes. Fonctions pures, testées (`annuaire.test.ts`), appelées
// par `src/lib/requetes/societes.ts` (qui, lui, lit la base).
//
// Choix : l'annuaire est filtré, trié et paginé EN MÉMOIRE, sur la liste
// complète des organisations publiées (lue une fois et mise en cache par
// `src/lib/requetes/societes.ts`). Raisons :
//   - tri alphabétique français insensible aux accents et à la casse
//     (`Intl.Collator("fr")`), que la collation de la base ne garantit pas ;
//   - filtre « ville » sur la forme normalisée (`slugifier`) d'un texte saisi
//     librement (« Porto-Novo », « porto novo » → `porto-novo`) ;
//   - aucune jointure filtrée à alias dans PostgREST (non vérifiable sans API).
// Hypothèse de volume : quelques centaines d'organisations au plus (toutes
// les sociétés savantes du Bénin). PostgREST plafonne une réponse à
// 1 000 lignes par défaut (réglage « Max rows » de Supabase) : au-delà, il
// faudra paginer côté base.
import { Constants, type Enums } from "@/lib/supabase/types";
import { estSlugValide, slugifier } from "@/lib/utils/slugs";

/** Nombre d'organisations par page de l'annuaire (section 8.1). */
export const TAILLE_PAGE_ANNUAIRE = 24;

/** Une recherche plus courte est ignorée (section 8.7 : « moins de 2 caractères »). */
export const LONGUEUR_MIN_RECHERCHE = 2;

/** Une recherche plus longue est coupée à cette longueur. */
export const LONGUEUR_MAX_RECHERCHE = 100;

/** Numéro de page maximal accepté avant bornage par le nombre réel de pages. */
const PAGE_MAX = 10_000;

export type CategorieOrganisation = Enums<"categorie_organisation">;

/** Filtres de l'annuaire, normalisés. `null` = filtre absent. */
export type FiltresAnnuaire = {
  /** Slug d'une discipline (`sante`). */
  discipline: string | null;
  /** Slug d'une ville, au sens de `slugifier` (`porto-novo`). */
  ville: string | null;
  categorie: CategorieOrganisation | null;
  /** Texte recherché, espaces normalisés, 2 à 100 caractères. */
  q: string | null;
  /** Numéro de page, à partir de 1. */
  page: number;
};

/** Filtres tels qu'on peut les recevoir (valeurs libres, toutes facultatives). */
export type FiltresAnnuaireEntree = {
  discipline?: string | null;
  ville?: string | null;
  categorie?: string | null;
  q?: string | null;
  page?: number | string | null;
};

/** `searchParams` d'une page Next (après `await`) ou `URLSearchParams`. */
export type ParametresUrl = Record<string, string | string[] | undefined> | URLSearchParams;

const CATEGORIES: readonly string[] = Constants.public.Enums.categorie_organisation;

// Caractères de contrôle et invisibles retirés du texte recherché.
const CARACTERES_PARASITES = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069]/g;

/**
 * Texte recherché saisi par le visiteur, nettoyé (caractères invisibles et
 * de contrôle retirés, espaces normalisés) : `null` sous 2 caractères, coupé
 * à 100. Partagé par l'annuaire et l'agenda (`src/lib/utils/agenda.ts`).
 */
export function normaliserRecherche(q: string | null | undefined): string | null {
  if (typeof q !== "string") return null;
  const propre = q.replace(CARACTERES_PARASITES, " ").replace(/\s+/g, " ").trim();
  const caracteres = Array.from(propre);
  if (caracteres.length < LONGUEUR_MIN_RECHERCHE) return null;
  return caracteres.slice(0, LONGUEUR_MAX_RECHERCHE).join("").trim();
}

/**
 * Forme canonique d'un texte de recherche, pour la requête à `rechercher()`
 * (et pour toute clé qui en dépendrait) : forme Unicode composée (NFC),
 * minuscules (locale française), espaces et caractères invisibles ramenés
 * à une seule espace. Ne retire QUE ce que la fonction SQL ignore déjà : la
 * partie plein texte (`fr_unaccent`) ignore casse et accents, mais la
 * similarité de trigrammes sur le sigle (`sigle % q`) ignore la casse et PAS
 * les accents ; les accents sont donc gardés (« Pédiatrie » → « pédiatrie »).
 * Le mot « OR » de `websearch_to_tsquery` est reconnu quelle que soit sa
 * casse : le résultat ne change pas. Le texte affiché dans le formulaire
 * reste celui du visiteur (`filtres.q`).
 */
export function cleRecherche(q: string): string {
  return q
    .normalize("NFC")
    .replace(CARACTERES_PARASITES, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fr");
}

function normaliserPage(page: number | string | null | undefined): number {
  const nombre =
    typeof page === "number"
      ? page
      : typeof page === "string" && /^\d+$/.test(page.trim())
        ? Number(page.trim())
        : NaN;
  if (!Number.isInteger(nombre) || nombre < 1) return 1;
  return Math.min(nombre, PAGE_MAX);
}

/**
 * Valide et normalise des filtres reçus : discipline au format slug
 * (minuscules), ville ramenée à son slug, catégorie parmi les valeurs de
 * l'énumération, texte nettoyé (moins de 2 caractères : ignoré ; plus de
 * 100 : coupé), page entière ≥ 1. Toute valeur invalide devient `null` (ou la
 * page 1) sans erreur. L'existence de la discipline et de la ville est
 * vérifiée plus tard, par `appliquerFiltresAnnuaire`.
 */
export function normaliserFiltresAnnuaire(entree: FiltresAnnuaireEntree = {}): FiltresAnnuaire {
  const discipline =
    typeof entree.discipline === "string" ? entree.discipline.trim().toLowerCase() : "";
  const ville = typeof entree.ville === "string" ? slugifier(entree.ville) : "";
  const categorie = typeof entree.categorie === "string" ? entree.categorie.trim() : "";
  return {
    discipline: estSlugValide(discipline) ? discipline : null,
    ville: estSlugValide(ville) ? ville : null,
    categorie: CATEGORIES.includes(categorie) ? (categorie as CategorieOrganisation) : null,
    q: normaliserRecherche(entree.q),
    page: normaliserPage(entree.page),
  };
}

function premiereValeur(parametres: ParametresUrl, cle: string): string | undefined {
  if (parametres instanceof URLSearchParams) return parametres.get(cle) ?? undefined;
  const valeur = parametres[cle];
  return Array.isArray(valeur) ? valeur[0] : valeur;
}

/**
 * Lit les filtres de l'URL de l'annuaire (`?discipline=sante&ville=cotonou&
 * categorie=societe_savante&q=...&page=2`) : première valeur de chaque
 * paramètre répété, puis `normaliserFiltresAnnuaire`. Paramètres inconnus
 * ignorés.
 */
export function lireFiltresAnnuaire(parametres: ParametresUrl): FiltresAnnuaire {
  return normaliserFiltresAnnuaire({
    discipline: premiereValeur(parametres, "discipline"),
    ville: premiereValeur(parametres, "ville"),
    categorie: premiereValeur(parametres, "categorie"),
    q: premiereValeur(parametres, "q"),
    page: premiereValeur(parametres, "page"),
  });
}

/**
 * Chemin de l'annuaire pour des filtres donnés (liens de pagination, retrait
 * d'un filtre) : paramètres dans l'ordre discipline, ville, categorie, q,
 * page ; filtres `null` et page 1 omis. `cheminAnnuaire({})` → « /societes ».
 */
export function cheminAnnuaire(filtres: Partial<FiltresAnnuaire>): string {
  const parametres = new URLSearchParams();
  if (filtres.discipline) parametres.set("discipline", filtres.discipline);
  if (filtres.ville) parametres.set("ville", filtres.ville);
  if (filtres.categorie) parametres.set("categorie", filtres.categorie);
  if (filtres.q) parametres.set("q", filtres.q);
  if (filtres.page && filtres.page > 1) parametres.set("page", String(filtres.page));
  const requete = parametres.toString();
  return requete ? `/societes?${requete}` : "/societes";
}

/** Le minimum qu'il faut savoir d'une organisation pour la filtrer et la trier. */
export type SocieteFiltrable = {
  id: string;
  slug: string;
  sigle: string;
  nomComplet: string | null;
  categorie: CategorieOrganisation;
  ville: string | null;
  miseEnAvant: boolean;
  disciplines: readonly { slug: string }[];
};

/** Une page de l'annuaire. */
export type ResultatAnnuaire<T> = {
  /** Les organisations de la page demandée (24 au plus). */
  societes: T[];
  /** Nombre total d'organisations qui correspondent aux filtres. */
  total: number;
  /** Page renvoyée : la page demandée, bornée à [1, pages] (1 si aucun résultat). */
  page: number;
  /** Nombre de pages (0 si aucun résultat). */
  pages: number;
  /** Taille d'une page (`TAILLE_PAGE_ANNUAIRE`). */
  taillePage: number;
  /**
   * Filtres EFFECTIVEMENT appliqués : discipline ou ville inconnue remise à
   * `null`, recherche remise à `null` si aucune recherche n'a été faite,
   * page bornée. À reprendre tels quels dans le formulaire et les liens.
   */
  filtres: FiltresAnnuaire;
};

const collateur = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

/**
 * Ordre de l'annuaire (section 8.1) : mises en avant d'abord, puis sigle
 * dans l'ordre alphabétique français (accents et casse ignorés, nombres dans
 * l'ordre numérique), puis nom complet et slug pour un ordre stable.
 */
export function comparerSocietes(a: SocieteFiltrable, b: SocieteFiltrable): number {
  if (a.miseEnAvant !== b.miseEnAvant) return a.miseEnAvant ? -1 : 1;
  return (
    collateur.compare(a.sigle, b.sigle) ||
    collateur.compare(a.nomComplet ?? "", b.nomComplet ?? "") ||
    (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
  );
}

/** Contexte de `appliquerFiltresAnnuaire`, fourni par la couche de lecture. */
export type ContexteFiltresAnnuaire = {
  /** Slugs de toutes les disciplines existantes : une discipline inconnue est ignorée. */
  disciplinesConnues: Iterable<string>;
  /**
   * Identifiants des organisations trouvées par la recherche texte de
   * `filtres.q` (fonction SQL `rechercher`), ou `null` si aucune recherche
   * n'a été faite (le filtre `q` est alors ignoré).
   */
  idsRecherche: ReadonlySet<string> | null;
};

/**
 * Filtre (discipline, ville, catégorie, recherche : combinables, tous
 * cumulatifs), trie (`comparerSocietes`) et pagine (`TAILLE_PAGE_ANNUAIRE`)
 * la liste complète des organisations publiées. Une discipline inconnue ou
 * une ville qu'aucune organisation publiée ne porte est ignorée (et retirée
 * des `filtres` renvoyés).
 */
export function appliquerFiltresAnnuaire<T extends SocieteFiltrable>(
  societes: readonly T[],
  filtres: FiltresAnnuaire,
  contexte: ContexteFiltresAnnuaire,
): ResultatAnnuaire<T> {
  const disciplinesConnues = new Set(contexte.disciplinesConnues);
  const villesConnues = new Set(societes.map((societe) => slugifier(societe.ville ?? "")));

  const effectifs: FiltresAnnuaire = {
    discipline:
      filtres.discipline && disciplinesConnues.has(filtres.discipline) ? filtres.discipline : null,
    ville: filtres.ville && villesConnues.has(filtres.ville) ? filtres.ville : null,
    categorie: filtres.categorie,
    q: contexte.idsRecherche ? filtres.q : null,
    page: filtres.page,
  };

  const retenues = societes
    .filter(
      (societe) =>
        (!effectifs.discipline ||
          societe.disciplines.some((discipline) => discipline.slug === effectifs.discipline)) &&
        (!effectifs.ville || slugifier(societe.ville ?? "") === effectifs.ville) &&
        (!effectifs.categorie || societe.categorie === effectifs.categorie) &&
        (!contexte.idsRecherche || contexte.idsRecherche.has(societe.id)),
    )
    .sort(comparerSocietes);

  const total = retenues.length;
  const pages = Math.ceil(total / TAILLE_PAGE_ANNUAIRE);
  const page = Math.min(Math.max(1, filtres.page), Math.max(1, pages));
  effectifs.page = page;

  return {
    societes: retenues.slice((page - 1) * TAILLE_PAGE_ANNUAIRE, page * TAILLE_PAGE_ANNUAIRE),
    total,
    page,
    pages,
    taillePage: TAILLE_PAGE_ANNUAIRE,
    filtres: effectifs,
  };
}

/** Une ville de l'annuaire, pour le filtre « ville ». */
export type VilleAnnuaire = {
  /** Valeur du paramètre `ville` (`slugifier(nom)`). */
  slug: string;
  /** Forme affichée : la graphie la plus fréquente parmi les organisations. */
  nom: string;
  /** Nombre d'organisations publiées dans cette ville. */
  nombre: number;
};

/**
 * Villes distinctes d'une liste d'organisations, regroupées par slug
 * (« Porto-Novo » et « porto novo » ne font qu'une), triées dans l'ordre
 * alphabétique français. Les villes vides sont ignorées.
 */
export function listerVilles(societes: readonly { ville: string | null }[]): VilleAnnuaire[] {
  const groupes = new Map<string, Map<string, number>>();
  for (const { ville } of societes) {
    const nom = (ville ?? "").replace(/\s+/g, " ").trim();
    const slug = slugifier(nom);
    if (!slug) continue;
    const graphies = groupes.get(slug) ?? new Map<string, number>();
    graphies.set(nom, (graphies.get(nom) ?? 0) + 1);
    groupes.set(slug, graphies);
  }

  return [...groupes.entries()]
    .map(([slug, graphies]) => {
      const classees = [...graphies.entries()].sort(
        // Plus fréquente d'abord ; à égalité, ordre des codes (« Ouidah »
        // avant « ouidah ») pour un résultat stable.
        ([nomA, nombreA], [nomB, nombreB]) =>
          nombreB - nombreA || (nomA < nomB ? -1 : nomA > nomB ? 1 : 0),
      );
      const nombre = classees.reduce((somme, [, n]) => somme + n, 0);
      return { slug, nom: classees[0][0], nombre };
    })
    .sort((a, b) => collateur.compare(a.nom, b.nom) || (a.slug < b.slug ? -1 : 1));
}
