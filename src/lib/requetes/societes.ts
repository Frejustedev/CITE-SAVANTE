import "server-only";

// Lectures publiques des organisations : annuaire (spécifications 8.1), fiche
// (8.2), compteurs (8.1, 9.1). Filtre EXPLICITE sur `statut = 'publie'`, même
// si la RLS l'impose déjà (CLAUDE.md, section 6 : « Seul le statut publie est
// visible du public. Toute requête publique filtre explicitement sur ce
// statut »).
//
// Lecture accordée PAR COLONNE sur `societes` (migration 6, relecture de
// sécurité) : chaque requête liste ses colonnes, jamais `select("*")` ; le
// décompte s'écrit `select("id", { count: "exact", head: true })`.
// `soumis_par_nom` et `soumis_par_email` ne sont jamais lisibles.
//
// Annuaire : la liste COMPLÈTE des organisations publiées est lue une fois
// (mise en cache, clé = date du jour), puis filtrée, triée et paginée en
// mémoire par `src/lib/utils/annuaire.ts` (raisons et hypothèse de volume
// dans l'en-tête de ce fichier).
//
// Recherche texte (`q`) : par la fonction SQL `public.rechercher(q, limite)`
// (migration 5), appelée en RPC, dont on ne garde que les lignes
// `type = 'societe'`. Elle cherche dans le vecteur `recherche` (sigle, nom
// complet, ville, description) avec la configuration `public.fr_unaccent`
// (« pediatrie » trouve « Pédiatrie », racines françaises, casse ignorée) et
// par similarité de trigrammes sur le sigle (une faute de frappe sur un sigle
// le trouve encore), uniquement parmi les fiches publiées ; c'est aussi la
// recherche de `/recherche` (section 8.7), donc les deux pages trouvent les
// mêmes organisations. Écarté : `.textSearch("recherche", q, { config })` de
// PostgREST, dont la prise en charge d'un nom de configuration qualifié
// (`public.fr_unaccent`) n'est pas vérifiable sans API, et qui perdrait la
// tolérance sur les sigles. Fonction appelable par `anon` (aucun `revoke`,
// testée en visiteur anonyme par supabase/tests/30_recherche.test.sql).
//
// Règle de rendu : mis en cache (`unstable_cache`), « aujourd'hui » passé en
// argument par l'appelant (nombre d'événements à venir). Étiquettes :
// `societes` + `disciplines` (chaque organisation embarque ses disciplines),
// plus `evenements` pour l'annuaire (nombre d'événements à venir). Invalidé
// par `invalider(...)` après toute écriture sur `societes`,
// `societe_disciplines`, `evenements` ou `evenement_societes` (server actions
// des phases 5 et 6) ; durée de validité de 5 minutes en plus
// (`DUREE_VALIDITE_CACHE`, pour les écritures faites hors server action).
// Aucune entrée de cache n'est créée à partir d'une saisie du visiteur : la
// recherche texte n'est pas mise en cache, et une fiche n'est lue (et mise en
// cache) que si son slug figure parmi les organisations publiées.
import { unstable_cache } from "next/cache";

import { DUREE_VALIDITE_CACHE, ETIQUETTES } from "@/lib/cache";
import { listerDisciplines } from "@/lib/requetes/disciplines";
import { creerClientPublic } from "@/lib/supabase/public";
import type { Enums } from "@/lib/supabase/types";
import {
  appliquerFiltresAnnuaire,
  cleRecherche,
  listerVilles,
  normaliserFiltresAnnuaire,
  type FiltresAnnuaireEntree,
  type ResultatAnnuaire,
  type VilleAnnuaire,
} from "@/lib/utils/annuaire";
import { aujourdhuiPortoNovo, lireDateIso } from "@/lib/utils/dates";
import { ROLES_ORGANISATEURS } from "@/lib/utils/evenements";
import { normaliserReseaux, type LienReseau } from "@/lib/utils/reseaux";
import { estSlugValide } from "@/lib/utils/slugs";
import { estUrlHttpsSure } from "@/lib/utils/urls";

