import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ActionsEvenement } from "@/components/evenements/fiche/ActionsEvenement";
import { AfficheEvenement } from "@/components/evenements/fiche/AfficheEvenement";
import { BandeauEvenementPasse } from "@/components/evenements/fiche/BandeauEvenementPasse";
import { DatesCles } from "@/components/evenements/fiche/DatesCles";
import { jsonLdEvenement } from "@/components/evenements/fiche/donneesStructurees";
import { EnTeteEvenement } from "@/components/evenements/fiche/EnTeteEvenement";
import { InformationsEvenement } from "@/components/evenements/fiche/InformationsEvenement";
import { Participation } from "@/components/evenements/fiche/Participation";
import {
  ANCRE_SUGGESTIONS,
  SuggestionsEvenement,
  texteLienSuggestions,
} from "@/components/evenements/fiche/SuggestionsEvenement";
import { descriptionEvenement } from "@/components/evenements/fiche/utilitaires";
import { Conteneur } from "@/components/mise-en-page/Conteneur";
import { Graduation } from "@/components/mise-en-page/Graduation";
import { jsonLdFilAriane } from "@/components/societes/fiche/donneesStructurees";
import { FilAriane, type ElementFilAriane } from "@/components/societes/fiche/FilAriane";
import { JsonLd } from "@/components/societes/fiche/JsonLd";
import { PresentationFiche } from "@/components/societes/fiche/PresentationFiche";
import { site } from "@/config/site";
import { listerSuggestions, obtenirEvenementPublie } from "@/lib/requetes/evenements";
import { urlAffiche } from "@/lib/stockage";
import { aujourdhuiPortoNovo } from "@/lib/utils/dates";
import { estAVenir } from "@/lib/utils/evenements";
import { urlAbsolue } from "@/lib/utils/urls";

// Fiche d'un événement publié (spécifications 8.4).
//
// Règle de rendu (PROGRESS.md, décision 20) : la page n'est jamais rendue au
// build (pas de base à ce moment-là) ; seules les lectures, dans
// `src/lib/requetes/`, sont mises en cache et partagées entre visiteurs. Le
// slug vient de l'URL : `obtenirEvenementPublie` le cherche d'abord dans la
// liste en cache des slugs publiés, donc un slug inventé ne crée aucune
// entrée de cache.
//
// 404 (même patron que la fiche organisation, src/app/societes/[slug]/
// page.tsx) : un événement absent, non publié ou demandé avec un slug
// inexact donne `notFound()`, levé par la PAGE seulement, AVANT tout envoi du
// corps ; `generateMetadata` renvoie les métadonnées de la page introuvable
// (titre, `noindex`) sans lever. Ne pas ajouter de `loading.tsx` dans ce
// segment ni de `<Suspense>` au-dessus de la page : la réponse partirait en
// 200. Page rendue : `./not-found.tsx`.
//
// LIMITE CONNUE (Next.js 16.3.6, décision de la phase 2, correction prévue en
// phase 5 dans `proxy.ts`) : la réponse 404 a le bon statut, le bon titre et
// `noindex`, mais son corps HTML est vide sans JavaScript ; « Événement
// introuvable » n'apparaît qu'avec JavaScript.
//
// Une seule date du jour (`aujourdhuiPortoNovo()`) pour toute la page :
// passé ou à venir, suggestions, état des échéances, cartes.
//
// Image d'aperçu (Open Graph) : `opengraph-image.tsx` de ce segment
// (section 10.5), ajoutée automatiquement par Next.js aux métadonnées
// ci-dessous (les métadonnées par fichier priment sur `generateMetadata`).
export const dynamic = "force-dynamic";

type ProprietesPage = {
  params: Promise<{ slug: string }>;
};

/**
 * Lecture de la fiche, mémorisée le temps d'une requête (`cache` de React) :
 * `generateMetadata` et la page la partagent au lieu de lire deux fois.
 */
const lireEvenement = cache((slug: string) => obtenirEvenementPublie(slug));

