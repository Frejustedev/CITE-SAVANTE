// Les copies de `assets/polices/` doivent rester identiques aux fichiers de
// `@fontsource` (voir l'en-tête de `polices.ts`). Après une mise à jour du paquet,
// ces tests échouent tant que les copies n'ont pas été refaites.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { FAMILLE_TEXTE, FAMILLE_TITRE, chargerPolicesApercu } from "@/lib/og/polices";

// Espion transparent : les octets restent ceux du disque, seuls les chemins lus
// sont notés. Comme les copies sont identiques aux fichiers du paquet, les octets
// seuls ne diraient pas d'où le chargeur a lu.
vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, readFile: vi.fn(original.readFile) };
});

const POLICES = [
  {
    paquet: "fraunces",
    fichier: "fraunces-latin-500-normal.woff",
    name: FAMILLE_TITRE,
    weight: 500,
  },
  {
    paquet: "fraunces",
    fichier: "fraunces-latin-700-normal.woff",
    name: FAMILLE_TITRE,
    weight: 700,
  },
  {
    paquet: "eb-garamond",
    fichier: "eb-garamond-latin-400-normal.woff",
    name: FAMILLE_TEXTE,
    weight: 400,
  },
  {
    paquet: "eb-garamond",
    fichier: "eb-garamond-latin-500-normal.woff",
    name: FAMILLE_TEXTE,
    weight: 500,
  },
] as const;

const LICENCES = ["OFL-fraunces.txt", "OFL-eb-garamond.txt"] as const;

function cheminCopie(fichier: string): string {
  return join(process.cwd(), "assets/polices", fichier);
}

function empreinte(octets: Uint8Array): string {
  return createHash("sha256").update(octets).digest("hex");
}

describe("copies des polices des aperçus", () => {
  it.each(POLICES)("$fichier est identique au fichier de @fontsource/$paquet", (police) => {
    const copie = cheminCopie(police.fichier);
    const source = join(
      process.cwd(),
      "node_modules/@fontsource",
      police.paquet,
      "files",
      police.fichier,
    );
    const consigne = `Recopiez ${source} vers ${copie}.`;

    expect(existsSync(source), `Fichier absent du paquet installé : ${source}.`).toBe(true);
    expect(existsSync(copie), `Copie absente : ${copie}. ${consigne}`).toBe(true);
    expect(
      empreinte(readFileSync(copie)),
      `La copie ${police.fichier} diffère du fichier de @fontsource/${police.paquet}. ${consigne}`,
    ).toBe(empreinte(readFileSync(source)));
  });

  it.each(LICENCES)("la licence %s accompagne les polices", (licence) => {
    const chemin = cheminCopie(licence);

    expect(existsSync(chemin), `Licence absente : ${chemin}.`).toBe(true);
    expect(
      readFileSync(chemin, "utf8"),
      `${licence} ne contient pas le texte de la licence SIL OFL.`,
    ).toContain("SIL Open Font License, Version 1.1");
  });
});

describe("chargerPolicesApercu", () => {
  it("rend les quatre polices, lues dans assets/polices", async () => {
    const polices = await chargerPolicesApercu();

    expect(polices.map(({ name, weight, style }) => ({ name, weight, style }))).toEqual(
      POLICES.map(({ name, weight }) => ({ name, weight, style: "normal" })),
    );
    expect(
      vi.mocked(readFile).mock.calls.map(([chemin]) => chemin),
      "Le chargeur doit lire les copies de assets/polices, pas le paquet.",
    ).toEqual(POLICES.map(({ fichier }) => cheminCopie(fichier)));
    expect(
      polices.map(({ data }) => empreinte(new Uint8Array(data))),
      "Les octets rendus doivent être ceux des copies.",
    ).toEqual(POLICES.map(({ fichier }) => empreinte(readFileSync(cheminCopie(fichier)))));
  });
});
