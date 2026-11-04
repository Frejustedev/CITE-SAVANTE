import type { Metadata } from "next";
import Link from "next/link";

import { BanniereAgenda } from "@/components/agenda/BanniereAgenda";
import { CalendrierMois, nombreEvenementsDuMois } from "@/components/agenda/CalendrierMois";
import { EtatVideAgenda } from "@/components/agenda/EtatVideAgenda";
import {
  decrireFiltresAgenda,
  resumeAgenda,
  texteNombreEvenements,
  type DonneesResumeAgenda,
} from "@/components/agenda/libelles";
import { ListeAgenda } from "@/components/agenda/ListeAgenda";
import { metadonneesAgenda, titreAgenda } from "@/components/agenda/metadonnees";
import { PanneauFiltresAgenda } from "@/components/agenda/PanneauFiltresAgenda";
import { SelecteurVue } from "@/components/agenda/SelecteurVue";
import { Conteneur } from "@/components/mise-en-page/Conteneur";
import { CHEMIN_ANNONCER_EVENEMENT, site } from "@/config/site";
import { listerDisciplines } from "@/lib/requetes/disciplines";
import { lireEmplacementsActifs } from "@/lib/requetes/emplacements";
import {
  listerEvenementsAgenda,
  listerEvenementsMois,
  type EvenementAgenda,
} from "@/lib/requetes/evenements";
import { modaliteEvenementLabels, typeEvenementLabels } from "@/lib/textes";
import {
  aDesFiltresAgenda,
  cheminAgenda,
  lireFiltresAgenda,
  type FiltresAgenda,
  type ResultatAgenda,
} from "@/lib/utils/agenda";
import { grilleMois, lireParametreMois, type GrilleMois } from "@/lib/utils/calendrier";
import { aujourdhuiPortoNovo } from "@/lib/utils/dates";

// Agenda des événements (spécifications 8.3).
//
// Rendu : la page lit la base à chaque requête (règle de rendu de la
// phase 1, PROGRESS.md, décision 20) ; les lectures elles-mêmes sont mises
// en cache par `src/lib/requetes/` (une liste des événements à venir, une
// des archives, les emplacements et les disciplines, par jour). Filtres,
// mois et recherche sont appliqués EN MÉMOIRE sur ces listes : aucune entrée
// de cache ne dépend de l'URL (la recherche texte `q` n'est pas mise en
// cache). « Aujourd'hui » (Porto-Novo) est calculé ici, une seule fois, et
// passé à chaque lecture et aux cartes.
//
// Deux vues, chacune à sa propre adresse (`SelecteurVue`) :
//   - liste (défaut) : `listerEvenementsAgenda`, déjà triée (mis en avant
//     d'abord, puis par date de début ; archives `?periode=passes` du plus
//     récent au plus ancien), groupée par mois par `ListeAgenda` ;
//   - calendrier (`?vue=calendrier&mois=AAAA-MM`) : `lireParametreMois`
//     (valeur invalide ou hors fenêtre : mois en cours), `grilleMois`, puis
//     `listerEvenementsMois` sur les bornes de la grille (lundi précédant le
//     1er, dimanche suivant le dernier jour), pour qu'un événement à cheval
//     sur deux mois figure dans les deux grilles.
// Le formulaire, le sélecteur de vue, la navigation des mois, le résumé et
// le lien « Effacer les filtres » reprennent les filtres RÉELLEMENT
// appliqués (`resultat.filtres` : discipline ou ville inconnue retirée), pas
// ceux de l'URL.
//
// Compteur de l'en-tête (« 15 événements à venir ») : la même lecture SANS
// aucun filtre (`listerEvenementsAgenda({ periode })`), comme le nombre
// d'organisations publiées de l'annuaire. Elle ne coûte aucune requête de
// plus : elle relit les mêmes listes en cache et ne filtre rien.
//
// Métadonnées (`metadonneesAgenda`, src/components/agenda/metadonnees.ts) :
// liste à venir sans filtre indexée (canonique `/agenda`) ; archives sans
// filtre indexées (canonique `/agenda?periode=passes`) ; toute variante
// filtrée et toute page du calendrier en `noindex, follow`.
//
// Pas de `loading.tsx` dans ce dossier, volontairement : il envelopperait
// aussi `/agenda/[slug]` dans une frontière Suspense, et la réponse partirait
// avant la fin du rendu ; une fiche inexistante (`notFound()`) ne
// renverrait plus un vrai statut 404. L'attente pendant un changement de
// filtre est signalée dans le formulaire (« Mise à jour des résultats… »).
// Une erreur de lecture est rendue par `./error.tsx`.
export const dynamic = "force-dynamic";

type ProprietesPage = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Métadonnées : voir `metadonneesAgenda` (canonique, `noindex` des variantes). */
export async function generateMetadata({ searchParams }: ProprietesPage): Promise<Metadata> {
  const aujourdhui = aujourdhuiPortoNovo();
  return metadonneesAgenda(lireFiltresAgenda(await searchParams, aujourdhui), aujourdhui);
}

/** Données de la vue affichée. */
type Vue =
  | { mode: "liste"; resultat: ResultatAgenda<EvenementAgenda> }
  | { mode: "calendrier"; resultat: ResultatAgenda<EvenementAgenda>; grille: GrilleMois };

async function lireVue(demandes: FiltresAgenda, aujourdhui: string): Promise<Vue> {
  if (demandes.vue === "calendrier") {
    const grille = grilleMois(lireParametreMois(demandes.mois, aujourdhui), aujourdhui);
    const resultat = await listerEvenementsMois(grille.debut, grille.fin, demandes, aujourdhui);
    return { mode: "calendrier", resultat, grille };
  }
  return { mode: "liste", resultat: await listerEvenementsAgenda(demandes, aujourdhui) };
}

