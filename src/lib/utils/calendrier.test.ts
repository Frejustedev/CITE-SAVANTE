import { describe, expect, it } from "vitest";

import {
  FENETRE_CALENDRIER,
  JOURS_SEMAINE,
  analyserParametreMois,
  bornesMois,
  comparerMois,
  decalerMois,
  estMoisDansFenetre,
  formaterParametreMois,
  grilleMois,
  grouperEcheancesParSemaine,
  grouperParMois,
  libelleMois,
  lireParametreMois,
  moisDeLaDate,
  moisPrecedent,
  moisSuivant,
  positionDansEvenement,
  repartirEvenementsParJour,
  titreMois,
  type GrilleMois,
} from "./calendrier";

const dates = (grille: GrilleMois) => grille.semaines.flat().map((jour) => jour.date);

describe("mois : navigation et paramètre", () => {
  it("mois précédent et suivant, y compris d'une année à l'autre", () => {
    expect(moisPrecedent({ annee: 2027, mois: 1 })).toEqual({ annee: 2026, mois: 12 });
    expect(moisSuivant({ annee: 2026, mois: 12 })).toEqual({ annee: 2027, mois: 1 });
    expect(moisSuivant({ annee: 2026, mois: 10 })).toEqual({ annee: 2026, mois: 11 });
    expect(decalerMois({ annee: 2026, mois: 10 }, 24)).toEqual({ annee: 2028, mois: 10 });
    expect(decalerMois({ annee: 2026, mois: 10 }, -12)).toEqual({ annee: 2025, mois: 10 });
    expect(comparerMois({ annee: 2026, mois: 12 }, { annee: 2027, mois: 1 })).toBeLessThan(0);
  });

  it("formate et analyse « AAAA-MM »", () => {
    expect(formaterParametreMois({ annee: 2026, mois: 3 })).toBe("2026-03");
    expect(analyserParametreMois("2026-10")).toEqual({ annee: 2026, mois: 10 });
    expect(analyserParametreMois(" 2026-10 ")).toEqual({ annee: 2026, mois: 10 });
    expect(analyserParametreMois(["2027-01", "2027-02"])).toEqual({ annee: 2027, mois: 1 });
  });

  it.each(["2026-1", "2026-13", "2026-00", "26-10", "2026-10-01", "octobre", "", null, 202610])(
    "valeur mal formée : %j → null",
    (valeur) => {
      expect(analyserParametreMois(valeur)).toBeNull();
    },
  );

  it(`fenêtre de ${FENETRE_CALENDRIER.moisAvant} mois en arrière et ${FENETRE_CALENDRIER.moisApres} en avant`, () => {
    const aujourdhui = "2026-10-31";
    expect(estMoisDansFenetre({ annee: 2025, mois: 10 }, aujourdhui)).toBe(true);
    expect(estMoisDansFenetre({ annee: 2025, mois: 9 }, aujourdhui)).toBe(false);
    expect(estMoisDansFenetre({ annee: 2028, mois: 10 }, aujourdhui)).toBe(true);
    expect(estMoisDansFenetre({ annee: 2028, mois: 11 }, aujourdhui)).toBe(false);
  });

  it("lireParametreMois : valeur valide, sinon mois courant de Porto-Novo", () => {
    const aujourdhui = "2026-10-31";
    expect(lireParametreMois("2026-11", aujourdhui)).toEqual({ annee: 2026, mois: 11 });
    expect(lireParametreMois(undefined, aujourdhui)).toEqual({ annee: 2026, mois: 10 });
    expect(lireParametreMois("2026-13", aujourdhui)).toEqual({ annee: 2026, mois: 10 });
    expect(lireParametreMois("0001-01", aujourdhui)).toEqual({ annee: 2026, mois: 10 });
    expect(lireParametreMois("9999-12", aujourdhui)).toEqual({ annee: 2026, mois: 10 });
    expect(lireParametreMois("2025-09", aujourdhui)).toEqual({ annee: 2026, mois: 10 });
    // 1er janvier : le mois courant change d'année.
    expect(lireParametreMois(null, "2027-01-01")).toEqual({ annee: 2027, mois: 1 });
  });

  it("libellés en français", () => {
    expect(libelleMois({ annee: 2026, mois: 10 })).toBe("octobre 2026");
    expect(libelleMois({ annee: 2026, mois: 8 })).toBe("août 2026");
    expect(titreMois({ annee: 2026, mois: 12 })).toBe("Décembre 2026");
    expect(titreMois({ annee: 2026, mois: 8 })).toBe("Août 2026");
    expect(moisDeLaDate("2027-02-28")).toEqual({ annee: 2027, mois: 2 });
  });

  it("bornes du mois, années bissextiles comprises", () => {
    expect(bornesMois({ annee: 2027, mois: 2 })).toEqual({
      debut: "2027-02-01",
      fin: "2027-02-28",
    });
    expect(bornesMois({ annee: 2028, mois: 2 })).toEqual({
      debut: "2028-02-01",
      fin: "2028-02-29",
    });
    expect(bornesMois({ annee: 2026, mois: 12 })).toEqual({
      debut: "2026-12-01",
      fin: "2026-12-31",
    });
  });
});

