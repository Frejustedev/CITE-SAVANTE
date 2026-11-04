import "server-only";

// Lectures publiques des événements : agenda (spécifications section 8.3),
// fiche événement (8.4), échéances (8.5), événements d'une organisation
// (fiche organisation, 8.2). Filtre EXPLICITE sur `statut = 'publie'`
// (CLAUDE.md, section 6), tables jointes comprises. « À venir » =
// `date_fin >= aujourd'hui à Porto-Novo` (section 7). Conversion des lignes,
// filtres, tris et groupements : fonctions pures et testées de
// `src/lib/utils/` (`evenements.ts`, `agenda.ts`, `calendrier.ts`) ; ce
// fichier ne fait que lire la base et composer.
//
// Lecture accordée PAR COLONNE sur `evenements` et `societes` (migration 6) :
// chaque sélection liste ses colonnes, jamais `select("*")` ; `soumis_par_*`
// et `cree_par` ne sont jamais lus.
//
// « Aujourd'hui » est calculé par l'APPELANT (`aujourdhuiPortoNovo()`, hors
// du périmètre mis en cache) et passé en ARGUMENT à la fonction mise en
// cache : `unstable_cache` inclut les arguments dans la clé de cache
// (documentation Next.js citée dans PROGRESS.md), donc le cache change
// naturellement de clé au changement de jour à Porto-Novo, sans dépendre
// d'une invalidation. Calculer la date À L'INTÉRIEUR de la fonction mise en
// cache aurait figé « aujourd'hui » à la date du premier appel.
//
// Organisateurs (relecture de sécurité) : seules les organisations PUBLIÉES
// sont renvoyées, par un filtre explicite sur leur statut (CLAUDE.md,
// section 6 : toute requête publique filtre sur `publie`, même sous la RLS)
// et `!inner`, qui retire du tableau `evenement_societes` les rattachements
// dont l'organisation est écartée, sans retirer l'événement. En plus, la
// conversion ignore tout rattachement dont `societes` serait nul : la RLS
// masque à `anon` une organisatrice non publiée (en attente, archivée…) et
// PostgREST renvoie alors `null` à sa place, alors que le type généré la dit
// non nulle — sans cette garde, TOUT l'agenda tombait (preuve : supabase/
// tests/50_securite.test.sql, section G).
//
// Agenda, calendrier, suggestions (phase 3) : aucune entrée de cache ne
// dépend d'une saisie du visiteur. Trois listes seulement sont mises en
// cache, clé = « aujourd'hui » : les événements à venir (tous), les
// événements passés (les `LIMITE_EVENEMENTS_PASSES` plus récents) et les
// échéances à venir ; filtres, mois du calendrier, période `du`–`au` et
// suggestions sont calculés EN MÉMOIRE sur ces listes (src/lib/utils/
// agenda.ts). La recherche texte (`q`) passe par la fonction SQL
// `rechercher`, NON mise en cache (comme l'annuaire). Une fiche n'est lue,
// et mise en cache, que si son slug figure dans la liste en cache des slugs
// publiés (`listerSlugsEvenementsPublies`) : un slug inventé ne crée aucune
// entrée. Hypothèse de volume : quelques centaines d'événements à venir
// (PostgREST plafonne une réponse à 1 000 lignes par défaut) ; au-delà,
// paginer côté base.
//
// « Mis en avant » (section 7) : emplacements `evenement_en_avant` actifs ce
// jour-là (`lireEmplacementsActifs`, src/lib/requetes/emplacements.ts, lecture
// séparée étiquetée `emplacements`), appliqués aux événements À VENIR
// seulement, hors du cache des événements.
//
// Règle de rendu : étiquetés `evenements`, `societes` et `disciplines` (les
// organisateurs, disciplines et échéances embarqués sont invalidés par les
// écritures sur `evenements`, `evenement_societes`, `evenement_disciplines`
// et `echeances`, qui appelleront toutes `invalider(ETIQUETTES.EVENEMENTS)` —
// server actions de l'espace gestionnaire, phase 5, et du back-office,
// phase 6 ; la dépublication d'une organisation invalide `societes`, la
// modification d'une discipline `disciplines`), et durée de validité de
// 5 minutes (`DUREE_VALIDITE_CACHE`) pour les écritures faites hors server
// action.
import { unstable_cache } from "next/cache";

