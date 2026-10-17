import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { couleursCharte, couplesUtilises, rapportDuCouple } from "./charte";
import { respecteAA } from "./utils/contraste";

describe("charte graphique", () => {
  it("reprend exactement les jetons de couleur déclarés dans globals.css", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    const jetonsCss = Object.fromEntries(
      [...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, nom, valeur]) => [
        nom,
        valeur.toUpperCase(),
      ]),
    );
    const jetonsTs = Object.fromEntries(
      couleursCharte.map(({ jeton, valeur }) => [jeton, valeur.toUpperCase()]),
    );

    expect(jetonsCss).toEqual(jetonsTs);
  });

  it("badge « urgent » : texte encre sur fond or, rapport ≈ 5,66:1 (conforme AA)", () => {
    const couple = couplesUtilises.find(
      (candidat) =>
        candidat.premierPlan === "encre" && candidat.fond === "or" && candidat.nature === "texte",
    );
    expect(couple).toBeDefined();
    const rapport = rapportDuCouple(couple!);
    expect(rapport).toBeCloseTo(5.66, 2);
    expect(respecteAA(rapport, "texte")).toBe(true);
  });

  it.each(couplesUtilises.map((couple) => [couple.usage, couple] as const))(
    "respecte le contraste AA : %s",
    (_usage, couple) => {
      expect(respecteAA(rapportDuCouple(couple), couple.nature)).toBe(true);
    },
  );
});
