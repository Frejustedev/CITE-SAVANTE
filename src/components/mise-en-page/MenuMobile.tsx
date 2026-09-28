"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MouseEvent, ReactNode } from "react";
import { PictoFermer, PictoMenu } from "@/components/pictos";
import { cx } from "@/lib/utils/classes";

const ID_PANNEAU = "menu-mobile";

// Abonnement vide : sert uniquement à savoir si l'on est hydraté côté client.
const sAbonner = () => () => {};

type MenuMobileProps = {
  className?: string;
  children: ReactNode;
};

/**
 * Menu repliable des écrans de moins de 768 px.
 *
 * Socle sans JavaScript : un `<details>`/`<summary>` natif, qui s'ouvre et se
 * ferme au clic, au clavier (Entrée, Espace) et expose son état aux lecteurs
 * d'écran sans aucun script.
 *
 * Amélioration une fois hydraté :
 * - `aria-expanded` sur le bouton (jamais rendu côté serveur : sans script il
 *   resterait figé à « false » alors que le navigateur ouvre le menu) ;
 * - fermeture par Échap (le focus revient sur le bouton), par un clic en
 *   dehors du menu et au choix d'un lien (la navigation côté client ne
 *   recharge pas la page, le menu resterait sinon ouvert).
 *
 * `<details>` non contrôlé : l'état React ne fait que refléter le DOM
 * (événement `toggle`), et la fermeture passe par `details.open = false`.
 */
export function MenuMobile({ className, children }: MenuMobileProps) {
  const refDetails = useRef<HTMLDetailsElement>(null);
  const refBouton = useRef<HTMLElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const hydrate = useSyncExternalStore(
    sAbonner,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!ouvert) return;

    function fermer(rendreLeFocus: boolean) {
      if (refDetails.current) refDetails.current.open = false;
      if (rendreLeFocus) refBouton.current?.focus();
    }

    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") fermer(true);
    }

    function surPointeur(evenement: PointerEvent) {
      const cible = evenement.target;
      if (cible instanceof Node && !refDetails.current?.contains(cible)) fermer(false);
    }

    document.addEventListener("keydown", surTouche);
    document.addEventListener("pointerdown", surPointeur);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.removeEventListener("pointerdown", surPointeur);
    };
  }, [ouvert]);

  function surClicPanneau(evenement: MouseEvent<HTMLDivElement>) {
    const cible = evenement.target;
    if (cible instanceof Element && cible.closest("a") && refDetails.current) {
      refDetails.current.open = false;
    }
  }

  return (
    <details
      ref={refDetails}
      onToggle={(evenement) => setOuvert(evenement.currentTarget.open)}
      className={cx("group", className)}
    >
      <summary
        ref={refBouton}
        aria-controls={ID_PANNEAU}
        aria-expanded={hydrate ? ouvert : undefined}
        className="petites-capitales inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[6px] border border-bordeaux px-3 text-base font-medium text-bordeaux select-none hover:bg-creme-soutenu group-open:bg-creme-soutenu [&::-webkit-details-marker]:hidden"
      >
        <PictoMenu className="group-open:hidden" />
        <PictoFermer className="hidden group-open:block" />
        <span>Menu</span>
      </summary>
      <div
        id={ID_PANNEAU}
        onClick={surClicPanneau}
        className="absolute inset-x-0 top-full z-30 border-b border-or bg-creme"
      >
        {children}
      </div>
    </details>
  );
}
