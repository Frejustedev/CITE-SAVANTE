import type { Metadata } from "next";
import Link from "next/link";

import { EtatVideEcheances } from "@/components/echeances/EtatVideEcheances";
import {
  QUESTION_ECHEANCE_MANQUANTE,
  decrireFiltresEcheances,
  resumeEcheances,
  texteIntroductionEcheances,
  texteNombreEcheances,
} from "@/components/echeances/libelles";
import { ListeEcheances } from "@/components/echeances/ListeEcheances";
import {
  TITRE_ECHEANCES,
  aDesFiltresEcheances,
  metadonneesEcheances,
} from "@/components/echeances/metadonnees";
import { PanneauFiltresEcheances } from "@/components/echeances/PanneauFiltresEcheances";
import { Conteneur } from "@/components/mise-en-page/Conteneur";
import { CHEMIN_ANNONCER_EVENEMENT, site } from "@/config/site";
import { listerDisciplines } from "@/lib/requetes/disciplines";
import { listerEcheancesAVenir } from "@/lib/requetes/evenements";
import { Constants } from "@/lib/supabase/types";
import { typeEcheanceLabels } from "@/lib/textes";
import { lireFiltresEcheances } from "@/lib/utils/agenda";
import { grouperEcheancesParSemaine } from "@/lib/utils/calendrier";
import { aujourdhuiPortoNovo } from "@/lib/utils/dates";

// Échéances à venir (spécifications 7 et 8.5).
//
// Rendu : la page lit la base à chaque requête (règle de rendu de la
// phase 1, PROGRESS.md, décision 20) ; la lecture elle-même est mise en
// cache par `src/lib/requetes/` (une entrée par jour pour toutes les
// échéances, étiquettes `evenements`, `societes`, `disciplines`), puis
// filtrée en mémoire. « Aujourd'hui » (Porto-Novo) est calculé ici, une
// seule fois, et sert à la lecture, aux jours restants et au groupement.
//
// Filtres : dans l'URL (`?type=…&discipline=…`), lus et validés par
// `lireFiltresEcheances` ; une valeur inconnue est ignorée. Le formulaire,
// le résumé et le lien « Effacer les filtres » reprennent les filtres
// RÉELLEMENT appliqués (`resultat.filtres`).
//
// Pas de `loading.tsx`, comme pour l'annuaire : l'attente pendant un
// changement de filtre est signalée dans le formulaire (« Mise à jour des
// résultats… »).
export const dynamic = "force-dynamic";

type ProprietesPage = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Métadonnées : voir `metadonneesEcheances` (canonique `/echeances`, `noindex` des variantes filtrées). */
export async function generateMetadata({ searchParams }: ProprietesPage): Promise<Metadata> {
  return metadonneesEcheances(lireFiltresEcheances(await searchParams));
}

const TYPES_ECHEANCE = Constants.public.Enums.type_echeance.map((type) => ({
  valeur: type,
  libelle: typeEcheanceLabels[type],
}));

export default async function PageEcheances({ searchParams }: ProprietesPage) {
  const demandes = lireFiltresEcheances(await searchParams);
  const aujourdhui = aujourdhuiPortoNovo();

  // Deux lectures de la même entrée de cache : la liste filtrée et le total
  // sans filtre (ligne d'en-tête).
  const [resultat, toutes, disciplines] = await Promise.all([
    listerEcheancesAVenir(demandes, aujourdhui),
    listerEcheancesAVenir({}, aujourdhui),
    listerDisciplines(),
  ]);

  const { filtres } = resultat;
  const filtresActifs = aDesFiltresEcheances(filtres);
  const groupes = grouperEcheancesParSemaine(resultat.echeances, aujourdhui);
  const descriptionsFiltres = decrireFiltresEcheances({
    type: filtres.type ? typeEcheanceLabels[filtres.type] : null,
    discipline: filtres.discipline
      ? (disciplines.find((discipline) => discipline.slug === filtres.discipline)?.nom ??
        filtres.discipline)
      : null,
  });

  return (
    <Conteneur className="py-10 md:py-14">
      <header className="max-w-[70ch]">
        <h1 className="font-titre text-2xl leading-[1.15] font-medium tracking-[-0.01em] text-balance text-bordeaux-profond md:text-3xl">
          {TITRE_ECHEANCES}
        </h1>
        <p className="mt-3 font-titre text-lg leading-snug font-medium text-bordeaux tabular-nums">
          {texteNombreEcheances(toutes.total)}
        </p>
        <p className="mt-4">{texteIntroductionEcheances(site.nom)}</p>
      </header>

      <PanneauFiltresEcheances
        className="mt-8 md:mt-10"
        filtres={filtres}
        types={TYPES_ECHEANCE}
        disciplines={disciplines.map((discipline) => ({
          valeur: discipline.slug,
          libelle: discipline.nom,
        }))}
        filtresActifs={filtresActifs}
      />

      <div className="mt-10 md:mt-12">
        {/* Toujours rendu, à la même place : son texte change à chaque
            filtre et les lecteurs d'écran l'annoncent poliment. */}
        <p role="status" aria-live="polite" aria-atomic="true">
          {resumeEcheances({ total: resultat.total, filtres: descriptionsFiltres })}
        </p>

        {groupes.length > 0 ? (
          <ListeEcheances className="mt-8" groupes={groupes} aujourdhui={aujourdhui} />
        ) : (
          <EtatVideEcheances className="mt-6" filtresActifs={filtresActifs} />
        )}

        {groupes.length > 0 ? (
          <p className="mt-10 text-sm">
            {QUESTION_ECHEANCE_MANQUANTE}{" "}
            <Link href={CHEMIN_ANNONCER_EVENEMENT}>Annoncer un événement</Link>
          </p>
        ) : null}
      </div>
    </Conteneur>
  );
}
