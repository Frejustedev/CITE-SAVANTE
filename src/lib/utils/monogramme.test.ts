import { describe, expect, it } from "vitest";

import {
  CARACTERES_MAX_MONOGRAMME,
  HAUTEUR_CAPITALES_MIN_PX,
  INTERLIGNE_DEUX_LIGNES,
  LARGEUR_TEXTE_MONOGRAMME,
  RAPPORT_CAPITALES,
  RESSERREMENT_MAX,
  TAILLE_LISIBLE,
  TAILLE_MAX_DEUX_LIGNES,
  TAILLE_MAX_UNE_LIGNE,
  TAILLE_MIN_MONOGRAMME,
  disposerMonogramme,
  hauteurCapitalesPx,
  largeurEstimee,
  resserrementNecessaire,
} from "./monogramme";

/** Sigles réalistes de 1 à 8 caractères (données de démonstration et formes courantes). */
const SIGLES_COURANTS = [
  "SBC",
  "SBMI",
  "ABDE",
  "ABIN",
  "ABPN",
  "SBGEO",
  "ABENV",
  "SBSHS",
  "SBAGRO",
  "SOBEPED",
  "SOBENCHI",
  "SOBÉPED",
  "UAC FSS",
  "UAC-FSS",
  "S.B.C.",
  "ASBEMI",
  "SOBAPRA",
];

