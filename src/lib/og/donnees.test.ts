import { describe, expect, it } from "vitest";

import {
  LONGUEUR_MAX_SIGLE,
  LONGUEUR_MAX_TITRE,
  apercuEvenement,
  apercuSociete,
  longueurGraphemes,
  tailleSigle,
  tailleTitreEvenement,
  texteDatesApercu,
  texteOrganisateurs,
  type EvenementApercu,
  type SocieteApercu,
} from "@/lib/og/donnees";
import { estTexteCouvert } from "@/lib/og/texte";

const NB = " "; // espace insécable
const ESPACE_SANS_CHASSE = String.fromCodePoint(0x200b);

const evenement: EvenementApercu = {
  type: "congres",
  titre: "[DÉMO] Congrès de pédiatrie de Cotonou",
  dateDebut: "2027-03-12",
  dateFin: "2027-03-14",
  heureDebut: null,
  modalite: "presentiel",
  lieuNom: "Palais des congrès",
  ville: "Cotonou",
  organisateurs: [
    { role: "organisateur", id: "o1", slug: "demo-sbp", sigle: "SBP", nomComplet: null },
    { role: "co_organisateur", id: "o2", slug: "demo-sbmi", sigle: "SBMI", nomComplet: null },
    { role: "partenaire", id: "o3", slug: "demo-abde", sigle: "ABDE", nomComplet: null },
  ],
};

const societe: SocieteApercu = {
  sigle: "SBMI",
  nomComplet: "[DÉMO] Société béninoise de médecine interne",
  categorie: "societe_savante",
  disciplines: [{ nom: "Santé" }, { nom: "Sciences de la vie" }],
};

/** Titre de démonstration d'exactement `longueur` caractères. */
function titreDeLongueur(longueur: number): string {
  const mots = "[DÉMO] Journées scientifiques nationales de la recherche en santé publique ";
  return mots.repeat(Math.ceil(longueur / mots.length) + 1).slice(0, longueur);
}

describe("longueurGraphemes", () => {
  it("compte les caractères perçus, pas les unités de code", () => {
    expect(longueurGraphemes("")).toBe(0);
    expect(longueurGraphemes("Bénin")).toBe(5);
    expect(longueurGraphemes("Bénin")).toBe(5);
    expect(longueurGraphemes("👩‍⚕️ ok")).toBe(4);
  });
});

describe("tailleTitreEvenement", () => {
  it("décroît avec la longueur, aux seuils annoncés", () => {
    expect(tailleTitreEvenement(10)).toEqual({ taille: 68, lignes: 2 });
    expect(tailleTitreEvenement(40)).toEqual({ taille: 68, lignes: 2 });
    expect(tailleTitreEvenement(41)).toEqual({ taille: 60, lignes: 3 });
    expect(tailleTitreEvenement(70)).toEqual({ taille: 60, lignes: 3 });
    expect(tailleTitreEvenement(71)).toEqual({ taille: 52, lignes: 3 });
    expect(tailleTitreEvenement(100)).toEqual({ taille: 52, lignes: 3 });
    expect(tailleTitreEvenement(101)).toEqual({ taille: 46, lignes: 4 });
    expect(tailleTitreEvenement(LONGUEUR_MAX_TITRE)).toEqual({ taille: 46, lignes: 4 });
  });
});

describe("tailleSigle", () => {
  it("décroît avec la longueur du sigle", () => {
    expect(tailleSigle(3)).toBe(160);
    expect(tailleSigle(4)).toBe(160);
    expect(tailleSigle(5)).toBe(140);
    expect(tailleSigle(6)).toBe(140);
    expect(tailleSigle(8)).toBe(116);
    expect(tailleSigle(12)).toBe(92);
    expect(tailleSigle(13)).toBe(76);
    expect(tailleSigle(LONGUEUR_MAX_SIGLE)).toBe(76);
  });
});

