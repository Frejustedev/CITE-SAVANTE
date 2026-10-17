import Link from "next/link";

import { Badge } from "@/components/mise-en-page/Badge";
import { Carte } from "@/components/mise-en-page/Carte";
import { LogoSociete } from "@/components/societes/LogoSociete";
import { PictoCalendrier, PictoLieu } from "@/components/pictos";
import type { SocietePubliee } from "@/lib/requetes/societes";
import { categorieOrganisationLabels } from "@/lib/textes";
import { cx } from "@/lib/utils/classes";

export type CarteSocieteProps = {
  /**
   * Organisation à présenter. `nombreEvenementsAVenir` (fourni par
   * `listerSocietesAnnuaire`) : ligne « N événements à venir » ; absent,
   * la ligne n'est pas affichée.
   */
  societe: SocietePubliee & { nombreEvenementsAVenir?: number };
  /** Niveau du titre de la carte (`h3` par défaut, sous un `h2` de section). */
  niveauTitre?: "h2" | "h3" | "h4";
  /** Élément rendu : `li` dans une liste (`<ul>`), `article` sinon. */
  as?: "article" | "li" | "div";
  /** Afficher la catégorie (utile hors de l'annuaire filtré par catégorie). Faux par défaut. */
  afficherCategorie?: boolean;
  className?: string;
};

function texteEvenements(nombre: number): string {
  if (nombre === 0) return "Aucun événement à venir";
  return nombre === 1 ? "1 événement à venir" : `${nombre} événements à venir`;
}

/**
 * Carte d'une organisation dans l'annuaire (spécifications 8.1) : logo ou
 * monogramme, sigle, nom complet, disciplines, ville, nombre d'événements à
 * venir, mention « Mise en avant ». Toute la carte mène à la fiche
 * `/societes/{slug}` par UN SEUL lien (celui du titre, étendu à la carte par
 * un pseudo-élément) : aucun lien imbriqué, nom de lien court pour les
 * lecteurs d'écran (sigle et nom complet), contour de focus sur toute la
 * carte.
 */
export function CarteSociete({
  societe,
  niveauTitre = "h3",
  as = "article",
  afficherCategorie = false,
  className,
}: CarteSocieteProps) {
  const Titre = niveauTitre;
  const disciplines = societe.disciplines.map((discipline) => discipline.nom);

  return (
    <Carte
      as={as}
      className={cx(
        "relative flex gap-4 transition-teintes duration-150 hover:border-bordeaux has-[a:focus-visible]:anneau-focus motion-reduce:transition-none",
        className,
      )}
    >
      <LogoSociete sigle={societe.sigle} logoPath={societe.logoPath} taille={64} />

      <div className="min-w-0 flex-1">
        {societe.miseEnAvant ? <Badge className="mb-2">Mise en avant</Badge> : null}

        <Titre className="leading-tight">
          <Link
            href={`/societes/${societe.slug}`}
            className="block no-underline after:absolute after:inset-0 hover:underline focus-visible:outline-none"
          >
            <span className="block font-titre text-lg font-medium break-words">
              {societe.sigle}
            </span>
            {societe.nomComplet ? (
              <>
                <span className="sr-only">, </span>
                <span className="mt-1 block font-texte text-base font-normal text-encre">
                  {societe.nomComplet}
                </span>
              </>
            ) : null}
          </Link>
        </Titre>

        <ul className="mt-3 space-y-1 text-base">
          {afficherCategorie ? <li>{categorieOrganisationLabels[societe.categorie]}</li> : null}
          {disciplines.length > 0 ? (
            <li>
              <span className="sr-only">
                {disciplines.length > 1 ? "Disciplines : " : "Discipline : "}
              </span>
              {disciplines.join(" · ")}
            </li>
          ) : null}
          {societe.ville ? (
            <li className="flex items-start gap-2">
              <PictoLieu taille={18} className="mt-0.5 shrink-0 text-bordeaux" />
              <span>
                <span className="sr-only">Ville : </span>
                {societe.ville}
              </span>
            </li>
          ) : null}
          {societe.nombreEvenementsAVenir !== undefined ? (
            <li className="flex items-start gap-2">
              <PictoCalendrier taille={18} className="mt-0.5 shrink-0 text-bordeaux" />
              <span className="tabular-nums">
                {texteEvenements(societe.nombreEvenementsAVenir)}
              </span>
            </li>
          ) : null}
        </ul>
      </div>
    </Carte>
  );
}
