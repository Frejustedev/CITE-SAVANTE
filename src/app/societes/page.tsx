import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Conteneur } from "@/components/mise-en-page/Conteneur";
import { TitreSection } from "@/components/mise-en-page/TitreSection";
import { CarteSociete } from "@/components/societes/CarteSociete";
import { EtatVideAnnuaire } from "@/components/societes/annuaire/EtatVideAnnuaire";
import { FocusResultats } from "@/components/societes/annuaire/FocusResultats";
import {
  decrireFiltresActifs,
  resumeResultats,
  texteNombreOrganisations,
} from "@/components/societes/annuaire/libelles";
import {
  TITRE_ANNUAIRE,
  aDesFiltres,
  metadonneesAnnuaire,
} from "@/components/societes/annuaire/metadonnees";
import { ANCRE_RESULTATS } from "@/components/societes/annuaire/pagination";
import { PaginationAnnuaire } from "@/components/societes/annuaire/PaginationAnnuaire";
import { PanneauFiltres } from "@/components/societes/annuaire/PanneauFiltres";
import { site } from "@/config/site";
import { listerDisciplines } from "@/lib/requetes/disciplines";
import {
  compterSocietesPubliees,
  listerSocietesAnnuaire,
  listerVillesAnnuaire,
} from "@/lib/requetes/societes";
import { Constants } from "@/lib/supabase/types";
import { categorieOrganisationLabels } from "@/lib/textes";
import { cheminAnnuaire, lireFiltresAnnuaire } from "@/lib/utils/annuaire";
import { aujourdhuiPortoNovo } from "@/lib/utils/dates";

// Annuaire des organisations (spécifications 8.1).
//
// Rendu : la page lit la base à chaque requête (règle de rendu de la
// phase 1, PROGRESS.md, décision 20) ; les lectures elles-mêmes sont mises
// en cache par `src/lib/requetes/` (étiquettes `societes`, `disciplines`,
// `evenements`). « Aujourd'hui » (nombre d'événements à venir de chaque
// carte) est calculé ici, une seule fois, et passé en argument.
//
// Filtres : dans l'URL (`?discipline=…&ville=…&categorie=…&q=…&page=…`),
// lus et validés par `lireFiltresAnnuaire` ; une valeur inconnue est ignorée.
// Le formulaire, le résumé, le lien « Effacer les filtres » et la
// pagination reprennent les filtres RÉELLEMENT appliqués
// (`resultat.filtres`).
//
// Page hors limites (`?page=99` pour 3 pages, ou `?page=2` sans résultat) :
// redirection (307) vers la dernière page existante (la page 1 s'il n'y a
// aucun résultat), avec les filtres appliqués. L'adresse affichée correspond
// ainsi toujours à la liste montrée. Seul un numéro de page différent
// déclenche la redirection (jamais un simple nettoyage des filtres) : la
// page d'arrivée est dans les limites, la redirection ne peut pas boucler.
//
// Pas de `loading.tsx` dans ce dossier, volontairement : il envelopperait
// aussi `/societes/[slug]` dans une frontière Suspense, et la réponse
// partirait avant la fin du rendu. Cette redirection ne serait plus une
// vraie 307 (seulement une balise insérée dans la page), et une fiche
// inexistante (`notFound()`) ne renverrait plus un vrai statut 404.
// L'attente pendant un changement de filtre est signalée dans le
// formulaire (« Mise à jour des résultats… »).
export const dynamic = "force-dynamic";

type ProprietesPage = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Métadonnées : voir `metadonneesAnnuaire` (canonique `/societes`, `noindex` des variantes). */
export async function generateMetadata({ searchParams }: ProprietesPage): Promise<Metadata> {
  return metadonneesAnnuaire(lireFiltresAnnuaire(await searchParams));
}

const CATEGORIES = Constants.public.Enums.categorie_organisation.map((categorie) => ({
  valeur: categorie,
  libelle: categorieOrganisationLabels[categorie],
}));

