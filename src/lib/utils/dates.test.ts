import { describe, expect, it } from "vitest";

import { aujourdhuiPortoNovo } from "./dates";

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
