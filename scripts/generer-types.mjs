#!/usr/bin/env node
// =============================================================================
// generer-types.mjs — génère src/lib/supabase/types.ts SANS Docker ni CLI Supabase
// =============================================================================
// Ce que fait ce script (phase 1, point 5 du prompt ; docs/PROMPTS.md) :
// interroge le schéma `public` d'une grappe PostgreSQL locale via `psql`
// (pg_catalog / information_schema, sortie JSON) et écrit
// `src/lib/supabase/types.ts` au même format que « supabase gen types
// --lang=typescript --linked --schema public » : `type Database` avec
// `Tables[t].Row/Insert/Update/Relationships`, `Views`, `Functions`
// (`Args`/`Returns`), `Enums`, `CompositeTypes`, plus les types utilitaires
// `Tables<>`, `TablesInsert<>`, `TablesUpdate<>`, `Enums<>`,
// `CompositeTypes<>` et la constante `Constants`.
//
// Utilise Node pur (aucune dépendance npm) : uniquement `node:child_process`
// pour appeler `psql` et `node:fs` pour écrire le fichier.
//
// Préparer une base à jour avant d'exécuter ce script :
//   PG_DB=citesavante_types SANS_DEMO=1 bash scripts/valider-base.sh
//   PG_DB=citesavante_types node scripts/generer-types.mjs
// (ou `pnpm db:types`, qui appelle ce script).
//
// Variables (mêmes noms et mêmes défauts que scripts/valider-base.sh) :
//   PG_BIN, PG_HOST (localhost), PG_PORT (54390), PG_USER (postgres),
//   PG_DB (citesavante_test).
//
// Ce que le script EXCLUT volontairement (voir PROGRESS.md, phase 1) :
//   - les fonctions dont le nom commence par `test_` : ajoutées par
//     `supabase/tests/00_stubs_supabase.sql`, que `valider-base.sh` applique
//     toujours avant les migrations. Elles n'existeront pas sur le projet
//     Supabase réel ;
//   - les fonctions de déclencheur (`returns trigger`) : non appelables par
//     l'API PostgREST, `supabase gen types` les exclut de même ;
//   - les clés étrangères dont la table référencée n'est pas dans le schéma
//     `public` (les colonnes vers `auth.users`) : hors du périmètre
//     `--schema public`.
// =============================================================================

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");
const FICHIER_SORTIE = join(RACINE, "src", "lib", "supabase", "types.ts");

const PG_BIN = process.env.PG_BIN ?? "C:/Users/agbot/Desktop/pgsql/pgsql/bin";
const PG_HOST = process.env.PG_HOST ?? "localhost";
const PG_PORT = process.env.PG_PORT ?? "54390";
const PG_USER = process.env.PG_USER ?? "postgres";
const PG_DB = process.env.PG_DB ?? "citesavante_test";

const PSQL = join(PG_BIN, process.platform === "win32" ? "psql.exe" : "psql");

// ── Appel psql, une requête = un texte JSON sur la sortie standard ──────────
function interroger(sql) {
  const requeteComplete = `set search_path = '';\n${sql}`;
  const sortie = execFileSync(
    PSQL,
    [
      "-h",
      PG_HOST,
      "-p",
      PG_PORT,
      "-U",
      PG_USER,
      "-d",
      PG_DB,
      "-X",
      "-At",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      requeteComplete,
    ],
    {
      env: { ...process.env, PGCLIENTENCODING: "UTF8", LC_ALL: "C", PGAPPNAME: "generer-types" },
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 64,
    },
  );
  const texte = sortie.trim();
  return texte === "" ? [] : JSON.parse(texte);
}

// ── Requêtes d'introspection (schéma public uniquement) ──────────────────────
const SQL_ENUMS = `
select coalesce(json_agg(
  json_build_object(
    'name', t.typname,
    'values', (
      select json_agg(en.enumlabel order by en.enumsortorder)
      from pg_catalog.pg_enum en where en.enumtypid = t.oid
    )
  )
  order by t.typname
), '[]'::json)::text
from pg_catalog.pg_type t
join pg_catalog.pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typtype = 'e';
`;

const SQL_COLONNES = `
select coalesce(json_agg(
  json_build_object(
    'table', c.table_name,
    'colonne', c.column_name,
    'position', c.ordinal_position,
    'nullable', (c.is_nullable = 'YES'),
    'parDefaut', (c.column_default is not null),
    'identite', c.identity_generation,
    'genere', (c.is_generated = 'ALWAYS'),
    'udt', c.udt_name
  )
  order by c.table_name, c.ordinal_position
), '[]'::json)::text
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema and t.table_name = c.table_name
where c.table_schema = 'public' and t.table_type = 'BASE TABLE';
`;