import { DUREE_VALIDITE_CACHE, ETIQUETTES } from "@/lib/cache";
import { listerDisciplines } from "@/lib/requetes/disciplines";
import { lireEmplacementsActifs } from "@/lib/requetes/emplacements";
import { creerClientPublic } from "@/lib/supabase/public";
import {
  appliquerFiltresAgenda,
  appliquerFiltresEcheances,
  normaliserFiltresAgenda,
  normaliserFiltresEcheances,
  type FiltresAgendaEntree,
  type FiltresEcheancesEntree,
  type ResultatAgenda,
  type ResultatEcheances,
} from "@/lib/utils/agenda";
import { cleRecherche } from "@/lib/utils/annuaire";
import { aujourdhuiPortoNovo, joursRestants, lireDateIso } from "@/lib/utils/dates";
import {
  ROLES_ORGANISATEURS,
  choisirSuggestions,
  comparerEvenementsAVenir,
  comparerEvenementsChronologique,
  comparerEvenementsPasses,
  marquerMiseEnAvant,
  repartirEvenements,
  versEcheanceAVenir,
  versEvenementFiche,
  versEvenementResume,
  type EcheanceAVenir,
  type EvenementFiche,
  type EvenementResume,
  type EvenementsSociete,
  type LigneEcheanceAVenir,
  type LigneEvenementFiche,
  type LigneEvenementResume,
} from "@/lib/utils/evenements";
import { estSlugValide } from "@/lib/utils/slugs";

export type {
  ContexteFiltresAgenda,
  FiltresAgenda,
  FiltresAgendaEntree,
  FiltresEcheances,
  FiltresEcheancesEntree,
  ResultatAgenda,
  ResultatEcheances,
  VilleAgenda,
} from "@/lib/utils/agenda";
export type {
  DisciplineEvenement,
  EcheanceAVenir,
  EcheanceEvenement,
  EvenementFiche,
  EvenementResume,
  EvenementsSociete,
  OrganisateurEvenement,
  OrganisateurFiche,
} from "@/lib/utils/evenements";
export type { BanniereAgenda, EmplacementsActifs } from "@/lib/requetes/emplacements";

/** Événement de l'agenda : même forme qu'`EvenementResume` (nom conservé de la phase 1). */
export type EvenementAVenir = EvenementResume;

/** Événement de l'agenda (liste, calendrier, suggestions) : `EvenementResume`, `miseEnAvant` renseigné. */
export type EvenementAgenda = EvenementResume;

/**
 * Nombre d'événements passés lus pour les archives (`?periode=passes`) et la
 * vue calendrier des mois passés : les plus récents (date de fin
 * décroissante). Couvre largement les 12 mois de la fenêtre du calendrier
 * (`FENETRE_CALENDRIER`, src/lib/utils/calendrier.ts) ; les archives
 * complètes, par année, sont prévues en P1 (`/agenda/archives/[annee]`,
 * section 17.3).
 */
export const LIMITE_EVENEMENTS_PASSES = 500;

/** Nombre maximal de suggestions sur la fiche d'un événement passé (section 8.4). */
export const LIMITE_SUGGESTIONS = 4;

/** Nombre maximal de résultats demandés à `rechercher()` (organisations et événements confondus). */
const LIMITE_RECHERCHE_AGENDA = 1000;

/** Écart maximal, en jours, entre `debut` et `fin` de `listerEvenementsMois` (6 semaines). */
const ECART_MAX_PERIODE_MOIS = 41;

/** Taille d'une page de lecture des slugs publiés. */
const TAILLE_PAGE_SLUGS = 1000;

/** Nombre maximal de pages de slugs (garde-fou : 50 000 événements). */
const PAGES_MAX_SLUGS = 50;

/**
 * Colonnes lues pour une carte d'événement. Toutes figurent dans les
 * `grant select (…)` de la migration 6 (lecture accordée par colonne :
 * jamais `select("*")`).
 */
