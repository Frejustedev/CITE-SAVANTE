"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

import { cheminAnnuaire, normaliserFiltresAnnuaire } from "@/lib/utils/annuaire";
import { cx } from "@/lib/utils/classes";

/** Délai avant l'envoi automatique après un changement de liste déroulante. */
const DELAI_ENVOI_MS = 300;

/** Noms des champs du formulaire, qui sont aussi les paramètres de l'URL. */
const CHAMPS = ["q", "discipline", "ville", "categorie"] as const;
type NomChamp = (typeof CHAMPS)[number];
type Valeurs = Record<NomChamp, string>;

export type FormulaireFiltresAnnuaireProps = {
  /** Valeurs des filtres réellement appliqués par la page ("" = aucun filtre). */
  q: string;
  discipline: string;
  ville: string;
  categorie: string;
  /** Identifiant du titre qui nomme le formulaire (`aria-labelledby`). */
  idTitre: string;
  /** Champs du formulaire (rendus par le serveur, avec leurs valeurs initiales). */
  children: ReactNode;
  /** Boutons et liens placés sous les champs (bouton « Filtrer », lien « Effacer les filtres »). */
  actions: ReactNode;
  className?: string;
};

/** Chemin de l'annuaire pour le contenu actuel du formulaire (page 1, valeurs vides omises). */
function cheminDuFormulaire(formulaire: HTMLFormElement): string {
  const donnees = new FormData(formulaire);
  const lire = (nom: NomChamp) => {
    const valeur = donnees.get(nom);
    return typeof valeur === "string" ? valeur : null;
  };
  return cheminAnnuaire(
    normaliserFiltresAnnuaire({
      q: lire("q"),
      discipline: lire("discipline"),
      ville: lire("ville"),
      categorie: lire("categorie"),
    }),
  );
}

/**
 * Formulaire de filtres de l'annuaire.
 *
 * Socle sans JavaScript : un `<form method="get" action="/societes">` natif.
 * Le bouton « Filtrer » (ou Entrée dans le champ texte) charge
 * `/societes?discipline=…&ville=…&categorie=…&q=…`, que la page lit.
 *
 * Une fois hydraté :
 * - l'envoi passe par une navigation côté client (`router.push`, sans
 *   remonter en haut de page) : la page n'est pas rechargée, le focus reste
 *   sur le champ utilisé et chaque recherche crée une entrée d'historique,
 *   comme l'envoi natif (le bouton Précédent revient aux filtres d'avant) ;
 * - changer une liste déroulante envoie le formulaire, après un court délai
 *   (au clavier, Chrome sous Windows déclenche `change` à chaque flèche) ;
 * - la page n'est pas remontée par Next.js quand seuls les paramètres de
 *   l'URL changent : les champs, non contrôlés, garderaient leurs anciennes
 *   valeurs après « Effacer les filtres » ou le bouton Précédent. Chaque
 *   champ est donc recopié depuis les filtres appliqués quand CEUX-CI
 *   changent (et seulement ce champ-là : un texte en cours de saisie n'est
 *   pas effacé par le changement d'une autre liste) ;
 * - « Mise à jour des résultats… » s'affiche pendant le chargement.
 */
export function FormulaireFiltresAnnuaire({
  q,
  discipline,
  ville,
  categorie,
  idTitre,
  children,
  actions,
  className,
}: FormulaireFiltresAnnuaireProps) {
  const router = useRouter();
  const [enAttente, demarrerTransition] = useTransition();
  const refFormulaire = useRef<HTMLFormElement>(null);
  const refValeursAppliquees = useRef<Valeurs>({ q, discipline, ville, categorie });
  // Envoi différé demandé par une liste déroulante ; un nouvel objet à chaque
  // demande, pour relancer le délai même si le chemin est identique.
  const [envoiDiffere, setEnvoiDiffere] = useState<{ chemin: string } | null>(null);

  useEffect(() => {
    if (!envoiDiffere) return;
    const minuteur = window.setTimeout(() => {
      demarrerTransition(() => router.push(envoiDiffere.chemin, { scroll: false }));
    }, DELAI_ENVOI_MS);
    return () => window.clearTimeout(minuteur);
  }, [envoiDiffere, router]);

  useEffect(() => {
    const formulaire = refFormulaire.current;
    const appliquees: Valeurs = { q, discipline, ville, categorie };
    const precedentes = refValeursAppliquees.current;
    refValeursAppliquees.current = appliquees;
    if (!formulaire) return;
    for (const nom of CHAMPS) {
      if (appliquees[nom] === precedentes[nom]) continue;
      const champ = formulaire.elements.namedItem(nom);
      if (
        (champ instanceof HTMLInputElement || champ instanceof HTMLSelectElement) &&
        champ.value !== appliquees[nom]
      ) {
        champ.value = appliquees[nom];
      }
    }
  }, [q, discipline, ville, categorie]);

  function surChangement(evenement: FormEvent<HTMLFormElement>) {
    if (!(evenement.target instanceof HTMLSelectElement)) return;
    setEnvoiDiffere({ chemin: cheminDuFormulaire(evenement.currentTarget) });
  }

  function surEnvoi(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const chemin = cheminDuFormulaire(evenement.currentTarget);
    setEnvoiDiffere(null);
    demarrerTransition(() => router.push(chemin, { scroll: false }));
  }

  return (
    <form
      ref={refFormulaire}
      method="get"
      action="/societes"
      role="search"
      aria-labelledby={idTitre}
      onChange={surChangement}
      onSubmit={surEnvoi}
      className={cx("grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end", className)}
    >
      {children}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:col-span-2 lg:col-span-4">
        {actions}
        <span className="text-sm text-encre italic">
          {enAttente ? "Mise à jour des résultats…" : null}
        </span>
      </div>
    </form>
  );
}
