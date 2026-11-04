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
import { modaliteEvenementLabels, typeEcheanceLabels } from "@/lib/textes";
import { estUrgente, heureConnue, joursRestants } from "@/lib/utils/dates";
import { estUrlHttpsSure } from "@/lib/utils/urls";

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

/** Discipline d'un événement (`evenement_disciplines` → `disciplines`), triées par `ordre`. */
export type DisciplineEvenement = { id: string; slug: string; nom: string };

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
  /** « HH:MM:SS » ou `null` (événement sur journées entières). À lire par `heureConnue` (dates.ts). */
  heureDebut: string | null;
  modalite: Enums<"modalite_evenement">;
  lieuNom: string | null;
  ville: string | null;
  gratuit: boolean;
  /** Organisations publiées rattachées, organisateurs d'abord, puis co-organisateurs, puis partenaires ; par sigle. */
  organisateurs: OrganisateurEvenement[];
  /** Échéance non passée la plus proche (`date_limite >= aujourd'hui`), ou `null`. */
  prochaineEcheance: EcheanceEvenement | null;
  /** Disciplines de l'événement, triées par `disciplines.ordre` (vide si aucune). */
  disciplines: DisciplineEvenement[];
  /**
   * Vrai si un emplacement `evenement_en_avant` actif ce jour-là (Porto-Novo)
   * désigne cet événement (section 7 : mention « Mis en avant », en tête de
   * l'agenda). Calculé par les lectures de l'agenda
   * (`src/lib/requetes/evenements.ts`, `marquerMiseEnAvant`) ; toujours
   * `false` ailleurs (fiche organisation, `listerEvenementsAVenir`).
   */
  miseEnAvant: boolean;
};

/** Ligne d'embarquement `evenement_disciplines ( disciplines ( id, slug, nom, ordre ) )`. */
export type LigneDisciplineEvenement = {
  disciplines: { id: string; slug: string; nom: string; ordre: number } | null;
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
  evenement_disciplines: LigneDisciplineEvenement[];
};

const collateur = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

/**
 * Disciplines d'une ligne lue : rattachements nuls ignorés (une ligne nulle
 * ne doit jamais faire tomber une page), tri par `ordre` puis nom, doublons
 * retirés.
 */
export function versDisciplines(
  rattachements: readonly LigneDisciplineEvenement[],
): DisciplineEvenement[] {
  const vues = new Set<string>();
  return rattachements
    .flatMap((rattachement) => (rattachement.disciplines ? [rattachement.disciplines] : []))
    .sort((a, b) => a.ordre - b.ordre || collateur.compare(a.nom, b.nom))
    .filter((discipline) => !vues.has(discipline.id) && Boolean(vues.add(discipline.id)))
    .map(({ id, slug, nom }) => ({ id, slug, nom }));
}

const ORDRE_ROLES: Record<Enums<"role_organisation">, number> = {
  organisateur: 0,
  co_organisateur: 1,
  partenaire: 2,
};

/** Ordre des organisateurs : organisateurs, co-organisateurs, partenaires ; puis sigle. */
function comparerOrganisateurs(
  a: Pick<OrganisateurEvenement, "role" | "sigle">,
  b: Pick<OrganisateurEvenement, "role" | "sigle">,
): number {
  return ORDRE_ROLES[a.role] - ORDRE_ROLES[b.role] || collateur.compare(a.sigle, b.sigle);
}

/**
 * Convertit une ligne lue en `EvenementResume` : organisations nulles
 * (masquées par la RLS) ignorées, organisateurs triés par rôle puis sigle,
 * prochaine échéance = la plus proche dont la date limite n'est pas passée
 * à la date `aujourdhui` (« AAAA-MM-JJ », Porto-Novo), disciplines triées
 * par `ordre`. `miseEnAvant` vaut `false` : les lectures de l'agenda le
 * renseignent ensuite (`marquerMiseEnAvant`).
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
    .sort(comparerOrganisateurs);

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
    disciplines: versDisciplines(ligne.evenement_disciplines),
    miseEnAvant: false,
  };
}

/**
 * Renseigne `miseEnAvant` : vrai pour les événements dont l'identifiant
 * figure dans `idsMisEnAvant` (emplacements `evenement_en_avant` actifs ce
 * jour-là, `lireEmplacementsActifs`). Renvoie de nouveaux objets, dans le
 * même ordre.
 */