/** Métadonnées d'une fiche introuvable (même titre que `./not-found.tsx`). */
const METADONNEES_INTROUVABLE: Metadata = {
  title: "Événement introuvable",
  robots: { index: false },
};

export async function generateMetadata({ params }: ProprietesPage): Promise<Metadata> {
  const { slug } = await params;
  const evenement = await lireEvenement(slug);
  // Pas de `notFound()` ici (voir l'en-tête) : la page le lève.
  if (!evenement) return METADONNEES_INTROUVABLE;

  const titre = evenement.titre;
  const description = descriptionEvenement(evenement);
  const chemin = `/agenda/${evenement.slug}`;

  // Chemins relatifs résolus par `metadataBase` (src/app/layout.tsx).
  return {
    title: titre,
    description,
    alternates: { canonical: chemin },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: site.nom,
      title: titre,
      description,
      url: chemin,
    },
  };
}

export default async function PageFicheEvenement({ params }: ProprietesPage) {
  const { slug } = await params;
  const evenement = await lireEvenement(slug);
  if (!evenement) notFound();

  const aujourdhui = aujourdhuiPortoNovo();
  const passe = !estAVenir(evenement, aujourdhui);
  const suggestions = passe ? await listerSuggestions(evenement, aujourdhui) : [];

  const chemin = `/agenda/${evenement.slug}`;
  const urlFiche = urlAbsolue(chemin);
  const urlImage = urlAffiche(evenement.affichePath);
  const filAriane: ElementFilAriane[] = [
    { nom: "Accueil", chemin: "/" },
    { nom: "Agenda", chemin: "/agenda" },
    { nom: evenement.titre, chemin },
  ];

  return (
    <>
      <JsonLd
        donnees={jsonLdEvenement({
          evenement,
          urlFiche,
          urlOrganisation: (slugOrganisation) => urlAbsolue(`/societes/${slugOrganisation}`),
          urlImage,
        })}
      />
      <JsonLd
        donnees={jsonLdFilAriane(
          filAriane.map((element) => ({ nom: element.nom, url: urlAbsolue(element.chemin) })),
        )}
      />

      <Conteneur className="pt-6 pb-16 md:pt-8 md:pb-24">
        <FilAriane elements={filAriane} />

        {passe ? (
          <BandeauEvenementPasse
            dateDebut={evenement.dateDebut}
            dateFin={evenement.dateFin}
            lienSuggestions={
              suggestions.length > 0
                ? {
                    ancre: ANCRE_SUGGESTIONS,
                    texte: texteLienSuggestions(evenement.disciplines.length),
                  }
                : null
            }
            className="mt-6"
          />
        ) : null}

        <div className="mt-6 grid items-start gap-8 md:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
          <div className="min-w-0">
            <EnTeteEvenement evenement={evenement} />
            <InformationsEvenement evenement={evenement} className="mt-8" />
            <ActionsEvenement
              evenement={evenement}
              urlFiche={urlFiche}
              passe={passe}
              className="mt-8"
            />
          </div>
          <div className="grid min-w-0 gap-6">
            <DatesCles echeances={evenement.echeances} aujourdhui={aujourdhui} />
            <Participation evenement={evenement} />
          </div>
        </div>

        {/* Présentation et affiche seulement si l'une existe : le résumé de
            l'en-tête suffit sinon, sans phrase « aucune présentation ». */}
        {evenement.description || urlImage ? (
          <>
            <Graduation className="mt-10 md:mt-12" />
            <div className="mt-10 grid items-start gap-10 md:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
              {evenement.description ? (
                <PresentationFiche description={evenement.description} />
              ) : null}
              <AfficheEvenement url={urlImage} titre={evenement.titre} />
            </div>
          </>
        ) : null}

        {passe ? (
          <SuggestionsEvenement
            evenements={suggestions}
            nombreDisciplines={evenement.disciplines.length}
            aujourdhui={aujourdhui}
            className="mt-12 md:mt-16"
          />
        ) : null}
      </Conteneur>
    </>
  );
}
