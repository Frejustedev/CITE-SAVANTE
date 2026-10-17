import { describe, expect, it } from "vitest";

import {
  LONGUEUR_MAX_TITRE_SLUG,
  dedoublonnerSlug,
  estSlugValide,
  slugEvenement,
  slugSigle,
  slugSociete,
  slugifier,
} from "./slugs";

describe("slugifier", () => {
  it("met en minuscules et retire les accents", () => {
    expect(slugifier("Société Béninoise de Pédiatrie")).toBe("societe-beninoise-de-pediatrie");
    expect(slugifier("Août À Ça Où Île Ü")).toBe("aout-a-ca-ou-ile-u");
  });

  it("traite les ligatures et lettres sans décomposition", () => {
    expect(slugifier("Œuvre cœur Æsculape")).toBe("oeuvre-coeur-aesculape");
    expect(slugifier("Straße")).toBe("strasse");
  });

  it("remplace apostrophes, ponctuation et espaces par un seul tiret", () => {
    expect(slugifier("Association Béninoise d'Informatique")).toBe(
      "association-beninoise-d-informatique",
    );
    expect(slugifier("l’épidémiologie")).toBe("l-epidemiologie");
    expect(slugifier("  Porto-Novo  ")).toBe("porto-novo");
    expect(slugifier("Abomey -- Calavi !!")).toBe("abomey-calavi");
    expect(slugifier("Congrès (2027) : santé & société")).toBe("congres-2027-sante-societe");
  });

  it("garde les chiffres et ne produit que [a-z0-9-]", () => {
    expect(slugifier("5ᵉ Journées 2027")).toBe("5e-journees-2027");
    expect(slugifier("<script>alert(1)</script>")).toBe("script-alert-1-script");
    expect(slugifier("../../etc/passwd")).toBe("etc-passwd");
  });

  it("renvoie une chaîne vide quand il n'y a ni lettre ni chiffre", () => {
    expect(slugifier("")).toBe("");
    expect(slugifier("  -- !! ")).toBe("");
    expect(slugifier("🙂")).toBe("");
  });
});

describe("estSlugValide", () => {
  it("accepte les slugs du site", () => {
    for (const slug of ["sobeped", "demo-sbmi", "congres-sobeped-2027", "a", "2027"]) {
      expect(estSlugValide(slug)).toBe(true);
    }
  });

  it("refuse majuscules, accents, tirets en trop, séparateurs de chemin et vide", () => {
    for (const slug of ["", "Sobeped", "sobépéd", "-sobeped", "sobeped-", "a--b", "a/b", "a b"]) {
      expect(estSlugValide(slug)).toBe(false);
    }
    expect(estSlugValide("a".repeat(121))).toBe(false);
    expect(estSlugValide("a".repeat(120))).toBe(true);
  });
});

describe("slugSociete", () => {
  it("donne le sigle en minuscules (section 7)", () => {
    expect(slugSociete("SOBEPED")).toBe("sobeped");
    expect(slugSociete("SoBéPeD")).toBe("sobeped");
  });

  it("colle un sigle écrit avec des points, des apostrophes ou des espaces", () => {
    expect(slugSociete("S.B.C.")).toBe("sbc");
    expect(slugSociete("S B C")).toBe("sbc");
    expect(slugSociete("S. B. C.")).toBe("sbc");
    expect(slugSociete("S\u00A0B\u00A0C")).toBe("sbc");
    expect(slugSociete("SOB'AN")).toBe("soban");
    expect(slugSociete("SOB\u2019AN")).toBe("soban");
    expect(slugSociete(" UAC FSS ")).toBe("uacfss");
    expect(slugSociete("Sobéped.")).toBe("sobeped");
  });

  it("garde le tiret d'un sigle et remplace les autres signes par un tiret", () => {
    expect(slugSociete("UAC-FSS")).toBe("uac-fss");
    expect(slugSociete("A&B")).toBe("a-b");
    expect(slugSociete("S.B.C./FSS")).toBe("sbc-fss");
  });

  it("lève une erreur si le sigle ne contient ni lettre ni chiffre", () => {
    expect(() => slugSociete("")).toThrow(/ni lettre ni chiffre/);
    expect(() => slugSociete(" - ")).toThrow(/ni lettre ni chiffre/);
  });
});

describe("slugSigle", () => {
  it("écrit le sigle comme le slug de la fiche", () => {
    for (const sigle of ["S.B.C.", "S B C", "SOB\u2019AN", "UAC-FSS", "SoBéPeD"]) {
      expect(slugSigle(sigle)).toBe(slugSociete(sigle));
    }
    expect(slugSigle(" . ")).toBe("");
  });
});

