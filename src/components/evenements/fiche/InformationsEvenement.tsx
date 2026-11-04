import Link from "next/link";
import type { ReactNode } from "react";

import { PictoLienExterne } from "@/components/pictos";
import { roleOrganisationLabels } from "@/lib/textes";
import { cx } from "@/lib/utils/classes";
import { formaterHeure, formaterPeriode, heureConnue } from "@/lib/utils/dates";
import type { EvenementFiche, OrganisateurFiche } from "@/lib/utils/evenements";
import { lienCarte } from "@/lib/utils/partage";
import { premiereLettreMajuscule } from "@/lib/utils/texte";

import {
  MENTION_SITE_EXTERNE_NOUVEL_ONGLET,
  libelleModalite,
  lignesLieu,
  nomCompletOrganisation,
  separerOrganisations,
} from "./utilitaires";

type InformationsEvenementProps = {
  evenement: Pick<
    EvenementFiche,
    | "dateDebut"
    | "dateFin"
    | "heureDebut"
    | "modalite"
    | "lieuNom"
    | "adresse"
    | "ville"
    | "pays"
    | "organisateurs"
    | "disciplines"
  >;
  className?: string;
};

function Ligne({
  terme,
  large = false,
  children,
}: {
  terme: string;
  /** Occupe toute la largeur de la grille (listes longues). */
  large?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cx("min-w-0", large && "sm:col-span-2")}>
      <dt className="petites-capitales text-base text-bordeaux">{terme}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/** Une organisation : sigle en lien vers sa fiche, nom complet, rôle s'il n'est pas « organisateur ». */
function Organisation({ organisation }: { organisation: OrganisateurFiche }) {
  const nom = nomCompletOrganisation(organisation);
  return (
    <li className="min-w-0">
      <Link href={`/societes/${organisation.slug}`} className="break-words">
        {organisation.sigle}
      </Link>
      {nom ? <span className="break-words">{`, ${nom}`}</span> : null}
      {organisation.role === "co_organisateur" ? (
        <span className="petites-capitales ml-2 text-base whitespace-nowrap text-bordeaux">
          {/* Séparateur masqué : sans lui, les lecteurs d'écran colleraient le nom et le rôle. */}
          <span className="sr-only">, </span>
          {roleOrganisationLabels.co_organisateur}
        </span>
      ) : null}
    </li>
  );
}

/**
 * Informations pratiques de la fiche événement (spécifications 8.4), en
 * liste de définitions : dates (`formaterPeriode`), heure de début si elle
 * est connue (« 8 h 30 », espaces insécables ; « le premier jour » pour un
 * événement de plusieurs jours), modalité, lieu et adresse (pays seulement
 * s'il n'est pas le Bénin) avec le lien « Voir sur la carte »
 * (OpenStreetMap, `lienCarte` : seulement si une adresse ou une ville est
 * connue, jamais pour un événement en ligne), organisatrices et
 * co-organisatrices, partenaires (liens vers leurs fiches), disciplines
 * (liens vers `/disciplines/{slug}`).
 *
 * Le lien de la carte ne passe pas par la passerelle `/go` : il ne mène pas
 * au site d'une organisation, et son adresse est construite par le site, pas
 * saisie. Lien direct, donc `rel="noopener noreferrer nofollow"`
 * (section 6), nouvel onglet annoncé en toutes lettres.
 */
export function InformationsEvenement({ evenement, className }: InformationsEvenementProps) {
  const unSeulJour = evenement.dateDebut === evenement.dateFin;
  const heure = heureConnue(evenement.heureDebut);
  const presentiel = evenement.modalite !== "en_ligne";
  const lieu = lignesLieu(evenement);
  const carte = presentiel
    ? lienCarte(evenement.adresse, evenement.ville, {
        lieuNom: evenement.lieuNom,
        pays: evenement.pays,
      })
    : null;
  const { organisateurs, partenaires } = separerOrganisations(evenement.organisateurs);

  return (
    <dl className={cx("grid gap-x-8 gap-y-4 sm:grid-cols-2", className)}>
      <Ligne terme={unSeulJour ? "Date" : "Dates"}>
        <span className="tabular-nums">
          {premiereLettreMajuscule(formaterPeriode(evenement.dateDebut, evenement.dateFin))}
        </span>
      </Ligne>

      {heure ? (
        <Ligne terme="Heure de début">
          <span className="tabular-nums">{formaterHeure(heure)}</span>
          {unSeulJour ? null : " le premier jour"}
        </Ligne>
      ) : null}

      <Ligne terme="Modalité">{libelleModalite(evenement.modalite)}</Ligne>

      {presentiel ? (
        <Ligne terme="Lieu">
          {lieu.length > 0 ? (
            <span className="block">
              {lieu.map((ligne) => (
                <span key={ligne} className="block break-words">
                  {ligne}
                </span>
              ))}
            </span>
          ) : (
            "Lieu à préciser"
          )}
          {carte ? (
            <a
              href={carte}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-1 inline-flex min-h-8 items-center gap-1.5"
            >
              Voir sur la carte
              <PictoLienExterne taille={16} className="shrink-0" />
              <span className="text-sm">({MENTION_SITE_EXTERNE_NOUVEL_ONGLET})</span>
            </a>
          ) : null}
        </Ligne>
      ) : null}

      {organisateurs.length > 0 ? (
        <Ligne terme={organisateurs.length > 1 ? "Organisateurs" : "Organisateur"} large>
          <ul className="space-y-1">
            {organisateurs.map((organisation) => (
              <Organisation key={organisation.id} organisation={organisation} />
            ))}
          </ul>
        </Ligne>
      ) : null}

      {partenaires.length > 0 ? (
        <Ligne terme={partenaires.length > 1 ? "Partenaires" : "Partenaire"} large>
          <ul className="space-y-1">
            {partenaires.map((organisation) => (
              <Organisation key={organisation.id} organisation={organisation} />
            ))}
          </ul>
        </Ligne>
      ) : null}

      {evenement.disciplines.length > 0 ? (
        <Ligne terme={evenement.disciplines.length > 1 ? "Disciplines" : "Discipline"} large>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {evenement.disciplines.map((discipline) => (
              <li key={discipline.id}>
                <Link href={`/disciplines/${discipline.slug}`}>{discipline.nom}</Link>
              </li>
            ))}
          </ul>
        </Ligne>
      ) : null}
    </dl>
  );
}