export function marquerMiseEnAvant<T extends EvenementResume>(
  evenements: readonly T[],
  idsMisEnAvant: Iterable<string>,
): T[] {
  const ids = new Set(idsMisEnAvant);
  return evenements.map((evenement) => ({ ...evenement, miseEnAvant: ids.has(evenement.id) }));
}

/** Ordre chronologique : date de début, heure de début, date de fin, puis titre. */
export function comparerEvenementsChronologique(
  a: Pick<EvenementResume, "dateDebut" | "dateFin" | "heureDebut" | "titre">,
  b: Pick<EvenementResume, "dateDebut" | "dateFin" | "heureDebut" | "titre">,
): number {
  return (
    a.dateDebut.localeCompare(b.dateDebut) ||
    (heureConnue(a.heureDebut) ?? "").localeCompare(heureConnue(b.heureDebut) ?? "") ||
    a.dateFin.localeCompare(b.dateFin) ||
    collateur.compare(a.titre, b.titre)
  );
}

/**
 * Ordre de l'agenda à venir (sections 7 et 8.3) : événements mis en avant
 * d'abord, puis ordre chronologique (`comparerEvenementsChronologique`).
 */
export function comparerEvenementsAVenir(
  a: Pick<EvenementResume, "dateDebut" | "dateFin" | "heureDebut" | "titre" | "miseEnAvant">,
  b: Pick<EvenementResume, "dateDebut" | "dateFin" | "heureDebut" | "titre" | "miseEnAvant">,
): number {
  if (a.miseEnAvant !== b.miseEnAvant) return a.miseEnAvant ? -1 : 1;
  return comparerEvenementsChronologique(a, b);
}

/** Ordre des archives : du plus récent au plus ancien (date de fin, puis de début), puis titre. */
export function comparerEvenementsPasses(
  a: Pick<EvenementResume, "dateDebut" | "dateFin" | "titre">,
  b: Pick<EvenementResume, "dateDebut" | "dateFin" | "titre">,
): number {
  return (
    b.dateFin.localeCompare(a.dateFin) ||
    b.dateDebut.localeCompare(a.dateDebut) ||
    collateur.compare(a.titre, b.titre)
  );
}

/**
 * Suggestions (fiche d'un événement passé, section 8.4) : parmi `aVenir`, les
 * événements qui partagent au moins une discipline (même slug) avec
 * `evenement`, lui-même exclu, par ordre chronologique, `limite` au plus.
 * Liste vide si `evenement` n'a aucune discipline.
 */
export function choisirSuggestions<T extends EvenementResume>(
  evenement: { id: string; disciplines: readonly { slug: string }[] },
  aVenir: readonly T[],
  limite: number,
): T[] {
  const disciplines = new Set(evenement.disciplines.map((discipline) => discipline.slug));
  if (disciplines.size === 0) return [];
  return aVenir
    .filter(
      (candidat) =>
        candidat.id !== evenement.id &&
        candidat.disciplines.some((discipline) => disciplines.has(discipline.slug)),
    )
    .sort(comparerEvenementsChronologique)
    .slice(0, Math.max(0, limite));
}

/** Libellé d'une échéance : son libellé libre, sinon celui de son type (« Inscription »). */
export function libelleEcheance(echeance: {
  type: Enums<"type_echeance">;
  libelle: string | null;
}): string {
  const libre = echeance.libelle?.replace(/\s+/g, " ").trim();
  return libre ? libre : typeEcheanceLabels[echeance.type];
}

/** Ce qu'il faut savoir d'un événement pour dire où il a lieu. */
export type LieuEvenement = {
  modalite: Enums<"modalite_evenement">;
  lieuNom: string | null;
  ville: string | null;
  adresse?: string | null;
  pays?: string | null;
};

/** Parties non vides, espaces normalisés, sans répétition (casse ignorée), jointes par « , ». */
function joindreParties(parties: readonly (string | null | undefined)[]): string {
  const vues = new Set<string>();
  const retenues: string[] = [];
  for (const partie of parties) {
    const propre = partie?.replace(/\s+/g, " ").trim();
    if (!propre) continue;
    const cle = propre.toLocaleLowerCase("fr");
    if (vues.has(cle)) continue;
    vues.add(cle);
    retenues.push(propre);
  }
  return retenues.join(", ");
}

