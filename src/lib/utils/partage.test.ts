import { describe, expect, it } from "vitest";

import type { EvenementExportable } from "./ics";
import {
  datesGoogleAgenda,
  lienCarte,
  lienGoogleAgenda,
  lienWhatsApp,
  texteWhatsApp,
} from "./partage";

const URL_FICHE = "https://citesavante.com/agenda/demo-congres-pediatrie-cotonou";

function evenement(surcharges: Partial<EvenementExportable> = {}): EvenementExportable {
  return {
    id: "ee110000-0000-0000-0000-000000000001",
    titre: "[DÉMO] Congrès de pédiatrie",
    resume: "Santé de l'enfant & nutrition.",
    dateDebut: "2027-03-12",
    dateFin: "2027-03-14",
    heureDebut: null,
    modalite: "presentiel",
    lieuNom: "Palais des congrès",
    adresse: null,
    ville: "Cotonou",
    pays: "Bénin",
    ...surcharges,
  };
}

/** Paramètres d'un lien, décodés. */
function parametres(lien: string): URLSearchParams {
  return new URL(lien).searchParams;
}

describe("lienGoogleAgenda", () => {
  it("journées entières : dates AAAAMMJJ/AAAAMMJJ, fin exclusive, sans ctz", () => {
    const lien = lienGoogleAgenda(evenement(), URL_FICHE);
    expect(lien.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE&")).toBe(
      true,
    );
    expect(lien).toContain("&dates=20270312/20270315&");
    const p = parametres(lien);
    expect(p.get("action")).toBe("TEMPLATE");
    expect(p.get("text")).toBe("[DÉMO] Congrès de pédiatrie");
    expect(p.get("dates")).toBe("20270312/20270315");
    expect(p.get("details")).toBe(`Santé de l'enfant & nutrition.\n\nDétails : ${URL_FICHE}`);
    expect(p.get("location")).toBe("Palais des congrès, Cotonou, Bénin");
    expect(p.has("ctz")).toBe(false);
  });

  it("encodage : accents en UTF-8, espaces en %20, « & » et « ? » encodés", () => {
    const lien = lienGoogleAgenda(evenement({ titre: "Pédiatrie & santé ? oui" }), URL_FICHE);
    expect(lien).toContain("text=P%C3%A9diatrie%20%26%20sant%C3%A9%20%3F%20oui");
    expect(lien).not.toMatch(/[  éÉ]/);
    expect(lien).not.toContain("+");
  });

  it("un jour avec une heure : AAAAMMJJTHHMMSS, fin = début + 1 h, ctz=Africa/Porto-Novo", () => {
    const lien = lienGoogleAgenda(
      evenement({ dateFin: "2027-03-12", heureDebut: "09:00:00" }),
      URL_FICHE,
    );
    expect(lien).toContain("&dates=20270312T090000/20270312T100000");
    expect(lien.endsWith("&ctz=Africa/Porto-Novo")).toBe(true);
    expect(parametres(lien).get("ctz")).toBe("Africa/Porto-Novo");
  });

  it("plusieurs jours avec une heure : journées entières, heure dans les détails", () => {
    const p = parametres(lienGoogleAgenda(evenement({ heureDebut: "08:30:00" }), URL_FICHE));
    expect(p.get("dates")).toBe("20270312/20270315");
    expect(p.get("details")).toContain("Début le 12 mars 2027 à 8 h 30.");
    expect(p.has("ctz")).toBe(false);
  });

  it("heure de 24 h ou plus : même lien que sans heure, sans ctz ni « à 24 h »", () => {
    const unJour = { dateFin: "2027-03-12" };
    const lienUnJour = lienGoogleAgenda(
      evenement({ ...unJour, heureDebut: "24:00:00" }),
      URL_FICHE,
    );
    expect(lienUnJour).toBe(
      lienGoogleAgenda(evenement({ ...unJour, heureDebut: null }), URL_FICHE),
    );
    expect(parametres(lienUnJour).get("dates")).toBe("20270312/20270313");
    expect(parametres(lienUnJour).has("ctz")).toBe(false);
    const plusieurs = parametres(
      lienGoogleAgenda(evenement({ heureDebut: "24:00:00" }), URL_FICHE),
    );
    expect(plusieurs.get("dates")).toBe("20270312/20270315");
    expect(plusieurs.get("details")).not.toContain("Début le");
    expect(plusieurs.has("ctz")).toBe(false);
  });

  it("à cheval sur deux années et sur deux mois", () => {
    expect(
      datesGoogleAgenda({ dateDebut: "2026-12-30", dateFin: "2027-01-01", heureDebut: null }),
    ).toBe("20261230/20270102");
    expect(
      datesGoogleAgenda({ dateDebut: "2027-03-30", dateFin: "2027-04-01", heureDebut: null }),
    ).toBe("20270330/20270402");
  });

  it("événement en ligne : location « En ligne » ; sans lieu connu : pas de location", () => {
    expect(
      parametres(lienGoogleAgenda(evenement({ modalite: "en_ligne" }), URL_FICHE)).get("location"),
    ).toBe("En ligne");
    expect(
      parametres(lienGoogleAgenda(evenement({ lieuNom: null, ville: null }), URL_FICHE)).has(
        "location",
      ),
    ).toBe(false);
  });
});

