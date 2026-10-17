"use client";

import { Bouton } from "@/components/mise-en-page/Bouton";
import { Conteneur } from "@/components/mise-en-page/Conteneur";

type ErreurAnnuaireProps = {
  error: Error & { digest?: string };
  /** Relance la lecture des données et le rendu de la page (Next.js 16). */
  retry: () => void;
};

/**
 * Erreur pendant le chargement de l'annuaire ou d'une fiche : ce fichier,
 * placé dans `app/societes/`, couvre `/societes` ET `/societes/[slug]` (sauf
 * si la fiche définit son propre `error.tsx`). Cas typique : la base de
 * données ne répond pas. Un message en français remplace la page d'erreur
 * anglaise de Next.js, avec un bouton pour réessayer et un lien vers
 * l'accueil. La page remplacée portait le `h1` : ce composant en rend un.
 * La référence (`digest`) permet de retrouver l'erreur dans les journaux du
 * serveur ; le message d'origine n'est jamais affiché (Next.js le masque en
 * production).
 */
export default function ErreurAnnuaire({ error, retry }: ErreurAnnuaireProps) {
  return (
    <Conteneur className="py-16 md:py-28">
      <h1 className="max-w-[22ch] font-titre text-2xl leading-[1.15] font-medium text-bordeaux-profond md:text-3xl">
        Chargement impossible
      </h1>
      <p className="mt-6 max-w-[60ch]">
        Les informations demandées n’ont pas pu être chargées. Le service est peut-être
        momentanément indisponible : réessayez dans quelques instants.
      </p>
      {error.digest ? (
        <p className="mt-3 text-sm italic">
          Référence de l’erreur : <span className="not-italic">{error.digest}</span>
        </p>
      ) : null}
      <p className="mt-8 flex flex-wrap gap-3">
        <Bouton onClick={() => retry()}>Réessayer</Bouton>
        <Bouton href="/" variante="secondaire">
          Revenir à l’accueil
        </Bouton>
      </p>
    </Conteneur>
  );
}
