import type { Metadata } from "next";

import { Bouton } from "@/components/mise-en-page/Bouton";
import { Conteneur } from "@/components/mise-en-page/Conteneur";
import { CHEMIN_ANNONCER_EVENEMENT } from "@/config/site";

// Next.js ajoute lui-même `<meta name="robots" content="noindex">` aux réponses 404.
export const metadata: Metadata = {
  title: "Événement introuvable",
};

/**
 * Page 404 d'une fiche événement (`notFound()` de `./page.tsx`) : adresse
 * inconnue, mal écrite, ou événement non publié (en attente, retiré). Le
 * texte ne distingue pas ces cas, pour ne rien révéler d'un événement non
 * publié. Propose l'agenda et l'annonce d'un événement.
 */
export default function EvenementIntrouvable() {
  return (
    <Conteneur className="py-16 md:py-28">
      <h1 className="max-w-[22ch] font-titre text-2xl leading-[1.15] font-medium text-bordeaux-profond md:text-3xl">
        Événement introuvable
      </h1>
      <p className="mt-6 max-w-[60ch]">
        Aucun événement publié sur Cité Savante ne correspond à cette adresse. Vérifiez l’adresse,
        ou cherchez l’événement dans l’agenda.
      </p>
      <ul className="mt-8 flex flex-col gap-3 sm:flex-row">
        <li>
          <Bouton href="/agenda">Consulter l’agenda</Bouton>
        </li>
        <li>
          <Bouton href={CHEMIN_ANNONCER_EVENEMENT} variante="secondaire">
            Annoncer un événement
          </Bouton>
        </li>
      </ul>
    </Conteneur>
  );
}