export type {
  FiltresAnnuaire,
  FiltresAnnuaireEntree,
  ResultatAnnuaire,
  VilleAnnuaire,
} from "@/lib/utils/annuaire";
export { TAILLE_PAGE_ANNUAIRE } from "@/lib/utils/annuaire";
export type { LienReseau, Reseau } from "@/lib/utils/reseaux";

/** Discipline rattachée à une organisation (triées par `disciplines.ordre`). */
export type DisciplineResume = { id: string; slug: string; nom: string };

/** Organisation publiée, forme commune aux listes (annuaire, Plan de la Cité, disciplines). */
export type SocietePubliee = {
  id: string;
  slug: string;
  sigle: string;
  nomComplet: string | null;
  categorie: Enums<"categorie_organisation">;
  ville: string | null;
  /** Chemin relatif au bucket `logos` ; URL par `urlLogo()` (src/lib/stockage.ts). */
  logoPath: string | null;
  miseEnAvant: boolean;
  disciplines: DisciplineResume[];
};

/** Organisation de l'annuaire : `SocietePubliee` + nombre d'événements à venir. */
export type SocieteAnnuaire = SocietePubliee & {
  /** Événements publiés à venir dont elle est organisatrice ou co-organisatrice. */
  nombreEvenementsAVenir: number;
};

/** Toutes les données de la fiche organisation (section 8.2). */
export type SocieteFiche = SocietePubliee & {
  description: string | null;
  anneeCreation: number | null;
  pays: string;
  /** Site officiel (`https://` sûr) ou `null` : bouton « Site officiel » via /go si non nul. */
  siteWeb: string | null;
  /** Plateforme de congrès (`https://` sûr) ou `null` : bouton « Plateforme de congrès » via /go si non nul. */
  siteCongres: string | null;
  /** Adresse saisie, telle quelle (lien : `hrefCourriel`, src/lib/utils/urls.ts). */
  email: string | null;
  /** Numéro saisi, tel quel (lien : `hrefTelephone`, src/lib/utils/urls.ts). */
  telephone: string | null;
  /** Réseaux sociaux, liens `https://` sûrs uniquement, dans l'ordre d'affichage. */
  reseaux: LienReseau[];
};

/** Colonnes communes aux listes ; toutes accordées à `anon` par la migration 6. */
const SELECTION_SOCIETE_PUBLIEE = `
  id,
  slug,
  sigle,
  nom_complet,
  categorie,
  ville,
  logo_path,
  mise_en_avant,
  societe_disciplines ( disciplines ( id, slug, nom, ordre ) )
` as const;

/** Colonnes de la fiche (section 8.2) ; toutes accordées à `anon` par la migration 6. */
const SELECTION_SOCIETE_FICHE = `
  id,
  slug,
  sigle,
  nom_complet,
  categorie,
  description,
  annee_creation,
  ville,
  pays,
  site_web,
  site_congres,
  email,
  telephone,
  reseaux,
  logo_path,
  mise_en_avant,
  societe_disciplines ( disciplines ( id, slug, nom, ordre ) )
` as const;

type LigneSocietePubliee = {
  id: string;
  slug: string;
  sigle: string;
  nom_complet: string | null;
  categorie: Enums<"categorie_organisation">;
  ville: string | null;
  logo_path: string | null;
  mise_en_avant: boolean;
  societe_disciplines: {
    disciplines: { id: string; slug: string; nom: string; ordre: number } | null;
  }[];
};

/**
 * Conversion commune. `disciplines` est déclaré nullable par prudence (une
 * discipline est toujours lisible, mais une ligne nulle ne doit jamais faire
 * tomber une page) ; disciplines triées par `ordre`.
 */