const SELECTION_EVENEMENT_RESUME = `
  id,
  slug,
  titre,
  type,
  date_debut,
  date_fin,
  heure_debut,
  modalite,
  lieu_nom,
  ville,
  gratuit,
  evenement_societes ( role, societes!inner ( id, slug, sigle ) ),
  echeances ( id, type, libelle, date_limite ),
  evenement_disciplines ( disciplines ( id, slug, nom, ordre ) )
` as const;

/** Colonnes de la fiche (section 8.4) ; toutes accordées à `anon` par la migration 6. */
const SELECTION_EVENEMENT_FICHE = `
  id,
  slug,
  titre,
  type,
  resume,
  description,
  date_debut,
  date_fin,
  heure_debut,
  modalite,
  lieu_nom,
  adresse,
  ville,
  pays,
  lien_inscription,
  site_web,
  affiche_path,
  tarifs,
  gratuit,
  credits_fmc,
  contact_email,
  evenement_societes ( role, societes!inner ( id, slug, sigle, nom_complet ) ),
  evenement_disciplines ( disciplines ( id, slug, nom, ordre ) ),
  echeances ( id, type, libelle, date_limite )
` as const;

/** Colonnes de la page des échéances (section 8.5), événement publié obligatoire (`!inner`). */
const SELECTION_ECHEANCE_A_VENIR = `
  id,
  type,
  libelle,
  date_limite,
  evenements!inner (
    id,
    slug,
    titre,
    type,
    date_debut,
    date_fin,
    evenement_societes ( role, societes!inner ( id, slug, sigle ) ),
    evenement_disciplines ( disciplines ( id, slug, nom, ordre ) )
  )
` as const;

const FORMAT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const listerEvenementsAVenirEnCache = unstable_cache(
  async (aujourdhui: string): Promise<EvenementResume[]> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("evenements")
      .select(SELECTION_EVENEMENT_RESUME)
      .eq("statut", "publie")
      .eq("evenement_societes.societes.statut", "publie")
      .gte("date_fin", aujourdhui)
      .order("date_debut", { ascending: true });

    if (error) {
      throw new Error(`Lecture des événements à venir impossible : ${error.message}`);
    }

    // Annotation : `societes` y est nullable (voir l'en-tête).
    const lignes: LigneEvenementResume[] = data;
    return lignes.map((ligne) => versEvenementResume(ligne, aujourdhui));
  },
  ["requetes/evenements/lister-evenements-a-venir"],
  {
    tags: [ETIQUETTES.EVENEMENTS, ETIQUETTES.SOCIETES, ETIQUETTES.DISCIPLINES],
    revalidate: DUREE_VALIDITE_CACHE,
  },
);

/**
 * Événements publiés à venir (`date_fin >= aujourd'hui` à Porto-Novo), triés
 * par date de début, avec leurs organisateurs, disciplines et prochaine
 * échéance (`miseEnAvant` toujours `false` : pour l'agenda, utiliser
 * `listerEvenementsAgenda`). `aujourdhui` (« AAAA-MM-JJ ») : par défaut
 * `aujourdhuiPortoNovo()`.
 */
export async function listerEvenementsAVenir(
  aujourdhui: string = aujourdhuiPortoNovo(),
): Promise<EvenementResume[]> {
  lireDateIso(aujourdhui);
  return listerEvenementsAVenirEnCache(aujourdhui);
}

const listerEvenementsPassesEnCache = unstable_cache(
  async (aujourdhui: string): Promise<EvenementResume[]> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("evenements")
      .select(SELECTION_EVENEMENT_RESUME)
      .eq("statut", "publie")
      .eq("evenement_societes.societes.statut", "publie")
      .lt("date_fin", aujourdhui)
      .order("date_fin", { ascending: false })
      .order("date_debut", { ascending: false })
      .limit(LIMITE_EVENEMENTS_PASSES);

    if (error) {
      throw new Error(`Lecture des événements passés impossible : ${error.message}`);
    }

    const lignes: LigneEvenementResume[] = data;
    return lignes.map((ligne) => versEvenementResume(ligne, aujourdhui));
  },
  ["requetes/evenements/lister-evenements-passes"],
  {
    tags: [ETIQUETTES.EVENEMENTS, ETIQUETTES.SOCIETES, ETIQUETTES.DISCIPLINES],
    revalidate: DUREE_VALIDITE_CACHE,
  },
);