describe("texteOrganisateurs", () => {
  it("aucun sigle dessinable : null", () => {
    expect(texteOrganisateurs([])).toBeNull();
    expect(texteOrganisateurs(["", "🎉", "  "])).toBeNull();
  });

  it("liste française jusqu'à quatre sigles", () => {
    expect(texteOrganisateurs(["SBP"])).toBe("Organisé par SBP");
    expect(texteOrganisateurs(["SBP", "SBMI"])).toBe("Organisé par SBP et SBMI");
    expect(texteOrganisateurs(["A", "B", "C", "D"])).toBe("Organisé par A, B, C et D");
  });

  it("au-delà de quatre : « et 1 autre », « et N autres »", () => {
    expect(texteOrganisateurs(["A", "B", "C", "D", "E"])).toBe(
      "Organisé par A, B, C, D et 1 autre",
    );
    expect(texteOrganisateurs(["A", "B", "C", "D", "E", "F"])).toBe(
      "Organisé par A, B, C, D et 2 autres",
    );
  });

  it("nettoie les sigles (emoji retirés)", () => {
    expect(texteOrganisateurs(["SBP 🎉", "🎉"])).toBe("Organisé par SBP");
  });
});

describe("texteDatesApercu", () => {
  it("période de plusieurs jours, première lettre en capitale, sans heure", () => {
    expect(texteDatesApercu(evenement)).toBe("Du 12 au 14 mars 2027");
    expect(texteDatesApercu({ ...evenement, heureDebut: "08:30:00" })).toBe(
      "Du 12 au 14 mars 2027",
    );
    expect(texteDatesApercu({ ...evenement, dateDebut: "2027-04-30", dateFin: "2027-05-02" })).toBe(
      "Du 30 avril au 2 mai 2027",
    );
  });

  it("un seul jour : la date, et l'heure de début si elle est connue", () => {
    const unJour = { dateDebut: "2027-05-01", dateFin: "2027-05-01" };
    expect(texteDatesApercu({ ...unJour, heureDebut: null })).toBe("1er mai 2027");
    expect(texteDatesApercu({ ...unJour, heureDebut: "08:30:00" })).toBe(
      `1er mai 2027 à 8${NB}h${NB}30`,
    );
    expect(texteDatesApercu({ ...unJour, heureDebut: "09:00:00" })).toBe(`1er mai 2027 à 9${NB}h`);
  });
});

describe("texteDatesApercu : heure de 24 h ou plus", () => {
  it("considérée comme absente : jamais « à 24 h »", () => {
    const unJour = { dateDebut: "2027-05-01", dateFin: "2027-05-01" };
    expect(texteDatesApercu({ ...unJour, heureDebut: "24:00:00" })).toBe("1er mai 2027");
    expect(texteDatesApercu({ ...evenement, heureDebut: "24:00:00" })).toBe(
      "Du 12 au 14 mars 2027",
    );
  });
});

