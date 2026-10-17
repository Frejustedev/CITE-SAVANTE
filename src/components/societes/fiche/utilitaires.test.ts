import { describe, expect, it } from "vitest";

import {
  LONGUEUR_MAX_DESCRIPTION_META,
  categorieDansUnePhrase,
  descriptionFiche,
  estPaysBenin,
  hrefTelephoneInternational,
  nomCompletDistinct,
  nomHote,
  paragraphes,
  resumerTexte,
  titreFiche,
} from "./utilitaires";

describe("paragraphes", () => {
  it("sépare les paragraphes sur les lignes vides et garde les retours à la ligne simples", () => {
    expect(paragraphes("Premier.\nSuite du premier.\n\n  \nSecond.\r\n\r\nTroisième.")).toEqual([
      ["Premier.", "Suite du premier."],
      ["Second."],
      ["Troisième."],
    ]);
  });

  it("ignore les espaces superflus et les lignes vides", () => {
    expect(paragraphes("   Un    texte  \n   \n\n\n  ")).toEqual([["Un texte"]]);
  });

  it("vide ou absent : aucun paragraphe", () => {
    expect(paragraphes(null)).toEqual([]);
    expect(paragraphes(undefined)).toEqual([]);
    expect(paragraphes("  \n\n ")).toEqual([]);
  });

  it("laisse le HTML tel quel, en texte (l'affichage l'échappe)", () => {
    expect(paragraphes("<b>gras</b>")).toEqual([["<b>gras</b>"]]);
  });
});

describe("resumerTexte", () => {
  it("texte court : inchangé, espaces ramenés à une seule", () => {
    expect(resumerTexte("  Une   phrase\ncourte. ", 160)).toBe("Une phrase courte.");
  });

  it("texte long : coupé à la fin d'un mot, « … » compris dans la limite", () => {
    const texte =
      "La société réunit les pédiatres du pays autour de congrès annuels et de formations.";
    const resume = resumerTexte(texte, 40);
    expect(resume.length).toBeLessThanOrEqual(40);
    expect(resume).toBe("La société réunit les pédiatres du pays…");
  });

  it("retire la ponctuation finale avant « … »", () => {
    expect(resumerTexte("Un, deux, trois, quatre, cinq, six, sept", 18)).toBe("Un, deux, trois…");
  });

  it("premier mot démesuré : coupé au caractère près", () => {
    expect(resumerTexte("a".repeat(50), 10)).toBe(`${"a".repeat(9)}…`);
  });

  it("vide ou absent : chaîne vide ; longueur invalide : erreur", () => {
    expect(resumerTexte(null, 10)).toBe("");
    expect(resumerTexte("   ", 10)).toBe("");
    expect(() => resumerTexte("texte", 1)).toThrow("Longueur maximale invalide");
  });
});

describe("estPaysBenin", () => {
  it("reconnaît le Bénin quelle que soit la graphie", () => {
    expect(estPaysBenin("Bénin")).toBe(true);
    expect(estPaysBenin(" benin ")).toBe(true);
    expect(estPaysBenin("BÉNIN")).toBe(true);
    expect(estPaysBenin("Togo")).toBe(false);
    expect(estPaysBenin(null)).toBe(false);
  });
});

describe("hrefTelephoneInternational", () => {
  it("garde un numéro déjà international", () => {
    expect(hrefTelephoneInternational("+229 01 97 00 00 00", "Bénin")).toBe("tel:+2290197000000");
    expect(hrefTelephoneInternational("+33 1 23 45 67 89", "Bénin")).toBe("tel:+33123456789");
  });

  it("remplace « 00 » par « + »", () => {
    expect(hrefTelephoneInternational("00229 01-97-00-00-00", "Togo")).toBe("tel:+2290197000000");
  });

  it("ajoute +229 à un numéro béninois à 10 chiffres", () => {
    expect(hrefTelephoneInternational("01 97 00 00 00", "Bénin")).toBe("tel:+2290197000000");
    expect(hrefTelephoneInternational("(01) 97.00.00.00", "benin")).toBe("tel:+2290197000000");
  });

  it("sans indicatif et pays inconnu, étranger ou longueur inattendue : aucun lien", () => {
    expect(hrefTelephoneInternational("01 97 00 00 00", "Togo")).toBeNull();
    expect(hrefTelephoneInternational("97 00 00 00", "Bénin")).toBeNull();
    expect(hrefTelephoneInternational("appeler le secrétariat", "Bénin")).toBeNull();
    expect(hrefTelephoneInternational(null, "Bénin")).toBeNull();
    expect(hrefTelephoneInternational("", "Bénin")).toBeNull();
  });
});

describe("nomHote", () => {
  it("renvoie l'hôte sans « www. »", () => {
    expect(nomHote("https://www.sobeped.org/accueil?x=1")).toBe("sobeped.org");
    expect(nomHote("https://congres.exemple.org")).toBe("congres.exemple.org");
  });

  it("URL illisible : null", () => {
    expect(nomHote("pas une adresse")).toBeNull();
  });
});

