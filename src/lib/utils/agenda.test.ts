import { describe, expect, it } from "vitest";

import {
  FILTRES_AGENDA_VIDES,
  aDesFiltresAgenda,
  appliquerFiltresAgenda,
  appliquerFiltresEcheances,
  cheminAgenda,
  cheminEcheances,
  lireFiltresAgenda,
  lireFiltresEcheances,
  normaliserFiltresAgenda,
  normaliserFiltresEcheances,
  type ContexteFiltresAgenda,
  type EvenementFiltrable,
  type FiltresAgenda,
} from "./agenda";

const AUJOURDHUI = "2026-10-31";

describe("normaliserFiltresAgenda", () => {
  it("aucun filtre : liste des événements à venir", () => {
    expect(normaliserFiltresAgenda({}, AUJOURDHUI)).toEqual(FILTRES_AGENDA_VIDES);
  });

  it("vue, période et mois", () => {
    expect(normaliserFiltresAgenda({ vue: "calendrier" }, AUJOURDHUI).vue).toBe("calendrier");
    expect(normaliserFiltresAgenda({ vue: "grille" }, AUJOURDHUI).vue).toBe("liste");
    expect(normaliserFiltresAgenda({ periode: "passes" }, AUJOURDHUI).periode).toBe("passes");
    expect(normaliserFiltresAgenda({ periode: "futur" }, AUJOURDHUI).periode).toBe("a_venir");
    // Le calendrier montre un mois entier : la période y est ramenée à « a_venir ».
    expect(
      normaliserFiltresAgenda({ vue: "calendrier", periode: "passes" }, AUJOURDHUI).periode,
    ).toBe("a_venir");
    // Le mois n'est gardé qu'en vue calendrier, et dans la fenêtre de navigation.
    expect(normaliserFiltresAgenda({ vue: "calendrier", mois: "2026-11" }, AUJOURDHUI).mois).toBe(
      "2026-11",
    );
    expect(normaliserFiltresAgenda({ mois: "2026-11" }, AUJOURDHUI).mois).toBeNull();
    expect(
      normaliserFiltresAgenda({ vue: "calendrier", mois: "2026-13" }, AUJOURDHUI).mois,
    ).toBeNull();
    expect(
      normaliserFiltresAgenda({ vue: "calendrier", mois: "1999-01" }, AUJOURDHUI).mois,
    ).toBeNull();
  });

  it("type, discipline, ville, modalité : valeurs connues ou formes valides seulement", () => {
    const filtres = normaliserFiltresAgenda(
      {
        type: "congres",
        discipline: " SANTE ",
        ville: "Porto Novo",
        modalite: "en_ligne",
      },
      AUJOURDHUI,
    );
    expect(filtres).toMatchObject({
      type: "congres",
      discipline: "sante",
      ville: "porto-novo",
      modalite: "en_ligne",
    });
    expect(
      normaliserFiltresAgenda(
        { type: "fete", discipline: "santé publique", ville: "  ", modalite: "distanciel" },
        AUJOURDHUI,
      ),
    ).toMatchObject({ type: null, discipline: null, ville: null, modalite: null });
  });

  it.each([
    ["1", true],
    ["true", true],
    ["oui", true],
    ["OUI", true],
    [true, true],
    ["0", false],
    ["non", false],
    ["", false],
    [null, false],
  ])("gratuit=%j → %s", (valeur, attendu) => {
    expect(normaliserFiltresAgenda({ gratuit: valeur }, AUJOURDHUI).gratuit).toBe(attendu);
  });

  it("dates : invalides ignorées, du > au échangées", () => {
    expect(
      normaliserFiltresAgenda({ du: "2027-02-30", au: "12/03/2027" }, AUJOURDHUI),
    ).toMatchObject({ du: null, au: null });
    expect(
      normaliserFiltresAgenda({ du: "2027-03-14", au: "2027-03-01" }, AUJOURDHUI),
    ).toMatchObject({ du: "2027-03-01", au: "2027-03-14" });
    expect(normaliserFiltresAgenda({ du: "2027-03-01" }, AUJOURDHUI)).toMatchObject({
      du: "2027-03-01",
      au: null,
    });
  });

  it("recherche : moins de 2 caractères ignorée, espaces normalisés", () => {
    expect(normaliserFiltresAgenda({ q: "a" }, AUJOURDHUI).q).toBeNull();
    expect(normaliserFiltresAgenda({ q: "  congrès   pédiatrie " }, AUJOURDHUI).q).toBe(
      "congrès pédiatrie",
    );
  });

  it("idempotente", () => {
    const une = normaliserFiltresAgenda(
      {
        vue: "calendrier",
        mois: "2027-01",
        ville: "Cotonou",
        du: "2027-02-01",
        au: "2027-01-01",
        gratuit: "1",
        q: "santé",
      },
      AUJOURDHUI,
    );
    expect(normaliserFiltresAgenda(une, AUJOURDHUI)).toEqual(une);
  });
});

