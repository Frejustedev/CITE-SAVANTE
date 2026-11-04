import Image from "next/image";

import { PictoLienExterne } from "@/components/pictos";
import type { BanniereAgenda as DonneesBanniere } from "@/lib/requetes/emplacements";
import { MENTION_PUBLICITE } from "@/lib/textes";
import { cx } from "@/lib/utils/classes";

/**
 * Format recommandé du visuel (`emplacements_pub.image_path`, bucket
 * `publicites`, 1 Mo au plus, section 5.7) : 1200 × 300 px (4:1), soit
 * environ 82 px de haut à 360 px de large. Un visuel d'un autre format garde
 * ses proportions (`h-auto`), plafonné à 300 px de haut (`object-contain`,
 * jamais recadré). À reprendre dans le formulaire du back-office (phase 6).
 */
export const LARGEUR_VISUEL_BANNIERE = 1200;
export const HAUTEUR_VISUEL_BANNIERE = 300;

/** Identifiant de la mention « Publicité », qui nomme la zone. */
const ID_MENTION = "mention-publicite-agenda";

export type BanniereAgendaProps = {
  /** Première bannière `banniere_agenda` active (`lireEmplacementsActifs(...).bannieresAgenda[0]`). */
  banniere: DonneesBanniere;
  className?: string;
};

/**
 * Bannière publicitaire de l'agenda (spécifications 8.3) : zone
 * complémentaire (`<aside>`) nommée par la mention « Publicité », écrite en
 * clair au-dessus du contenu (jamais réservée aux lecteurs d'écran).
 *
 * - Avec un visuel (`urlImage`) : `next/image`, texte alternatif saisi par
 *   l'administrateur, à défaut le titre de l'emplacement ; le lien annonce
 *   « (site externe) » en texte masqué, comme les boutons de la fiche.
 * - Sans visuel (pas de `image_path`, ou chemin refusé par `urlPublicite`) :
 *   bannière typographique sobre aux couleurs de la charte (fond crème
 *   soutenu, filet or, titre en Fraunces, annonceur).
 *
 * Lien : toujours la passerelle `/go/emplacement/{id}?from=/agenda`
 * (`lienPasserelle`, section 10.1, qui vérifie l'emplacement, compte le clic
 * et ajoute les UTM), en `<a>` natif (jamais `next/link` : pas de
 * préchargement d'une route qui enregistre un clic), même onglet comme les
 * boutons de la fiche organisation, `rel="sponsored"` (lien payant). Sans
 * lien `https://` sûr (`lienPasserelle` nul), la bannière n'est pas
 * cliquable.
 */
export function BanniereAgenda({ banniere, className }: BanniereAgendaProps) {
  const lien = banniere.lienPasserelle;
  const alt = banniere.texteAlternatif ?? banniere.titre;

  const contenu = banniere.urlImage ? (
    <Image
      src={banniere.urlImage}
      alt={alt}
      width={LARGEUR_VISUEL_BANNIERE}
      height={HAUTEUR_VISUEL_BANNIERE}
      sizes="(min-width: 1264px) 1200px, 100vw"
      className="block h-auto max-h-[300px] w-full border border-or bg-creme object-contain"
    />
  ) : (
    <span className="flex flex-col gap-1 border-t border-or bg-creme-soutenu px-5 py-4 md:flex-row md:items-baseline md:justify-between md:gap-6 md:px-6">
      <span className="min-w-0">
        <span
          className={cx(
            "block font-titre text-lg leading-tight font-medium text-bordeaux-profond",
            lien && "group-hover:underline",
          )}
        >
          {banniere.titre}
        </span>
        <span className="mt-1 block text-sm text-encre">{banniere.annonceur}</span>
      </span>
      {lien ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-base text-bordeaux underline">
          Consulter le site de l’annonceur
          <PictoLienExterne taille={16} className="shrink-0" />
        </span>
      ) : null}
    </span>
  );

  return (
    <aside aria-labelledby={ID_MENTION} className={className}>
      <p id={ID_MENTION} className="petites-capitales text-sm leading-tight text-bordeaux-profond">
        {MENTION_PUBLICITE}
      </p>
      {lien ? (
        <a
          href={lien}
          rel="sponsored noopener noreferrer"
          className="group mt-1.5 block text-encre no-underline"
        >
          {contenu}
          {banniere.urlImage ? <span className="sr-only"> (site externe)</span> : null}
        </a>
      ) : (
        <div className="mt-1.5">{contenu}</div>
      )}
    </aside>
  );
}
