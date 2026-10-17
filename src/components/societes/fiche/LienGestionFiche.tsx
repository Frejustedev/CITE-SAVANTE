import Link from "next/link";

import { cx } from "@/lib/utils/classes";

type LienGestionFicheProps = {
  slug: string;
  className?: string;
};

/**
 * Lien discret de bas de fiche (spécifications 8.2) : « Vous faites partie
 * du bureau ? Gérer cette fiche », vers `/espace/reclamer/{slug}` (demande
 * de gestion, phase 5). `prefetch={false}` : l'espace gestionnaire exige une
 * session, rien à précharger pour un visiteur.
 */
export function LienGestionFiche({ slug, className }: LienGestionFicheProps) {
  return (
    <p className={cx("border-t border-or pt-5 text-base italic", className)}>
      {/* Espace insécable avant « ? » : jamais de point d'interrogation seul en début de ligne. */}
      Vous faites partie du bureau{"\u00a0"}?{" "}
      <Link href={`/espace/reclamer/${slug}`} prefetch={false}>
        Gérer cette fiche
      </Link>
    </p>
  );
}