describe("nomCompletDistinct et titreFiche", () => {
  it("titre « SIGLE — Nom complet »", () => {
    const societe = { sigle: "SBMI", nomComplet: "Société Béninoise de Médecine Interne" };
    expect(nomCompletDistinct(societe)).toBe("Société Béninoise de Médecine Interne");
    expect(titreFiche(societe)).toBe("SBMI — Société Béninoise de Médecine Interne");
  });

  it("sans nom complet, ou nom identique au sigle : le sigle seul", () => {
    expect(titreFiche({ sigle: "SBMI", nomComplet: null })).toBe("SBMI");
    expect(titreFiche({ sigle: "SBMI", nomComplet: "  " })).toBe("SBMI");
    expect(titreFiche({ sigle: "UAC", nomComplet: "uac" })).toBe("UAC");
  });
});

describe("categorieDansUnePhrase", () => {
  it("met la catégorie en minuscules ; « autre » devient « organisation »", () => {
    expect(categorieDansUnePhrase("societe_savante")).toBe("société savante");
    expect(categorieDansUnePhrase("institution_academique")).toBe("institution académique");
    expect(categorieDansUnePhrase("association_professionnelle")).toBe(
      "association professionnelle",
    );
    expect(categorieDansUnePhrase("autre")).toBe("organisation");
  });
});

describe("resumerTexte : coupe sur des graphèmes", () => {
  const LIVRE = String.fromCodePoint(0x1f4da); // emoji hors du plan de base (2 unités UTF-16)
  const POUCE_TEINTE = String.fromCodePoint(0x1f44d, 0x1f3fd); // emoji + modificateur
  const E_ACCENT_COMBINANT = String.fromCodePoint(0x65, 0x301); // « é » décomposé
  const graphemes = (texte: string) =>
    Array.from(new Intl.Segmenter("fr", { granularity: "grapheme" }).segment(texte));

  it("ne sépare jamais une paire de substitution placée à la coupe", () => {
    const resume = resumerTexte(`${"a".repeat(158)}${LIVRE}${LIVRE} suite`, 160);
    expect(resume.isWellFormed()).toBe(true);
    expect(resume).toBe(`${"a".repeat(158)}${LIVRE}…`);
    expect(graphemes(resume)).toHaveLength(160);
  });

  it("garde entiers un emoji à modificateur et une lettre à accent combinant", () => {
    expect(resumerTexte(`${"a".repeat(8)}${POUCE_TEINTE}${"b".repeat(5)}`, 10)).toBe(
      `${"a".repeat(8)}${POUCE_TEINTE}…`,
    );
    expect(resumerTexte(`${"a".repeat(8)}${E_ACCENT_COMBINANT}${"b".repeat(5)}`, 10)).toBe(
      `${"a".repeat(8)}${E_ACCENT_COMBINANT}…`,
    );
  });

  it("compte en graphèmes : un texte de 160 caractères perçus n'est pas coupé", () => {
    const texte = `${"a".repeat(156)}${LIVRE}${LIVRE}${LIVRE}${LIVRE}`;
    expect(texte.length).toBeGreaterThan(160);
    expect(resumerTexte(texte, 160)).toBe(texte);
  });

  it("aucun demi-caractère dans la description des métadonnées", () => {
    for (let decalage = 150; decalage <= 162; decalage += 1) {
      const description = `${"a".repeat(decalage)}${LIVRE.repeat(10)} fin`;
      const resultat = descriptionFiche({
        sigle: "SBMI",
        nomComplet: null,
        categorie: "societe_savante",
        ville: null,
        description,
      });
      expect(resultat.isWellFormed(), `décalage ${decalage}`).toBe(true);
      expect(graphemes(resultat).length).toBeLessThanOrEqual(LONGUEUR_MAX_DESCRIPTION_META);
    }
  });
});

describe("descriptionFiche", () => {
  const base = {
    sigle: "SBMI",
    nomComplet: "Société Béninoise de Médecine Interne",
    categorie: "societe_savante" as const,
    ville: "Cotonou",
  };

  it("résume la présentation en 160 caractères au plus", () => {
    const description = `${"Présentation détaillée de la société. ".repeat(10)}Fin.`;
    const resultat = descriptionFiche({ ...base, description });
    expect(resultat.length).toBeLessThanOrEqual(LONGUEUR_MAX_DESCRIPTION_META);
    expect(resultat.endsWith("…")).toBe(true);
    expect(resultat).not.toMatch(/\s…$/);
  });

  it("sans présentation : phrase construite avec les seules données de la fiche", () => {
    expect(descriptionFiche({ ...base, description: null })).toBe(
      "SBMI, Société Béninoise de Médecine Interne : société savante à Cotonou. Présentation, contacts et événements.",
    );
    expect(
      descriptionFiche({
        ...base,
        nomComplet: null,
        categorie: "autre",
        ville: null,
        description: "  ",
      }),
    ).toBe("SBMI : organisation. Présentation, contacts et événements.");
  });
});