function versSocietePubliee(ligne: LigneSocietePubliee): SocietePubliee {
  return {
    id: ligne.id,
    slug: ligne.slug,
    sigle: ligne.sigle,
    nomComplet: ligne.nom_complet,
    categorie: ligne.categorie,
    ville: ligne.ville,
    logoPath: ligne.logo_path,
    miseEnAvant: ligne.mise_en_avant,
    disciplines: ligne.societe_disciplines
      .flatMap((rattachement) => (rattachement.disciplines ? [rattachement.disciplines] : []))
      .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"))
      .map(({ id, slug, nom }) => ({ id, slug, nom })),
  };
}

const listerSocietesPublieesEnCache = unstable_cache(
  async (): Promise<SocietePubliee[]> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("societes")
      .select(SELECTION_SOCIETE_PUBLIEE)
      .eq("statut", "publie")
      .order("mise_en_avant", { ascending: false })
      .order("sigle", { ascending: true });

    if (error) {
      throw new Error(`Lecture des sociétés publiées impossible : ${error.message}`);
    }

    const lignes: LigneSocietePubliee[] = data;
    return lignes.map(versSocietePubliee);
  },
  ["requetes/societes/lister-societes-publiees"],
  { tags: [ETIQUETTES.SOCIETES, ETIQUETTES.DISCIPLINES], revalidate: DUREE_VALIDITE_CACHE },
);

/**
 * Organisations publiées (sigle, nom, slug, ville, catégorie, logo, mise en
 * avant, disciplines), mises en avant d'abord puis triées par sigle (ordre de
 * la base). Sans filtre ni pagination : pour l'annuaire, utiliser
 * `listerSocietesAnnuaire`.
 */
export async function listerSocietesPubliees(): Promise<SocietePubliee[]> {
  return listerSocietesPublieesEnCache();
}

/**
 * Slugs des organisations publiées, tirés de `listerSocietesPubliees` (même
 * entrée de cache, aucune lecture de plus). Sert à vérifier un slug reçu du
 * visiteur sans créer d'entrée de cache par slug : fiche
 * (`obtenirSocietePubliee`) et page d'origine d'un clic de la passerelle
 * (`src/app/go/[type]/[id]/route.ts`).
 */
export async function listerSlugsSocietesPubliees(): Promise<ReadonlySet<string>> {
  const publiees = await listerSocietesPubliees();
  return new Set(publiees.map((societe) => societe.slug));
}

const listerSocietesAnnuaireEnCache = unstable_cache(
  async (aujourdhui: string): Promise<SocieteAnnuaire[]> => {
    const supabase = creerClientPublic();
    const [societes, rattachements] = await Promise.all([
      supabase.from("societes").select(SELECTION_SOCIETE_PUBLIEE).eq("statut", "publie"),
      // Un rattachement par (événement, organisation) : la clé primaire de
      // `evenement_societes` garantit qu'un événement n'est compté qu'une fois.
      supabase
        .from("evenement_societes")
        .select("societe_id, evenements!inner ( id )")
        .in("role", ROLES_ORGANISATEURS)
        .eq("evenements.statut", "publie")
        .gte("evenements.date_fin", aujourdhui),
    ]);

    if (societes.error) {
      throw new Error(`Lecture de l'annuaire impossible : ${societes.error.message}`);
    }
    if (rattachements.error) {
      throw new Error(
        `Lecture des événements à venir de l'annuaire impossible : ${rattachements.error.message}`,
      );
    }

    const nombreParSociete = new Map<string, number>();
    for (const { societe_id } of rattachements.data) {
      nombreParSociete.set(societe_id, (nombreParSociete.get(societe_id) ?? 0) + 1);
    }

    const lignes: LigneSocietePubliee[] = societes.data;
    return lignes.map((ligne) => ({
      ...versSocietePubliee(ligne),
      nombreEvenementsAVenir: nombreParSociete.get(ligne.id) ?? 0,
    }));
  },
  ["requetes/societes/lister-societes-annuaire"],
  {
    tags: [ETIQUETTES.SOCIETES, ETIQUETTES.DISCIPLINES, ETIQUETTES.EVENEMENTS],
    revalidate: DUREE_VALIDITE_CACHE,
  },
);