describe("lireFiltresAgenda", () => {
  it("lit les searchParams (première valeur d'un paramètre répété) et URLSearchParams", () => {
    const attendu = {
      ...FILTRES_AGENDA_VIDES,
      type: "atelier",
      discipline: "sante",
      gratuit: true,
      q: "nutrition",
    };
    expect(
      lireFiltresAgenda(
        { type: ["atelier", "congres"], discipline: "sante", gratuit: "1", q: "nutrition", x: "y" },
        AUJOURDHUI,
      ),
    ).toEqual(attendu);
    expect(
      lireFiltresAgenda(
        new URLSearchParams("type=atelier&discipline=sante&gratuit=1&q=nutrition"),
        AUJOURDHUI,
      ),
    ).toEqual(attendu);
  });
});

describe("cheminAgenda", () => {
  it("valeurs par défaut omises", () => {
    expect(cheminAgenda({})).toBe("/agenda");
    expect(cheminAgenda(FILTRES_AGENDA_VIDES)).toBe("/agenda");
  });

  it("archives, vue calendrier et mois", () => {
    expect(cheminAgenda({ periode: "passes" })).toBe("/agenda?periode=passes");
    expect(cheminAgenda({ vue: "calendrier", mois: "2026-11" })).toBe(
      "/agenda?vue=calendrier&mois=2026-11",
    );
    // `mois` hors calendrier et `periode` en calendrier sont omis.
    expect(cheminAgenda({ vue: "liste", mois: "2026-11" })).toBe("/agenda");
    expect(cheminAgenda({ vue: "calendrier", periode: "passes" })).toBe("/agenda?vue=calendrier");
  });

  it("ordre des paramètres et encodage", () => {
    const filtres: FiltresAgenda = {
      vue: "liste",
      periode: "passes",
      mois: null,
      type: "congres",
      discipline: "sante",
      ville: "porto-novo",
      modalite: "hybride",
      gratuit: true,
      du: "2027-01-01",
      au: "2027-06-30",
      q: "pédiatrie & santé",
    };
    expect(cheminAgenda(filtres)).toBe(
      "/agenda?periode=passes&type=congres&discipline=sante&ville=porto-novo&modalite=hybride&gratuit=1&du=2027-01-01&au=2027-06-30&q=p%C3%A9diatrie+%26+sant%C3%A9",
    );
    // Aller-retour : l'URL relue redonne les mêmes filtres.
    const relus = lireFiltresAgenda(
      new URL(cheminAgenda(filtres), "https://citesavante.com").searchParams,
      AUJOURDHUI,
    );
    expect(relus).toEqual(filtres);
  });

  it("aDesFiltresAgenda : vue, période et mois ne sont pas des filtres", () => {
    expect(aDesFiltresAgenda(FILTRES_AGENDA_VIDES)).toBe(false);
    expect(aDesFiltresAgenda({ ...FILTRES_AGENDA_VIDES, vue: "calendrier", mois: "2026-11" })).toBe(
      false,
    );
    expect(aDesFiltresAgenda({ ...FILTRES_AGENDA_VIDES, periode: "passes" })).toBe(false);
    expect(aDesFiltresAgenda({ ...FILTRES_AGENDA_VIDES, gratuit: true })).toBe(true);
    expect(aDesFiltresAgenda({ ...FILTRES_AGENDA_VIDES, au: "2027-01-01" })).toBe(true);
  });
});

