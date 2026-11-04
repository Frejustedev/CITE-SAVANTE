import { describe, expect, it } from "vitest";

import {
  PLAGES_COUVERTES,
  estCaractereCouvert,
  estTexteCouvert,
  nettoyerSegmentApercu,
  nettoyerTexteApercu,
} from "@/lib/og/texte";

const NB = " "; // espace insécable

describe("estCaractereCouvert", () => {
  it("couvre le français courant et sa typographie", () => {
    for (const caractere of "aàâäçéèêëîïôöùûüÿœæÀÂÇÉÈÊËÎÏÔÖÙÛÜŒÆ«»’—–…€°·") {
      expect(estCaractereCouvert(caractere.codePointAt(0) ?? 0), caractere).toBe(true);
    }
    expect(estCaractereCouvert(0x00a0)).toBe(true);
  });

  it("ne couvre ni l'espace fine insécable, ni les emoji, ni les écritures non latines", () => {
    for (const caractere of [" ", "😀", "漢", "ɔ", "ɛ", "ɖ", "ł", "ş", "Ÿ", "ź"]) {
      expect(estCaractereCouvert(caractere.codePointAt(0) ?? 0), caractere).toBe(false);
    }
  });

  it("plages triées, sans chevauchement, bornes dans l'ordre", () => {
    for (const [index, [debut, fin]] of PLAGES_COUVERTES.entries()) {
      expect(debut).toBeLessThanOrEqual(fin);
      const precedente = PLAGES_COUVERTES[index - 1];
      if (precedente) expect(debut).toBeGreaterThan(precedente[1]);
    }
  });
});

describe("nettoyerSegmentApercu", () => {
  it("segment sans lettre ni chiffre dessinable : chaîne vide", () => {
    expect(nettoyerSegmentApercu(null)).toBe("");
    expect(nettoyerSegmentApercu(undefined)).toBe("");
    expect(nettoyerSegmentApercu("ɖɔ")).toBe("");
    expect(nettoyerSegmentApercu("🏛️")).toBe("");
    expect(nettoyerSegmentApercu("ɖ-ɔ")).toBe("");
    expect(nettoyerSegmentApercu("ɖ, ɔ")).toBe("");
    expect(nettoyerSegmentApercu("ɖ / ɔ")).toBe("");
  });

  it("aucun séparateur orphelin en bord de segment ni répété", () => {
    expect(nettoyerSegmentApercu("ɖɔ, Ouidah")).toBe("Ouidah");
    expect(nettoyerSegmentApercu("Ouidah, ɖɔ")).toBe("Ouidah");
    expect(nettoyerSegmentApercu("Saint-ɖɔ")).toBe("Saint");
    expect(nettoyerSegmentApercu("Salle, ɖɔ, Annexe")).toBe("Salle, Annexe");
    expect(nettoyerSegmentApercu("Salle — ɖɔ — Annexe")).toBe("Salle — Annexe");
  });

  it("garde tels quels les segments complets et leurs séparateurs utiles", () => {
    for (const segment of ["Porto-Novo", "S-BMI", "A/B", "Hôtel St. Jean", "2iE", "Salle n° 3"]) {
      expect(nettoyerSegmentApercu(segment)).toBe(segment);
    }
  });

  it("le résultat est toujours entièrement couvert", () => {
    expect(estTexteCouvert(nettoyerSegmentApercu("Salle 漢 Ɔkɔ 🎉, ɖ"))).toBe(true);
  });
});

describe("nettoyerTexteApercu", () => {
  it("garde un titre français tel quel", () => {
    const titre = "Congrès de la Société béninoise de pédiatrie — « Santé de l’enfant » (2027)";
    expect(nettoyerTexteApercu(titre)).toBe(titre);
  });

  it("retire les emoji et les caractères non dessinables, sans laisser d'espaces doubles", () => {
    expect(nettoyerTexteApercu("Journées 🎉 scientifiques 漢字 2027")).toBe(
      "Journées scientifiques 2027",
    );
    expect(nettoyerTexteApercu("👩‍⚕️ Atelier")).toBe("Atelier");
  });

  it("garde la lettre de base quand seul l'accent manque", () => {
    expect(nettoyerTexteApercu("București, Ẹ̀kọ́, şehir, Oṣogbo")).toBe(
      "Bucuresti, Èkó, sehir, Osogbo",
    );
  });

  it("lettre de base seule quand la forme recomposée serait absente des polices", () => {
    // « Ÿ » (U+0178) et « ź » (U+017A) manquent, mais Y, z, le tréma et
    // l'accent aigu combinants sont couverts : sans précaution, la
    // recomposition finale (NFC) redonnerait le caractère absent.
    expect(nettoyerTexteApercu("L’HAŸ-LES-ROSES")).toBe("L’HAY-LES-ROSES");
    expect(nettoyerTexteApercu("Łódź")).toBe("ódz");
    expect(nettoyerTexteApercu("Be\u0301nin")).toBe("Bénin");
  });

  it("aucun accent laissé seul : retiré avec sa lettre absente, ou détaché d'une lettre sans forme composée", () => {
    expect(nettoyerTexteApercu("Hɔ̀gbonu")).toBe("Hgbonu");
    expect(nettoyerTexteApercu("H\u0300 \u0301x")).toBe("H x");
  });

  it("retire les lettres sans équivalent (limite connue : fon, IPA)", () => {
    expect(nettoyerTexteApercu("Hɔ̀gbonu Łódź")).toBe("Hgbonu ódź".replace("ź", "z"));
  });

  it("limite acceptée pour les titres : l'apostrophe reste, la lettre absente disparaît", () => {
    expect(nettoyerTexteApercu("Congrès ɖ’Abomey")).toBe("Congrès ’Abomey");
  });

  it("compose les accents décomposés (NFD → NFC)", () => {
    const decompose = "Pédiatrie";
    expect(nettoyerTexteApercu(decompose)).toBe("Pédiatrie");
  });

  it("ramène espaces typographiques et tirets à leur équivalent couvert", () => {
    expect(nettoyerTexteApercu("1 000 participants")).toBe(`1${NB}000 participants`);
    expect(nettoyerTexteApercu("Pré‑congrès : ateliers")).toBe("Pré-congrès : ateliers");
  });

  it("met sur une ligne : retours, tabulations et caractères invisibles", () => {
    expect(nettoyerTexteApercu("  Colloque\n\tinter­national​  ")).toBe("Colloque international");
  });

  it("garde les espaces insécables intérieures, retire celles des bords", () => {
    expect(nettoyerTexteApercu(`${NB}Date${NB}: 12 mars${NB}`)).toBe(`Date${NB}: 12 mars`);
  });

  it("texte absent ou sans caractère dessinable : chaîne vide", () => {
    expect(nettoyerTexteApercu(null)).toBe("");
    expect(nettoyerTexteApercu(undefined)).toBe("");
    expect(nettoyerTexteApercu("😀 漢字 ")).toBe("");
  });

  it("le résultat est toujours entièrement couvert", () => {
    const echantillons = [
      "Congrès 🎉 Ɔ ɛ ɖ — « ẹ̀ » 1 000 €",
      "Ἀθῆναι Москва القاهرة 東京",
      "\u0000\u0007 Séminaire   \u{1F600}",
    ];
    for (const texte of echantillons) {
      expect(estTexteCouvert(nettoyerTexteApercu(texte)), texte).toBe(true);
    }
  });
});
