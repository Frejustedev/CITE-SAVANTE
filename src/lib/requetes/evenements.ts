import "server-only";

// Lecture publique : les événements à venir (agenda, spécifications section
// 8.3). Filtre EXPLICITE sur `statut = 'publie'` (CLAUDE.md, section 6),
// « à venir » = `date_fin >= aujourd'hui à Porto-Novo` (et non un événement
// déjà terminé), triés par `date_debut`, avec leurs organisateurs et leur
// prochaine échéance (celle dont la date limite n'est pas encore passée).
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
// non nulle — sans cette garde, `rattachement.societes.id` levait une
// exception et TOUT l'agenda tombait (preuve : supabase/tests/
// 50_securite.test.sql, section G).
//
// Règle de rendu : étiqueté `evenements` et `societes` (les organisateurs et
// échéances n'ont pas leur propre page publique ; leur invalidation passe
// par les écritures sur `evenements`, `evenement_societes` et `echeances`,
// qui appelleront toutes `invalider(ETIQUETTES.EVENEMENTS)` — server actions
// de l'espace gestionnaire, phase 5, et du back-office, phase 6 ; la
// dépublication ou l'archivage d'une organisation, qui la retire des
// organisateurs affichés, invalide `societes`).
import { unstable_cache } from "next/cache";

import { ETIQUETTES } from "@/lib/cache";
import { creerClientPublic } from "@/lib/supabase/public";
import type { Enums } from "@/lib/supabase/types";
import { aujourdhuiPortoNovo } from "@/lib/utils/dates";

export type OrganisateurEvenement = {
  role: Enums<"role_organisation">;
  id: string;
  slug: string;
  sigle: string;
};

export type EcheanceEvenement = {
  id: string;
  type: Enums<"type_echeance">;
  libelle: string | null;
  dateLimite: string;
};

export type EvenementAVenir = {
  id: string;
  slug: string;
  titre: string;
  type: Enums<"type_evenement">;
  dateDebut: string;
  dateFin: string;
  heureDebut: string | null;
  modalite: Enums<"modalite_evenement">;
  ville: string | null;
  gratuit: boolean;
  organisateurs: OrganisateurEvenement[];
  prochaineEcheance: EcheanceEvenement | null;
};

const SELECTION_EVENEMENT_A_VENIR = `
  id,
  slug,
  titre,
  type,
  date_debut,
  date_fin,
  heure_debut,
  modalite,
  ville,
  gratuit,
  evenement_societes ( role, societes!inner ( id, slug, sigle ) ),
  echeances ( id, type, libelle, date_limite )
` as const;

const listerEvenementsAVenirEnCache = unstable_cache(
  async (aujourdhui: string): Promise<EvenementAVenir[]> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("evenements")
      .select(SELECTION_EVENEMENT_A_VENIR)
      .eq("statut", "publie")
      .eq("evenement_societes.societes.statut", "publie")
      .gte("date_fin", aujourdhui)
      .order("date_debut", { ascending: true });

    if (error) {
      throw new Error(`Lecture des événements à venir impossible : ${error.message}`);
    }

    return data.map((evenement) => {
      const echeancesAVenir = evenement.echeances
        .filter((echeance) => echeance.date_limite >= aujourdhui)
        .sort((a, b) => a.date_limite.localeCompare(b.date_limite));

      return {
        id: evenement.id,
        slug: evenement.slug,
        titre: evenement.titre,
        type: evenement.type,
        dateDebut: evenement.date_debut,
        dateFin: evenement.date_fin,
        heureDebut: evenement.heure_debut,
        modalite: evenement.modalite,
        ville: evenement.ville,
        gratuit: evenement.gratuit,
        // supabase-js type `societes` comme non nul (clé étrangère NOT NULL),
        // mais la RLS peut le rendre nul (voir l'en-tête) : on le retype
        // honnêtement avant de filtrer.
        organisateurs: evenement.evenement_societes.flatMap((rattachement) => {
          const societe = rattachement.societes as typeof rattachement.societes | null;
          return societe
            ? [
                {
                  role: rattachement.role,
                  id: societe.id,
                  slug: societe.slug,
                  sigle: societe.sigle,
                },
              ]
            : [];
        }),
        prochaineEcheance: echeancesAVenir[0]
          ? {
              id: echeancesAVenir[0].id,
              type: echeancesAVenir[0].type,
              libelle: echeancesAVenir[0].libelle,
              dateLimite: echeancesAVenir[0].date_limite,
            }
          : null,
      };
    });
  },
  ["requetes/evenements/lister-evenements-a-venir"],
  { tags: [ETIQUETTES.EVENEMENTS, ETIQUETTES.SOCIETES] },
);

/**
 * Événements publiés à venir (`date_fin >= aujourd'hui` à Porto-Novo), triés
 * par date de début, avec leurs organisateurs et leur prochaine échéance.
 */
export async function listerEvenementsAVenir(): Promise<EvenementAVenir[]> {
  return listerEvenementsAVenirEnCache(aujourdhuiPortoNovo());
}
