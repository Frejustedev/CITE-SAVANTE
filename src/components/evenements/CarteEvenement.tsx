import Link from "next/link";

import { Badge } from "@/components/mise-en-page/Badge";
import { Carte } from "@/components/mise-en-page/Carte";
import { PictoCalendrier, PictoEnLigne, PictoLieu } from "@/components/pictos";
import { modaliteEvenementLabels, typeEcheanceLabels, typeEvenementLabels } from "@/lib/textes";
import { cx } from "@/lib/utils/classes";
import {
  aujourdhuiPortoNovo,
  decrireJoursRestants,
  estUrgente,
  formaterDate,
  formaterPeriode,
  joursRestants,
} from "@/lib/utils/dates";
import { siglesOrganisateurs, type EvenementResume } from "@/lib/utils/evenements";

export type CarteEvenementProps = {
  evenement: EvenementResume;
  /**
   * Date du jour à Porto-Novo (« AAAA-MM-JJ »), pour signaler une échéance
   * urgente. Par défaut `aujourdhuiPortoNovo()` ; la passer pour qu'une page
   * utilise la même date que ses requêtes.
   */
  aujourdhui?: string;
  /** Niveau du titre de la carte (`h3` par défaut, sous un `h2` de section). */
  niveauTitre?: "h2" | "h3" | "h4";
  /** Élément rendu : `li` dans une liste (`<ul>`), `article` sinon. */
  as?: "article" | "li" | "div";
  className?: string;
};

const listeFrancaise = new Intl.ListFormat("fr", { style: "long", type: "conjunction" });

/** Lieu affiché : « En ligne », « Lieu, Ville », « Ville et en ligne »… */
function texteLieu(evenement: EvenementResume): string {
  const lieu = [evenement.lieuNom, evenement.ville]
    .map((partie) => partie?.trim())
    .filter(Boolean)
    .join(", ");
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
 * Carte d'un événement (version minimale de la phase 2, enrichie en phase 3) :
 * type, titre, période, lieu ou « En ligne », organisateurs (sigles des
 * organisatrices et co-organisatrices), prochaine échéance avec un badge si
 * elle tombe dans 7 jours ou moins. Toute la carte mène à `/agenda/{slug}`
 * par un seul lien (titre étendu à la carte) ; les organisateurs sont du
 * texte, pour ne pas imbriquer de liens.
 */
export function CarteEvenement({
  evenement,
  aujourdhui = aujourdhuiPortoNovo(),
  niveauTitre = "h3",
  as = "article",
  className,
}: CarteEvenementProps) {
  const Titre = niveauTitre;
  const sigles = siglesOrganisateurs(evenement);
  const echeance = evenement.prochaineEcheance;
  const urgente = echeance ? estUrgente(echeance.dateLimite, aujourdhui) : false;
  const enLigne = evenement.modalite === "en_ligne";

  return (
    <Carte
      as={as}
      className={cx(
        "relative flex flex-col transition-teintes duration-150 hover:border-bordeaux has-[a:focus-visible]:anneau-focus motion-reduce:transition-none",
        className,
      )}
    >
      <div>
        <Badge>{typeEvenementLabels[evenement.type]}</Badge>
      </div>

      <Titre className="mt-3 font-titre text-lg leading-tight font-medium">
        <Link
          href={`/agenda/${evenement.slug}`}
          className="no-underline after:absolute after:inset-0 hover:underline focus-visible:outline-none"
        >
          {evenement.titre}
        </Link>
      </Titre>

      <ul className="mt-3 space-y-1 text-base">
        <li className="flex items-start gap-2">
          <PictoCalendrier taille={18} className="mt-0.5 shrink-0 text-bordeaux" />
          <span className="tabular-nums">
            <span className="sr-only">
              {evenement.dateDebut === evenement.dateFin ? "Date : " : "Dates : "}
            </span>
            {formaterPeriode(evenement.dateDebut, evenement.dateFin)}
          </span>
        </li>
        <li className="flex items-start gap-2">
          {enLigne ? (
            <PictoEnLigne taille={18} className="mt-0.5 shrink-0 text-bordeaux" />
          ) : (
            <PictoLieu taille={18} className="mt-0.5 shrink-0 text-bordeaux" />
          )}
          <span>
            <span className="sr-only">Lieu : </span>
            {texteLieu(evenement)}
          </span>
        </li>
        {sigles.length > 0 ? <li>Organisé par {listeFrancaise.format(sigles)}</li> : null}
      </ul>

      {echeance ? (
        <p className="mt-4 border-t border-or pt-3 text-base">
          <span className="petites-capitales block text-bordeaux">Prochaine échéance</span>
          <span className="tabular-nums">
            {/* Espace insécable avant « : », comme partout sur le site. */}
            {`${echeance.libelle ?? typeEcheanceLabels[echeance.type]} : `}
            {formaterDate(echeance.dateLimite)}
          </span>
          {urgente ? (
            <span className="mt-2 block">
              <Badge variante="urgent">
                Clôture {decrireJoursRestants(joursRestants(echeance.dateLimite, aujourdhui))}
              </Badge>
            </span>
          ) : null}
        </p>
      ) : null}
    </Carte>
  );
}