/**
 * Identifiants des événements trouvés par `rechercher(q)` (type
 * « evenement », publiés seulement). NON mise en cache : le texte vient du
 * visiteur (même raisonnement que `rechercherSocietes`, src/lib/requetes/
 * societes.ts). Texte normalisé par `cleRecherche` (casse, espaces).
 */
async function rechercherEvenements(q: string): Promise<string[]> {
  const supabase = creerClientPublic();
  const { data, error } = await supabase.rpc("rechercher", {
    q: cleRecherche(q),
    limite: LIMITE_RECHERCHE_AGENDA,
  });
  if (error) {
    throw new Error(`Recherche dans l'agenda impossible : ${error.message}`);
  }
  return data.filter((resultat) => resultat.type === "evenement").map((resultat) => resultat.id);
}

/**
 * Vue LISTE de l'agenda (section 8.3), filtres combinables, normalisés ici
 * (`normaliserFiltresAgenda`, valeurs inconnues ignorées sans erreur) :
 * - `periode` « a_venir » (défaut) : événements publiés à venir
 *   (`date_fin >= aujourdhui`), mis en avant d'abord (emplacement
 *   `evenement_en_avant` actif, `miseEnAvant: true`), puis par date de début
 *   (`comparerEvenementsAVenir`) ;
 * - `periode` « passes » (archives) : les `LIMITE_EVENEMENTS_PASSES` plus
 *   récents, du plus récent au plus ancien (`comparerEvenementsPasses`),
 *   jamais mis en avant ;
 * - puis `type`, `discipline`, `ville`, `modalite`, `gratuit`, `du`–`au`
 *   (chevauchement), `q` (fonction SQL `rechercher`, non mise en cache).
 * `vue` et `mois` sont ignorés ici (vue calendrier : `listerEvenementsMois`).
 * Pour grouper par mois : `grouperParMois(resultat.evenements, periode ===
 * "passes" ? "decroissant" : "croissant")` (src/lib/utils/calendrier.ts).
 * `resultat.filtres` = filtres réellement appliqués ; `resultat.villes` =
 * villes proposées. `aujourdhui` : `aujourdhuiPortoNovo()`, calculé une fois
 * par la page.
 */
export async function listerEvenementsAgenda(
  filtres: FiltresAgendaEntree,
  aujourdhui: string,
): Promise<ResultatAgenda<EvenementAgenda>> {
  lireDateIso(aujourdhui);
  const normalises = normaliserFiltresAgenda(filtres, aujourdhui);
  const archives = normalises.periode === "passes";
  const [evenements, emplacements, disciplines, idsRecherche] = await Promise.all([
    archives
      ? listerEvenementsPassesEnCache(aujourdhui)
      : listerEvenementsAVenirEnCache(aujourdhui),
    lireEmplacementsActifs(aujourdhui),
    listerDisciplines(),
    normalises.q ? rechercherEvenements(normalises.q) : Promise.resolve(null),
  ]);
  const marques = archives
    ? evenements
    : marquerMiseEnAvant(evenements, emplacements.evenementsEnAvant);
  const resultat = appliquerFiltresAgenda(marques, normalises, {
    disciplinesConnues: disciplines.map((discipline) => discipline.slug),
    idsRecherche: idsRecherche ? new Set(idsRecherche) : null,
  });
  resultat.evenements.sort(archives ? comparerEvenementsPasses : comparerEvenementsAVenir);
  return resultat;
}

