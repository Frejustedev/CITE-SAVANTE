import { describe, expect, it } from "vitest";
import { composer, hexVersRvb, luminanceRelative, rapportContraste, respecteAA } from "./contraste";

describe("contraste WCAG", () => {
  it("lit les notations hexadécimales longues et courtes", () => {
    expect(hexVersRvb("#6B1E2E")).toEqual({ r: 107, v: 30, b: 46 });
    expect(hexVersRvb("#fff")).toEqual({ r: 255, v: 255, b: 255 });
    expect(() => hexVersRvb("#12")).toThrow();
  });

  it("donne une luminance de 0 pour le noir et de 1 pour le blanc", () => {
    expect(luminanceRelative("#000000")).toBe(0);
    expect(luminanceRelative("#FFFFFF")).toBeCloseTo(1, 10);
  });

  it("calcule 21:1 pour noir sur blanc et 1:1 pour deux couleurs identiques", () => {
    expect(rapportContraste("#000000", "#FFFFFF")).toBeCloseTo(21, 10);
    expect(rapportContraste("#FFFFFF", "#000000")).toBeCloseTo(21, 10);
    expect(rapportContraste("#6B1E2E", "#6B1E2E")).toBe(1);
  });

  it("retrouve une valeur de référence connue (#777777 sur blanc ≈ 4,48:1)", () => {
    expect(rapportContraste("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  it("compose une couleur semi-transparente sur son fond", () => {
    expect(composer("#000000", 0.5, "#FFFFFF")).toEqual({ r: 127.5, v: 127.5, b: 127.5 });
    expect(composer("#6B1E2E", 1, "#FFFFFF")).toEqual(hexVersRvb("#6B1E2E"));
  });

  it("applique les seuils AA selon la nature de l'élément", () => {
    expect(respecteAA(4.5, "texte")).toBe(true);
    expect(respecteAA(4.49, "texte")).toBe(false);
    expect(respecteAA(3, "grand-texte")).toBe(true);
    expect(respecteAA(2.99, "non-textuel")).toBe(false);
    expect(respecteAA(1.1, "decoratif")).toBe(true);
  });
});
