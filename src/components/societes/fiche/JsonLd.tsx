import { serialiserJsonLd, type DonneesJsonLd } from "./donneesStructurees";

/**
 * Balise `<script type="application/ld+json">` (données structurées pour les
 * moteurs de recherche ; documentation Next.js « JSON-LD » : balise native,
 * pas `next/script`). Le contenu est sérialisé par `serialiserJsonLd`, qui
 * échappe `<`, `>` et `&` : une valeur saisie ne peut pas fermer la balise.
 */
export function JsonLd({ donnees }: { donnees: DonneesJsonLd }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialiserJsonLd(donnees) }}
    />
  );
}
