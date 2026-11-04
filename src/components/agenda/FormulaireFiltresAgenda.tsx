"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode, SubmitEvent, SyntheticEvent } from "react";
import { useRouter } from "next/navigation";

import { cx } from "@/lib/utils/classes";

/** Délai avant l'envoi automatique après un changement de liste déroulante ou de case. */
const DELAI_ENVOI_MS = 300;

/**
 * Paramètres de l'URL, dans l'ordre de `cheminAgenda` (src/lib/utils/agenda.ts),
 * pour que l'adresse produite ici ait la même forme que les liens de la page.
 * Ce composant n'importe pas `agenda.ts` : ce module tire `calendrier.ts`,
 * donc `date-fns` et sa locale française, dans le code envoyé au navigateur,
 * pour une normalisation que le serveur refait de toute façon
 * (`lireFiltresAgenda`).
 */
const ORDRE_PARAMETRES = [
  "vue",
  "periode",
  "mois",
  "type",
  "discipline",
  "ville",
  "modalite",
  "gratuit",
  "du",
  "au",
  "q",
] as const;

/** Champs visibles dont la valeur est recopiée depuis les filtres appliqués. */
const CHAMPS_VALEUR = ["q", "type", "discipline", "ville", "modalite", "du", "au"] as const;
type NomChampValeur = (typeof CHAMPS_VALEUR)[number];

/** Filtres appliqués par la page ("" = aucun filtre ; `gratuit` : case cochée). */
export type ValeursFiltresAgenda = Record<NomChampValeur, string> & { gratuit: boolean };

export type FormulaireFiltresAgendaProps = {
  /** Valeurs des filtres réellement appliqués par la page. */
  valeurs: ValeursFiltresAgenda;
  /** Identifiant du titre qui nomme le formulaire (`aria-labelledby`). */
  idTitre: string;
  /** Champs du formulaire, champs cachés compris (rendus par le serveur). */
  children: ReactNode;
  /** Boutons et liens placés sous les champs (« Filtrer », « Effacer les filtres »). */
  actions: ReactNode;
  className?: string;
};

/**
 * Chemin de l'agenda pour le contenu actuel du formulaire : valeurs vides
 * omises, espaces de début et de fin retirées, ordre de `ORDRE_PARAMETRES`.
 * Le serveur valide et normalise ensuite chaque valeur.
 */
function cheminDuFormulaire(formulaire: HTMLFormElement): string {
  const donnees = new FormData(formulaire);
  const parametres = new URLSearchParams();
  for (const nom of ORDRE_PARAMETRES) {
    const valeur = donnees.get(nom);
    if (typeof valeur !== "string") continue;
    const propre = valeur.trim();
    if (propre) parametres.set(nom, propre);
  }
  const requete = parametres.toString();
  return requete ? `/agenda?${requete}` : "/agenda";
}

/** Vrai pour un champ dont le changement envoie le formulaire : liste déroulante ou case à cocher. */
function declencheEnvoi(cible: EventTarget): boolean {
  return (
    cible instanceof HTMLSelectElement ||
    (cible instanceof HTMLInputElement && cible.type === "checkbox")
  );
}

/**
 * Formulaire de filtres de l'agenda (même principe que
 * `FormulaireFiltresAnnuaire`, src/components/societes/annuaire/).
 *
 * Socle sans JavaScript : un `<form method="get" action="/agenda">` natif.
 * Le bouton « Filtrer » (ou Entrée dans un champ) charge
 * `/agenda?type=…&discipline=…&…`, que la page lit ; les champs cachés
 * (`vue`, `mois`, `periode`) gardent la vue, le mois et la période en cours.
 *
 * Une fois hydraté :
 * - l'envoi passe par une navigation côté client (`router.push`, sans
 *   défilement) : la page n'est pas rechargée, le focus reste sur le champ
 *   utilisé et chaque envoi crée une entrée d'historique ;
 * - changer une liste déroulante ou la case « gratuits » envoie le
 *   formulaire, après un court délai. Les champs de date, non : le
 *   navigateur émet `change` pendant la saisie au clavier (année « 0002 »,
 *   puis « 0020 »…), et l'échange de `du` et `au` par le serveur
 *   réécrirait un champ en cours de saisie. Ils partent avec « Filtrer » ;
 * - Next.js ne remonte pas la page quand seuls les paramètres de l'URL
 *   changent : chaque champ est recopié depuis les filtres appliqués quand
 *   CEUX-CI changent (et seulement ce champ-là), y compris l'état coché de
 *   « gratuits » ;
 * - « Mise à jour des résultats… » s'affiche pendant le chargement.
 */
export function FormulaireFiltresAgenda({
  valeurs,
  idTitre,
  children,
  actions,
  className,
}: FormulaireFiltresAgendaProps) {
  const router = useRouter();
  const [enAttente, demarrerTransition] = useTransition();
  const refFormulaire = useRef<HTMLFormElement>(null);
  const refValeursAppliquees = useRef<ValeursFiltresAgenda>(valeurs);
  // Envoi différé demandé par une liste ou la case ; un nouvel objet à chaque
  // demande, pour relancer le délai même si le chemin est identique.
  const [envoiDiffere, setEnvoiDiffere] = useState<{ chemin: string } | null>(null);

  const { q, type, discipline, ville, modalite, du, au, gratuit } = valeurs;

  useEffect(() => {
    if (!envoiDiffere) return;
    const minuteur = window.setTimeout(() => {
      demarrerTransition(() => router.push(envoiDiffere.chemin, { scroll: false }));
    }, DELAI_ENVOI_MS);
    return () => window.clearTimeout(minuteur);
  }, [envoiDiffere, router]);

  useEffect(() => {
    const formulaire = refFormulaire.current;
    const appliquees: ValeursFiltresAgenda = {
      q,
      type,
      discipline,
      ville,
      modalite,
      du,
      au,
      gratuit,
    };
    const precedentes = refValeursAppliquees.current;
    refValeursAppliquees.current = appliquees;
    if (!formulaire) return;

    for (const nom of CHAMPS_VALEUR) {
      if (appliquees[nom] === precedentes[nom]) continue;
      const champ = formulaire.elements.namedItem(nom);
      if (
        (champ instanceof HTMLInputElement || champ instanceof HTMLSelectElement) &&
        champ.value !== appliquees[nom]
      ) {
        champ.value = appliquees[nom];
      }
    }
    if (appliquees.gratuit !== precedentes.gratuit) {
      const caseGratuit = formulaire.elements.namedItem("gratuit");
      if (caseGratuit instanceof HTMLInputElement) caseGratuit.checked = appliquees.gratuit;
    }
  }, [q, type, discipline, ville, modalite, du, au, gratuit]);

  function surChangement(evenement: SyntheticEvent<HTMLFormElement>) {
    if (!declencheEnvoi(evenement.target)) return;
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
      action="/agenda"
      role="search"
      aria-labelledby={idTitre}
      onChange={surChangement}
      onSubmit={surEnvoi}
      className={cx("grid grid-cols-2 gap-4 lg:grid-cols-4 lg:items-end", className)}
    >
      {children}
      <div className="col-span-2 flex flex-wrap items-center gap-x-6 gap-y-3 lg:col-span-4">
        {actions}
        <span className="text-sm text-encre italic">
          {enAttente ? "Mise à jour des résultats…" : null}
        </span>
      </div>
    </form>
  );
}
