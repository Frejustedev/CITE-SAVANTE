import { describe, expect, it } from "vitest";

import { premiereLettreMajuscule } from "./texte";

describe("premiereLettreMajuscule", () => {
  it("met la première lettre en capitale", () => {
    expect(premiereLettreMajuscule("du 12 au 14 mars 2027")).toBe("Du 12 au 14 mars 2027");
    expect(premiereLettreMajuscule("lundi 12 octobre")).toBe("Lundi 12 octobre");
    expect(premiereLettreMajuscule("écoles")).toBe("Écoles");
  });

  it("laisse le texte vide et un texte déjà en capitale tels quels", () => {
    expect(premiereLettreMajuscule("")).toBe("");
    expect(premiereLettreMajuscule("Cotonou")).toBe("Cotonou");
  });

  it("ne coupe jamais un caractère hors du plan de base", () => {
    expect(premiereLettreMajuscule("\u{1D49C}bc")).toBe("\u{1D49C}bc");
    expect(premiereLettreMajuscule("\u{1D49C}bc").isWellFormed()).toBe(true);
  });
});