/** Nombre maximal de résultats demandés à `rechercher()` (organisations et événements confondus). */
const LIMITE_RECHERCHE_ANNUAIRE = 1000;

/**
 * Identifiants des organisations trouvées par `rechercher(q)`. NON mise en
 * cache, comme la lecture de la passerelle (`src/lib/passerelle/donnees.ts`) :
 * le texte vient du visiteur, chaque saisie différente créerait une entrée de
 * cache persistante (relecture de la phase 2 : un fichier par saisie dans
 * `.next/cache/fetch-cache` en auto-hébergement), et une durée courte la
 * ferait expirer sans la supprimer. Varier la saisie contournerait de toute
 * façon le cache : il ne protégerait pas la base. Coût : une requête indexée
 * (GIN sur `recherche`, trigrammes sur `sigle`) par page filtrée par texte ;
 * la liste complète, elle, reste en cache. Le texte envoyé est la forme
 * normalisée par `cleRecherche` (casse et espaces), qui ne change pas le
 * résultat.
 */
async function rechercherSocietes(q: string): Promise<string[]> {
  const supabase = creerClientPublic();
  const { data, error } = await supabase.rpc("rechercher", {
    q: cleRecherche(q),
    limite: LIMITE_RECHERCHE_ANNUAIRE,
  });
  if (error) {
    throw new Error(`Recherche dans l'annuaire impossible : ${error.message}`);
  }
  return data.filter((resultat) => resultat.type === "societe").map((resultat) => resultat.id);
}

/**
 * Une page de l'annuaire (section 8.1). Filtres combinables, validés et
 * normalisés ici (valeurs inconnues ignorées sans erreur) :
 * `discipline` (slug), `ville` (slug de ville, voir `listerVillesAnnuaire`,
 * ou nom libre ramené à son slug), `categorie` (valeur de l'énumération),
 * `q` (texte, 2 caractères au moins, recherche `rechercher()`), `page`
 * (entier ≥ 1, borné au nombre de pages). Tri : mises en avant, puis sigle
 * (ordre alphabétique français). 24 par page (`TAILLE_PAGE_ANNUAIRE`).
 * `resultat.filtres` donne les filtres réellement appliqués.
 * `aujourdhui` (« AAAA-MM-JJ ») : par défaut `aujourdhuiPortoNovo()`.
 */
export async function listerSocietesAnnuaire(
  filtres: FiltresAnnuaireEntree = {},
  aujourdhui: string = aujourdhuiPortoNovo(),
): Promise<ResultatAnnuaire<SocieteAnnuaire>> {
  lireDateIso(aujourdhui);
  const normalises = normaliserFiltresAnnuaire(filtres);
  const [societes, disciplines, idsRecherche] = await Promise.all([
    listerSocietesAnnuaireEnCache(aujourdhui),
    listerDisciplines(),
    normalises.q ? rechercherSocietes(normalises.q) : Promise.resolve(null),
  ]);
  return appliquerFiltresAnnuaire(societes, normalises, {
    disciplinesConnues: disciplines.map((discipline) => discipline.slug),
    idsRecherche: idsRecherche ? new Set(idsRecherche) : null,
  });
}

const listerVillesAnnuaireEnCache = unstable_cache(
  async (): Promise<VilleAnnuaire[]> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("societes")
      .select("ville")
      .eq("statut", "publie")
      .not("ville", "is", null);
    if (error) {
      throw new Error(`Lecture des villes de l'annuaire impossible : ${error.message}`);
    }
    return listerVilles(data);
  },
  ["requetes/societes/lister-villes-annuaire"],
  { tags: [ETIQUETTES.SOCIETES], revalidate: DUREE_VALIDITE_CACHE },
);