/**
 * Vue CALENDRIER (section 8.3) : événements publiés qui CHEVAUCHENT la
 * période `debut`–`fin` (bornes incluses, « AAAA-MM-JJ » ; en pratique
 * `grilleMois(...).debut` et `.fin`, src/lib/utils/calendrier.ts), passés
 * comme à venir, par ordre chronologique (`comparerEvenementsChronologique`),
 * `miseEnAvant` renseigné pour les événements à venir. Mêmes filtres que la
 * liste (`periode` et `mois` ignorés). Calculé EN MÉMOIRE sur les listes en
 * cache (à venir + archives) : aucune entrée de cache par mois. Un mois
 * passé n'est complet que dans la limite des `LIMITE_EVENEMENTS_PASSES`
 * archives, qui couvre la fenêtre du calendrier. Villes proposées : celles
 * de toutes les listes, pas seulement du mois. Lève une erreur si une date
 * est invalide, si `fin` précède `debut` ou si la période dépasse 6 semaines
 * (erreur de programmation : le mois vient de `lireParametreMois`).
 * Placer ensuite les événements jour par jour : `repartirEvenementsParJour`.
 */
export async function listerEvenementsMois(
  debut: string,
  fin: string,
  filtres: FiltresAgendaEntree,
  aujourdhui: string,
): Promise<ResultatAgenda<EvenementAgenda>> {
  lireDateIso(debut);
  lireDateIso(fin);
  lireDateIso(aujourdhui);
  const ecart = joursRestants(fin, debut);
  if (ecart < 0 || ecart > ECART_MAX_PERIODE_MOIS) {
    throw new Error(
      `Période du calendrier invalide : du ${debut} au ${fin} (6 semaines au plus, fin après le début).`,
    );
  }
  const normalises = normaliserFiltresAgenda(filtres, aujourdhui);
  const [aVenir, passes, emplacements, disciplines, idsRecherche] = await Promise.all([
    listerEvenementsAVenirEnCache(aujourdhui),
    listerEvenementsPassesEnCache(aujourdhui),
    lireEmplacementsActifs(aujourdhui),
    listerDisciplines(),
    normalises.q ? rechercherEvenements(normalises.q) : Promise.resolve(null),
  ]);
  const tous = [...marquerMiseEnAvant(aVenir, emplacements.evenementsEnAvant), ...passes];
  const duMois = tous.filter(
    (evenement) => evenement.dateDebut <= fin && evenement.dateFin >= debut,
  );
  const resultat = appliquerFiltresAgenda(duMois, normalises, {
    disciplinesConnues: disciplines.map((discipline) => discipline.slug),
    idsRecherche: idsRecherche ? new Set(idsRecherche) : null,
    referenceVilles: tous,
  });
  resultat.evenements.sort(comparerEvenementsChronologique);
  return resultat;
}

const listerSlugsEvenementsPubliesEnCache = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = creerClientPublic();
    const slugs: string[] = [];
    // Lecture par pages (`range`) : la liste doit être COMPLÈTE (une fiche
    // absente de la liste renverrait 404), au-delà du plafond de 1 000 lignes
    // de PostgREST. Arrêt sur la première page vide.
    for (let page = 0; page < PAGES_MAX_SLUGS; page += 1) {
      const { data, error } = await supabase
        .from("evenements")
        .select("slug")
        .eq("statut", "publie")
        .order("slug", { ascending: true })
        .range(slugs.length, slugs.length + TAILLE_PAGE_SLUGS - 1);
      if (error) {
        throw new Error(`Lecture des slugs des événements publiés impossible : ${error.message}`);
      }
      if (data.length === 0) break;
      slugs.push(...data.map((ligne) => ligne.slug));
    }
    return slugs;
  },
  ["requetes/evenements/lister-slugs-evenements-publies"],
  { tags: [ETIQUETTES.EVENEMENTS], revalidate: DUREE_VALIDITE_CACHE },
);

/**
 * Slugs de TOUS les événements publiés (passés compris), UNE entrée de cache
 * pour tout le site. Sert à vérifier un slug reçu du visiteur sans créer
 * d'entrée de cache par slug : fiche (`obtenirEvenementPublie`), route .ics,
 * image d'aperçu, et page d'origine `/agenda/{slug}` d'un clic de la
 * passerelle (src/app/go/[type]/[id]/route.ts).
 */
