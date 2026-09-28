import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  categorieOrganisationLabels,
  modaliteEvenementLabels,
  roleOrganisationLabels,
  statutPublicationLabels,
  typeEcheanceLabels,
  typeEmplacementLabels,
  typeEvenementLabels,
} from "./textes";

/**
 * Dictionnaires de libellés, associés au nom du type énuméré Postgres
 * qu'ils traduisent (docs/SPECIFICATIONS.md, section 5.2).
 */
const dictionnaires: Record<string, { typeSql: string; libelles: Record<string, string> }> = {
  typeEvenementLabels: { typeSql: "type_evenement", libelles: typeEvenementLabels },
  typeEcheanceLabels: { typeSql: "type_echeance", libelles: typeEcheanceLabels },
  statutPublicationLabels: { typeSql: "statut_publication", libelles: statutPublicationLabels },
  categorieOrganisationLabels: {
    typeSql: "categorie_organisation",
    libelles: categorieOrganisationLabels,
  },
  modaliteEvenementLabels: { typeSql: "modalite_evenement", libelles: modaliteEvenementLabels },
  roleOrganisationLabels: { typeSql: "role_organisation", libelles: roleOrganisationLabels },
  typeEmplacementLabels: { typeSql: "type_emplacement", libelles: typeEmplacementLabels },
};

/** Lit les `create type … as enum (…)` des spécifications : nom du type → valeurs. */
function enumsDesSpecifications(): Record<string, string[]> {
  const specifications = readFileSync(resolve(process.cwd(), "docs/SPECIFICATIONS.md"), "utf8");
  return Object.fromEntries(
    [...specifications.matchAll(/create type (\w+) as enum \(([^)]*)\);/g)].map(
      ([, nom, valeurs]) => [nom, [...valeurs.matchAll(/'([^']+)'/g)].map(([, valeur]) => valeur)],
    ),
  );
}

describe("libellés des types énumérés", () => {
  const enums = enumsDesSpecifications();

  /**
   * Les clés doivent reprendre EXACTEMENT les valeurs de la section 5.2 : une
   * valeur renommée, oubliée ou ajoutée d'un seul côté fait échouer ce test.
   */
  it.each(Object.entries(dictionnaires))(
    "%s : les clés sont exactement les valeurs de l'enum SQL",
    (_nom, { typeSql, libelles }) => {
      expect(enums[typeSql], `type ${typeSql} absent de la section 5.2`).toBeDefined();
      expect(Object.keys(libelles).sort()).toEqual([...enums[typeSql]].sort());
    },
  );

  /**
   * Un libellé vide afficherait une valeur brute (ex. « soumission_resumes »)
   * ou rien du tout à un visiteur.
   */
  it.each(Object.entries(dictionnaires))(
    "%s : chaque valeur a un libellé non vide",
    (_nom, { libelles }) => {
      for (const [valeurEnum, libelle] of Object.entries(libelles)) {
        expect(libelle.trim().length, `libellé vide pour "${valeurEnum}"`).toBeGreaterThan(0);
      }
    },
  );
});