describe("texteWhatsApp et lienWhatsApp", () => {
  it("« {titre} — {dates}, {lieu}. Détails : {url} »", () => {
    expect(texteWhatsApp(evenement(), URL_FICHE)).toBe(
      `[DÉMO] Congrès de pédiatrie — du 12 au 14 mars 2027, Palais des congrès, Cotonou. Détails : ${URL_FICHE}`,
    );
  });

  it("un seul jour ; à cheval sur deux mois ; sur deux années", () => {
    expect(texteWhatsApp(evenement({ dateFin: "2027-03-12" }), URL_FICHE)).toContain(
      " — 12 mars 2027, ",
    );
    expect(
      texteWhatsApp(evenement({ dateDebut: "2027-04-30", dateFin: "2027-05-01" }), URL_FICHE),
    ).toContain(" — du 30 avril au 1er mai 2027, ");
    expect(
      texteWhatsApp(evenement({ dateDebut: "2026-12-30", dateFin: "2027-01-02" }), URL_FICHE),
    ).toContain(" — du 30 décembre 2026 au 2 janvier 2027, ");
  });

  it("en ligne, hybride, et présentiel sans lieu (segment omis)", () => {
    expect(texteWhatsApp(evenement({ modalite: "en_ligne" }), URL_FICHE)).toContain(
      "mars 2027, en ligne. Détails",
    );
    expect(texteWhatsApp(evenement({ modalite: "hybride", lieuNom: null }), URL_FICHE)).toContain(
      "mars 2027, Cotonou et en ligne. Détails",
    );
    expect(
      texteWhatsApp(evenement({ modalite: "hybride", lieuNom: null, ville: null }), URL_FICHE),
    ).toContain("mars 2027, en présentiel et en ligne. Détails");
    expect(texteWhatsApp(evenement({ lieuNom: null, ville: null }), URL_FICHE)).toBe(
      `[DÉMO] Congrès de pédiatrie — du 12 au 14 mars 2027. Détails : ${URL_FICHE}`,
    );
  });

  it("le pays et l'adresse ne figurent pas dans la phrase", () => {
    const texte = texteWhatsApp(evenement({ adresse: "12, rue des Écoles" }), URL_FICHE);
    expect(texte).not.toContain("Bénin");
    expect(texte).not.toContain("rue des Écoles");
  });

  it("lien wa.me : texte encodé, décodable à l'identique", () => {
    const lien = lienWhatsApp(evenement({ titre: "Pédiatrie & santé ? #2027" }), URL_FICHE);
    expect(lien.startsWith("https://wa.me/?text=")).toBe(true);
    const encode = lien.slice("https://wa.me/?text=".length);
    expect(encode).not.toMatch(/[ &?#éÉ —]/);
    expect(decodeURIComponent(encode)).toBe(
      texteWhatsApp(evenement({ titre: "Pédiatrie & santé ? #2027" }), URL_FICHE),
    );
    expect(parametres(lien).get("text")).toBe(decodeURIComponent(encode));
  });
});

describe("lienCarte", () => {
  it("recherche OpenStreetMap : lieu, adresse, ville, pays", () => {
    const lien = lienCarte("12, rue des Écoles", "Cotonou", {
      lieuNom: "Palais des congrès",
      pays: "Bénin",
    });
    expect(lien?.startsWith("https://www.openstreetmap.org/search?query=")).toBe(true);
    expect(parametres(lien ?? "").get("query")).toBe(
      "Palais des congrès, 12, rue des Écoles, Cotonou, Bénin",
    );
    expect(lien).toContain("query=Palais%20des%20congr%C3%A8s%2C%2012%2C%20rue");
  });

  it("ville seule ; parties vides ou répétées ignorées", () => {
    expect(parametres(lienCarte(null, "Porto-Novo") ?? "").get("query")).toBe("Porto-Novo");
    expect(
      parametres(lienCarte("  ", " Cotonou ", { lieuNom: " ", pays: "" }) ?? "").get("query"),
    ).toBe("Cotonou");
    expect(parametres(lienCarte("Cotonou", "cotonou") ?? "").get("query")).toBe("Cotonou");
  });

  it("ni adresse ni ville : aucun lien (un nom de lieu seul est trop ambigu)", () => {
    expect(lienCarte(null, null)).toBeNull();
    expect(lienCarte("", "  ", { lieuNom: "Palais des congrès", pays: "Bénin" })).toBeNull();
  });
});
