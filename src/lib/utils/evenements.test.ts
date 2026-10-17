import { describe, expect, it } from "vitest";

import {
  ROLES_ORGANISATEURS,
  estAVenir,
  repartirEvenements,
  siglesOrganisateurs,
  versEvenementResume,
  type EvenementResume,
  type LigneEvenementResume,
} from "./evenements";

function ligne(surcharges: Partial<LigneEvenementResume> = {}): LigneEvenementResume {
  return {
    id: "e1",
    slug: "congres-test-2027",
    titre: "[TEST] Congrès",
    type: "congres",
    date_debut: "2027-03-12",
    date_fin: "2027-03-14",
    heure_debut: null,
    modalite: "presentiel",
    lieu_nom: null,
    ville: "Cotonou",
    gratuit: false,
    evenement_societes: [],
    echeances: [],
    ...surcharges,
  };
}

function resume(surcharges: Partial<EvenementResume>): EvenementResume {
  return { ...versEvenementResume(ligne(), "2027-01-01"), ...surcharges };
}

describe("versEvenementResume", () => {
  it("convertit les noms de colonnes", () => {
    const converti = versEvenementResume(
      ligne({ lieu_nom: "Palais des congrès", heure_debut: "09:00:00", gratuit: true }),
      "2027-01-01",
    );
    expect(converti).toMatchObject({
      id: "e1",
      slug: "congres-test-2027",
      dateDebut: "2027-03-12",
      dateFin: "2027-03-14",
      heureDebut: "09:00:00",
      lieuNom: "Palais des congrès",
      ville: "Cotonou",
      gratuit: true,
      organisateurs: [],
      prochaineEcheance: null,
    });
  });

  it("ignore les organisations masquées par la RLS (null) et trie par rôle puis sigle", () => {
    const converti = versEvenementResume(
      ligne({
        evenement_societes: [
          { role: "partenaire", societes: { id: "p", slug: "demo-aaa", sigle: "AAA" } },
          { role: "co_organisateur", societes: { id: "c", slug: "demo-abpn", sigle: "ABPN" } },
          { role: "organisateur", societes: null },
          { role: "organisateur", societes: { id: "o2", slug: "demo-sbmi", sigle: "SBMI" } },
          { role: "organisateur", societes: { id: "o1", slug: "demo-abc", sigle: "ÉBC" } },
        ],
      }),
      "2027-01-01",
    );
    expect(converti.organisateurs.map((o) => `${o.role}:${o.sigle}`)).toEqual([
      "organisateur:ÉBC",
      "organisateur:SBMI",
      "co_organisateur:ABPN",
      "partenaire:AAA",
    ]);
  });

  it("prochaine échéance : la plus proche qui n'est pas passée (aujourd'hui compris)", () => {
    const echeances: LigneEvenementResume["echeances"] = [
      { id: "passee", type: "bourse", libelle: null, date_limite: "2027-01-31" },
      { id: "lointaine", type: "inscription", libelle: null, date_limite: "2027-03-01" },
      { id: "proche", type: "soumission_resumes", libelle: "Résumés", date_limite: "2027-02-01" },
    ];
    expect(versEvenementResume(ligne({ echeances }), "2027-02-01").prochaineEcheance).toEqual({
      id: "proche",
      type: "soumission_resumes",
      libelle: "Résumés",
      dateLimite: "2027-02-01",
    });
    expect(versEvenementResume(ligne({ echeances }), "2027-02-02").prochaineEcheance?.id).toBe(
      "lointaine",
    );
    expect(versEvenementResume(ligne({ echeances }), "2027-03-02").prochaineEcheance).toBeNull();
  });
});

describe("estAVenir et repartirEvenements", () => {
  it("à venir tant que la date de fin n'est pas passée (section 7)", () => {
    expect(estAVenir({ dateFin: "2027-03-14" }, "2027-03-14")).toBe(true);
    expect(estAVenir({ dateFin: "2027-03-14" }, "2027-03-15")).toBe(false);
  });

  it("à venir par date de début croissante, passés du plus récent au plus ancien", () => {
    const evenements = [
      resume({ id: "passe-ancien", dateDebut: "2026-01-10", dateFin: "2026-01-11" }),
      resume({ id: "futur-lointain", dateDebut: "2027-06-01", dateFin: "2027-06-02" }),
      resume({ id: "en-cours", dateDebut: "2027-02-28", dateFin: "2027-03-02" }),
      resume({ id: "passe-recent", dateDebut: "2027-02-20", dateFin: "2027-02-21" }),
      resume({ id: "futur-proche", dateDebut: "2027-03-05", dateFin: "2027-03-05" }),
    ];
    const { aVenir, passes } = repartirEvenements(evenements, "2027-03-01");
    expect(aVenir.map((e) => e.id)).toEqual(["en-cours", "futur-proche", "futur-lointain"]);
    expect(passes.map((e) => e.id)).toEqual(["passe-recent", "passe-ancien"]);
  });

  it("le même jour, l'heure de début départage", () => {
    const evenements = [
      resume({
        id: "apres-midi",
        dateDebut: "2027-03-05",
        dateFin: "2027-03-05",
        heureDebut: "14:00:00",
      }),
      resume({
        id: "matin",
        dateDebut: "2027-03-05",
        dateFin: "2027-03-05",
        heureDebut: "09:00:00",
      }),
    ];
    expect(repartirEvenements(evenements, "2027-03-01").aVenir.map((e) => e.id)).toEqual([
      "matin",
      "apres-midi",
    ]);
  });
});

describe("siglesOrganisateurs", () => {
  it("organisateurs et co-organisateurs seulement, partenaires exclus", () => {
    expect(ROLES_ORGANISATEURS).toEqual(["organisateur", "co_organisateur"]);
    expect(
      siglesOrganisateurs({
        organisateurs: [
          { role: "organisateur", id: "1", slug: "a", sigle: "SBMI" },
          { role: "co_organisateur", id: "2", slug: "b", sigle: "ABPN" },
          { role: "partenaire", id: "3", slug: "c", sigle: "FSS" },
        ],
      }),
    ).toEqual(["SBMI", "ABPN"]);
  });
});
