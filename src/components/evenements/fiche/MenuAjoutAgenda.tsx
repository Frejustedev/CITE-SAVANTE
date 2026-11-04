import { classesBouton } from "@/components/mise-en-page/Bouton";
import {
  PictoCalendrier,
  PictoFleche,
  PictoLienExterne,
  PictoTelechargement,
} from "@/components/pictos";
import { cx } from "@/lib/utils/classes";
import type { EvenementExportable } from "@/lib/utils/ics";
import { lienGoogleAgenda } from "@/lib/utils/partage";
import { premiereLettreMajuscule } from "@/lib/utils/texte";

import { MENTION_SITE_EXTERNE_NOUVEL_ONGLET } from "./utilitaires";

type MenuAjoutAgendaProps = {
  /** Slug de l'événement : lien `/agenda/{slug}/ics`. */
  slug: string;
  evenement: EvenementExportable;
  /** Adresse ABSOLUE de la fiche (`urlAbsolue("/agenda/{slug}")`), reprise dans la description. */
  urlFiche: string;
  className?: string;
};

const classesChoix =
  "flex min-h-11 items-start gap-3 px-4 py-3 no-underline transition-teintes duration-150 hover:bg-creme hover:underline motion-reduce:transition-none";

/**
 * Menu « Ajouter à mon agenda » de la fiche événement (spécifications 8.4,
 * 10.2 et 10.3), en `<details>` / `<summary>` natifs : il s'ouvre et se
 * ferme sans JavaScript, au clavier (Entrée, Espace) comme à la souris, et
 * son état (replié, déplié) est annoncé par le navigateur. Le panneau se
 * déplie SOUS le bouton, dans le flux de la page : il ne recouvre rien et
 * n'a pas besoin d'être refermé par un script.
 *
 * Deux choix :
 * - « Fichier .ics » : `/agenda/{slug}/ics` (route du site, téléchargement
 *   par `Content-Disposition: attachment`), en `<a>` NATIF — un `next/link`
 *   préchargerait la route à l'affichage ; `rel="nofollow"` : rien à indexer
 *   (la réponse porte aussi `X-Robots-Tag: noindex`). Pas d'attribut
 *   `download` : il ferait enregistrer le fichier sur certains téléphones au
 *   lieu de proposer son ajout à l'agenda ; l'en-tête suffit au
 *   téléchargement sur ordinateur.
 * - « Google Agenda » : lien DIRECT vers calendar.google.com
 *   (`lienGoogleAgenda`, section 10.3), pas par la passerelle `/go` : Google
 *   Agenda est un service qui reçoit l'événement prérempli, pas le site d'une
 *   organisation ou d'un annonceur (section 10.1), et l'adresse est
 *   construite par le site, jamais saisie. Lien externe hors `/go`, donc
 *   `rel="noopener noreferrer nofollow"` (section 6), nouvel onglet annoncé
 *   en toutes lettres.
 */
export function MenuAjoutAgenda({ slug, evenement, urlFiche, className }: MenuAjoutAgendaProps) {
  return (
    <details className={cx("group min-w-0", className)}>
      <summary
        className={classesBouton(
          "secondaire",
          "w-full cursor-pointer list-none select-none sm:w-auto [&::-webkit-details-marker]:hidden",
        )}
      >
        <PictoCalendrier taille={18} className="shrink-0" />
        <span>Ajouter à mon agenda</span>
        <PictoFleche
          direction="bas"
          taille={18}
          className="shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <ul className="mt-2 border-t border-or bg-creme-soutenu sm:w-80">
        <li>
          <a href={`/agenda/${slug}/ics`} rel="nofollow" className={classesChoix}>
            <PictoTelechargement taille={20} className="mt-0.5 shrink-0" />
            <span className="min-w-0">
              <span className="block font-medium">Fichier .ics</span>
              <span className="block text-sm text-encre">
                Pour l’agenda de votre téléphone, Outlook ou Apple Calendrier
              </span>
            </span>
          </a>
        </li>
        <li className="border-t border-or/60">
          <a
            href={lienGoogleAgenda(evenement, urlFiche)}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={classesChoix}
          >
            <PictoLienExterne taille={20} className="mt-0.5 shrink-0" />
            <span className="min-w-0">
              <span className="block font-medium">Google Agenda</span>
              <span className="block text-sm text-encre">
                {premiereLettreMajuscule(MENTION_SITE_EXTERNE_NOUVEL_ONGLET)}
              </span>
            </span>
          </a>
        </li>
      </ul>
    </details>
  );
}
