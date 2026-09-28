import Link from "next/link";
import { site } from "@/config/site";
import { Conteneur } from "./Conteneur";
import { FormulaireRecherche } from "./FormulaireRecherche";
import { MenuMobile } from "./MenuMobile";
import { NavigationPrincipale } from "./NavigationPrincipale";
import { Graduation } from "./Graduation";

/**
 * En-tête du site (charte, section 4.4).
 *
 * Moins de 768 px : logotype et bouton « Menu » sur la première ligne, champ
 * de recherche toujours visible sur la seconde ; la navigation s'ouvre sous
 * l'en-tête (`MenuMobile`).
 * À partir de 768 px : logotype et slogan à gauche, recherche à droite,
 * navigation complète sur un second registre.
 *
 * Un seul formulaire de recherche, placé par la grille selon la largeur.
 * Deux navigations (bandeau et menu mobile) mais une seule est affichée à
 * chaque largeur : l'autre est en `display: none`, donc absente de l'arbre
 * d'accessibilité.
 */
export function EnTete() {
  return (
    <header className="relative bg-creme">
      <Conteneur>
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 pt-4 pb-4 md:grid-cols-[auto_1fr] md:gap-x-10 md:pt-7 md:pb-5">
          <div className="col-start-1 row-start-1 min-w-0">
            <Link
              href="/"
              className="font-titre text-lg leading-none font-bold tracking-[-0.01em] text-bordeaux-profond no-underline hover:text-bordeaux md:text-xl"
            >
              {site.nom}
            </Link>
            <p className="mt-1.5 hidden text-sm leading-snug text-encre italic sm:block">
              {site.slogan}
            </p>
          </div>

          <MenuMobile className="col-start-2 row-start-1 md:hidden">
            <Conteneur className="pt-1 pb-4">
              <NavigationPrincipale disposition="verticale" />
            </Conteneur>
          </MenuMobile>

          <FormulaireRecherche className="col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1 md:w-full md:max-w-[340px] md:justify-self-end" />
        </div>

        <div className="hidden border-t border-or md:block">
          <NavigationPrincipale disposition="horizontale" />
        </div>
      </Conteneur>
      <Graduation />
    </header>
  );
}