const SQL_CLES_UNIQUES = `
select coalesce(json_agg(
  json_build_object(
    'table', tbl.relname,
    'colonnes', (
      select json_agg(a.attname order by k.ord)
      from unnest(con.conkey) with ordinality as k(attnum, ord)
      join pg_catalog.pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
    )
  )
), '[]'::json)::text
from pg_catalog.pg_constraint con
join pg_catalog.pg_class tbl on tbl.oid = con.conrelid
join pg_catalog.pg_namespace n on n.oid = tbl.relnamespace
where n.nspname = 'public' and con.contype in ('p', 'u');
`;

const SQL_CLES_ETRANGERES = `
select coalesce(json_agg(
  json_build_object(
    'nom', con.conname,
    'table', src.relname,
    'colonnes', (
      select json_agg(a.attname order by k.ord)
      from unnest(con.conkey) with ordinality as k(attnum, ord)
      join pg_catalog.pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
    ),
    'tableRef', tgt.relname,
    'schemaRef', tgtns.nspname,
    'colonnesRef', (
      select json_agg(a.attname order by k.ord)
      from unnest(con.confkey) with ordinality as k(attnum, ord)
      join pg_catalog.pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum
    )
  )
  order by src.relname, con.conname
), '[]'::json)::text
from pg_catalog.pg_constraint con
join pg_catalog.pg_class src on src.oid = con.conrelid
join pg_catalog.pg_namespace srcns on srcns.oid = src.relnamespace
join pg_catalog.pg_class tgt on tgt.oid = con.confrelid
join pg_catalog.pg_namespace tgtns on tgtns.oid = tgt.relnamespace
where srcns.nspname = 'public' and con.contype = 'f';
`;

const SQL_FONCTIONS = `
select coalesce(json_agg(
  json_build_object(
    'nom', p.proname,
    'args', pg_catalog.pg_get_function_arguments(p.oid),
    'resultat', pg_catalog.pg_get_function_result(p.oid)
  )
  order by p.proname, p.oid
), '[]'::json)::text
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and p.proname not like 'test\\_%'
  and pg_catalog.format_type(p.prorettype, null) <> 'trigger';
`;

// ── Découpage d'une liste « nom type[ DEFAULT expr]» sur les virgules de tête ─
function decouperNiveauSuperieur(texte) {
  const parties = [];
  let profondeur = 0;
  let courant = "";
  for (const caractere of texte) {
    if (caractere === "(") profondeur += 1;
    if (caractere === ")") profondeur -= 1;
    if (caractere === "," && profondeur === 0) {
      parties.push(courant);
      courant = "";
    } else {
      courant += caractere;
    }
  }
  if (courant.trim() !== "") parties.push(courant);
  return parties.map((p) => p.trim()).filter((p) => p !== "");
}

// `pg_get_function_arguments`/`pg_get_function_result` renvoient des
// déclarations « nom type » ou « nom type DEFAULT expression ».
function analyserArguments(texte) {
  if (!texte || texte.trim() === "") return [];
  return decouperNiveauSuperieur(texte).map((partie) => {
    const correspondance = partie.match(/\sDEFAULT\s/i);
    const declaration = correspondance ? partie.slice(0, correspondance.index).trim() : partie;
    const aDefaut = Boolean(correspondance);
    const espace = declaration.indexOf(" ");
    const nom = declaration.slice(0, espace);
    const type = declaration.slice(espace + 1).trim();
    return { nom, type, aDefaut };
  });
}

// ── Correspondance des types PostgreSQL vers TypeScript ─────────────────────
// D'après `information_schema.columns.udt_name` (colonnes de table).
function typeDepuisUdt(udt, nomsEnums) {
  if (nomsEnums.has(udt)) return `Database["public"]["Enums"]["${udt}"]`;
  switch (udt) {
    case "uuid":
    case "text":
    case "varchar":
    case "bpchar":
    case "date":
    case "timestamptz":
    case "timestamp":
    case "time":
    case "timetz":
      return "string";
    case "bool":
      return "boolean";
    case "int2":
    case "int4":
    case "int8":
    case "float4":
    case "float8":
    case "numeric":
      return "number";
    case "json":
    case "jsonb":
      return "Json";
    default:
      return "unknown"; // notamment tsvector (colonnes « recherche »)
  }
}