describe("apercuEvenement : segments vides après nettoyage", () => {
  const sigles = (...liste: string[]) =>
    liste.map((sigle, rang) => ({
      role: "organisateur" as const,
      id: `o${rang}`,
      slug: `demo-${rang}`,
      sigle,
      nomComplet: null,
    }));

  it("nom du lieu non dessinable : la ville seule, jamais « , Ouidah »", () => {
    expect(apercuEvenement({ ...evenement, lieuNom: "ɖɔ", ville: "Ouidah" })?.lieu).toBe("Ouidah");
    expect(apercuEvenement({ ...evenement, lieuNom: "🏛️", ville: "Ouidah" })?.lieu).toBe("Ouidah");
  });

  it("ville non dessinable : le nom du lieu seul, sans virgule finale", () => {
    expect(apercuEvenement({ ...evenement, lieuNom: "Palais", ville: "ɖɔ" })?.lieu).toBe("Palais");
  });

  it("séparateur à l'intérieur d'un champ : aucun orphelin", () => {
    expect(apercuEvenement({ ...evenement, lieuNom: "ɖɔ, ɛ", ville: "Ouidah" })?.lieu).toBe(
      "Ouidah",
    );
    expect(apercuEvenement({ ...evenement, lieuNom: "ɖɔ, Ouidah", ville: null })?.lieu).toBe(
      "Ouidah",
    );
    expect(apercuEvenement({ ...evenement, lieuNom: "Salle, ɖɔ, Annexe", ville: null })?.lieu).toBe(
      "Salle, Annexe",
    );
  });

  it("nom du lieu et ville identiques une fois nettoyés : une seule fois", () => {
    expect(apercuEvenement({ ...evenement, lieuNom: "Ouidah ɖɔ", ville: "Ouidah" })?.lieu).toBe(
      "Ouidah",
    );
  });

  it("hybride : « Ouidah et en ligne » ; rien de dessinable : « En présentiel et en ligne »", () => {
    expect(
      apercuEvenement({ ...evenement, modalite: "hybride", lieuNom: "ɖɔ", ville: "Ouidah" })?.lieu,
    ).toBe("Ouidah et en ligne");
    expect(
      apercuEvenement({ ...evenement, modalite: "hybride", lieuNom: "ɖɔ", ville: "ɛ" })?.lieu,
    ).toBe("En présentiel et en ligne");
  });

  it("rien de dessinable en présentiel : « Lieu à préciser »", () => {
    expect(apercuEvenement({ ...evenement, lieuNom: "ɖɔ", ville: "ɛ" })?.lieu).toBe(
      "Lieu à préciser",
    );
  });

  it("organisateurs : un sigle réduit à un séparateur est retiré", () => {
    expect(texteOrganisateurs(["ɖ-ɔ", "SBMI"])).toBe("Organisé par SBMI");
    expect(texteOrganisateurs(["SBMI", "ɖ/ɔ", "ABDE"])).toBe("Organisé par SBMI et ABDE");
    expect(texteOrganisateurs(["ɖ-ɔ", "ɛ"])).toBeNull();
    expect(
      apercuEvenement({ ...evenement, organisateurs: sigles("ɖ, ɔ", "SBP") })?.organisateurs,
    ).toBe("Organisé par SBP");
  });

  it("disciplines : une discipline réduite à un séparateur est retirée", () => {
    expect(
      apercuSociete({
        ...societe,
        disciplines: [{ nom: "ɖ-ɔ" }, { nom: "Santé" }, { nom: "ɛ, ɔ" }, { nom: "Droit" }],
      })?.disciplines,
    ).toBe("Santé et Droit");
    expect(
      apercuSociete({ ...societe, disciplines: [{ nom: "ɖ-ɔ" }, { nom: "ɛ" }] })?.disciplines,
    ).toBeNull();
  });

  it("les noms sans lettre manquante restent intacts", () => {
    expect(
      apercuEvenement({ ...evenement, lieuNom: "Saint-Michel", ville: "Porto-Novo" })?.lieu,
    ).toBe("Saint-Michel, Porto-Novo");
    expect(texteOrganisateurs(["S-BMI", "A/B"])).toBe("Organisé par S-BMI et A/B");
  });
});

