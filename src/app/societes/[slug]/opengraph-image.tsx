import { ElementApercuSociete, TAILLE_APERCU, TYPE_CONTENU_APERCU } from "@/lib/og/apercus";
import { apercuSociete } from "@/lib/og/donnees";
import { repondreApercu } from "@/lib/og/reponse";
import { obtenirSocietePubliee } from "@/lib/requetes/societes";

// Image d'aperçu de la fiche organisation (spécifications 10.5) : sigle en
// grand, nom complet, disciplines (balises `og:image` ajoutées par Next.js à
// `/societes/{slug}`).
//
// Mêmes règles que l'image de la fiche événement
// (src/app/agenda/[slug]/opengraph-image.tsx) : dynamique, moteur Node.js,
// lecture publique mise en cache (`obtenirSocietePubliee`, slug vérifié
// contre la liste en cache), image générique pour un slug inconnu ou non
// publié, texte de remplacement fixe (pas de `generateImageMetadata`, qui
// lirait la base au build).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const alt = "Aperçu de l’organisation sur Cité Savante : sigle, nom complet et disciplines";
export const size = TAILLE_APERCU;
export const contentType = TYPE_CONTENU_APERCU;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return repondreApercu(
    () => obtenirSocietePubliee(slug),
    (societe) => {
      const apercu = apercuSociete(societe);
      return apercu ? <ElementApercuSociete apercu={apercu} /> : null;
    },
  );
}