describe("disposerMonogramme : lisibilité sur la carte de 64 px", () => {
  it("seuil : capitales de 11 px à 64 px", () => {
    expect(hauteurCapitalesPx(TAILLE_LISIBLE)).toBeGreaterThanOrEqual(HAUTEUR_CAPITALES_MIN_PX);
    expect(hauteurCapitalesPx(TAILLE_LISIBLE - 0.1)).toBeLessThan(HAUTEUR_CAPITALES_MIN_PX);
  });

  it.each(SIGLES_COURANTS)(
    "%s : capitales d'au moins 11 px, sans compression, sur deux lignes au plus",
    (sigle) => {
      const { lignes, taillePolice } = disposerMonogramme(sigle);
      expect(lignes.length).toBeGreaterThanOrEqual(1);
      expect(lignes.length).toBeLessThanOrEqual(2);
      expect(hauteurCapitalesPx(taillePolice)).toBeGreaterThanOrEqual(HAUTEUR_CAPITALES_MIN_PX);
      for (const ligne of lignes) {
        expect(ligne.compresser).toBe(false);
        expect(largeurEstimee(ligne.texte) * taillePolice).toBeLessThanOrEqual(
          LARGEUR_TEXTE_MONOGRAMME,
        );
      }
    },
  );

  // Resserrement (décision du coordinateur après la vérification complète de
  // la phase 2) : les sigles dont la meilleure disposition tombait sous 11 px
  // (ZTESTMMW 9,95 px, SOBENCHIR 9,41 px, ABMHEPAT ≈ 10,3 px) passent à
  // `TAILLE_LISIBLE`, la seule ligne qui déborderait étant resserrée de 15 %
  // au plus. Les valeurs sont figées ici : si la disposition change, ces tests
  // le signalent.
  it("resserrement : 8 caractères riches en lettres larges (ZTESTMMW, 9,95 → 11 px)", () => {
    const disposition = disposerMonogramme("ZTESTMMW");
    expect(disposition.lignes).toEqual([
      { texte: "ZTEST", compresser: true },
      { texte: "MMW", compresser: false },
    ]);
    expect(disposition.taillePolice).toBe(TAILLE_LISIBLE);
    expect(hauteurCapitalesPx(disposition.taillePolice)).toBeCloseTo(11.02, 2);
    expect(resserrementNecessaire("ZTEST", disposition.taillePolice)).toBeCloseTo(0.096, 3);
    expect(resserrementNecessaire("MMW", disposition.taillePolice)).toBe(0);
  });

  it("resserrement : sigle réel de 9 caractères de seed.sql (SOBENCHIR, 9,41 → 11 px)", () => {
    // Au-delà de l'arbitrage (8 caractères) ; « SOBENCHI » de SIGLES_COURANTS
    // n'est pas ce sigle.
    const disposition = disposerMonogramme("SOBENCHIR");
    expect(disposition.lignes).toEqual([
      { texte: "SOBE", compresser: false },
      { texte: "NCHIR", compresser: true },
    ]);
    expect(disposition.taillePolice).toBe(TAILLE_LISIBLE);
    expect(hauteurCapitalesPx(disposition.taillePolice)).toBeCloseTo(11.02, 2);
    expect(resserrementNecessaire("NCHIR", disposition.taillePolice)).toBeCloseTo(0.143, 3);
    expect(resserrementNecessaire("SOBE", disposition.taillePolice)).toBe(0);
  });

  it("resserrement : ligne de 4 lettres dont deux très larges (ABMH / EPAT)", () => {
    const disposition = disposerMonogramme("ABMHEPAT");
    expect(disposition.lignes).toEqual([
      { texte: "ABMH", compresser: true },
      { texte: "EPAT", compresser: false },
    ]);
    expect(disposition.taillePolice).toBe(TAILLE_LISIBLE);
    expect(resserrementNecessaire("ABMH", disposition.taillePolice)).toBeCloseTo(0.069, 3);
  });

  it("limite connue : au-delà de 15 % de resserrement, rien n'est resserré (MMWWMMWW, ≈ 8 px)", () => {
    // Pire cas théorique (8 lettres M ou W) : il faudrait resserrer « MMWW » de
    // 25 % à `TAILLE_LISIBLE` ; le sigle reste plus petit, sans déformation.
    const pire = disposerMonogramme("MMWWMMWW");
    expect(pire.lignes.map((ligne) => ligne.texte)).toEqual(["MMWW", "MMWW"]);
    expect(pire.taillePolice).toBe(18.5);
    expect(hauteurCapitalesPx(pire.taillePolice)).toBeGreaterThanOrEqual(8);
    expect(hauteurCapitalesPx(pire.taillePolice)).toBeLessThan(HAUTEUR_CAPITALES_MIN_PX);
    expect(resserrementNecessaire("MMWW", TAILLE_LISIBLE)).toBeGreaterThan(RESSERREMENT_MAX);
    expect(pire.lignes.every((ligne) => !ligne.compresser)).toBe(true);
  });

  it("resserrement borné : 15 % au plus, et seulement pour atteindre 11 px", () => {
    for (const sigle of [
      ...SIGLES_COURANTS,
      "ZTESTMMW",
      "SOBENCHIR",
      "ABMHEPAT",
      "MMWWMMWW",
      "WWW",
      "MMWW",
      "HMWMHM",
      "WWMMHH",
      "SOBENCHIRMW",
    ]) {
      const { lignes, taillePolice } = disposerMonogramme(sigle);
      // Hors dernier recours (taille minimale), une ligne n'est resserrée que
      // pour porter le sigle à 11 px, et de 15 % au plus ; les lignes non
      // resserrées tiennent sans déformation (test « aucune ligne non
      // compressée ne dépasse la largeur disponible »).
      if (taillePolice === TAILLE_MIN_MONOGRAMME) continue;
      for (const ligne of lignes.filter((ligne) => ligne.compresser)) {
        const resserrement = resserrementNecessaire(ligne.texte, taillePolice);
        expect(taillePolice, sigle).toBe(TAILLE_LISIBLE);
        expect(resserrement, `${sigle} / ${ligne.texte}`).toBeGreaterThan(0);
        expect(resserrement, `${sigle} / ${ligne.texte}`).toBeLessThanOrEqual(RESSERREMENT_MAX);
      }
    }
  });

  it("quatre lettres larges sur deux lignes (MMWW) : au seuil de 11 px", () => {
    const disposition = disposerMonogramme("MMWW");
    expect(disposition.lignes.map((ligne) => ligne.texte)).toEqual(["MM", "WW"]);
    expect(hauteurCapitalesPx(disposition.taillePolice)).toBeGreaterThanOrEqual(
      HAUTEUR_CAPITALES_MIN_PX,
    );
  });

  it("sigles de 5 et 6 lettres de l'annuaire : deux lignes empilées", () => {
    const textes = (sigle: string) => disposerMonogramme(sigle).lignes.map((ligne) => ligne.texte);
    expect(textes("SBGEO")).toEqual(["SB", "GEO"]);
    expect(textes("ABENV")).toEqual(["AB", "ENV"]);
    expect(textes("SBAGRO")).toEqual(["SBA", "GRO"]);
    expect(textes("SOBENCHI")).toEqual(["SOBE", "NCHI"]);
  });

  it("deux lignes : le bloc tient entre les deux filets ornés (y = 20 et y = 80)", () => {
    const taille = TAILLE_MAX_DEUX_LIGNES;
    const hauteurBloc = taille * INTERLIGNE_DEUX_LIGNES + taille * RAPPORT_CAPITALES;
    // Losanges des filets : de y = 17 à 23 et de 77 à 83.
    expect(50 - hauteurBloc / 2).toBeGreaterThan(23);
    expect(50 + hauteurBloc / 2).toBeLessThan(77);
  });
});