describe("apercuEvenement", () => {
  it("type, titre, dates, lieu et organisateurs (partenaires exclus)", () => {
    expect(apercuEvenement(evenement)).toEqual({
      type: "Congrès",
      titre: "[DÉMO] Congrès de pédiatrie de Cotonou",
      tailleTitre: { taille: 68, lignes: 2 },
      dates: "Du 12 au 14 mars 2027",
      lieu: "Palais des congrès, Cotonou",
      organisateurs: "Organisé par SBP et SBMI",
    });
  });

  it("lieu : « En ligne », hybride sans lieu, présentiel sans lieu dessinable", () => {
    expect(apercuEvenement({ ...evenement, modalite: "en_ligne" })?.lieu).toBe("En ligne");
    expect(
      apercuEvenement({ ...evenement, modalite: "hybride", lieuNom: null, ville: null })?.lieu,
    ).toBe("En présentiel et en ligne");
    expect(apercuEvenement({ ...evenement, lieuNom: "🏛️", ville: null })?.lieu).toBe(
      "Lieu à préciser",
    );
  });

  it("sans organisatrice ni co-organisatrice : pas de ligne d'organisateurs", () => {
    expect(
      apercuEvenement({
        ...evenement,
        organisateurs: evenement.organisateurs.filter((o) => o.role === "partenaire"),
      })?.organisateurs,
    ).toBeNull();
  });

  it("titre sans aucun caractère dessinable : null (image générique)", () => {
    expect(apercuEvenement({ ...evenement, titre: "🎉🎉 漢字" })).toBeNull();
    expect(apercuEvenement({ ...evenement, titre: "   " })).toBeNull();
  });

  it("titre de 120 caractères : gardé en entier, en 46 px sur 4 lignes au plus", () => {
    const titre = titreDeLongueur(120);
    const apercu = apercuEvenement({ ...evenement, titre });
    expect(apercu?.titre).toBe(titre.trim());
    expect(apercu?.tailleTitre).toEqual({ taille: 46, lignes: 4 });
  });

  it("titre trop long : coupé à la fin d'un mot, « … » compris dans la limite", () => {
    const apercu = apercuEvenement({ ...evenement, titre: titreDeLongueur(500) });
    expect(apercu).not.toBeNull();
    expect(longueurGraphemes(apercu?.titre ?? "")).toBeLessThanOrEqual(LONGUEUR_MAX_TITRE);
    expect(apercu?.titre.endsWith("…")).toBe(true);
    expect(apercu?.titre).not.toMatch(/\s…$/u);
  });

  it("tous les textes sont dessinables par les polices locales", () => {
    const apercu = apercuEvenement({
      ...evenement,
      titre: `Journées 🎉 de l’Ẹ̀kọ́ — Oṣogbo${ESPACE_SANS_CHASSE} 2027`,
      lieuNom: "Salle 漢 Ɔkɔ",
      heureDebut: "08:30:00",
      dateFin: evenement.dateDebut,
    });
    expect(apercu).not.toBeNull();
    for (const texte of [apercu?.type, apercu?.titre, apercu?.dates, apercu?.lieu]) {
      expect(estTexteCouvert(texte ?? ""), texte).toBe(true);
    }
    expect(apercu?.titre).toBe("Journées de l’Èkó — Osogbo 2027");
    expect(apercu?.lieu).toBe("Salle k, Cotonou");
  });
});

describe("apercuSociete", () => {
  it("catégorie, sigle, taille du sigle, nom complet et disciplines", () => {
    expect(apercuSociete(societe)).toEqual({
      categorie: "Société savante",
      sigle: "SBMI",
      tailleSigle: 160,
      nomComplet: "[DÉMO] Société béninoise de médecine interne",
      disciplines: "Santé et Sciences de la vie",
    });
  });

  it("sans nom complet ni discipline : null pour chacun", () => {
    const apercu = apercuSociete({ ...societe, nomComplet: null, disciplines: [] });
    expect(apercu?.nomComplet).toBeNull();
    expect(apercu?.disciplines).toBeNull();
  });

  it("disciplines non dessinables écartées, trois disciplines en liste française", () => {
    expect(
      apercuSociete({
        ...societe,
        disciplines: [{ nom: "Santé" }, { nom: "🎉" }, { nom: "Agronomie" }, { nom: "Droit" }],
      })?.disciplines,
    ).toBe("Santé, Agronomie et Droit");
  });

  it("sigle sans caractère dessinable : null (image générique)", () => {
    expect(apercuSociete({ ...societe, sigle: "🎉" })).toBeNull();
  });

  it("sigle trop long coupé, taille la plus petite", () => {
    const apercu = apercuSociete({ ...societe, sigle: "S".repeat(60) });
    expect(longueurGraphemes(apercu?.sigle ?? "")).toBeLessThanOrEqual(LONGUEUR_MAX_SIGLE);
    expect(apercu?.tailleSigle).toBe(76);
  });
});
