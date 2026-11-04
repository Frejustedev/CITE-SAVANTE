import Image from "next/image";

import { cx } from "@/lib/utils/classes";

/** Dimensions de réservation de l'affiche : format A4 portrait (1 : √2), le plus courant. */
export const LARGEUR_AFFICHE = 800;
export const HAUTEUR_AFFICHE = 1131;

type AfficheEvenementProps = {
  /** Adresse publique de l'affiche (`urlAffiche(affichePath)`), ou `null` : rien n'est affiché. */
  url: string | null;
  /** Titre de l'événement, repris dans le texte alternatif. */
  titre: string;
  className?: string;
};

/**
 * Affiche d'un événement (spécifications 8.4), par `next/image` (formats
 * AVIF et WebP, `next.config.ts`). L'adresse est calculée par la page
 * (`urlAffiche`, src/lib/stockage.ts) : sans affiche, ou avec un chemin
 * suspect, elle vaut `null` et le bloc n'est pas rendu.
 *
 * Dimensions explicites (CLAUDE.md, section 6) : 800 × 1131 réservent la
 * place d'une affiche A4 portrait avant le chargement ; la largeur suit la
 * colonne (`w-full`) et la hauteur s'ajuste ensuite au vrai rapport de
 * l'image (`h-auto`), quel que soit son format. Largeur limitée à 28 rem
 * (une affiche pleine largeur sur tablette serait démesurée) ; `sizes`
 * correspond à la colonne latérale de 22 rem au-delà de 1024 px, à 28 rem
 * au-delà de 448 px, à la pleine largeur en deçà. Chargement différé (par
 * défaut) : l'affiche n'est pas en tête de page sur mobile.
 */
export function AfficheEvenement({ url, titre, className }: AfficheEvenementProps) {
  if (!url) return null;
  return (
    <figure className={cx("w-full max-w-md min-w-0", className)}>
      <Image
        src={url}
        alt={`Affiche de l’événement « ${titre} »`}
        width={LARGEUR_AFFICHE}
        height={HAUTEUR_AFFICHE}
        sizes="(min-width: 1024px) 22rem, (min-width: 448px) 28rem, 100vw"
        className="h-auto w-full border border-or bg-creme-soutenu"
      />
    </figure>
  );
}