describe("appliquerFiltresAgenda", () => {
  const ev = (
    id: string,
    surcharges: Partial<EvenementFiltrable> = {},
  ): EvenementFiltrable & { titre: string } => ({
    id,
    titre: id,
    type: "congres",
    dateDebut: "2027-03-12",
    dateFin: "2027-03-14",
    modalite: "presentiel",
    gratuit: false,
    ville: "Cotonou",
    disciplines: [{ slug: "sante" }],
    ...surcharges,
  });

  const EVENEMENTS = [
    ev("congres-cotonou"),
    ev("atelier-porto-novo", { type: "atelier", ville: "Porto-Novo", gratuit: true }),
    ev("webinaire-droit", {
      type: "webinaire",
      modalite: "en_ligne",
      ville: null,
      gratuit: true,
      disciplines: [{ slug: "droit-economie" }],
      dateDebut: "2027-01-10",
      dateFin: "2027-01-10",
    }),
    ev("hybride-parakou", {
      modalite: "hybride",
      ville: "parakou",
      disciplines: [{ slug: "sante" }, { slug: "sciences-techniques" }],
      dateDebut: "2027-02-27",
      dateFin: "2027-03-02",
    }),
  ];

  const CONTEXTE = {
    disciplinesConnues: ["sante", "sciences-techniques", "droit-economie"],
    idsRecherche: null,
  };

  const appliquer = (
    filtres: Partial<FiltresAgenda>,
    contexte: Partial<ContexteFiltresAgenda> = {},
  ) =>
    appliquerFiltresAgenda(
      EVENEMENTS,
      { ...FILTRES_AGENDA_VIDES, ...filtres },
      { ...CONTEXTE, ...contexte },
    );
  const ids = (resultat: ReturnType<typeof appliquer>) => resultat.evenements.map((e) => e.id);

  it("sans filtre : tout, dans l'ordre reçu ; villes proposées", () => {
    const resultat = appliquer({});
    expect(ids(resultat)).toEqual(EVENEMENTS.map((e) => e.id));
    expect(resultat.total).toBe(4);
    expect(resultat.villes.map((v) => [v.slug, v.nom, v.nombre])).toEqual([
      ["cotonou", "Cotonou", 1],
      ["parakou", "parakou", 1],
      ["porto-novo", "Porto-Novo", 1],
    ]);
  });

  it("chaque filtre", () => {
    expect(ids(appliquer({ type: "atelier" }))).toEqual(["atelier-porto-novo"]);
    expect(ids(appliquer({ discipline: "sciences-techniques" }))).toEqual(["hybride-parakou"]);
    expect(ids(appliquer({ ville: "porto-novo" }))).toEqual(["atelier-porto-novo"]);
    expect(ids(appliquer({ modalite: "en_ligne" }))).toEqual(["webinaire-droit"]);
    expect(ids(appliquer({ gratuit: true }))).toEqual(["atelier-porto-novo", "webinaire-droit"]);
  });

  it("filtres combinables et cumulatifs", () => {
    expect(ids(appliquer({ gratuit: true, discipline: "sante" }))).toEqual(["atelier-porto-novo"]);
    expect(ids(appliquer({ type: "congres", ville: "parakou", modalite: "hybride" }))).toEqual([
      "hybride-parakou",
    ]);
    expect(appliquer({ type: "formation" }).total).toBe(0);
  });

  it("période du–au : chevauchement (un événement qui déborde est gardé)", () => {
    // Du 1er au 12 mars : le congrès commence le 12, l'hybride finit le 2.
    expect(ids(appliquer({ du: "2027-03-01", au: "2027-03-12" }))).toEqual([
      "congres-cotonou",
      "atelier-porto-novo",
      "hybride-parakou",
    ]);
    expect(ids(appliquer({ du: "2027-03-03" }))).toEqual(["congres-cotonou", "atelier-porto-novo"]);
    expect(ids(appliquer({ au: "2027-01-31" }))).toEqual(["webinaire-droit"]);
  });

  it("discipline ou ville inconnue : ignorée et retirée des filtres effectifs", () => {
    const resultat = appliquer({ discipline: "astronomie", ville: "natitingou" });
    expect(resultat.total).toBe(4);
    expect(resultat.filtres.discipline).toBeNull();
    expect(resultat.filtres.ville).toBeNull();
  });

  it("recherche : ids trouvés par rechercher() ; sans recherche, q retiré", () => {
    const resultat = appliquer(
      { q: "droit" },
      { idsRecherche: new Set(["webinaire-droit", "inconnu"]) },
    );
    expect(ids(resultat)).toEqual(["webinaire-droit"]);
    expect(resultat.filtres.q).toBe("droit");
    expect(appliquer({ q: "droit" }).filtres.q).toBeNull();
  });

  it("referenceVilles : une ville connue ailleurs garde son filtre (calendrier)", () => {
    const duMois = [EVENEMENTS[2]];
    const resultat = appliquerFiltresAgenda(
      duMois,
      { ...FILTRES_AGENDA_VIDES, ville: "parakou" },
      { ...CONTEXTE, referenceVilles: EVENEMENTS },
    );
    expect(resultat.total).toBe(0);
    expect(resultat.filtres.ville).toBe("parakou");
    expect(resultat.villes).toHaveLength(3);
  });
});

