import { describe, expect, it } from "vitest";

import { RESEAUX, libellesReseaux, normaliserReseaux } from "./reseaux";

describe("normaliserReseaux", () => {
  it("garde les liens https, dans l'ordre d'affichage", () => {
    expect(
      normaliserReseaux({
        youtube: "https://example.org/youtube",
        facebook: "https://example.org/facebook",
        linkedin: " https://example.org/linkedin ",
      }),
    ).toEqual([
      { reseau: "facebook", url: "https://example.org/facebook" },
      { reseau: "linkedin", url: "https://example.org/linkedin" },
      { reseau: "youtube", url: "https://example.org/youtube" },
    ]);
  });

  it("écarte les liens non https, les valeurs non textuelles et les clés inconnues", () => {
    expect(
      normaliserReseaux({
        facebook: "http://example.org/facebook",
        linkedin: "javascript:alert(1)",
        x: 42,
        youtube: { url: "https://example.org" },
        instagram: "https://example.org/instagram",
        whatsapp: "",
      }),
    ).toEqual([]);
  });

  it("WhatsApp : lien https gardé, numéro international converti, numéro local ignoré", () => {
    expect(normaliserReseaux({ whatsapp: "https://example.org/whatsapp" })).toEqual([
      { reseau: "whatsapp", url: "https://example.org/whatsapp" },
    ]);
    expect(normaliserReseaux({ whatsapp: "+229 01 97 00 00 00" })).toEqual([
      { reseau: "whatsapp", url: "https://wa.me/2290197000000" },
    ]);
    expect(normaliserReseaux({ whatsapp: "01 97 00 00 00" })).toEqual([]);
    expect(normaliserReseaux({ whatsapp: "+229" })).toEqual([]);
  });

  it("renvoie une liste vide pour tout ce qui n'est pas un objet", () => {
    for (const brut of [null, undefined, "https://example.org", 42, [], ["https://example.org"]]) {
      expect(normaliserReseaux(brut)).toEqual([]);
    }
  });

  it("a un libellé pour chaque réseau", () => {
    expect(Object.keys(libellesReseaux).sort()).toEqual([...RESEAUX].sort());
  });
});