describe("grilleMois", () => {
  it("octobre 2026 : du lundi 28 septembre au dimanche 1er novembre, 5 semaines", () => {
    const grille = grilleMois({ annee: 2026, mois: 10 }, "2026-10-31");
    expect(grille.debut).toBe("2026-09-28");
    expect(grille.fin).toBe("2026-11-01");
    expect(grille.semaines).toHaveLength(5);
    const jours = grille.semaines.flat();
    expect(jours.filter((jour) => jour.horsMois).map((jour) => jour.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-11-01",
    ]);
    expect(jours.filter((jour) => jour.aujourdhui).map((jour) => jour.date)).toEqual([
      "2026-10-31",
    ]);
    expect(jours.find((jour) => jour.date === "2026-10-01")).toEqual({
      date: "2026-10-01",
      jour: 1,
      jourSemaine: 4,
      horsMois: false,
      aujourdhui: false,
    });
  });

  it("chaque semaine compte 7 jours consécutifs, du lundi au dimanche", () => {
    for (const mois of [1, 2, 3, 8, 10, 12]) {
      const grille = grilleMois({ annee: 2026, mois });
      for (const semaine of grille.semaines) {
        expect(semaine.map((jour) => jour.jourSemaine)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      }
      expect(grille.semaines[0][0].date).toBe(grille.debut);
      expect(grille.semaines.at(-1)?.[6].date).toBe(grille.fin);
      expect(new Set(dates(grille)).size).toBe(grille.semaines.length * 7);
    }
  });

  it("février 2027 (commence un lundi, 28 jours) : exactement 4 semaines", () => {
    const grille = grilleMois({ annee: 2027, mois: 2 });
    expect(grille.debut).toBe("2027-02-01");
    expect(grille.fin).toBe("2027-02-28");
    expect(grille.semaines).toHaveLength(4);
    expect(grille.semaines.flat().some((jour) => jour.horsMois)).toBe(false);
  });

  it("février 2028 (bissextile) : le 29 est dans la grille", () => {
    const grille = grilleMois({ annee: 2028, mois: 2 });
    expect(grille.debut).toBe("2028-01-31");
    expect(grille.fin).toBe("2028-03-05");
    expect(dates(grille)).toContain("2028-02-29");
    expect(grille.semaines.flat().find((jour) => jour.date === "2028-02-29")?.horsMois).toBe(false);
  });

  it("août 2026 : 6 semaines (commence un samedi, finit un lundi)", () => {
    const grille = grilleMois({ annee: 2026, mois: 8 });
    expect(grille.debut).toBe("2026-07-27");
    expect(grille.fin).toBe("2026-09-06");
    expect(grille.semaines).toHaveLength(6);
  });

  it("janvier 2027 : commence en décembre 2026 (1er janvier = vendredi)", () => {
    const grille = grilleMois({ annee: 2027, mois: 1 });
    expect(grille.debut).toBe("2026-12-28");
    expect(grille.fin).toBe("2027-01-31");
    expect(grille.semaines[0].map((jour) => jour.horsMois)).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it("noms des jours du lundi au dimanche", () => {
    expect(JOURS_SEMAINE.map((jour) => jour.long)).toEqual([
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi",
      "dimanche",
    ]);
  });
});

describe("repartirEvenementsParJour", () => {
  const surDeuxMois = { id: "a-cheval", dateDebut: "2026-10-30", dateFin: "2026-11-01" };
  const unJour = { id: "un-jour", dateDebut: "2026-10-30", dateFin: "2026-10-30" };
  const horsPeriode = { id: "hors", dateDebut: "2026-12-10", dateFin: "2026-12-11" };
  const evenements = [surDeuxMois, unJour, horsPeriode];

  it("un événement de 3 jours sur deux mois est présent dans les deux grilles, chaque jour", () => {
    const octobre = grilleMois({ annee: 2026, mois: 10 });
    const novembre = grilleMois({ annee: 2026, mois: 11 });
    const parJourOctobre = repartirEvenementsParJour(evenements, octobre.debut, octobre.fin);
    const parJourNovembre = repartirEvenementsParJour(evenements, novembre.debut, novembre.fin);

    // La grille d'octobre va jusqu'au dimanche 1er novembre ; celle de novembre
    // commence le lundi 26 octobre.
    expect([...parJourOctobre.keys()]).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
    expect([...parJourNovembre.keys()]).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(parJourOctobre.get("2026-10-30")?.map((e) => e.id)).toEqual(["a-cheval", "un-jour"]);
    expect(parJourOctobre.get("2026-10-31")?.map((e) => e.id)).toEqual(["a-cheval"]);
    expect(parJourNovembre.get("2026-11-01")?.map((e) => e.id)).toEqual(["a-cheval"]);
  });

  it("vue mobile : seulement les jours du mois qui ont des événements", () => {
    const { debut, fin } = bornesMois({ annee: 2026, mois: 11 });
    const parJour = repartirEvenementsParJour(evenements, debut, fin);
    expect([...parJour.keys()]).toEqual(["2026-11-01"]);
  });

  it("1er janvier : un événement du 31 décembre au 1er janvier est dans les deux mois", () => {
    const reveillon = [{ id: "r", dateDebut: "2026-12-31", dateFin: "2027-01-01" }];
    const decembre = bornesMois({ annee: 2026, mois: 12 });
    const janvier = bornesMois({ annee: 2027, mois: 1 });
    expect([...repartirEvenementsParJour(reveillon, decembre.debut, decembre.fin).keys()]).toEqual([
      "2026-12-31",
    ]);
    expect([...repartirEvenementsParJour(reveillon, janvier.debut, janvier.fin).keys()]).toEqual([
      "2027-01-01",
    ]);
  });

  it("garde l'ordre reçu ; période vide ou inversée : aucune entrée", () => {
    const inverses = [unJour, surDeuxMois];
    expect(
      repartirEvenementsParJour(inverses, "2026-10-30", "2026-10-30")
        .get("2026-10-30")
        ?.map((e) => e.id),
    ).toEqual(["un-jour", "a-cheval"]);
    expect(repartirEvenementsParJour(evenements, "2026-11-02", "2026-11-30").size).toBe(0);
    expect(repartirEvenementsParJour(evenements, "2026-11-01", "2026-10-01").size).toBe(0);
  });

  it("position d'un jour dans l'événement", () => {
    expect(positionDansEvenement(unJour, "2026-10-30")).toBe("unique");
    expect(positionDansEvenement(surDeuxMois, "2026-10-30")).toBe("premier");
    expect(positionDansEvenement(surDeuxMois, "2026-10-31")).toBe("intermediaire");
    expect(positionDansEvenement(surDeuxMois, "2026-11-01")).toBe("dernier");
  });
});

describe("grouperParMois", () => {
  const evenements = [
    { id: "en-avant-novembre", dateDebut: "2026-11-20" },
    { id: "a-cheval", dateDebut: "2026-10-30" },
    { id: "novembre", dateDebut: "2026-11-03" },
    { id: "janvier", dateDebut: "2027-01-13" },
  ];

  it("un événement à cheval sur deux mois est rangé dans le mois de son début", () => {
    const groupes = grouperParMois(evenements);
    expect(groupes.map((groupe) => [groupe.cle, groupe.titre])).toEqual([
      ["2026-10", "Octobre 2026"],
      ["2026-11", "Novembre 2026"],
      ["2027-01", "Janvier 2027"],
    ]);
    expect(groupes[0].evenements.map((e) => e.id)).toEqual(["a-cheval"]);
    // Ordre reçu conservé dans le mois (mis en avant d'abord, si ainsi trié).
    expect(groupes[1].evenements.map((e) => e.id)).toEqual(["en-avant-novembre", "novembre"]);
    expect(groupes[1].mois).toEqual({ annee: 2026, mois: 11 });
  });

  it("ordre décroissant pour les archives ; liste vide", () => {
    expect(grouperParMois(evenements, "decroissant").map((groupe) => groupe.cle)).toEqual([
      "2027-01",
      "2026-11",
      "2026-10",
    ]);
    expect(grouperParMois([])).toEqual([]);
  });
});

describe("grouperEcheancesParSemaine", () => {
  const ech = (id: string, dateLimite: string) => ({ id, dateLimite });

  it("cette semaine, semaine prochaine, puis par mois (semaines du lundi au dimanche)", () => {
    // Mercredi 28 octobre 2026 : semaine du 26 octobre au 1er novembre.
    const groupes = grouperEcheancesParSemaine(
      [
        ech("passee", "2026-10-27"),
        ech("dimanche", "2026-11-01"),
        ech("aujourdhui", "2026-10-28"),
        ech("lundi-prochain", "2026-11-02"),
        ech("dimanche-prochain", "2026-11-08"),
        ech("lundi-suivant", "2026-11-09"),
        ech("decembre", "2026-12-15"),
        ech("fin-novembre", "2026-11-30"),
      ],
      "2026-10-28",
    );
    expect(groupes.map((g) => [g.cle, g.titre, g.echeances.map((e) => e.id)])).toEqual([
      ["cette-semaine", "Cette semaine", ["aujourdhui", "dimanche"]],
      ["semaine-prochaine", "Semaine prochaine", ["lundi-prochain", "dimanche-prochain"]],
      ["2026-11", "Novembre 2026", ["lundi-suivant", "fin-novembre"]],
      ["2026-12", "Décembre 2026", ["decembre"]],
    ]);
  });

  it("semaines à cheval sur deux mois et deux années : aucune échéance comptée deux fois", () => {
    // Mercredi 30 décembre 2026 : semaine du 28 décembre au 3 janvier.
    const echeances = [
      ech("31-dec", "2026-12-31"),
      ech("2-jan", "2027-01-02"),
      ech("4-jan", "2027-01-04"),
      ech("10-jan", "2027-01-10"),
      ech("11-jan", "2027-01-11"),
      ech("1-fev", "2027-02-01"),
    ];
    const groupes = grouperEcheancesParSemaine(echeances, "2026-12-30");
    expect(groupes.map((g) => [g.cle, g.echeances.map((e) => e.id)])).toEqual([
      ["cette-semaine", ["31-dec", "2-jan"]],
      ["semaine-prochaine", ["4-jan", "10-jan"]],
      ["2027-01", ["11-jan"]],
      ["2027-02", ["1-fev"]],
    ]);
    expect(groupes.flatMap((g) => g.echeances)).toHaveLength(echeances.length);
  });

  it("dimanche : la semaine se termine le jour même", () => {
    const groupes = grouperEcheancesParSemaine(
      [ech("dimanche", "2026-11-01"), ech("lundi", "2026-11-02")],
      "2026-11-01",
    );
    expect(groupes.map((g) => [g.cle, g.echeances.map((e) => e.id)])).toEqual([
      ["cette-semaine", ["dimanche"]],
      ["semaine-prochaine", ["lundi"]],
    ]);
  });

  it("groupes vides omis ; même date : ordre reçu conservé", () => {
    const groupes = grouperEcheancesParSemaine(
      [ech("b", "2027-03-01"), ech("a", "2027-03-01")],
      "2026-10-28",
    );
    expect(groupes.map((g) => [g.cle, g.echeances.map((e) => e.id)])).toEqual([
      ["2027-03", ["b", "a"]],
    ]);
    expect(grouperEcheancesParSemaine([], "2026-10-28")).toEqual([]);
  });
});