/**
 * Lieu affiché sur une carte ou une fiche (jamais vide) :
 * - en ligne : « En ligne » ;
 * - hybride : « {lieu} et en ligne », ou « En présentiel et en ligne » ;
 * - présentiel : « {lieu} », ou « Lieu à préciser ».
 * `{lieu}` = nom du lieu, (adresse si `options.adresse`), ville, séparés par
 * « , » ; jamais le pays.
 */
export function texteLieu(evenement: LieuEvenement, options: { adresse?: boolean } = {}): string {
  const lieu = joindreParties([
    evenement.lieuNom,
    options.adresse ? evenement.adresse : null,
    evenement.ville,
  ]);
  switch (evenement.modalite) {
    case "en_ligne":
      return modaliteEvenementLabels.en_ligne;
    case "hybride":
      return lieu ? `${lieu} et en ligne` : "En présentiel et en ligne";
    default:
      return lieu || "Lieu à préciser";
  }
}

/**
 * Lieu pour un agenda externe (`LOCATION` du .ics, `location` de Google
 * Agenda), ou `null` s'il n'y a rien d'utile à y mettre :
 * - en ligne : « En ligne » ;
 * - hybride : « {lieu} et en ligne », ou « En ligne » sans lieu connu ;
 * - présentiel : « {lieu} », ou `null` sans lieu connu (plutôt que « Lieu à
 *   préciser », qui n'est pas un lieu).
 * `{lieu}` = nom du lieu, adresse, ville, puis pays (utile au géocodage des
 * agendas) — le pays seul ne suffit pas à faire un lieu.
 */
export function lieuAgenda(evenement: LieuEvenement): string | null {
  const precis = joindreParties([evenement.lieuNom, evenement.adresse, evenement.ville]);
  const lieu = precis ? joindreParties([precis, evenement.pays]) : "";
  switch (evenement.modalite) {
    case "en_ligne":
      return modaliteEvenementLabels.en_ligne;
    case "hybride":
      return lieu ? `${lieu} et en ligne` : modaliteEvenementLabels.en_ligne;
    default:
      return lieu || null;
  }
}

/**
 * Organisateur principal : la première organisatrice (puis co-organisatrice)
 * dans l'ordre des rôles et des sigles ; partenaires exclus. `null` si aucune.
 */
export function organisateurPrincipal<T extends Pick<OrganisateurEvenement, "role" | "sigle">>(
  organisateurs: readonly T[],
): T | null {
  const roles: readonly string[] = ROLES_ORGANISATEURS;
  return (
    [...organisateurs]
      .filter((organisateur) => roles.includes(organisateur.role))
      .sort(comparerOrganisateurs)[0] ?? null
  );
}

// ── Fiche événement (section 8.4) ────────────────────────────────────────────

/** Organisation rattachée, sur la fiche : avec son nom complet (liens, JSON-LD `organizer`). */
export type OrganisateurFiche = OrganisateurEvenement & { nomComplet: string | null };

