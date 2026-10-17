import type { Metadata } from "next";

import { Bouton } from "@/components/mise-en-page/Bouton";
import { Conteneur } from "@/components/mise-en-page/Conteneur";

// Next.js ajoute lui-même `<meta name="robots" content="noindex">` aux réponses 404.
export const metadata: Metadata = {
  title: "Organisation introuvable",
};

/**
 * Page 404 d'une fiche organisation (`notFound()` de `./page.tsx`) :
 * adresse inconnue, mal écrite, ou fiche non publiée (en attente, retirée).
 * Le texte ne distingue pas ces cas, pour ne rien révéler d'une fiche non
 * publiée. Propose l'annuaire et le référencement.
 */
export default function OrganisationIntrouvable() {
  return (
    <Conteneur className="py-16 md:py-28">
      <h1 className="max-w-[22ch] font-titre text-2xl leading-[1.15] font-medium text-bordeaux-profond md:text-3xl">
        Organisation introuvable
      </h1>
      <p className="mt-6 max-w-[60ch]">
        Aucune organisation publiée sur Cité Savante ne correspond à cette adresse. Vérifiez
        l’adresse, ou cherchez l’organisation dans l’annuaire.
      </p>
      <ul className="mt-8 flex flex-col gap-3 sm:flex-row">
        <li>
          <Bouton href="/societes">Consulter l’annuaire</Bouton>
        </li>
        <li>
          <Bouton href="/referencer" variante="secondaire">
            Référencer une organisation
          </Bouton>
        </li>
      </ul>
    </Conteneur>
  );
}
