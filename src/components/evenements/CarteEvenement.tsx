import Link from "next/link";

import { BadgeTypeEvenement } from "@/components/evenements/BadgeTypeEvenement";
import { Badge } from "@/components/mise-en-page/Badge";
import { Carte } from "@/components/mise-en-page/Carte";
import { PictoCalendrier, PictoEnLigne, PictoFanion, PictoLieu } from "@/components/pictos";
import { MENTION_MIS_EN_AVANT } from "@/lib/textes";
import { cx } from "@/lib/utils/classes";
import {
  aujourdhuiPortoNovo,
  decrireJoursRestants,
  estUrgente,
  formaterDate,
  formaterPeriode,
  joursRestants,
} from "@/lib/utils/dates";
import {
  libelleEcheance,
  siglesOrganisateurs,
  texteLieu,
  type EvenementResume,
} from "@/lib/utils/evenements";

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

/**
 * Carte d'un événement (agenda, fiche organisation, suggestions, accueil ;
 * section 8.3) : badge de type, mention « Mis en avant » (fanion or et texte
 * bordeaux) si `evenement.miseEnAvant`, titre, période, lieu ou « En ligne »
 * (`texteLieu`), organisateurs (sigles des organisatrices et
 * co-organisatrices), prochaine échéance (libellé, date) avec un badge
 * « Clôture … » or si elle tombe dans 7 jours ou moins. Toute la carte mène
 * à `/agenda/{slug}` par un seul lien (titre étendu à la carte) ; les
 * organisateurs et la mention sont du texte, pour ne pas imbriquer de liens.
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <BadgeTypeEvenement type={evenement.type} />
        {evenement.miseEnAvant ? (
          <span className="petites-capitales inline-flex items-center gap-1 text-base text-bordeaux">
            <PictoFanion taille={18} className="shrink-0 text-or" />
            {MENTION_MIS_EN_AVANT}
          </span>
        ) : null}
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
            {`${libelleEcheance(echeance)} : `}
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
