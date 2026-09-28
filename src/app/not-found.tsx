import type { Metadata } from "next";
import { Bouton } from "@/components/mise-en-page/Bouton";
import { Conteneur } from "@/components/mise-en-page/Conteneur";

// Next.js ajoute lui-même `<meta name="robots" content="noindex">` aux réponses 404.
export const metadata: Metadata = {
  title: "Page introuvable",
};

/**
 * Page 404 du site, en français et aux couleurs de la charte. Elle remplace
 * la page par défaut de Next.js (texte en anglais, thème sombre selon le
 * système), qu'on atteindrait sinon depuis chaque lien de navigation tant
 * que les rubriques ne sont pas construites.
 */
export default function PageIntrouvable() {
  return (
    <Conteneur className="py-16 md:py-28">
      <h1 className="max-w-[22ch] font-titre text-2xl leading-[1.15] font-medium text-bordeaux-profond md:text-3xl">
        Page introuvable
      </h1>
      <p className="mt-6 max-w-[60ch]">
        L’adresse demandée ne correspond à aucune page de Cité Savante. Elle a pu être déplacée, ou
        la rubrique n’est pas encore en ligne.
      </p>
      <p className="mt-8">
        <Bouton href="/">Revenir à l’accueil</Bouton>
      </p>
    </Conteneur>
  );
}
