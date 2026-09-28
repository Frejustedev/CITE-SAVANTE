/**
 * Libellés d'interface centralisés pour les valeurs des types énumérés
 * Postgres (voir docs/SPECIFICATIONS.md, section 5.2). Un seul endroit à
 * modifier pour changer un texte, et une base pour une future traduction
 * (voir section 1 : les évolutions P2 ne sont pas développées mais le
 * code ne doit pas les empêcher).
 *
 * Les clés reproduisent EXACTEMENT les valeurs des `create type ... as enum`
 * de la section 5.2 : ne pas les renommer ici sans mettre à jour les
 * migrations correspondantes en phase 1.
 */

export type TypeEvenement =
  | "congres"
  | "journees"
  | "colloque"
  | "seminaire"
  | "atelier"
  | "webinaire"
  | "formation"
  | "autre";

export const typeEvenementLabels: Record<TypeEvenement, string> = {
  congres: "Congrès",
  journees: "Journées",
  colloque: "Colloque",
  seminaire: "Séminaire",
  atelier: "Atelier",
  webinaire: "Webinaire",
  formation: "Formation",
  autre: "Autre",
};

export type TypeEcheance =
  | "soumission_resumes"
  | "inscription_tarif_preferentiel"
  | "inscription"
  | "bourse"
  | "prix"
  | "autre";

export const typeEcheanceLabels: Record<TypeEcheance, string> = {
  soumission_resumes: "Soumission des résumés",
  inscription_tarif_preferentiel: "Inscription à tarif préférentiel",
  inscription: "Inscription",
  bourse: "Bourse",
  prix: "Prix",
  autre: "Autre",
};

export type StatutPublication = "brouillon" | "en_attente" | "publie" | "refuse" | "archive";

export const statutPublicationLabels: Record<StatutPublication, string> = {
  brouillon: "Brouillon",
  en_attente: "En attente",
  publie: "Publié",
  refuse: "Refusé",
  archive: "Archivé",
};

export type CategorieOrganisation =
  "societe_savante" | "institution_academique" | "association_professionnelle" | "autre";

export const categorieOrganisationLabels: Record<CategorieOrganisation, string> = {
  societe_savante: "Société savante",
  institution_academique: "Institution académique",
  association_professionnelle: "Association professionnelle",
  autre: "Autre",
};

export type ModaliteEvenement = "presentiel" | "en_ligne" | "hybride";

export const modaliteEvenementLabels: Record<ModaliteEvenement, string> = {
  presentiel: "En présentiel",
  en_ligne: "En ligne",
  hybride: "Hybride",
};

export type RoleOrganisation = "organisateur" | "co_organisateur" | "partenaire";

export const roleOrganisationLabels: Record<RoleOrganisation, string> = {
  organisateur: "Organisateur",
  co_organisateur: "Co-organisateur",
  partenaire: "Partenaire",
};

export type TypeEmplacement =
  "banniere_accueil" | "banniere_agenda" | "banniere_discipline" | "evenement_en_avant" | "lettre";

export const typeEmplacementLabels: Record<TypeEmplacement, string> = {
  banniere_accueil: "Bannière accueil",
  banniere_agenda: "Bannière agenda",
  banniere_discipline: "Bannière discipline",
  evenement_en_avant: "Événement mis en avant",
  lettre: "Lettre",
};