export async function listerSlugsEvenementsPublies(): Promise<ReadonlySet<string>> {
  return new Set(await listerSlugsEvenementsPubliesEnCache());
}

const obtenirEvenementPublieEnCache = unstable_cache(
  async (slug: string): Promise<EvenementFiche | null> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("evenements")
      .select(SELECTION_EVENEMENT_FICHE)
      .eq("statut", "publie")
      .eq("evenement_societes.societes.statut", "publie")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new Error(`Lecture de l'événement « ${slug} » impossible : ${error.message}`);
    }
    if (!data) return null;

    const ligne: LigneEvenementFiche = data;
    return versEvenementFiche(ligne);
  },
  ["requetes/evenements/obtenir-evenement-publie"],
  {
    tags: [ETIQUETTES.EVENEMENTS, ETIQUETTES.SOCIETES, ETIQUETTES.DISCIPLINES],
    revalidate: DUREE_VALIDITE_CACHE,
  },
);

/**
 * Fiche d'un événement publié (section 8.4 : tout son contenu, échéances
 * passées comprises), ou `null` si le slug est mal formé, inconnu, ou si
 * l'événement n'est pas publié (la page appelle alors `notFound()`). Slug
 * exact (minuscules). Le slug vient de l'URL : il est d'abord cherché dans
 * `listerSlugsEvenementsPublies()` ; un slug inconnu renvoie `null` SANS
 * lecture ni entrée de cache. Passé ou à venir : `estAVenir(fiche,
 * aujourdhui)` (src/lib/utils/evenements.ts). Une même page appelle cette
 * fonction depuis `generateMetadata` et le composant : l'envelopper dans
 * `cache` de React pour une seule lecture (comme la fiche organisation).
 */
export async function obtenirEvenementPublie(slug: string): Promise<EvenementFiche | null> {
  if (!estSlugValide(slug)) return null;
  const publies = await listerSlugsEvenementsPublies();
  if (!publies.has(slug)) return null;
  return obtenirEvenementPublieEnCache(slug);
}

/**
 * Suggestions sur la fiche d'un événement PASSÉ (section 8.4) : les
 * prochains événements publiés (à venir) qui partagent au moins une
 * discipline avec `evenement`, l'événement lui-même exclu, par ordre
 * chronologique, `LIMITE_SUGGESTIONS` (4) au plus ; liste vide si
 * l'événement n'a pas de discipline. Tirées de la liste en cache des
 * événements à venir (aucune lecture de plus).
 */
export async function listerSuggestions(
  evenement: Pick<EvenementFiche, "id" | "disciplines">,
  aujourdhui: string,
): Promise<EvenementAgenda[]> {
  lireDateIso(aujourdhui);
  const [aVenir, emplacements] = await Promise.all([
    listerEvenementsAVenirEnCache(aujourdhui),
    lireEmplacementsActifs(aujourdhui),
  ]);
  return choisirSuggestions(
    evenement,
    marquerMiseEnAvant(aVenir, emplacements.evenementsEnAvant),
    LIMITE_SUGGESTIONS,
  );
}

