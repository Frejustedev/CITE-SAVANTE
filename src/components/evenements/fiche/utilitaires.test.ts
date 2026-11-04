import { describe, expect, it } from "vitest";

import type { OrganisateurFiche } from "@/lib/utils/evenements";

import {
  descriptionEvenement,
  etatEcheance,
  libelleModalite,
  lignesLieu,
  nomCompletOrganisation,
  paysEtranger,
  periodeEnPhrase,
  separerOrganisations,
} from "./utilitaires";

// Données fictives uniquement (préfixe [DÉMO]).
const organisateurs: OrganisateurFiche[] = [
  { role: "organisateur", id: "o1", slug: "demo-sbp", sigle: "SBP", nomComplet: "[DÉMO] Société" },
  { role: "co_organisateur", id: "o2", slug: "demo-abc", sigle: "ABC", nomComplet: null },
  { role: "partenaire", id: "o3", slug: "demo-xyz", sigle: "XYZ", nomComplet: null },
];

const base = {
  type: "congres" as const,
  resume: null,
  description: null,
  dateDebut: "2027-03-29",
  dateFin: "2027-03-31",
  modalite: "presentiel" as const,
  ville: "Cotonou",
  organisateurs,
};

describe("periodeEnPhrase", () => {
  it("un jour : « le … » ; plusieurs : forme de formaterPeriode", () => {
    expect(periodeEnPhrase("2026-08-01", "2026-08-01")).toBe("le 1er août 2026");
    expect(periodeEnPhrase("2026-10-30", "2026-11-03")).toBe("du 30 octobre au 3 novembre 2026");
  });
});

describe("descriptionEvenement", () => {
  it("le résumé, s'il existe", () => {
    expect(descriptionEvenement({ ...base, resume: "Résumé fictif." })).toBe("Résumé fictif.");
  });

  it("sinon la description, ramenée à 160 caractères", () => {
    const description = "Mot ".repeat(80);
    const resultat = descriptionEvenement({ ...base, description });
    expect([...resultat].length).toBeLessThanOrEqual(160);
    expect(resultat.endsWith("…")).toBe(true);
  });

  it("sinon une phrase tirée des seules données de la fiche (partenaires exclus)", () => {
    expect(descriptionEvenement(base)).toBe(
      "Congrès du 29 au 31 mars 2027 à Cotonou. Organisé par SBP et ABC. Dates clés, participation et ajout à votre agenda.",
    );
  });

  it("en ligne, hybride sans ville, sans organisateur", () => {
    expect(
      descriptionEvenement({
        ...base,
        type: "webinaire",
        modalite: "en_ligne",
        dateFin: base.dateDebut,
        organisateurs: [],
      }),
    ).toBe(
      "Webinaire le 29 mars 2027 en ligne. Dates clés, participation et ajout à votre agenda.",
    );
    expect(descriptionEvenement({ ...base, modalite: "hybride", ville: null })).toContain(
      "Congrès du 29 au 31 mars 2027 en présentiel et en ligne.",
    );
    expect(descriptionEvenement({ ...base, modalite: "hybride" })).toContain(
      "à Cotonou et en ligne.",
    );
  });
});

describe("etatEcheance", () => {
  const aujourdhui = "2026-10-31";
  it("passée la veille, urgente du jour même à J+7, à venir au-delà", () => {
    expect(etatEcheance("2026-10-30", aujourdhui)).toBe("passee");
    expect(etatEcheance("2026-10-31", aujourdhui)).toBe("urgente");
    expect(etatEcheance("2026-11-07", aujourdhui)).toBe("urgente");
    expect(etatEcheance("2026-11-08", aujourdhui)).toBe("a_venir");
  });

  it("lève sur une date invalide", () => {
    expect(() => etatEcheance("2026-02-30", aujourdhui)).toThrow();
  });
});

describe("lieu", () => {
  it("pays : rien pour le Bénin (casse et accents indifférents)", () => {
    expect(paysEtranger("Bénin")).toBeNull();
    expect(paysEtranger(" benin ")).toBeNull();
    expect(paysEtranger("Togo")).toBe("Togo");
    expect(paysEtranger(null)).toBeNull();
  });

  it("lignes : lieu, adresse, ville (et pays étranger), sans vide ni répétition", () => {
    expect(
      lignesLieu({ lieuNom: "Palais", adresse: " Rue  1 ", ville: "Cotonou", pays: "Bénin" }),
    ).toEqual(["Palais", "Rue 1", "Cotonou"]);
    expect(lignesLieu({ lieuNom: null, adresse: null, ville: "Lomé", pays: "Togo" })).toEqual([
      "Lomé, Togo",
    ]);
    expect(lignesLieu({ lieuNom: null, adresse: null, ville: null, pays: "Togo" })).toEqual([
      "Togo",
    ]);
    expect(
      lignesLieu({ lieuNom: "Cotonou", adresse: "", ville: "cotonou", pays: "Bénin" }),
    ).toEqual(["Cotonou"]);
    expect(lignesLieu({ lieuNom: null, adresse: null, ville: null, pays: "Bénin" })).toEqual([]);
  });

  it("modalité en toutes lettres", () => {
    expect(libelleModalite("presentiel")).toBe("En présentiel");
    expect(libelleModalite("en_ligne")).toBe("En ligne");
    expect(libelleModalite("hybride")).toBe("Hybride : en présentiel et en ligne");
  });
});

describe("organisations", () => {
  it("organisatrices et co-organisatrices d'un côté, partenaires de l'autre, ordre gardé", () => {
    const { organisateurs: organisatrices, partenaires } = separerOrganisations(organisateurs);
    expect(organisatrices.map((organisation) => organisation.sigle)).toEqual(["SBP", "ABC"]);
    expect(partenaires.map((organisation) => organisation.sigle)).toEqual(["XYZ"]);
  });

  it("nom complet distinct du sigle seulement", () => {
    expect(nomCompletOrganisation({ sigle: "SBP", nomComplet: " Société  fictive " })).toBe(
      "Société fictive",
    );
    expect(nomCompletOrganisation({ sigle: "SBP", nomComplet: "sbp" })).toBeNull();
    expect(nomCompletOrganisation({ sigle: "SBP", nomComplet: null })).toBeNull();
  });
});
