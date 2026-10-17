import Image from "next/image";

import { Monogramme } from "@/components/societes/Monogramme";
import { urlLogo } from "@/lib/stockage";
import { cx } from "@/lib/utils/classes";

export type LogoSocieteProps = {
  sigle: string;
  /** `societes.logo_path` (chemin relatif au bucket `logos`) ou `null`. */
  logoPath: string | null;
  /** Côté du carré, en pixels (64 par défaut). */
  taille?: number;
  /**
   * Texte alternatif. Vide par défaut : l'image est décorative, car le sigle
   * est écrit juste à côté (cartes, en-tête de fiche). À renseigner
   * (« Logo de la SOBEPED ») si le logo est seul.
   */
  alt?: string;
  /** Précharger l'image (en-tête de la fiche, au-dessus de la ligne de flottaison). */
  preload?: boolean;
  className?: string;
};

/**
 * Logo d'une organisation (`next/image`, depuis le bucket public `logos`),
 * dans un carré crème bordé d'un filet or, image entière (`object-contain`).
 * Sans logo, ou si son chemin n'est pas sûr (`urlLogo` renvoie `null`) : le
 * monogramme du sigle, à la même taille.
 */
export function LogoSociete({
  sigle,
  logoPath,
  taille = 64,
  alt = "",
  preload = false,
  className,
}: LogoSocieteProps) {
  const url = urlLogo(logoPath);

  if (!url) {
    return (
      <Monogramme sigle={sigle} taille={taille} titre={alt || undefined} className={className} />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      width={taille}
      height={taille}
      preload={preload}
      className={cx("shrink-0 border border-or bg-creme object-contain p-1", className)}
    />
  );
}
