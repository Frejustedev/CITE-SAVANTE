import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Conteneur } from "@/components/mise-en-page/Conteneur";
import { Graduation } from "@/components/mise-en-page/Graduation";
import { ContactsFiche } from "@/components/societes/fiche/ContactsFiche";
import { EnTeteFiche } from "@/components/societes/fiche/EnTeteFiche";
import { EvenementsAVenir, EvenementsPasses } from "@/components/societes/fiche/EvenementsFiche";
import { FilAriane, type ElementFilAriane } from "@/components/societes/fiche/FilAriane";
import { JsonLd } from "@/components/societes/fiche/JsonLd";
import {
  jsonLdFilAriane,
  jsonLdOrganisation,
} from "@/components/societes/fiche/donneesStructurees";
import { LienGestionFiche } from "@/components/societes/fiche/LienGestionFiche";
import { PresentationFiche } from "@/components/societes/fiche/PresentationFiche";
import { descriptionFiche, titreFiche } from "@/components/societes/fiche/utilitaires";
import { site } from "@/config/site";
import { listerEvenementsSociete } from "@/lib/requetes/evenements";
import { obtenirSocietePubliee } from "@/lib/requetes/societes";
import { urlLogo } from "@/lib/stockage";
import { aujourdhuiPortoNovo } from "@/lib/utils/dates";
import { urlAbsolue } from "@/lib/utils/urls";

// Fiche d'une organisation publiée (spécifications 8.2).
//
// Règle de rendu (PROGRESS.md, décision 20) : la page n'est jamais rendue au
// build (pas de base à ce moment-là) ; seules les lectures, dans
// `src/lib/requetes/`, sont mises en cache et partagées entre visiteurs.
//
// 404 : une organisation absente, non publiée ou demandée avec un slug
// inexact (majuscules, « / » final…) donne `notFound()`, sans tentative de
// correction (`obtenirSocietePubliee`). Pour que la réponse porte vraiment le
// statut HTTP 404, `notFound()` doit être levé AVANT que le corps de la
// réponse commence à être envoyé : ne pas ajouter de `loading.tsx` dans ce
// segment ni de `<Suspense>` au-dessus de la page (le flux démarrerait et la
// réponse partirait en 200 ; documentation Next.js, `loading.js`, « Status
// Codes »). Page rendue : `./not-found.tsx`.
//
// `notFound()` n'est levé que par la PAGE ; `generateMetadata` renvoie les
// métadonnées de la page introuvable (titre, `noindex`) sans lever.
//
// LIMITE CONNUE (Next.js 16.3.6, à trancher : PROGRESS.md, phase 2) : la
// réponse a bien le statut 404, le titre et `noindex`, mais son corps HTML
// est une coquille vide (`<html id="__next_error__">`, sans `lang` ni `h1`) ;
// « Organisation introuvable » n'apparaît qu'avec JavaScript. Ce n'est pas dû
// à `generateMetadata` (vérifié : identique quand seule la page lève) : tout
// `notFound()` levé pendant le rendu du shell d'une page dynamique passe par
// la reprise sur erreur de `renderToStream` (`next/dist/server/app-render/
// app-render.js`), car la frontière `not-found.tsx` est un error boundary de
// classe, que le rendu serveur de React n'applique pas. Remède documenté par
// Next (`loading.md`, « Status Codes ») : vérifier l'existence du slug dans
// `proxy.ts` et y réécrire vers une page introuvable.
export const dynamic = "force-dynamic";

type ProprietesPage = {
  params: Promise<{ slug: string }>;
};

/**
 * Lecture de la fiche, mémorisée le temps d'une requête (`cache` de React) :
 * `generateMetadata` et la page la partagent au lieu de lire deux fois
 * (documentation Next.js, `generateMetadata`).
 */
const lireSociete = cache((slug: string) => obtenirSocietePubliee(slug));

/** Métadonnées d'une fiche introuvable (même titre que `./not-found.tsx`). */
const METADONNEES_INTROUVABLE: Metadata = {
  title: "Organisation introuvable",
  robots: { index: false },
};

export async function generateMetadata({ params }: ProprietesPage): Promise<Metadata> {
  const { slug } = await params;
  const societe = await lireSociete(slug);
  // Pas de `notFound()` ici (voir l'en-tête) : la page le lève.
  if (!societe) return METADONNEES_INTROUVABLE;

  const titre = titreFiche(societe);
  const description = descriptionFiche(societe);
  const chemin = `/societes/${societe.slug}`;

  // Chemins relatifs résolus par `metadataBase` (src/app/layout.tsx).
  // Image d'aperçu : `opengraph-image.tsx` de la phase 3 (section 10.5).
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

export default async function PageFicheSociete({ params }: ProprietesPage) {
  const { slug } = await params;
  const societe = await lireSociete(slug);
  if (!societe) notFound();

  // Une seule date du jour pour toute la page : requête (à venir / passés)
  // et cartes (échéance urgente) — règle de rendu, point 4.
  const aujourdhui = aujourdhuiPortoNovo();
  const evenements = await listerEvenementsSociete(societe.id, aujourdhui);

  const chemin = `/societes/${societe.slug}`;
  const filAriane: ElementFilAriane[] = [
    { nom: "Accueil", chemin: "/" },
    { nom: "Annuaire", chemin: "/societes" },
    { nom: societe.sigle, chemin },
  ];

  return (
    <>
      <JsonLd
        donnees={jsonLdOrganisation({
          societe,
          urlFiche: urlAbsolue(chemin),
          urlLogo: urlLogo(societe.logoPath),
        })}
      />
      <JsonLd
        donnees={jsonLdFilAriane(
          filAriane.map((element) => ({ nom: element.nom, url: urlAbsolue(element.chemin) })),
        )}
      />

      <Conteneur className="pt-6 pb-16 md:pt-8 md:pb-24">
        <FilAriane elements={filAriane} />

        <div className="mt-6 grid items-start gap-8 md:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
          <EnTeteFiche societe={societe} />
          <ContactsFiche societe={societe} />
        </div>

        <Graduation className="mt-10 md:mt-12" />

        <PresentationFiche description={societe.description} className="mt-10 md:mt-12" />
        <EvenementsAVenir
          evenements={evenements.aVenir}
          aujourdhui={aujourdhui}
          className="mt-12 md:mt-16"
        />
        <EvenementsPasses evenements={evenements.passes} className="mt-12 md:mt-16" />

        <LienGestionFiche slug={societe.slug} className="mt-16 md:mt-20" />
      </Conteneur>
    </>
  );
}