describe("disposerMonogramme", () => {
  it("sigle court : une ligne, à la taille maximale", () => {
    expect(disposerMonogramme("SBC")).toEqual({
      lignes: [{ texte: "SBC", compresser: false }],
      taillePolice: TAILLE_MAX_UNE_LIGNE,
    });
  });

  it("sigle de 4 lettres : une ligne, plus petite que pour 3 lettres", () => {
    const disposition = disposerMonogramme("SBMI");
    expect(disposition.lignes).toEqual([{ texte: "SBMI", compresser: false }]);
    expect(disposition.taillePolice).toBeLessThan(TAILLE_MAX_UNE_LIGNE);
    expect(disposition.taillePolice).toBeGreaterThanOrEqual(TAILLE_LISIBLE);
  });

  it("sigle en deux mots trop long pour une ligne : coupé à l'espace", () => {
    const disposition = disposerMonogramme("UAC FSS");
    expect(disposition.lignes.map((ligne) => ligne.texte)).toEqual(["UAC", "FSS"]);
    expect(disposition.taillePolice).toBe(TAILLE_MAX_DEUX_LIGNES);
  });

  it("coupe après le tiret, qui reste en fin de première ligne", () => {
    const disposition = disposerMonogramme("SOCIETE-PEDIATRIE");
    expect(disposition.lignes.map((ligne) => ligne.texte)).toEqual(["SOCIETE-", "PEDIATRIE"]);
    expect(disposition.lignes.every((ligne) => !ligne.compresser)).toBe(true);
  });

  it("sigle court en deux mots : reste sur une ligne", () => {
    expect(disposerMonogramme("A B").lignes).toEqual([{ texte: "A B", compresser: false }]);
  });

  it("sigle très long sans séparateur : deux lignes, taille minimale et compression", () => {
    const disposition = disposerMonogramme("ABCDEFGHKLNOPQRSTUVXYZ");
    expect(disposition.taillePolice).toBe(TAILLE_MIN_MONOGRAMME);
    expect(disposition.lignes).toHaveLength(2);
    expect(disposition.lignes.map((ligne) => ligne.texte).join("")).toBe("ABCDEFGHKLNOPQRSTUVXYZ");
    expect(disposition.lignes.every((ligne) => ligne.compresser)).toBe(true);
  });

  it("coupe au-delà de 24 caractères, avec « … »", () => {
    const disposition = disposerMonogramme("A".repeat(30));
    const texte = disposition.lignes.map((ligne) => ligne.texte).join("");
    expect(Array.from(texte)).toHaveLength(CARACTERES_MAX_MONOGRAMME);
    expect(texte.endsWith("…")).toBe(true);
  });

  it("normalise les espaces et garde la casse", () => {
    expect(disposerMonogramme("  S  b ").lignes.map((ligne) => ligne.texte)).toEqual(["S b"]);
    // Trop long pour une ligne lisible : coupé à l'espace (unique après normalisation).
    expect(disposerMonogramme("  So  BéPed ").lignes.map((ligne) => ligne.texte)).toEqual([
      "So",
      "BéPed",
    ]);
  });

  it("sigle vide : aucune ligne (ornement seul)", () => {
    expect(disposerMonogramme("").lignes).toEqual([]);
    expect(disposerMonogramme("   ").lignes).toEqual([]);
  });

  it("aucune ligne non compressée ne dépasse la largeur disponible", () => {
    for (const sigle of [
      ...SIGLES_COURANTS,
      "MMWWMMWW",
      "IIIIIIII",
      "SOCIETE-PEDIATRIE",
      "Société béninoise de pédiatrie",
      "W".repeat(40),
      "12345678901",
      "ŒÆÐÞ",
    ]) {
      const { lignes, taillePolice } = disposerMonogramme(sigle);
      expect(taillePolice).toBeGreaterThanOrEqual(TAILLE_MIN_MONOGRAMME);
      expect(taillePolice).toBeLessThanOrEqual(TAILLE_MAX_UNE_LIGNE);
      if (lignes.length === 2) expect(taillePolice).toBeLessThanOrEqual(TAILLE_MAX_DEUX_LIGNES);
      for (const ligne of lignes) {
        if (!ligne.compresser) {
          expect(largeurEstimee(ligne.texte) * taillePolice, sigle).toBeLessThanOrEqual(
            LARGEUR_TEXTE_MONOGRAMME,
          );
        }
      }
    }
  });
});
