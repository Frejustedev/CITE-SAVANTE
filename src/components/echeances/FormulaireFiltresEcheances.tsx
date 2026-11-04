"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode, SubmitEvent, SyntheticEvent } from "react";
import { useRouter } from "next/navigation";

import { cx } from "@/lib/utils/classes";

/** Délai avant l'envoi automatique après un changement de liste déroulante. */
const DELAI_ENVOI_MS = 300;

/** Noms des champs du formulaire, qui sont aussi les paramètres de l'URL. */
const CHAMPS = ["type", "discipline"] as const;
type NomChamp = (typeof CHAMPS)[number];
type Valeurs = Record<NomChamp, string>;

export type FormulaireFiltresEcheancesProps = {
  /** Valeurs des filtres réellement appliqués par la page ("" = aucun filtre). */
  type: string;
  discipline: string;
  /** Identifiant du titre qui nomme le formulaire (`aria-labelledby`). */
  idTitre: string;
  /** Champs du formulaire (rendus par le serveur, avec leurs valeurs initiales). */
  children: ReactNode;
  /** Boutons et liens placés sous les champs (bouton « Filtrer », lien « Effacer les filtres »). */
  actions: ReactNode;
  className?: string;
};

/**
 * Chemin de la page des échéances pour le contenu actuel du formulaire,
 * valeurs vides omises, paramètres dans l'ordre de `cheminEcheances`
 * (src/lib/utils/agenda.ts, non importé ici pour ne pas charger les
 * utilitaires de dates dans le navigateur). Les valeurs viennent des listes
 * déroulantes ; la page les valide de toute façon (`lireFiltresEcheances`).
 */
function cheminDuFormulaire(formulaire: HTMLFormElement): string {
  const donnees = new FormData(formulaire);
  const parametres = new URLSearchParams();
  for (const nom of CHAMPS) {
    const valeur = donnees.get(nom);
    if (typeof valeur === "string" && valeur.trim() !== "") parametres.set(nom, valeur.trim());
  }
  const requete = parametres.toString();
  return requete ? `/echeances?${requete}` : "/echeances";
}

/**
 * Formulaire de filtres des échéances (même fonctionnement que celui de
 * l'annuaire, `FormulaireFiltresAnnuaire`).
 *
 * Socle sans JavaScript : un `<form method="get" action="/echeances">`
 * natif ; le bouton « Filtrer » charge `/echeances?type=…&discipline=…`,
 * que la page lit.
 *
 * Une fois hydraté :
 * - l'envoi passe par une navigation côté client (`router.push`, sans
 *   remonter en haut de page) : le focus reste sur le champ utilisé et
 *   chaque envoi crée une entrée d'historique, comme l'envoi natif ;
 * - changer une liste déroulante envoie le formulaire après un court délai
 *   (au clavier, Chrome sous Windows déclenche `change` à chaque flèche) ;
 * - les champs, non contrôlés, sont recopiés depuis les filtres appliqués
 *   quand ceux-ci changent (« Effacer les filtres », bouton Précédent) :
 *   Next.js ne remonte pas la page quand seuls les paramètres changent ;
 * - « Mise à jour des résultats… » s'affiche pendant le chargement.
 */
export function FormulaireFiltresEcheances({
  type,
  discipline,
  idTitre,
  children,
  actions,
  className,
}: FormulaireFiltresEcheancesProps) {
  const router = useRouter();
  const [enAttente, demarrerTransition] = useTransition();
  const refFormulaire = useRef<HTMLFormElement>(null);
  const refValeursAppliquees = useRef<Valeurs>({ type, discipline });
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
    const appliquees: Valeurs = { type, discipline };
    const precedentes = refValeursAppliquees.current;
    refValeursAppliquees.current = appliquees;
    if (!formulaire) return;
    for (const nom of CHAMPS) {
      if (appliquees[nom] === precedentes[nom]) continue;
      const champ = formulaire.elements.namedItem(nom);
      if (champ instanceof HTMLSelectElement && champ.value !== appliquees[nom]) {
        champ.value = appliquees[nom];
      }
    }
  }, [type, discipline]);

  function surChangement(evenement: SyntheticEvent<HTMLFormElement>) {
    if (!(evenement.target instanceof HTMLSelectElement)) return;
    setEnvoiDiffere({ chemin: cheminDuFormulaire(evenement.currentTarget) });
  }

  function surEnvoi(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const chemin = cheminDuFormulaire(evenement.currentTarget);
    setEnvoiDiffere(null);
    demarrerTransition(() => router.push(chemin, { scroll: false }));
  }

  return (
    <form
      ref={refFormulaire}
      method="get"
      action="/echeances"
      role="search"
      aria-labelledby={idTitre}
      onChange={surChangement}
      onSubmit={surEnvoi}
      className={cx("grid gap-4 md:grid-cols-2 md:items-end", className)}
    >
      {children}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:col-span-2">
        {actions}
        <span className="text-sm text-encre italic">
          {enAttente ? "Mise à jour des résultats…" : null}
        </span>
      </div>
    </form>
  );
}
