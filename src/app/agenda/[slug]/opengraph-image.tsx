import { ElementApercuEvenement, TAILLE_APERCU, TYPE_CONTENU_APERCU } from "@/lib/og/apercus";
import { apercuEvenement } from "@/lib/og/donnees";
import { repondreApercu } from "@/lib/og/reponse";
import { obtenirEvenementPublie } from "@/lib/requetes/evenements";

// Image d'aperçu de la fiche événement (spécifications 10.5) : celle
// qu'affichent WhatsApp et les réseaux quand on partage `/agenda/{slug}`
// (balises `og:image` ajoutées par Next.js à la page).
//
// Dynamique (`force-dynamic`) : jamais dessinée au build, qui n'a pas de base
// de données (règle de rendu, PROGRESS.md, décision 20) ; la lecture, elle,
// est mise en cache (`obtenirEvenementPublie`). Moteur Node.js : les polices
// sont lues sur le disque (src/lib/og/polices.ts). Slug inconnu ou non
// publié : image générique « Cité Savante » (src/lib/og/reponse.ts).
//
// Texte de remplacement fixe : `generateImageMetadata` permettrait un texte
// propre à chaque événement, mais Next.js lui ajoute un
// `generateStaticParams` appelé au build (chargeur
// `next-metadata-route-loader`), donc une lecture de la base au build.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const alt =
  "Aperçu de l’événement sur Cité Savante : type, titre, dates, lieu et organisateurs";
export const size = TAILLE_APERCU;
export const contentType = TYPE_CONTENU_APERCU;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return repondreApercu(
    () => obtenirEvenementPublie(slug),
    (evenement) => {
      const apercu = apercuEvenement(evenement);
      return apercu ? <ElementApercuEvenement apercu={apercu} /> : null;
    },
  );
}
