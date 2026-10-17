import "server-only";

// Lectures publiques des événements : agenda (spécifications section 8.3) et
// événements d'une organisation (fiche organisation, section 8.2). Filtre
// EXPLICITE sur `statut = 'publie'` (CLAUDE.md, section 6). « À venir » =
// `date_fin >= aujourd'hui à Porto-Novo` (section 7). Conversion des lignes,
// tri et séparation à venir / passés : `src/lib/utils/evenements.ts`
// (fonctions pures, testées).
//
// « Aujourd'hui » est calculé par l'APPELANT (`aujourdhuiPortoNovo()`, hors
// du périmètre mis en cache) et passé en ARGUMENT à la fonction mise en
// cache : `unstable_cache` inclut les arguments dans la clé de cache
// (documentation Next.js citée dans PROGRESS.md), donc le cache change
// naturellement de clé au changement de jour à Porto-Novo, sans dépendre
// d'une invalidation. Calculer la date À L'INTÉRIEUR de la fonction mise en
// cache aurait figé « aujourd'hui » à la date du premier appel jusqu'à la
// prochaine écriture.
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
// Événements d'une organisation : DEUX requêtes plutôt qu'un embarquement
// filtré à alias (`filtre:evenement_societes!inner(...)` en plus de
// `evenement_societes(...)`), dont le comportement dans PostgREST n'a pas pu
// être vérifié sans API : (1) identifiants des événements PUBLIÉS dont
// l'organisation est organisatrice ou co-organisatrice (`evenement_societes`
// joint à `evenements!inner`, filtre explicite `evenements.statut`, en plus de
// la RLS), puis (2) ces événements, avec la sélection et les filtres de
// l'agenda.
//
// Règle de rendu : étiqueté `evenements` et `societes` (les organisateurs et
// échéances n'ont pas leur propre page publique ; leur invalidation passe
// par les écritures sur `evenements`, `evenement_societes` et `echeances`,
// qui appelleront toutes `invalider(ETIQUETTES.EVENEMENTS)` — server actions
// de l'espace gestionnaire, phase 5, et du back-office, phase 6 ; la
// dépublication ou l'archivage d'une organisation, qui la retire des
// organisateurs affichés, invalide `societes`), et durée de validité de
// 5 minutes (`DUREE_VALIDITE_CACHE`) pour les écritures faites hors server
// action.
import { unstable_cache } from "next/cache";

import { DUREE_VALIDITE_CACHE, ETIQUETTES } from "@/lib/cache";
import { creerClientPublic } from "@/lib/supabase/public";
import { aujourdhuiPortoNovo, lireDateIso } from "@/lib/utils/dates";
import {
  ROLES_ORGANISATEURS,
  repartirEvenements,
  versEvenementResume,
  type EvenementResume,
  type EvenementsSociete,
  type LigneEvenementResume,
} from "@/lib/utils/evenements";

export type {
  EcheanceEvenement,
  EvenementResume,
  EvenementsSociete,
  OrganisateurEvenement,
} from "@/lib/utils/evenements";

/** Événement de l'agenda : même forme qu'`EvenementResume` (nom conservé de la phase 1). */
export type EvenementAVenir = EvenementResume;

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
  echeances ( id, type, libelle, date_limite )
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
  { tags: [ETIQUETTES.EVENEMENTS, ETIQUETTES.SOCIETES], revalidate: DUREE_VALIDITE_CACHE },
);

/**
 * Événements publiés à venir (`date_fin >= aujourd'hui` à Porto-Novo), triés
 * par date de début, avec leurs organisateurs et leur prochaine échéance.
 * `aujourdhui` (« AAAA-MM-JJ ») : par défaut `aujourdhuiPortoNovo()`.
 */
export async function listerEvenementsAVenir(
  aujourdhui: string = aujourdhuiPortoNovo(),
): Promise<EvenementResume[]> {
  lireDateIso(aujourdhui);
  return listerEvenementsAVenirEnCache(aujourdhui);
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
  { tags: [ETIQUETTES.EVENEMENTS, ETIQUETTES.SOCIETES], revalidate: DUREE_VALIDITE_CACHE },
);

/**
 * Événements publiés dont l'organisation `societeId` est organisatrice ou
 * co-organisatrice (partenaire exclu), séparés en `aVenir` (date de début
 * croissante) et `passes` (du plus récent au plus ancien), au format des
 * cartes (`EvenementResume`). Identifiant mal formé : deux listes vides.
 * `aujourdhui` (« AAAA-MM-JJ ») : par défaut `aujourdhuiPortoNovo()` ; le
 * passer explicitement pour qu'une page utilise la même date partout.
 */
export async function listerEvenementsSociete(
  societeId: string,
  aujourdhui: string = aujourdhuiPortoNovo(),
): Promise<EvenementsSociete> {
  lireDateIso(aujourdhui);
  if (!FORMAT_UUID.test(societeId)) return { aVenir: [], passes: [] };
  return listerEvenementsSocieteEnCache(societeId.toLowerCase(), aujourdhui);
}