describe("slugEvenement", () => {
  it("écrit le sigle de l'organisateur comme le slug de sa fiche", () => {
    expect(
      slugEvenement({ type: "congres", sigleOrganisateur: "S.B.C.", annee: 2027, titre: "x" }),
    ).toBe("congres-sbc-2027");
    expect(
      slugEvenement({ type: "journees", sigleOrganisateur: "UAC FSS", annee: 2027, titre: "x" }),
    ).toBe("journees-uacfss-2027");
  });

  it("type-sigle-annee quand un organisateur est connu (section 7)", () => {
    expect(
      slugEvenement({
        type: "congres",
        sigleOrganisateur: "SOBEPED",
        annee: 2027,
        titre: "Congrès de pédiatrie",
      }),
    ).toBe("congres-sobeped-2027");
    expect(
      slugEvenement({ type: "journees", sigleOrganisateur: "SBMI", annee: 2026, titre: "x" }),
    ).toBe("journees-sbmi-2026");
  });

  it("titre-annee sans organisateur", () => {
    expect(
      slugEvenement({
        type: "colloque",
        sigleOrganisateur: null,
        annee: 2027,
        titre: "Colloque international d'épidémiologie",
      }),
    ).toBe("colloque-international-d-epidemiologie-2027");
    expect(
      slugEvenement({ type: "atelier", sigleOrganisateur: "  ", annee: 2027, titre: "Atelier R" }),
    ).toBe("atelier-r-2027");
  });

  it("titre-annee pour le type « autre », même avec un organisateur", () => {
    expect(
      slugEvenement({
        type: "autre",
        sigleOrganisateur: "SOBEPED",
        annee: 2027,
        titre: "Remise des prix",
      }),
    ).toBe("remise-des-prix-2027");
  });

  it("ne répète pas l'année déjà présente dans le titre", () => {
    expect(slugEvenement({ type: "congres", annee: 2027, titre: "Congrès 2027" })).toBe(
      "congres-2027",
    );
    expect(slugEvenement({ type: "journees", annee: 2027, titre: "2027 : journées" })).toBe(
      "2027-journees",
    );
    // « 20270 » n'est pas l'année : on l'ajoute.
    expect(slugEvenement({ type: "autre", annee: 2027, titre: "Code 20270" })).toBe(
      "code-20270-2027",
    );
  });

  it("coupe un titre très long sur une limite de mot", () => {
    const titre = "Journées scientifiques ".repeat(10);
    const slug = slugEvenement({ type: "journees", annee: 2027, titre });
    expect(slug.endsWith("-2027")).toBe(true);
    const partieTitre = slug.slice(0, -"-2027".length);
    expect(partieTitre.length).toBeLessThanOrEqual(LONGUEUR_MAX_TITRE_SLUG);
    // Coupé entre deux mots, jamais au milieu d'un mot.
    expect(partieTitre).toMatch(/^journees-scientifiques(-(journees|scientifiques))*$/);
    expect(estSlugValide(slug)).toBe(true);
  });

  it("dernier recours : type-annee si le titre n'a ni lettre ni chiffre", () => {
    expect(slugEvenement({ type: "webinaire", annee: 2027, titre: "!!!" })).toBe("webinaire-2027");
    expect(
      slugEvenement({ type: "autre", sigleOrganisateur: "SBC", annee: 2027, titre: "…" }),
    ).toBe("autre-sbc-2027");
  });

  it("refuse une année invalide", () => {
    expect(() => slugEvenement({ type: "congres", annee: 27, titre: "x" })).toThrow(
      /Année invalide/,
    );
    expect(() => slugEvenement({ type: "congres", annee: 2027.5, titre: "x" })).toThrow(
      /Année invalide/,
    );
  });

  it("produit toujours un slug valide", () => {
    for (const titre of ["Œcuménisme & santé", "Atelier « IA »", "Séminaire n° 3"]) {
      expect(estSlugValide(slugEvenement({ type: "seminaire", annee: 2027, titre }))).toBe(true);
    }
  });
});

describe("dedoublonnerSlug", () => {
  it("garde le slug s'il est libre", () => {
    expect(dedoublonnerSlug("sobeped", [])).toBe("sobeped");
    expect(dedoublonnerSlug("sobeped", ["sbc", "sobeped-2"])).toBe("sobeped");
  });

  it("ajoute -2, puis -3… en cas de collision (section 7)", () => {
    expect(dedoublonnerSlug("sobeped", ["sobeped"])).toBe("sobeped-2");
    expect(dedoublonnerSlug("sobeped", ["sobeped", "sobeped-2"])).toBe("sobeped-3");
    expect(dedoublonnerSlug("sobeped", new Set(["sobeped", "sobeped-2", "sobeped-4"]))).toBe(
      "sobeped-3",
    );
  });

  it("ne prend jamais une année finale pour un suffixe de collision", () => {
    expect(dedoublonnerSlug("congres-sobeped-2027", ["congres-sobeped-2027"])).toBe(
      "congres-sobeped-2027-2",
    );
    expect(dedoublonnerSlug("congres-2", ["congres-2"])).toBe("congres-2-2");
  });
});