describe("échéances : filtres", () => {
  it("normalise, lit et écrit l'URL", () => {
    expect(normaliserFiltresEcheances({ type: "bourse", discipline: "Sante" })).toEqual({
      type: "bourse",
      discipline: "sante",
    });
    expect(normaliserFiltresEcheances({ type: "concours", discipline: "a b" })).toEqual({
      type: null,
      discipline: null,
    });
    expect(normaliserFiltresEcheances()).toEqual({ type: null, discipline: null });
    expect(lireFiltresEcheances(new URLSearchParams("type=prix&discipline=sante&x=1"))).toEqual({
      type: "prix",
      discipline: "sante",
    });
    expect(cheminEcheances({})).toBe("/echeances");
    expect(cheminEcheances({ type: "soumission_resumes", discipline: "sante" })).toBe(
      "/echeances?type=soumission_resumes&discipline=sante",
    );
  });

  it("applique type et discipline de l'événement, discipline inconnue ignorée", () => {
    const echeances = [
      { id: "1", type: "bourse" as const, disciplines: [{ slug: "sante" }] },
      { id: "2", type: "inscription" as const, disciplines: [{ slug: "droit-economie" }] },
      { id: "3", type: "bourse" as const, disciplines: [] },
    ];
    const contexte = { disciplinesConnues: ["sante", "droit-economie"] };
    expect(
      appliquerFiltresEcheances(
        echeances,
        { type: "bourse", discipline: null },
        contexte,
      ).echeances.map((e) => e.id),
    ).toEqual(["1", "3"]);
    expect(
      appliquerFiltresEcheances(
        echeances,
        { type: null, discipline: "droit-economie" },
        contexte,
      ).echeances.map((e) => e.id),
    ).toEqual(["2"]);
    const inconnue = appliquerFiltresEcheances(
      echeances,
      { type: null, discipline: "astronomie" },
      contexte,
    );
    expect(inconnue.total).toBe(3);
    expect(inconnue.filtres.discipline).toBeNull();
  });
});