// D'après le texte de `pg_get_function_arguments`/`pg_get_function_result`
// (noms de types humains ; « public.xxx » une fois `search_path` vidé).
function typeDepuisSignature(texte, nomsEnums) {
  const brut = texte.trim();
  const sansSchema = brut.startsWith("public.") ? brut.slice("public.".length) : brut;
  if (nomsEnums.has(sansSchema)) return `Database["public"]["Enums"]["${sansSchema}"]`;
  switch (sansSchema) {
    case "uuid":
    case "text":
    case "character varying":
    case "character":
    case "date":
    case "timestamp with time zone":
    case "timestamp without time zone":
    case "time with time zone":
    case "time without time zone":
      return "string";
    case "boolean":
      return "boolean";
    case "smallint":
    case "integer":
    case "bigint":
    case "real":
    case "double precision":
    case "numeric":
      return "number";
    case "json":
    case "jsonb":
      return "Json";
    default:
      return "unknown";
  }
}

function indenter(texte, unites = 1) {
  const prefixe = "  ".repeat(unites);
  return texte
    .split("\n")
    .map((ligne) => (ligne === "" ? "" : prefixe + ligne))
    .join("\n");
}

function construireDatabase() {
  const enums = interroger(SQL_ENUMS);
  const nomsEnums = new Set(enums.map((e) => e.name));

  const colonnes = interroger(SQL_COLONNES);
  const clesUniques = interroger(SQL_CLES_UNIQUES);
  const clesEtrangeresBrutes = interroger(SQL_CLES_ETRANGERES);
  const fonctionsBrutes = interroger(SQL_FONCTIONS);

  const tablesNoms = [...new Set(colonnes.map((c) => c.table))].sort((a, b) => a.localeCompare(b));

  const colonnesParTable = new Map();
  for (const nom of tablesNoms) colonnesParTable.set(nom, []);
  for (const c of colonnes) colonnesParTable.get(c.table).push(c);

  // Une combinaison de colonnes compte comme clé (primaire ou unique) si un
  // ensemble EXACTEMENT identique existe pour cette table. Aucune clé
  // étrangère du schéma actuel n'est dans ce cas (`isOneToOne` vaut donc
  // toujours `false` dans le fichier généré) : vérifié séparément avec une
  // table de test temporaire (`discipline_id uuid not null unique
  // references disciplines`), qui a bien produit `isOneToOne: true`, puis
  // supprimée (PROGRESS.md, phase 1).
  function estCleExacte(table, colonnesFk) {
    const cible = [...colonnesFk].sort().join(",");
    return clesUniques.some(
      (k) => k.table === table && [...(k.colonnes ?? [])].sort().join(",") === cible,
    );
  }

  const relationsParTable = new Map();
  for (const nom of tablesNoms) relationsParTable.set(nom, []);
  for (const fk of clesEtrangeresBrutes) {
    if (fk.schemaRef !== "public") continue; // hors périmètre --schema public (auth.users, etc.)
    relationsParTable.get(fk.table).push({
      foreignKeyName: fk.nom,
      columns: fk.colonnes,
      isOneToOne: estCleExacte(fk.table, fk.colonnes),
      referencedRelation: fk.tableRef,
      referencedColumns: fk.colonnesRef,
    });
  }

  // ── Tables ──────────────────────────────────────────────────────────────
  const blocsTables = tablesNoms.map((nomTable) => {
    const cols = colonnesParTable.get(nomTable);
    const lignesRow = [];
    const lignesInsert = [];
    const lignesUpdate = [];

    for (const c of cols) {
      const typeBase = typeDepuisUdt(c.udt, nomsEnums);
      const typeAvecNull = c.nullable ? `${typeBase} | null` : typeBase;
      lignesRow.push(`${c.colonne}: ${typeAvecNull}`);

      const estIdentiteToujours = c.identite === "ALWAYS";
      const estGenereeToujours = c.genere === true;
      if (estIdentiteToujours || estGenereeToujours) {
        lignesInsert.push(`${c.colonne}?: never`);
        lignesUpdate.push(`${c.colonne}?: never`);
        continue;
      }
      const optionnelleEnInsert = c.nullable || c.parDefaut;
      lignesInsert.push(`${c.colonne}${optionnelleEnInsert ? "?" : ""}: ${typeAvecNull}`);
      lignesUpdate.push(`${c.colonne}?: ${typeAvecNull}`);
    }

    const relations = relationsParTable.get(nomTable);
    const relationsTs =
      relations.length === 0
        ? "[]"
        : `[\n${relations
            .map((r) =>
              indenter(
                [
                  "{",
                  `  foreignKeyName: "${r.foreignKeyName}"`,
                  `  columns: [${r.columns.map((c) => `"${c}"`).join(", ")}]`,
                  `  isOneToOne: ${r.isOneToOne}`,
                  `  referencedRelation: "${r.referencedRelation}"`,
                  `  referencedColumns: [${r.referencedColumns.map((c) => `"${c}"`).join(", ")}]`,
                  "}",
                ].join("\n"),
                1,
              ),
            )
            .join(",\n")}\n]`;

    return `    ${nomTable}: {
      Row: {
${indenter(lignesRow.join("\n"), 4)}
      }
      Insert: {
${indenter(lignesInsert.join("\n"), 4)}
      }
      Update: {
${indenter(lignesUpdate.join("\n"), 4)}
      }
      Relationships: ${relationsTs}
    }`;
  });

  // ── Fonctions ───────────────────────────────────────────────────────────
  // Regroupées par nom : plusieurs entrées possibles pour une fonction
  // surchargée (aucune, ici, mais le format le permet).
  const fonctionsParNom = new Map();
  for (const f of fonctionsBrutes) {
    const liste = fonctionsParNom.get(f.nom) ?? [];
    liste.push(f);
    fonctionsParNom.set(f.nom, liste);
  }
  const nomsFonctions = [...fonctionsParNom.keys()].sort((a, b) => a.localeCompare(b));

  function signatureFonction(f) {
    const args = analyserArguments(f.args);
    const argsTs =
      args.length === 0
        ? "Record<PropertyKey, never>"
        : `{\n${indenter(
            args
              .map(
                (a) => `${a.nom}${a.aDefaut ? "?" : ""}: ${typeDepuisSignature(a.type, nomsEnums)}`,
              )
              .join("\n"),
            1,
          )}\n      }`;

    const resultat = f.resultat.trim();
    const correspondanceTable = resultat.match(/^TABLE\((.*)\)$/is);
    let returnsTs;
    if (correspondanceTable) {
      const colonnesTable = analyserArguments(correspondanceTable[1]);
      returnsTs = `{\n${indenter(
        colonnesTable.map((c) => `${c.nom}: ${typeDepuisSignature(c.type, nomsEnums)}`).join("\n"),
        1,
      )}\n      }[]`;
    } else {
      returnsTs = typeDepuisSignature(resultat, nomsEnums);
    }
    return `{\n      Args: ${argsTs}\n      Returns: ${returnsTs}\n    }`;
  }

  const blocsFonctions = nomsFonctions.map((nom) => {
    const signatures = fonctionsParNom.get(nom).map(signatureFonction);
    return `    ${nom}: ${signatures.join("\n      | ")}`;
  });

  // ── Enums ───────────────────────────────────────────────────────────────
  const blocsEnums = enums.map(
    (e) => `    ${e.name}: ${e.values.map((v) => `"${v}"`).join(" | ")}`,
  );

  // ── Constants (valeurs des enums, pour un usage à l'exécution) ──────────
  const blocsConstantesEnums = enums.map(
    (e) => `      ${e.name}: [${e.values.map((v) => `"${v}"`).join(", ")}]`,
  );

  const contenu = `// =============================================================================
// src/lib/supabase/types.ts — GÉNÉRÉ, ne pas modifier à la main
// =============================================================================
// Produit par \`node scripts/generer-types.mjs\` (\`pnpm db:types\`), au même
// format que « supabase gen types --lang=typescript --linked --schema public »
// (PROGRESS.md, phase 1, point 5, en donne le détail et les choix de format).
// Base source : ${PG_DB} (grappe locale, port ${PG_PORT}).
// Régénérer après toute migration : PG_DB=... bash scripts/valider-base.sh
// puis PG_DB=... pnpm db:types.
// =============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
${blocsTables.join("\n")}
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
${blocsFonctions.join("\n")}
    }
    Enums: {
${blocsEnums.join("\n")}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
${blocsConstantesEnums.join(",\n")}
    },
  },
} as const
`;

  return contenu;
}

function main() {
  const contenu = construireDatabase();
  mkdirSync(dirname(FICHIER_SORTIE), { recursive: true });
  writeFileSync(FICHIER_SORTIE, contenu, "utf8");
  process.stdout.write(`Écrit : ${FICHIER_SORTIE}\n`);
}

main();