const listerEcheancesAVenirEnCache = unstable_cache(
  async (aujourdhui: string): Promise<EcheanceAVenir[]> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("echeances")
      .select(SELECTION_ECHEANCE_A_VENIR)
      .eq("evenements.statut", "publie")
      .eq("evenements.evenement_societes.societes.statut", "publie")
      .gte("date_limite", aujourdhui)
      .order("date_limite", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Lecture des échéances à venir impossible : ${error.message}`);
    }

    // Annotation : `evenements` et `societes` y sont nullables (voir l'en-tête).
    const lignes: LigneEcheanceAVenir[] = data;
    return lignes.flatMap((ligne) => {
      const echeance = versEcheanceAVenir(ligne, aujourdhui);
      return echeance ? [echeance] : [];
    });
  },
  ["requetes/evenements/lister-echeances-a-venir"],
  {
    tags: [ETIQUETTES.EVENEMENTS, ETIQUETTES.SOCIETES, ETIQUETTES.DISCIPLINES],
    revalidate: DUREE_VALIDITE_CACHE,
  },
);

/**
 * Échéances à venir (sections 7 et 8.5) : `date_limite >= aujourdhui`,
 * événement publié (passé ou non), par date limite croissante, avec le
 * titre et le slug de l'événement, l'organisateur principal, les
 * disciplines, les jours restants et l'urgence (7 jours ou moins). Filtres
 * `type` (type d'échéance) et `discipline` (de l'événement), normalisés ici ;
 * `resultat.filtres` = filtres réellement appliqués. Grouper ensuite avec
 * `grouperEcheancesParSemaine(resultat.echeances, aujourdhui)`
 * (src/lib/utils/calendrier.ts).
 */
export async function listerEcheancesAVenir(
  filtres: FiltresEcheancesEntree,
  aujourdhui: string,
): Promise<ResultatEcheances<EcheanceAVenir>> {
  lireDateIso(aujourdhui);
  const normalises = normaliserFiltresEcheances(filtres);
  const [echeances, disciplines] = await Promise.all([
    listerEcheancesAVenirEnCache(aujourdhui),
    listerDisciplines(),
  ]);
  return appliquerFiltresEcheances(echeances, normalises, {
    disciplinesConnues: disciplines.map((discipline) => discipline.slug),
  });
}

const listerEvenementsSocieteEnCache = unstable_cache(
  async (societeId: string, aujourdhui: string): Promise<EvenementsSociete> => {
    const supabase = creerClientPublic();

    // Filtre explicite sur le statut de l'événement dès cette première
    // requête (CLAUDE.md, section 6), même si la RLS ne montre déjà à `anon`
    // que les rattachements d'événements publiés : même motif que l'annuaire
    // (`evenements!inner` + `evenements.statut`).
    const { data: rattachements, error: erreurRattachements } = await supabase
      .from("evenement_societes")
      .select("evenement_id, evenements!inner ( id )")
      .eq("societe_id", societeId)
      .in("role", ROLES_ORGANISATEURS)
      .eq("evenements.statut", "publie");

    if (erreurRattachements) {
      throw new Error(
        `Lecture des événements de l'organisation impossible : ${erreurRattachements.message}`,
      );
    }

    const ids = [...new Set(rattachements.map((rattachement) => rattachement.evenement_id))];
    if (ids.length === 0) return { aVenir: [], passes: [] };

    const { data, error } = await supabase
      .from("evenements")
      .select(SELECTION_EVENEMENT_RESUME)
      .in("id", ids)
      .eq("statut", "publie")
      .eq("evenement_societes.societes.statut", "publie");

    if (error) {
      throw new Error(`Lecture des événements de l'organisation impossible : ${error.message}`);
    }

    const lignes: LigneEvenementResume[] = data;
    return repartirEvenements(
      lignes.map((ligne) => versEvenementResume(ligne, aujourdhui)),
      aujourdhui,
    );
  },
  ["requetes/evenements/lister-evenements-societe"],
  {
    tags: [ETIQUETTES.EVENEMENTS, ETIQUETTES.SOCIETES, ETIQUETTES.DISCIPLINES],
    revalidate: DUREE_VALIDITE_CACHE,
  },
);

/**
 * Événements publiés dont l'organisation `societeId` est organisatrice ou
 * co-organisatrice (partenaire exclu), séparés en `aVenir` (date de début
 * croissante) et `passes` (du plus récent au plus ancien), au format des
 * cartes (`EvenementResume`, `miseEnAvant` toujours `false`). Identifiant
 * mal formé : deux listes vides. `aujourdhui` (« AAAA-MM-JJ ») : par défaut
 * `aujourdhuiPortoNovo()` ; le passer explicitement pour qu'une page utilise
 * la même date partout.
 */
export async function listerEvenementsSociete(
  societeId: string,
  aujourdhui: string = aujourdhuiPortoNovo(),
): Promise<EvenementsSociete> {
  lireDateIso(aujourdhui);
  if (!FORMAT_UUID.test(societeId)) return { aVenir: [], passes: [] };
  return listerEvenementsSocieteEnCache(societeId.toLowerCase(), aujourdhui);
}