/** Tout ce qu'affiche la fiche `/agenda/[slug]` (section 8.4), d'un événement PUBLIÉ. */
export type EvenementFiche = {
  id: string;
  slug: string;
  titre: string;
  type: Enums<"type_evenement">;
  /** Résumé (280 caractères au plus), espaces de bord retirés, ou `null`. */
  resume: string | null;
  /** Description libre (texte brut, à afficher comme texte), ou `null`. */
  description: string | null;
  /** « AAAA-MM-JJ ». */
  dateDebut: string;
  /** « AAAA-MM-JJ », jamais avant `dateDebut`. */
  dateFin: string;
  /** « HH:MM:SS » ou `null` (journées entières), à lire par `heureConnue` (dates.ts). Aucune heure de fin en base. */
  heureDebut: string | null;
  modalite: Enums<"modalite_evenement">;
  lieuNom: string | null;
  adresse: string | null;
  ville: string | null;
  /** « Bénin » par défaut (colonne non nulle). */
  pays: string;
  /** Lien d'inscription `https://` sûr, ou `null` : bouton « S'inscrire » via /go (`vers=inscription`) si non nul. */
  lienInscription: string | null;
  /** Site de l'événement `https://` sûr, ou `null` : bouton « Site de l'événement » via /go (`vers=site`) si non nul. */
  siteWeb: string | null;
  /** Chemin relatif au bucket `affiches`, ou `null` ; URL par `urlAffiche()` (src/lib/stockage.ts). */
  affichePath: string | null;
  /** Tarifs (texte libre), ou `null`. */
  tarifs: string | null;
  gratuit: boolean;
  /** Crédits de formation médicale continue (texte libre), ou `null`. */
  creditsFmc: string | null;
  /** Adresse de contact saisie, telle quelle (lien : `hrefCourriel`, src/lib/utils/urls.ts), ou `null`. */
  contactEmail: string | null;
  /** Organisations PUBLIÉES rattachées : organisateurs, co-organisateurs, partenaires ; par sigle. */
  organisateurs: OrganisateurFiche[];
  /** Disciplines, triées par `ordre`. */
  disciplines: DisciplineEvenement[];
  /** TOUTES les échéances (passées comprises), par date limite croissante. */
  echeances: EcheanceEvenement[];
};

/** Ligne `evenements` telle que la renvoie `SELECTION_EVENEMENT_FICHE` (src/lib/requetes/evenements.ts). */
export type LigneEvenementFiche = {
  id: string;
  slug: string;
  titre: string;
  type: Enums<"type_evenement">;
  resume: string | null;
  description: string | null;
  date_debut: string;
  date_fin: string;
  heure_debut: string | null;
  modalite: Enums<"modalite_evenement">;
  lieu_nom: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string;
  lien_inscription: string | null;
  site_web: string | null;
  affiche_path: string | null;
  tarifs: string | null;
  gratuit: boolean;
  credits_fmc: string | null;
  contact_email: string | null;
  evenement_societes: {
    role: Enums<"role_organisation">;
    societes: { id: string; slug: string; sigle: string; nom_complet: string | null } | null;
  }[];
  evenement_disciplines: LigneDisciplineEvenement[];
  echeances: {
    id: string;
    type: Enums<"type_echeance">;
    libelle: string | null;
    date_limite: string;
  }[];
};

/** Texte libre : espaces de bord retirés, `null` si vide. */
function texteOuNull(valeur: string | null | undefined): string | null {
  const propre = valeur?.trim();
  return propre ? propre : null;
}

/**
 * Convertit la ligne de la fiche : textes vides → `null`, liens non
 * `https://` sûrs → `null` (le bouton correspondant n'est pas affiché),
 * organisations nulles (masquées par la RLS) ignorées, échéances triées
 * par date limite (puis libellé).
 */
export function versEvenementFiche(ligne: LigneEvenementFiche): EvenementFiche {
  const organisateurs = ligne.evenement_societes
    .flatMap((rattachement) =>
      rattachement.societes
        ? [
            {
              role: rattachement.role,
              id: rattachement.societes.id,
              slug: rattachement.societes.slug,
              sigle: rattachement.societes.sigle,
              nomComplet: texteOuNull(rattachement.societes.nom_complet),
            },
          ]
        : [],
    )
    .sort(comparerOrganisateurs);

  const echeances = ligne.echeances
    .map((echeance) => ({
      id: echeance.id,
      type: echeance.type,
      libelle: texteOuNull(echeance.libelle),
      dateLimite: echeance.date_limite,
    }))
    .sort(
      (a, b) =>
        a.dateLimite.localeCompare(b.dateLimite) ||
        collateur.compare(libelleEcheance(a), libelleEcheance(b)),
    );

  return {
    id: ligne.id,
    slug: ligne.slug,
    titre: ligne.titre,
    type: ligne.type,
    resume: texteOuNull(ligne.resume),
    description: texteOuNull(ligne.description),
    dateDebut: ligne.date_debut,
    dateFin: ligne.date_fin,
    heureDebut: ligne.heure_debut,
    modalite: ligne.modalite,
    lieuNom: texteOuNull(ligne.lieu_nom),
    adresse: texteOuNull(ligne.adresse),
    ville: texteOuNull(ligne.ville),
    pays: texteOuNull(ligne.pays) ?? "Bénin",
    lienInscription: estUrlHttpsSure(ligne.lien_inscription) ? ligne.lien_inscription : null,
    siteWeb: estUrlHttpsSure(ligne.site_web) ? ligne.site_web : null,
    affichePath: texteOuNull(ligne.affiche_path),
    tarifs: texteOuNull(ligne.tarifs),
    gratuit: ligne.gratuit,
    creditsFmc: texteOuNull(ligne.credits_fmc),
    contactEmail: texteOuNull(ligne.contact_email),
    organisateurs,
    disciplines: versDisciplines(ligne.evenement_disciplines),
    echeances,
  };
}