export default async function PageAnnuaire({ searchParams }: ProprietesPage) {
  const demandes = lireFiltresAnnuaire(await searchParams);
  const aujourdhui = aujourdhuiPortoNovo();

  const [resultat, nombrePubliees, disciplines, villes] = await Promise.all([
    listerSocietesAnnuaire(demandes, aujourdhui),
    compterSocietesPubliees(),
    listerDisciplines(),
    listerVillesAnnuaire(),
  ]);

  if (resultat.page !== demandes.page) {
    redirect(cheminAnnuaire(resultat.filtres));
  }

  const { filtres } = resultat;
  const filtresActifs = aDesFiltres(filtres);
  const descriptionsFiltres = decrireFiltresActifs({
    discipline: filtres.discipline
      ? (disciplines.find((discipline) => discipline.slug === filtres.discipline)?.nom ??
        filtres.discipline)
      : null,
    ville: filtres.ville
      ? (villes.find((ville) => ville.slug === filtres.ville)?.nom ?? filtres.ville)
      : null,
    categorie: filtres.categorie ? categorieOrganisationLabels[filtres.categorie] : null,
    q: filtres.q,
  });

  return (
    <Conteneur className="py-10 md:py-14">
      <header className="max-w-[70ch]">
        <h1 className="font-titre text-2xl leading-[1.15] font-medium tracking-[-0.01em] text-balance text-bordeaux-profond md:text-3xl">
          {TITRE_ANNUAIRE}
        </h1>
        <p className="mt-3 font-titre text-lg leading-snug font-medium text-bordeaux tabular-nums">
          {texteNombreOrganisations(nombrePubliees)}
        </p>
        <p className="mt-4">
          Cette page liste les organisations scientifiques du Bénin référencées sur {site.nom} :
          sociétés savantes, institutions académiques et associations professionnelles. Filtrez par
          discipline, ville ou catégorie, ou cherchez un nom, un sigle ou un mot-clé.
        </p>
      </header>

      <PanneauFiltres
        className="mt-8 md:mt-10"
        filtres={filtres}
        disciplines={disciplines.map((discipline) => ({
          valeur: discipline.slug,
          libelle: discipline.nom,
        }))}
        villes={villes.map((ville) => ({ valeur: ville.slug, libelle: ville.nom }))}
        categories={CATEGORIES}
        filtresActifs={filtresActifs}
      />

      <section aria-labelledby={ANCRE_RESULTATS} className="mt-10 md:mt-12">
        <TitreSection id={ANCRE_RESULTATS} className="scroll-mt-6">
          Liste des organisations
        </TitreSection>
        <FocusResultats
          page={resultat.page}
          cheminFiltres={cheminAnnuaire({ ...filtres, page: 1 })}
        />

        {/* Toujours rendu, à la même place : son texte change à chaque
            filtre ou page et les lecteurs d'écran l'annoncent poliment. */}
        <p role="status" aria-live="polite" aria-atomic="true" className="mt-4">
          {resumeResultats({
            total: resultat.total,
            page: resultat.page,
            pages: resultat.pages,
            filtres: descriptionsFiltres,
          })}
        </p>

        {resultat.societes.length > 0 ? (
          <>
            <p className="mt-1 text-sm italic">
              Les organisations mises en avant sont présentées en premier, puis les autres par ordre
              alphabétique du sigle.
            </p>
            <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resultat.societes.map((societe) => (
                <CarteSociete
                  key={societe.id}
                  as="li"
                  niveauTitre="h3"
                  societe={societe}
                  afficherCategorie={!filtres.categorie}
                />
              ))}
            </ul>
          </>
        ) : (
          <EtatVideAnnuaire className="mt-6" filtresActifs={filtresActifs} />
        )}

        <PaginationAnnuaire
          className="mt-10"
          page={resultat.page}
          pages={resultat.pages}
          filtres={filtres}
        />

        {resultat.societes.length > 0 ? (
          <p className="mt-10 text-sm">
            Une organisation manque à l’annuaire ?{" "}
            <Link href="/referencer/societe">Référencer une société</Link>
          </p>
        ) : null}
      </section>
    </Conteneur>
  );
}
