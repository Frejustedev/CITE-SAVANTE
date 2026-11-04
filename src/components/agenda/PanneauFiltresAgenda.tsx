import Link from "next/link";

import { FormulaireFiltresAgenda } from "@/components/agenda/FormulaireFiltresAgenda";
import { CaseACocher } from "@/components/formulaires/CaseACocher";
import { ChampTexte } from "@/components/formulaires/ChampTexte";
import { Select, type OptionSelect } from "@/components/formulaires/Select";
import { Bouton } from "@/components/mise-en-page/Bouton";
import { PictoFiltre } from "@/components/pictos";
import { Constants } from "@/lib/supabase/types";
import { modaliteEvenementLabels, typeEvenementLabels } from "@/lib/textes";
import { cheminAgenda, type FiltresAgenda } from "@/lib/utils/agenda";
import { LONGUEUR_MAX_RECHERCHE, LONGUEUR_MIN_RECHERCHE } from "@/lib/utils/annuaire";
import { cx } from "@/lib/utils/classes";

const ID_TITRE = "titre-filtres-agenda";

const TYPES: readonly OptionSelect[] = Constants.public.Enums.type_evenement.map((type) => ({
  valeur: type,
  libelle: typeEvenementLabels[type],
}));

const MODALITES: readonly OptionSelect[] = Constants.public.Enums.modalite_evenement.map(
  (modalite) => ({ valeur: modalite, libelle: modaliteEvenementLabels[modalite] }),
);

/**
 * Bouton d'effacement natif des champs de recherche masqué, comme dans
 * l'annuaire et la recherche de l'en-tête (couleur système hors charte).
 */
const SANS_BOUTON_EFFACER = "[&_input::-webkit-search-cancel-button]:appearance-none";

export type PanneauFiltresAgendaProps = {
  /** Filtres réellement appliqués (`resultat.filtres`) : valeurs présélectionnées. */
  filtres: FiltresAgenda;
  /** Disciplines (valeur : slug ; libellé : nom), dans l'ordre de la base. */
  disciplines: readonly OptionSelect[];
  /** Villes des événements publiés (valeur : slug ; libellé : nom), `resultat.villes`. */
  villes: readonly OptionSelect[];
  /** Au moins un filtre de contenu actif : affiche le lien « Effacer les filtres ». */
  filtresActifs: boolean;
  className?: string;
};

/**
 * Filtres de l'agenda (spécifications 8.3) : recherche, type, discipline,
 * ville, modalité, période (`du`, `au`) et gratuité, tous dans l'URL. Les
 * champs sont rendus par le serveur avec les valeurs en cours (le
 * formulaire fonctionne sans JavaScript) ; `FormulaireFiltresAgenda` y
 * ajoute l'envoi automatique.
 *
 * Champs cachés : `vue=calendrier` et `mois` en vue calendrier,
 * `periode=passes` dans les archives, pour que filtrer garde la vue, le mois
 * et la période affichés (`value`, et non `defaultValue`, pour suivre les
 * changements de vue sans rechargement). « Effacer les filtres » les garde
 * aussi.
 *
 * Disposition (mobile d'abord) : une colonne, sauf les deux dates côte à
 * côte ; deux colonnes à partir de 768 px ; quatre à partir de 1024 px
 * (recherche, type, discipline, ville, puis modalité, dates et gratuité).
 * Panneau non replié (décision de l'annuaire, phase 2 : outil principal de
 * la page).
 */
export function PanneauFiltresAgenda({
  filtres,
  disciplines,
  villes,
  filtresActifs,
  className,
}: PanneauFiltresAgendaProps) {
  const calendrier = filtres.vue === "calendrier";
  const archives = !calendrier && filtres.periode === "passes";

  return (
    <div className={cx("border-y border-or py-6", className)}>
      <h2
        id={ID_TITRE}
        className="petites-capitales flex items-center gap-2 font-titre text-lg leading-tight font-medium text-bordeaux-profond"
      >
        <PictoFiltre taille={20} className="shrink-0 text-bordeaux" />
        Filtrer l’agenda
      </h2>

      <FormulaireFiltresAgenda
        valeurs={{
          q: filtres.q ?? "",
          type: filtres.type ?? "",
          discipline: filtres.discipline ?? "",
          ville: filtres.ville ?? "",
          modalite: filtres.modalite ?? "",
          du: filtres.du ?? "",
          au: filtres.au ?? "",
          gratuit: filtres.gratuit,
        }}
        idTitre={ID_TITRE}
        className="mt-4"
        actions={
          <>
            <Bouton type="submit">Filtrer</Bouton>
            {filtresActifs ? (
              <Link
                href={cheminAgenda({
                  vue: filtres.vue,
                  periode: filtres.periode,
                  mois: filtres.mois,
                })}
              >
                Effacer les filtres
              </Link>
            ) : null}
          </>
        }
      >
        {calendrier ? <input type="hidden" name="vue" value="calendrier" /> : null}
        {calendrier && filtres.mois ? (
          <input type="hidden" name="mois" value={filtres.mois} />
        ) : null}
        {archives ? <input type="hidden" name="periode" value="passes" /> : null}

        <ChampTexte
          id="filtre-agenda-q"
          name="q"
          type="search"
          libelle="Titre, organisateur ou mot-clé"
          className={cx("col-span-2 lg:col-span-1", SANS_BOUTON_EFFACER)}
          defaultValue={filtres.q ?? ""}
          minLength={LONGUEUR_MIN_RECHERCHE}
          maxLength={LONGUEUR_MAX_RECHERCHE}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
        />
        <Select
          id="filtre-agenda-type"
          name="type"
          libelle="Type d’événement"
          optionVide="Tous les types"
          options={TYPES}
          defaultValue={filtres.type ?? ""}
          className="col-span-2 md:col-span-1"
        />
        <Select
          id="filtre-agenda-discipline"
          name="discipline"
          libelle="Discipline"
          optionVide="Toutes les disciplines"
          options={disciplines}
          defaultValue={filtres.discipline ?? ""}
          className="col-span-2 md:col-span-1"
        />
        <Select
          id="filtre-agenda-ville"
          name="ville"
          libelle="Ville"
          optionVide="Toutes les villes"
          options={villes}
          defaultValue={filtres.ville ?? ""}
          className="col-span-2 md:col-span-1"
        />
        <Select
          id="filtre-agenda-modalite"
          name="modalite"
          libelle="Modalité"
          optionVide="Toutes les modalités"
          options={MODALITES}
          defaultValue={filtres.modalite ?? ""}
          className="col-span-2 md:col-span-1"
        />
        <ChampTexte
          id="filtre-agenda-du"
          name="du"
          type="date"
          libelle="À partir du"
          className="col-span-1 min-w-0"
          defaultValue={filtres.du ?? ""}
        />
        <ChampTexte
          id="filtre-agenda-au"
          name="au"
          type="date"
          libelle="Jusqu’au"
          className="col-span-1 min-w-0"
          defaultValue={filtres.au ?? ""}
        />
        <CaseACocher
          id="filtre-agenda-gratuit"
          name="gratuit"
          value="1"
          libelle="Événements gratuits seulement"
          className="col-span-2 md:col-span-1 lg:pb-2.5"
          defaultChecked={filtres.gratuit}
        />
      </FormulaireFiltresAgenda>
    </div>
  );
}