export default async function PageAgenda({ searchParams }: ProprietesPage) {
  const aujourdhui = aujourdhuiPortoNovo();
  const demandes = lireFiltresAgenda(await searchParams, aujourdhui);

  const [vue, sansFiltre, disciplines, emplacements] = await Promise.all([
    lireVue(demandes, aujourdhui),
    listerEvenementsAgenda({ periode: demandes.periode }, aujourdhui),
    listerDisciplines(),
    lireEmplacementsActifs(aujourdhui),
  ]);

  const { resultat } = vue;
  const { filtres } = resultat;
  const archives = filtres.vue === "liste" && filtres.periode === "passes";
  const filtresActifs = aDesFiltresAgenda(filtres);
  const banniere = emplacements.bannieresAgenda[0] ?? null;
  const cheminEffacer = cheminAgenda({
    vue: filtres.vue,
    periode: filtres.periode,
    mois: filtres.mois,
  });

  const descriptionsFiltres = decrireFiltresAgenda({
    type: filtres.type ? typeEvenementLabels[filtres.type] : null,
    discipline: filtres.discipline
      ? (disciplines.find((discipline) => discipline.slug === filtres.discipline)?.nom ??
        filtres.discipline)
      : null,
    ville: filtres.ville
      ? (resultat.villes.find((ville) => ville.slug === filtres.ville)?.nom ?? filtres.ville)
      : null,
    modalite: filtres.modalite ? modaliteEvenementLabels[filtres.modalite] : null,
    gratuit: filtres.gratuit,
    du: filtres.du,
    au: filtres.au,
    q: filtres.q,
  });

  const resume: DonneesResumeAgenda =
    vue.mode === "calendrier"
      ? {
          mode: "calendrier",
          // Événements qui ont au moins un jour DANS le mois (la grille déborde
          // sur les mois voisins).
          total: nombreEvenementsDuMois(resultat.evenements, vue.grille.mois),
          filtres: descriptionsFiltres,
          mois: vue.grille.mois,
        }
      : { mode: filtres.periode, total: resultat.total, filtres: descriptionsFiltres };
  const aDesEvenements = resume.total > 0;

  return (
    <Conteneur className="py-10 md:py-14">
      <header className="max-w-[70ch]">
        <h1 className="font-titre text-2xl leading-[1.15] font-medium tracking-[-0.01em] text-balance text-bordeaux-profond md:text-3xl">
          {titreAgenda(filtres)}
        </h1>
        <p className="mt-3 font-titre text-lg leading-snug font-medium text-bordeaux tabular-nums">
          {texteNombreEvenements(sansFiltre.total, archives ? "passes" : "a_venir")}
        </p>
        {archives ? (
          <p className="mt-4">
            Cette page présente les événements scientifiques terminés, du plus récent au plus
            ancien, avec les mêmes filtres que l’agenda. Chaque fiche reste consultable.
          </p>
        ) : (
          <>
            <p className="mt-4">
              Cette page présente les congrès, journées, colloques, séminaires, ateliers, webinaires
              et formations scientifiques annoncés au Bénin, en liste par mois ou en calendrier.
              Filtrez par type, discipline, ville, modalité ou période, ou cherchez un titre, un
              organisateur ou un mot-clé.
            </p>
            <p className="mt-3">
              Les dates limites (résumés, inscriptions, bourses) sont regroupées sur la page{" "}
              <Link href="/echeances">Échéances</Link>.
            </p>
          </>
        )}
      </header>

      {banniere ? <BanniereAgenda className="mt-8" banniere={banniere} /> : null}

      <SelecteurVue className="mt-8 md:mt-10" filtres={filtres} />

      <PanneauFiltresAgenda
        className="mt-6"
        filtres={filtres}
        disciplines={disciplines.map((discipline) => ({
          valeur: discipline.slug,
          libelle: discipline.nom,
        }))}
        villes={resultat.villes.map((ville) => ({ valeur: ville.slug, libelle: ville.nom }))}
        filtresActifs={filtresActifs}
      />

      {/* Toujours rendu, à la même place : son texte change à chaque filtre,
          vue ou mois, et les lecteurs d'écran l'annoncent poliment. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="mt-8">
        {resumeAgenda(resume)}
      </p>

      {vue.mode === "calendrier" ? (
        <CalendrierMois
          className="mt-6"
          grille={vue.grille}
          evenements={resultat.evenements}
          filtres={filtres}
          aujourdhui={aujourdhui}
          etatVide={
            <EtatVideAgenda
              className="mt-6"
              mode="calendrier"
              filtresActifs={filtresActifs}
              cheminEffacer={cheminEffacer}
            />
          }
        />
      ) : aDesEvenements ? (
        <>
          <p className="mt-1 text-sm italic">
            {archives
              ? "Événements groupés par mois de début, du plus récent au plus ancien."
              : "Événements groupés par mois de début : un événement sur plusieurs mois figure dans le mois où il commence."}
          </p>
          <ListeAgenda
            className="mt-8"
            evenements={resultat.evenements}
            archives={archives}
            aujourdhui={aujourdhui}
          />
        </>
      ) : (
        <EtatVideAgenda
          className="mt-6"
          mode={filtres.periode}
          filtresActifs={filtresActifs}
          cheminEffacer={cheminEffacer}
        />
      )}

      {aDesEvenements ? (
        <p className="mt-10 text-sm">
          Un événement manque à l’agenda de {site.nom} ?{" "}
          <Link href={CHEMIN_ANNONCER_EVENEMENT}>Annoncer un événement</Link>
        </p>
      ) : null}
    </Conteneur>
  );
}
