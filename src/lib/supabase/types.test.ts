import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { Constants, type Database, type Enums, type Tables, type TablesInsert } from "./types";

// =============================================================================
// Vérifications d'EXÉCUTION : les valeurs générées (Constants) reprennent
// exactement celles des types énumérés SQL (section 5.2 des spécifications ;
// même principe que src/lib/textes.test.ts pour les libellés français).
// =============================================================================
describe("Constants générées depuis les types énumérés SQL", () => {
  it("statut_publication reprend les 5 valeurs, dans l'ordre de la migration", () => {
    expect(Constants.public.Enums.statut_publication).toEqual([
      "brouillon",
      "en_attente",
      "publie",
      "refuse",
      "archive",
    ]);
  });

  it("type_evenement reprend les 8 valeurs de la section 5.2", () => {
    expect(Constants.public.Enums.type_evenement).toEqual([
      "congres",
      "journees",
      "colloque",
      "seminaire",
      "atelier",
      "webinaire",
      "formation",
      "autre",
    ]);
  });

  it("les 12 types énumérés de la section 5.2 sont tous présents", () => {
    expect(Object.keys(Constants.public.Enums).sort()).toEqual(
      [
        "categorie_organisation",
        "modalite_evenement",
        "role_organisation",
        "role_utilisateur",
        "source_evenement",
        "statut_demande",
        "statut_publication",
        "type_cible",
        "type_demande_contact",
        "type_echeance",
        "type_emplacement",
        "type_evenement",
      ].sort(),
    );
  });
});

// =============================================================================
// Vérifications de TYPE, compilées par `pnpm typecheck` (tsc --noEmit couvre
// tout `**/*.ts`), jamais exécutées par Vitest : le but est que
// scripts/generer-types.mjs produise un fichier où `supabase-js` infère
// correctement chaque requête, sans jamais tomber sur `never` ni `any`
// (prompt de phase 1, point 5). Une régression du générateur ferait échouer
// `pnpm typecheck`, pas cette suite de tests.
// =============================================================================
type EstJamais<T> = [T] extends [never] ? true : false;
type EstAny<T> = 0 extends 1 & T ? true : false;
type NiJamaisNiAny<T> = EstJamais<T> extends true ? false : EstAny<T> extends true ? false : true;
/** Ne compile que si `T` vaut exactement `true` : un `false` casse `pnpm typecheck`. */
type Attendu<T extends true> = T;

// Une table simple, une table avec colonne générée (tsvector), une table de
// liaison sans clé primaire propre : les trois formes rencontrées dans le
// schéma (supabase/migrations/20260928000300_tables.sql).
type VerifDisciplines = Attendu<NiJamaisNiAny<Tables<"disciplines">>>;
type VerifEvenements = Attendu<NiJamaisNiAny<Tables<"evenements">>>;
type VerifLiaison = Attendu<NiJamaisNiAny<Tables<"societe_disciplines">>>;
type VerifEnum = Attendu<NiJamaisNiAny<Enums<"statut_publication">>>;
type VerifFonctionRechercher = Attendu<
  NiJamaisNiAny<Database["public"]["Functions"]["rechercher"]["Returns"]>
>;

// La colonne générée `recherche` (tsvector) et la clé `id` en
// « generated always as identity » ne doivent JAMAIS être insérables :
// scripts/generer-types.mjs doit leur donner `?: never` (PROGRESS.md, phase 1,
// décision 17).
// `Required<...>` avant l'accès indexé : une propriété optionnelle donne
// `never | undefined` (= `undefined`) par indexation directe, ce qui
// masquerait un `never` réel — `Required` retire d'abord le `?`.
type VerifRechercheNonInsertable = Attendu<
  EstJamais<Required<TablesInsert<"evenements">>["recherche"]>
>;
type VerifIdentiteNonInsertable = Attendu<
  EstJamais<Required<TablesInsert<"clics_sortants">>["id"]>
>;

// Une requête typique, avec une jointure imbriquée à deux niveaux
// (evenements → evenement_societes → societes) : jamais invoquée ni exportée
// pour être appelée (seule sa SIGNATURE sert, via `ReturnType`), donc aucun
// appel réseau ni variable d'environnement requis pour que `pnpm typecheck`
// passe. Exportée uniquement pour que ESLint la reconnaisse comme utilisée
// (elle ne l'est, en pratique, qu'au niveau des types, ci-dessous).
export function requeteEvenementsAvecOrganisateurs(client: SupabaseClient<Database>) {
  return client
    .from("evenements")
    .select("id, slug, titre, evenement_societes ( role, societes ( id, slug, sigle ) )")
    .eq("statut", "publie");
}
type ResultatRequeteTypique = Awaited<
  ReturnType<typeof requeteEvenementsAvecOrganisateurs>
>["data"];
type VerifRequeteImbriquee = Attendu<NiJamaisNiAny<ResultatRequeteTypique>>;

// Regroupe toutes les vérifications ci-dessus dans un seul type EXPORTÉ :
// chaque alias `Verif*` est ainsi référencé (donc « utilisé » pour ESLint),
// et une régression du générateur continue de casser `pnpm typecheck` au
// même endroit précis.
export type VerificationsDeTypes = [
  VerifDisciplines,
  VerifEvenements,
  VerifLiaison,
  VerifEnum,
  VerifFonctionRechercher,
  VerifRechercheNonInsertable,
  VerifIdentiteNonInsertable,
  VerifRequeteImbriquee,
];
