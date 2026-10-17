"use client";

import { useEffect, useRef } from "react";

import { ANCRE_RESULTATS } from "@/components/societes/annuaire/pagination";

export type FocusResultatsProps = {
  /** Page affichée (`resultat.page`). */
  page: number;
  /**
   * Filtres appliqués, page exclue (`cheminAnnuaire({ ...filtres, page: 1 })`) :
   * distingue un changement de page d'un changement de filtre.
   */
  cheminFiltres: string;
};

/**
 * Focus après un changement de page de l'annuaire (navigation côté client).
 *
 * Next.js 16 fait défiler jusqu'au titre de la liste (`#resultats`) mais
 * laisse le focus sur le lien de pagination, en bas de page, voire sur
 * `<body>` si ce lien a disparu (« Page suivante » sur la dernière page). Ce
 * composant place le focus sur le titre de la liste : la touche Tab reprend
 * alors à la première carte, et le lecteur d'écran lit le titre.
 *
 * Seulement quand la PAGE change à filtres identiques : après le
 * changement d'un filtre, le focus reste sur le champ utilisé. Rien au
 * premier affichage. Sans JavaScript, le navigateur fait de même de lui-même
 * avec l'ancre. Ne rend rien.
 */
export function FocusResultats({ page, cheminFiltres }: FocusResultatsProps) {
  const precedent = useRef({ page, cheminFiltres });

  useEffect(() => {
    const avant = precedent.current;
    precedent.current = { page, cheminFiltres };
    if (avant.page === page || avant.cheminFiltres !== cheminFiltres) return;

    const titre = document.getElementById(ANCRE_RESULTATS);
    if (!titre) return;
    // Un titre ne reçoit le focus que par programme : `tabindex="-1"` (hors
    // de l'ordre de tabulation), posé ici plutôt que dans le rendu serveur
    // (`TitreSection` ne transmet pas cet attribut).
    if (!titre.hasAttribute("tabindex")) titre.setAttribute("tabindex", "-1");
    titre.focus();
  }, [page, cheminFiltres]);

  return null;
}
