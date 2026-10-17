import Link from "next/link";

import { ChampTexte } from "@/components/formulaires/ChampTexte";
import { Select, type OptionSelect } from "@/components/formulaires/Select";
import { Bouton } from "@/components/mise-en-page/Bouton";
import { PictoFiltre } from "@/components/pictos";
import { FormulaireFiltresAnnuaire } from "@/components/societes/annuaire/FormulaireFiltresAnnuaire";
import {
  LONGUEUR_MAX_RECHERCHE,
  LONGUEUR_MIN_RECHERCHE,
  type FiltresAnnuaire,
} from "@/lib/utils/annuaire";
import { cx } from "@/lib/utils/classes";

const ID_TITRE = "titre-filtres";

export type PanneauFiltresProps = {
  /** Filtres réellement appliqués (`resultat.filtres`) : valeurs présélectionnées. */
  filtres: FiltresAnnuaire;
  /** Disciplines (valeur : slug ; libellé : nom), dans l'ordre de la base. */
  disciplines: readonly OptionSelect[];
  /** Villes des organisations publiées (valeur : slug ; libellé : nom). */
  villes: readonly OptionSelect[];
  /** Catégories d'organisation (valeur : énumération ; libellé : `categorieOrganisationLabels`). */
  categories: readonly OptionSelect[];
  /** Au moins un filtre actif : affiche le lien « Effacer les filtres ». */
  filtresActifs: boolean;
  className?: string;
};

/**
 * Filtres de l'annuaire (spécifications 8.1) : recherche par nom, sigle ou
 * mot-clé, discipline, ville et catégorie, tous dans l'URL. Les champs sont
 * rendus par le serveur avec les valeurs en cours (le formulaire fonctionne
 * sans JavaScript) ; `FormulaireFiltresAnnuaire` y ajoute l'envoi
 * automatique. Champs empilés sur mobile, 2 colonnes à partir de 768 px,
 * 4 à partir de 1024 px.
 */
export function PanneauFiltres({
  filtres,
  disciplines,
  villes,
  categories,
  filtresActifs,
  className,
}: PanneauFiltresProps) {
  return (
    <div className={cx("border-y border-or py-6", className)}>
      <h2
        id={ID_TITRE}
        className="petites-capitales flex items-center gap-2 font-titre text-lg leading-tight font-medium text-bordeaux-profond"
      >
        <PictoFiltre taille={20} className="shrink-0 text-bordeaux" />
        Filtrer l’annuaire
      </h2>

      <FormulaireFiltresAnnuaire
        q={filtres.q ?? ""}
        discipline={filtres.discipline ?? ""}
        ville={filtres.ville ?? ""}
        categorie={filtres.categorie ?? ""}
        idTitre={ID_TITRE}
        className="mt-4"
        actions={
          <>
            <Bouton type="submit">Filtrer</Bouton>
            {filtresActifs ? <Link href="/societes">Effacer les filtres</Link> : null}
          </>
        }
      >
        <ChampTexte
          id="filtre-q"
          name="q"
          type="search"
          libelle="Nom, sigle ou mot-clé"
          // Bouton d'effacement natif des champs de recherche masqué, comme
          // dans la recherche de l'en-tête (couleur système hors charte).
          className="[&_input::-webkit-search-cancel-button]:appearance-none"
          defaultValue={filtres.q ?? ""}
          minLength={LONGUEUR_MIN_RECHERCHE}
          maxLength={LONGUEUR_MAX_RECHERCHE}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
        />
        <Select
          id="filtre-discipline"
          name="discipline"
          libelle="Discipline"
          optionVide="Toutes les disciplines"
          options={disciplines}
          defaultValue={filtres.discipline ?? ""}
        />
        <Select
          id="filtre-ville"
          name="ville"
          libelle="Ville"
          optionVide="Toutes les villes"
          options={villes}
          defaultValue={filtres.ville ?? ""}
        />
        <Select
          id="filtre-categorie"
          name="categorie"
          libelle="Catégorie"
          optionVide="Toutes les catégories"
          options={categories}
          defaultValue={filtres.categorie ?? ""}
        />
      </FormulaireFiltresAnnuaire>
    </div>
  );
}
