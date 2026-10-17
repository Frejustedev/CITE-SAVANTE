import { describe, expect, it } from "vitest";

import {
  SEUIL_URGENCE_JOURS,
  aujourdhuiPortoNovo,
  decrireJoursRestants,
  estUrgente,
  formaterDate,
  formaterDateCourte,
  formaterPeriode,
  joursRestants,
  lireDateIso,
} from "./dates";

describe("aujourdhuiPortoNovo", () => {
  it("donne la même date que l'UTC en milieu de journée", () => {
    expect(aujourdhuiPortoNovo(new Date("2026-09-29T12:00:00Z"))).toBe("2026-09-29");
  });

  it("est déjà le lendemain à Porto-Novo alors que l'UTC est encore la veille", () => {
    // 23:30 UTC le 29 = 00:30 à Porto-Novo le 30 : la date de Porto-Novo est
    // déjà le lendemain de la date UTC. C'est exactement l'écart que
    // `current_date` ignorerait côté SQL (PROGRESS.md, décision 2).
    expect(aujourdhuiPortoNovo(new Date("2026-09-29T23:30:00Z"))).toBe("2026-09-30");
  });

  it("reste sur le même jour juste avant le changement (22 h 59 UTC = 23 h 59 à Porto-Novo)", () => {
    expect(aujourdhuiPortoNovo(new Date("2026-09-29T22:59:00Z"))).toBe("2026-09-29");
  });

  it("bascule pile à 23 h UTC, l'instant où Porto-Novo atteint minuit", () => {
    expect(aujourdhuiPortoNovo(new Date("2026-09-29T23:00:00Z"))).toBe("2026-09-30");
  });

  it("reste sur le jour de Porto-Novo juste avant minuit UTC (00 h 30 UTC = 1 h 30 à Porto-Novo)", () => {
    expect(aujourdhuiPortoNovo(new Date("2026-09-30T00:30:00Z"))).toBe("2026-09-30");
  });

  it("formate toujours sur deux chiffres (mois et jour à un chiffre)", () => {
    expect(aujourdhuiPortoNovo(new Date("2026-01-05T12:00:00Z"))).toBe("2026-01-05");
  });

  it("sans argument, utilise l'heure actuelle (ne lève pas et renvoie AAAA-MM-JJ)", () => {
    expect(aujourdhuiPortoNovo()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("lireDateIso", () => {
  it("décompose une date valide", () => {
    expect(lireDateIso("2027-03-12")).toEqual({ annee: 2027, mois: 3, jour: 12 });
  });

  it("accepte le 29 février d'une année bissextile (2028, 2000)", () => {
    expect(lireDateIso("2028-02-29")).toEqual({ annee: 2028, mois: 2, jour: 29 });
    expect(lireDateIso("2000-02-29")).toEqual({ annee: 2000, mois: 2, jour: 29 });
  });

  it("refuse le 29 février d'une année non bissextile (2027, 1900, 2100)", () => {
    expect(() => lireDateIso("2027-02-29")).toThrow(/n'existe pas/);
    expect(() => lireDateIso("1900-02-29")).toThrow(/n'existe pas/);
    expect(() => lireDateIso("2100-02-29")).toThrow(/n'existe pas/);
  });

  it("refuse les jours et mois hors calendrier", () => {
    expect(() => lireDateIso("2027-04-31")).toThrow(/n'existe pas/);
    expect(() => lireDateIso("2027-13-01")).toThrow(/n'existe pas/);
    expect(() => lireDateIso("2027-00-10")).toThrow(/n'existe pas/);
    expect(() => lireDateIso("2027-01-00")).toThrow(/n'existe pas/);
  });

  it("refuse tout autre format (y compris un horodatage complet)", () => {
    for (const saisie of ["12/03/2027", "2027-3-12", "2027-03-12T00:00:00Z", "", " 2027-03-12"]) {
      expect(() => lireDateIso(saisie)).toThrow(/format attendu : AAAA-MM-JJ/);
    }
  });
});

describe("formaterDate", () => {
  it("formate « 2027-03-12 » en « 12 mars 2027 » (exemple de CLAUDE.md)", () => {
    expect(formaterDate("2027-03-12")).toBe("12 mars 2027");
  });

  it("écrit « 1er » pour le premier jour du mois, et seulement pour lui", () => {
    expect(formaterDate("2027-05-01")).toBe("1er mai 2027");
    expect(formaterDate("2027-05-02")).toBe("2 mai 2027");
    expect(formaterDate("2027-05-21")).toBe("21 mai 2027");
    expect(formaterDate("2027-05-31")).toBe("31 mai 2027");
  });

  it("donne les douze mois en français, accents compris", () => {
    const mois = [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre",
    ];
    mois.forEach((nom, index) => {
      const numero = String(index + 1).padStart(2, "0");
      expect(formaterDate(`2027-${numero}-15`)).toBe(`15 ${nom} 2027`);
    });
  });

  it("gère les fins de mois et le 29 février bissextile", () => {
    expect(formaterDate("2027-01-31")).toBe("31 janvier 2027");
    expect(formaterDate("2027-04-30")).toBe("30 avril 2027");
    expect(formaterDate("2027-02-28")).toBe("28 février 2027");
    expect(formaterDate("2028-02-29")).toBe("29 février 2028");
    expect(formaterDate("2026-12-31")).toBe("31 décembre 2026");
  });

  it("ne décale jamais d'un jour, quel que soit le fuseau du processus", () => {
    // `new Date("2027-01-01")` vaut minuit UTC : affiché en heure locale à
    // l'ouest de Greenwich, ce serait le 31 décembre 2026. La lecture par
    // composantes ne dépend d'aucun fuseau.
    expect(formaterDate("2027-01-01")).toBe("1er janvier 2027");
  });

  it("lève une erreur claire sur une date invalide", () => {
    expect(() => formaterDate("2027-02-30")).toThrow(/Date invalide/);
  });
});

describe("formaterDateCourte", () => {
  it("omet l'année et garde le « 1er »", () => {
    expect(formaterDateCourte("2027-03-12")).toBe("12 mars");
    expect(formaterDateCourte("2027-08-01")).toBe("1er août");
  });
});

describe("formaterPeriode", () => {
  it("même jour : la date seule (« 12 mars 2027 »)", () => {
    expect(formaterPeriode("2027-03-12", "2027-03-12")).toBe("12 mars 2027");
  });

  it("même mois : « du 12 au 14 mars 2027 » (exemple de CLAUDE.md)", () => {
    expect(formaterPeriode("2027-03-12", "2027-03-14")).toBe("du 12 au 14 mars 2027");
  });

  it("même année : « du 30 avril au 2 mai 2027 » (exemple de CLAUDE.md)", () => {
    expect(formaterPeriode("2027-04-30", "2027-05-02")).toBe("du 30 avril au 2 mai 2027");
  });

  it("années différentes : « du 30 décembre 2026 au 2 janvier 2027 »", () => {
    expect(formaterPeriode("2026-12-30", "2027-01-02")).toBe(
      "du 30 décembre 2026 au 2 janvier 2027",
    );
  });

  it("« 1er » au début, à la fin, ou aux deux bouts", () => {
    expect(formaterPeriode("2027-03-01", "2027-03-03")).toBe("du 1er au 3 mars 2027");
    expect(formaterPeriode("2027-04-29", "2027-05-01")).toBe("du 29 avril au 1er mai 2027");
    expect(formaterPeriode("2027-04-01", "2027-05-01")).toBe("du 1er avril au 1er mai 2027");
    expect(formaterPeriode("2026-12-01", "2027-01-01")).toBe(
      "du 1er décembre 2026 au 1er janvier 2027",
    );
    expect(formaterPeriode("2027-05-01", "2027-05-01")).toBe("1er mai 2027");
  });

  it("enjambe une fin de février, bissextile ou non", () => {
    expect(formaterPeriode("2028-02-28", "2028-03-01")).toBe("du 28 février au 1er mars 2028");
    expect(formaterPeriode("2028-02-27", "2028-02-29")).toBe("du 27 au 29 février 2028");
    expect(formaterPeriode("2027-02-27", "2027-03-02")).toBe("du 27 février au 2 mars 2027");
  });

  it("mêmes jour et mois mais années différentes : les deux années sont écrites", () => {
    expect(formaterPeriode("2026-03-12", "2027-03-12")).toBe("du 12 mars 2026 au 12 mars 2027");
  });

  it("refuse une période inversée avec un message clair", () => {
    expect(() => formaterPeriode("2027-03-14", "2027-03-12")).toThrow(
      "Période invalide : la date de fin (2027-03-12) précède la date de début (2027-03-14).",
    );
    expect(() => formaterPeriode("2027-01-01", "2026-12-31")).toThrow(/Période invalide/);
  });

  it("refuse une date invalide à l'un ou l'autre bout", () => {
    expect(() => formaterPeriode("2027-02-29", "2027-03-02")).toThrow(/Date invalide/);
    expect(() => formaterPeriode("2027-03-01", "2027-03-32")).toThrow(/Date invalide/);
  });
});

describe("joursRestants", () => {
  it("vaut 0 le jour même, 1 la veille, négatif une fois passé", () => {
    expect(joursRestants("2027-03-12", "2027-03-12")).toBe(0);
    expect(joursRestants("2027-03-12", "2027-03-11")).toBe(1);
    expect(joursRestants("2027-03-12", "2027-03-13")).toBe(-1);
  });

  it("traverse les fins de mois, d'année et le 29 février", () => {
    expect(joursRestants("2027-01-02", "2026-12-30")).toBe(3);
    expect(joursRestants("2028-03-01", "2028-02-28")).toBe(2);
    expect(joursRestants("2027-03-01", "2027-02-28")).toBe(1);
    expect(joursRestants("2029-01-01", "2028-01-01")).toBe(366);
  });

  it("lève une erreur sur une date invalide", () => {
    expect(() => joursRestants("2027-02-29", "2027-02-01")).toThrow(/Date invalide/);
  });
});

describe("estUrgente", () => {
  it("le seuil est de 7 jours (spécifications, section 7)", () => {
    expect(SEUIL_URGENCE_JOURS).toBe(7);
  });

  it("urgente d'aujourd'hui à 7 jours inclus", () => {
    expect(estUrgente("2027-03-12", "2027-03-12")).toBe(true);
    expect(estUrgente("2027-03-13", "2027-03-12")).toBe(true);
    expect(estUrgente("2027-03-19", "2027-03-12")).toBe(true);
  });

  it("pas urgente à 8 jours ni une fois passée", () => {
    expect(estUrgente("2027-03-20", "2027-03-12")).toBe(false);
    expect(estUrgente("2027-03-11", "2027-03-12")).toBe(false);
  });

  it("compte juste à travers une fin d'année", () => {
    expect(estUrgente("2027-01-03", "2026-12-27")).toBe(true);
    expect(estUrgente("2027-01-04", "2026-12-27")).toBe(false);
  });
});

describe("decrireJoursRestants", () => {
  it("dit l'écart en toutes lettres", () => {
    expect(decrireJoursRestants(0)).toBe("aujourd’hui");
    expect(decrireJoursRestants(1)).toBe("demain");
    expect(decrireJoursRestants(2)).toBe("dans 2 jours");
    expect(decrireJoursRestants(7)).toBe("dans 7 jours");
    expect(decrireJoursRestants(-1)).toBe("hier");
    expect(decrireJoursRestants(-4)).toBe("il y a 4 jours");
  });

  it("refuse un nombre non entier", () => {
    expect(() => decrireJoursRestants(1.5)).toThrow(/entier attendu/);
  });
});