// ── Échéances à venir (section 8.5) ──────────────────────────────────────────

/** Une échéance de la page `/echeances`, avec son événement. */
export type EcheanceAVenir = {
  id: string;
  type: Enums<"type_echeance">;
  /** Libellé libre, ou `null` : afficher `libelleEcheance(echeance)`. */
  libelle: string | null;
  /** « AAAA-MM-JJ », jamais avant « aujourd'hui ». */
  dateLimite: string;
  /** Jours restants à la date `aujourdhui` de la lecture : 0 = aujourd'hui (`decrireJoursRestants`). */
  joursRestants: number;
  /** 7 jours ou moins (section 7 : badge « urgente » or, `Badge variante="urgent"`). */
  urgente: boolean;
  /** L'événement (publié) de l'échéance : lien `/agenda/{slug}`. */
  evenement: {
    id: string;
    slug: string;
    titre: string;
    type: Enums<"type_evenement">;
    dateDebut: string;
    dateFin: string;
  };
  /** Organisation organisatrice principale (publiée), ou `null` (`organisateurPrincipal`). */
  organisateurPrincipal: { id: string; slug: string; sigle: string } | null;
  /** Disciplines de l'événement (filtre `discipline`). */
  disciplines: DisciplineEvenement[];
};

/** Ligne `echeances` telle que la renvoie `SELECTION_ECHEANCE_A_VENIR` (src/lib/requetes/evenements.ts). */
export type LigneEcheanceAVenir = {
  id: string;
  type: Enums<"type_echeance">;
  libelle: string | null;
  date_limite: string;
  evenements: {
    id: string;
    slug: string;
    titre: string;
    type: Enums<"type_evenement">;
    date_debut: string;
    date_fin: string;
    evenement_societes: {
      role: Enums<"role_organisation">;
      societes: { id: string; slug: string; sigle: string } | null;
    }[];
    evenement_disciplines: LigneDisciplineEvenement[];
  } | null;
};

/**
 * Convertit une ligne d'échéance à la date `aujourdhui` (« AAAA-MM-JJ »,
 * Porto-Novo). `null` si l'événement est absent (masqué par la RLS) : la
 * ligne est alors ignorée.
 */
export function versEcheanceAVenir(
  ligne: LigneEcheanceAVenir,
  aujourdhui: string,
): EcheanceAVenir | null {
  const evenement = ligne.evenements;
  if (!evenement) return null;
  const organisateurs = evenement.evenement_societes.flatMap((rattachement) =>
    rattachement.societes ? [{ role: rattachement.role, ...rattachement.societes }] : [],
  );
  const principal = organisateurPrincipal(organisateurs);
  return {
    id: ligne.id,
    type: ligne.type,
    libelle: texteOuNull(ligne.libelle),
    dateLimite: ligne.date_limite,
    joursRestants: joursRestants(ligne.date_limite, aujourdhui),
    urgente: estUrgente(ligne.date_limite, aujourdhui),
    evenement: {
      id: evenement.id,
      slug: evenement.slug,
      titre: evenement.titre,
      type: evenement.type,
      dateDebut: evenement.date_debut,
      dateFin: evenement.date_fin,
    },
    organisateurPrincipal: principal
      ? { id: principal.id, slug: principal.slug, sigle: principal.sigle }
      : null,
    disciplines: versDisciplines(evenement.evenement_disciplines),
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
    .sort(comparerEvenementsChronologique);
  const passes = evenements
    .filter((evenement) => !estAVenir(evenement, aujourdhui))
    .sort(comparerEvenementsPasses);
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
