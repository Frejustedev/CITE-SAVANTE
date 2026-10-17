// Événements : types partagés et conversions pures des lignes lues par
// `src/lib/requetes/evenements.ts`.
//
// Séparé de `requetes/` pour deux raisons : (1) tout fichier de
// `src/lib/requetes/` commence par `import "server-only"`, qui lève une
// erreur sous Vitest — la logique placée ici est donc testable
// (`evenements.test.ts`) ; (2) un composant client peut importer ces types
// sans enfreindre la règle « aucun composant client n'importe
// `src/lib/requetes/` » (`src/lib/securite.test.ts`).
import type { Enums } from "@/lib/supabase/types";

/**
 * Rôles qui font d'une organisation l'organisatrice d'un événement (fiche
 * organisation, nombre d'événements de l'annuaire) : `partenaire` exclu.
 */
export const ROLES_ORGANISATEURS = [
  "organisateur",
  "co_organisateur",
] as const satisfies readonly Enums<"role_organisation">[];

/** Organisation rattachée à un événement (toujours une organisation publiée). */
export type OrganisateurEvenement = {
  role: Enums<"role_organisation">;
  id: string;
  slug: string;
  sigle: string;
};

/** Échéance d'un événement (date limite au format « AAAA-MM-JJ »). */
export type EcheanceEvenement = {
  id: string;
  type: Enums<"type_echeance">;
  /** Libellé libre ; à défaut, afficher `typeEcheanceLabels[type]` (src/lib/textes.ts). */
  libelle: string | null;
  dateLimite: string;
};

/** Ce qu'il faut pour afficher un événement en carte (agenda, fiche organisation, accueil). */
export type EvenementResume = {
  id: string;
  slug: string;
  titre: string;
  type: Enums<"type_evenement">;
  /** « AAAA-MM-JJ ». */
  dateDebut: string;
  /** « AAAA-MM-JJ », jamais avant `dateDebut` (contrainte `dates_coherentes`). */
  dateFin: string;
  /** « HH:MM:SS » ou `null` (événement sur journées entières). */
  heureDebut: string | null;
  modalite: Enums<"modalite_evenement">;
  lieuNom: string | null;
  ville: string | null;
  gratuit: boolean;
  /** Organisations publiées rattachées, organisateurs d'abord, puis co-organisateurs, puis partenaires ; par sigle. */
  organisateurs: OrganisateurEvenement[];
  /** Échéance non passée la plus proche (`date_limite >= aujourd'hui`), ou `null`. */
  prochaineEcheance: EcheanceEvenement | null;
};

/**
 * Ligne `evenements` telle que la renvoie la sélection
 * `SELECTION_EVENEMENT_RESUME` de `src/lib/requetes/evenements.ts`.
 * `societes` est déclaré nullable : la RLS masque à `anon` une organisation
 * non publiée et PostgREST renvoie alors `null` à sa place, alors que le type
 * généré la dit non nulle (relecture de sécurité de la phase 1, correction 4).
 */
export type LigneEvenementResume = {
  id: string;
  slug: string;
  titre: string;
  type: Enums<"type_evenement">;
  date_debut: string;
  date_fin: string;
  heure_debut: string | null;
  modalite: Enums<"modalite_evenement">;
  lieu_nom: string | null;
  ville: string | null;
  gratuit: boolean;
  evenement_societes: {
    role: Enums<"role_organisation">;
    societes: { id: string; slug: string; sigle: string } | null;
  }[];
  echeances: {
    id: string;
    type: Enums<"type_echeance">;
    libelle: string | null;
    date_limite: string;
  }[];
};

const collateur = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

const ORDRE_ROLES: Record<Enums<"role_organisation">, number> = {
  organisateur: 0,
  co_organisateur: 1,
  partenaire: 2,
};

/**
 * Convertit une ligne lue en `EvenementResume` : organisations nulles
 * (masquées par la RLS) ignorées, organisateurs triés par rôle puis sigle,
 * prochaine échéance = la plus proche dont la date limite n'est pas passée
 * à la date `aujourdhui` (« AAAA-MM-JJ », Porto-Novo).
 */
export function versEvenementResume(
  ligne: LigneEvenementResume,
  aujourdhui: string,
): EvenementResume {
  const organisateurs = ligne.evenement_societes
    .flatMap((rattachement) =>
      rattachement.societes
        ? [
            {
              role: rattachement.role,
              id: rattachement.societes.id,
              slug: rattachement.societes.slug,
              sigle: rattachement.societes.sigle,
            },
          ]
        : [],
    )
    .sort(
      (a, b) => ORDRE_ROLES[a.role] - ORDRE_ROLES[b.role] || collateur.compare(a.sigle, b.sigle),
    );

  const prochaine = ligne.echeances
    .filter((echeance) => echeance.date_limite >= aujourdhui)
    .sort((a, b) => a.date_limite.localeCompare(b.date_limite))[0];

  return {
    id: ligne.id,
    slug: ligne.slug,
    titre: ligne.titre,
    type: ligne.type,
    dateDebut: ligne.date_debut,
    dateFin: ligne.date_fin,
    heureDebut: ligne.heure_debut,
    modalite: ligne.modalite,
    lieuNom: ligne.lieu_nom,
    ville: ligne.ville,
    gratuit: ligne.gratuit,
    organisateurs,
    prochaineEcheance: prochaine
      ? {
          id: prochaine.id,
          type: prochaine.type,
          libelle: prochaine.libelle,
          dateLimite: prochaine.date_limite,
        }
      : null,
  };
}

/** Un événement est à venir tant que `date_fin >= aujourd'hui` (section 7). */
export function estAVenir(
  evenement: Pick<EvenementResume, "dateFin">,
  aujourdhui: string,
): boolean {
  return evenement.dateFin >= aujourdhui;
}

/** Événements d'une organisation, séparés en deux listes (fiche organisation, section 8.2). */
export type EvenementsSociete = {
  /** À venir (en cours compris), par date de début croissante. */
  aVenir: EvenementResume[];
  /** Passés, du plus récent au plus ancien (date de fin décroissante). */
  passes: EvenementResume[];
};

/** Sépare et trie des événements en « à venir » et « passés » à la date `aujourdhui`. */
export function repartirEvenements(
  evenements: readonly EvenementResume[],
  aujourdhui: string,
): EvenementsSociete {
  const aVenir = evenements
    .filter((evenement) => estAVenir(evenement, aujourdhui))
    .sort(
      (a, b) =>
        a.dateDebut.localeCompare(b.dateDebut) ||
        (a.heureDebut ?? "").localeCompare(b.heureDebut ?? "") ||
        a.dateFin.localeCompare(b.dateFin) ||
        collateur.compare(a.titre, b.titre),
    );
  const passes = evenements
    .filter((evenement) => !estAVenir(evenement, aujourdhui))
    .sort(
      (a, b) =>
        b.dateFin.localeCompare(a.dateFin) ||
        b.dateDebut.localeCompare(a.dateDebut) ||
        collateur.compare(a.titre, b.titre),
    );
  return { aVenir, passes };
}

/**
 * Sigles des organisatrices et co-organisatrices (partenaires exclus), dans
 * l'ordre de `organisateurs` : ce que montre une carte d'événement.
 */
export function siglesOrganisateurs(evenement: Pick<EvenementResume, "organisateurs">): string[] {
  const roles: readonly string[] = ROLES_ORGANISATEURS;
  return evenement.organisateurs
    .filter((organisateur) => roles.includes(organisateur.role))
    .map((organisateur) => organisateur.sigle);
}
