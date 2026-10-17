// Passerelle `/go/[type]/[id]` (spécifications, section 10.1) : accès aux
// données. Le client Supabase est REÇU en paramètre, jamais créé ici : la
// route (src/app/go/[type]/[id]/route.ts) fournit le client anonyme pour la
// lecture et le client de service pour l'écriture, et les tests
// (passerelle.test.ts) un faux client en mémoire.
//
// Lecture avec le client ANONYME (src/lib/supabase/public.ts), et non le
// client de service : la RLS s'ajoute aux filtres explicites ci-dessous
// (`statut = 'publie'` ; emplacement actif dans sa période) et à la seconde
// vérification faite en JavaScript (analyse.ts). Le client de service ne
// sert qu'à l'écriture dans `clics_sortants` (aucune politique d'écriture
// sur cette table, spécifications section 6 ; usage listé en tête de
// src/lib/supabase/service.ts).
//
// Pas de `unstable_cache` ici, par choix : l'identifiant vient de l'URL, donc
// du visiteur ; mettre en cache la lecture créerait une entrée de cache par
// identifiant inventé. Une lecture par clé primaire coûte peu, et une fiche
// dépubliée cesse aussitôt de rediriger.
//
// Colonnes toujours listées (lecture accordée par colonne sur `societes` et
// `evenements`, migration 6 : `select("*")` échouerait en 42501).
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Enums } from "@/lib/supabase/types";
import type { CiblePasserelle } from "@/lib/utils/urls";

import {
  destinationEmplacement,
  destinationEvenement,
  destinationSociete,
  type LigneEmplacement,
  type LigneEvenement,
  type LigneSociete,
} from "./analyse";

/** Client Supabase typé, tel que le reçoivent les fonctions de ce module. */
export type ClientPasserelle = SupabaseClient<Database>;

/** Délai maximal de la lecture de la cible ; au-delà, réponse 503. */
export const DELAI_MAX_LECTURE_MS = 5000;

/**
 * Délai maximal d'attente de l'enregistrement du clic ; au-delà, la
 * redirection part quand même. Le délai coupe l'ATTENTE, pas la transaction :
 * la requête déjà partie peut encore aboutir côté base.
 */
export const DELAI_MAX_ENREGISTREMENT_MS = 2000;

/** Erreur renvoyée par Supabase, réduite à ce qui peut être journalisé. */
export type ErreurDonnees = { code: string | null; message: string };

export type ResultatLecture =
  { ok: true; url: string | null } | { ok: false; erreur: ErreurDonnees };

/** Ne garde que le code et le message : `details` peut reprendre la ligne en cause. */
function erreurJournalisable(erreur: {
  code?: string | null;
  message?: string | null;
}): ErreurDonnees {
  return { code: erreur.code || null, message: erreur.message || "erreur sans message" };
}

/**
 * Lit la cible et renvoie son URL brute de destination (`null` si la cible
 * n'existe pas, n'est pas publiée, n'est pas active ce jour-là, ou n'a pas
 * de lien pour cette destination). L'URL n'est PAS encore vérifiée : c'est
 * `ajouterUtm` (src/lib/utils/urls.ts) qui n'accepte que `https://`.
 * `aujourdhui` : date du jour à Porto-Novo, calculée par l'appelant.
 */
export async function lireDestination(
  client: ClientPasserelle,
  cible: CiblePasserelle,
  aujourdhui: string,
): Promise<ResultatLecture> {
  const signal = AbortSignal.timeout(DELAI_MAX_LECTURE_MS);

  switch (cible.type) {
    case "societe": {
      const { data, error } = await client
        .from("societes")
        .select("id, statut, site_web, site_congres")
        .eq("id", cible.id)
        .eq("statut", "publie")
        .abortSignal(signal)
        .maybeSingle();
      if (error) return { ok: false, erreur: erreurJournalisable(error) };
      const ligne: LigneSociete | null = data;
      return { ok: true, url: destinationSociete(ligne, cible.id, cible.vers) };
    }
    case "evenement": {
      const { data, error } = await client
        .from("evenements")
        .select("id, statut, site_web, lien_inscription")
        .eq("id", cible.id)
        .eq("statut", "publie")
        .abortSignal(signal)
        .maybeSingle();
      if (error) return { ok: false, erreur: erreurJournalisable(error) };
      const ligne: LigneEvenement | null = data;
      return { ok: true, url: destinationEvenement(ligne, cible.id, cible.vers) };
    }
    case "emplacement": {
      const { data, error } = await client
        .from("emplacements_pub")
        .select("id, actif, date_debut, date_fin, lien")
        .eq("id", cible.id)
        .eq("actif", true)
        .lte("date_debut", aujourdhui)
        .gte("date_fin", aujourdhui)
        .abortSignal(signal)
        .maybeSingle();
      if (error) return { ok: false, erreur: erreurJournalisable(error) };
      const ligne: LigneEmplacement | null = data;
      return { ok: true, url: destinationEmplacement(ligne, cible.id, aujourdhui) };
    }
  }
}

/** Ligne de `clics_sortants` : ni adresse IP, ni identifiant, ni agent utilisateur. */
export type Clic = {
  cible_type: Enums<"type_cible">;
  cible_id: string;
  url: string;
  page_origine: string | null;
};

/**
 * Issue de l'enregistrement d'un clic :
 * - `enregistre` : la base a confirmé l'insertion ;
 * - `delai_depasse` : pas de réponse dans `DELAI_MAX_ENREGISTREMENT_MS` ;
 *   l'attente est abandonnée mais l'insertion peut avoir abouti (non confirmé) ;
 * - `erreur` : erreur renvoyée par l'API (ou réseau) avant le délai : le clic
 *   n'est pas enregistré.
 */
export type ResultatEnregistrement =
  | { statut: "enregistre" }
  | { statut: "delai_depasse" }
  | { statut: "erreur"; erreur: ErreurDonnees };

/**
 * Enregistre un clic sortant (client de service). Renvoie l'issue au lieu de
 * lever : l'appelant la journalise et redirige quand même. Aucune relecture de
 * la ligne insérée (`return=minimal`).
 *
 * Délai dépassé : reconnu à NOTRE signal (`signal.aborted`), et non au texte de
 * l'erreur, qui dépend de supabase-js et du `fetch` utilisé (« AbortError »,
 * « TimeoutError »…). Supabase-js renvoie l'interruption comme une erreur
 * (`{ error }`) ; si elle était levée, elle est reconnue de la même façon.
 */
export async function enregistrerClic(
  client: ClientPasserelle,
  clic: Clic,
): Promise<ResultatEnregistrement> {
  const signal = AbortSignal.timeout(DELAI_MAX_ENREGISTREMENT_MS);
  try {
    const { error } = await client.from("clics_sortants").insert(clic).abortSignal(signal);
    if (!error) return { statut: "enregistre" };
    if (signal.aborted) return { statut: "delai_depasse" };
    return { statut: "erreur", erreur: erreurJournalisable(error) };
  } catch (erreur) {
    if (signal.aborted) return { statut: "delai_depasse" };
    throw erreur;
  }
}