/**
 * Villes des organisations publiées, pour le filtre de l'annuaire :
 * `{ slug, nom, nombre }`, graphies d'une même ville regroupées, triées dans
 * l'ordre alphabétique français. `slug` est la valeur du paramètre `ville`.
 */
export async function listerVillesAnnuaire(): Promise<VilleAnnuaire[]> {
  return listerVillesAnnuaireEnCache();
}

type LigneSocieteFiche = LigneSocietePubliee & {
  description: string | null;
  annee_creation: number | null;
  pays: string;
  site_web: string | null;
  site_congres: string | null;
  email: string | null;
  telephone: string | null;
  reseaux: unknown;
};

const obtenirSocietePublieeEnCache = unstable_cache(
  async (slug: string): Promise<SocieteFiche | null> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("societes")
      .select(SELECTION_SOCIETE_FICHE)
      .eq("statut", "publie")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new Error(`Lecture de l'organisation « ${slug} » impossible : ${error.message}`);
    }
    if (!data) return null;

    const ligne: LigneSocieteFiche = data;
    const texte = (valeur: string | null) =>
      valeur && valeur.trim() !== "" ? valeur.trim() : null;
    return {
      ...versSocietePubliee(ligne),
      description: texte(ligne.description),
      anneeCreation: ligne.annee_creation,
      pays: ligne.pays,
      siteWeb: estUrlHttpsSure(ligne.site_web) ? ligne.site_web : null,
      siteCongres: estUrlHttpsSure(ligne.site_congres) ? ligne.site_congres : null,
      email: texte(ligne.email),
      telephone: texte(ligne.telephone),
      reseaux: normaliserReseaux(ligne.reseaux),
    };
  },
  ["requetes/societes/obtenir-societe-publiee"],
  { tags: [ETIQUETTES.SOCIETES, ETIQUETTES.DISCIPLINES], revalidate: DUREE_VALIDITE_CACHE },
);

/**
 * Fiche d'une organisation publiée (section 8.2), ou `null` si le slug est
 * mal formé, inconnu, ou si l'organisation n'est pas publiée (la page
 * appelle alors `notFound()`). Le slug doit être exact (minuscules).
 *
 * Le slug vient de l'URL : il est d'abord cherché dans la liste des
 * organisations publiées (`listerSocietesPubliees`, UNE entrée de cache pour
 * tout le site). Un slug inconnu renvoie `null` SANS appeler la lecture mise
 * en cache par slug : un visiteur ne peut donc pas créer une entrée de cache
 * par adresse inventée (relecture de la phase 2). Les deux lectures portent
 * les mêmes étiquettes et la même durée (`DUREE_VALIDITE_CACHE`) : une
 * publication faite par une server action est visible aussitôt ; faite en
 * SQL, au plus tard après la durée de validité.
 */
export async function obtenirSocietePubliee(slug: string): Promise<SocieteFiche | null> {
  if (!estSlugValide(slug)) return null;
  const publiees = await listerSlugsSocietesPubliees();
  if (!publiees.has(slug)) return null;
  return obtenirSocietePublieeEnCache(slug);
}

const compterSocietesPublieesEnCache = unstable_cache(
  async (): Promise<number> => {
    const supabase = creerClientPublic();
    // `select("*", { head: true })` produirait `select societes.*`, refusé
    // (lecture accordée par colonne) : on compte sur `id`.
    const { count, error } = await supabase
      .from("societes")
      .select("id", { count: "exact", head: true })
      .eq("statut", "publie");
    if (error) {
      throw new Error(`Décompte des organisations publiées impossible : ${error.message}`);
    }
    return count ?? 0;
  },
  ["requetes/societes/compter-societes-publiees"],
  { tags: [ETIQUETTES.SOCIETES], revalidate: DUREE_VALIDITE_CACHE },
);

/** Nombre d'organisations publiées (en-tête de l'annuaire, chiffres clés de l'accueil). */
export async function compterSocietesPubliees(): Promise<number> {
  return compterSocietesPublieesEnCache();
}
