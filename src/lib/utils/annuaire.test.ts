import { describe, expect, it } from "vitest";

import {
  LONGUEUR_MAX_RECHERCHE,
  TAILLE_PAGE_ANNUAIRE,
  appliquerFiltresAnnuaire,
  cheminAnnuaire,
  cleRecherche,
  comparerSocietes,
  lireFiltresAnnuaire,
  listerVilles,
  normaliserFiltresAnnuaire,
  type FiltresAnnuaire,
  type SocieteFiltrable,
} from "./annuaire";

const SANS_FILTRE: FiltresAnnuaire = {
  discipline: null,
  ville: null,
  categorie: null,
  q: null,
  page: 1,
};

function societe(
  id: string,
  sigle: string,
  surcharges: Partial<SocieteFiltrable> = {},
): SocieteFiltrable {
  return {
    id,
    slug: `demo-${id}`,
    sigle,
    nomComplet: `[DÉMO] ${sigle}`,
    categorie: "societe_savante",
    ville: "Cotonou",
    miseEnAvant: false,
    disciplines: [{ slug: "sante" }],
    ...surcharges,
  };
}

const DISCIPLINES = ["sante", "sciences-techniques", "droit-economie"];

const SOCIETES: SocieteFiltrable[] = [
  societe("1", "SBMI", { miseEnAvant: true }),
  societe("2", "ABPN", { ville: "Porto-Novo" }),
  societe("3", "SBGEO", {
    miseEnAvant: true,
    ville: "Parakou",
    disciplines: [{ slug: "sciences-techniques" }],
  }),
  societe("4", "ABIN", {
    categorie: "association_professionnelle",
    ville: "Abomey-Calavi",
    disciplines: [{ slug: "sciences-techniques" }],
  }),
  societe("5", "ÉCOLE", { ville: "porto novo", categorie: "institution_academique" }),
  societe("6", "abde", { ville: null, disciplines: [{ slug: "droit-economie" }] }),
  societe("7", "ZETA", { ville: "  Porto-Novo ", disciplines: [] }),
];

function appliquer(filtres: Partial<FiltresAnnuaire>, idsRecherche: Set<string> | null = null) {
  return appliquerFiltresAnnuaire(
    SOCIETES,
    { ...SANS_FILTRE, ...filtres },
    { disciplinesConnues: DISCIPLINES, idsRecherche },
  );
}

const sigles = (resultat: { societes: SocieteFiltrable[] }) =>
  resultat.societes.map((s) => s.sigle);

describe("normaliserFiltresAnnuaire", () => {
  it("sans filtre : tout à null, page 1", () => {
    expect(normaliserFiltresAnnuaire()).toEqual(SANS_FILTRE);
    expect(normaliserFiltresAnnuaire({})).toEqual(SANS_FILTRE);
  });

  it("garde des valeurs valides", () => {
    expect(
      normaliserFiltresAnnuaire({
        discipline: "sante",
        ville: "cotonou",
        categorie: "societe_savante",
        q: "pediatrie",
        page: "3",
      }),
    ).toEqual({
      discipline: "sante",
      ville: "cotonou",
      categorie: "societe_savante",
      q: "pediatrie",
      page: 3,
    });
  });

  it("met la discipline en minuscules et ramène la ville à son slug", () => {
    expect(normaliserFiltresAnnuaire({ discipline: " SANTE ", ville: "Porto Novo" })).toMatchObject(
      {
        discipline: "sante",
        ville: "porto-novo",
      },
    );
    expect(normaliserFiltresAnnuaire({ ville: "Abomey-Calavi" }).ville).toBe("abomey-calavi");
  });

  it("ignore les valeurs invalides sans erreur", () => {
    expect(
      normaliserFiltresAnnuaire({
        discipline: "santé publique/../x",
        ville: "!!!",
        categorie: "SOCIETE_SAVANTE",
        q: " a ",
        page: "-2",
      }),
    ).toEqual(SANS_FILTRE);
    expect(normaliserFiltresAnnuaire({ categorie: "laboratoire" }).categorie).toBeNull();
    expect(normaliserFiltresAnnuaire({ page: "2.5" }).page).toBe(1);
    expect(normaliserFiltresAnnuaire({ page: "abc" }).page).toBe(1);
    expect(normaliserFiltresAnnuaire({ page: 0 }).page).toBe(1);
    expect(normaliserFiltresAnnuaire({ page: "99999999999" }).page).toBe(10_000);
  });

  it("nettoie le texte recherché : espaces, caractères de contrôle, longueur", () => {
    expect(normaliserFiltresAnnuaire({ q: "  société   de\tpédiatrie\n" }).q).toBe(
      "société de pédiatrie",
    );
    expect(normaliserFiltresAnnuaire({ q: "sb\u0000c" }).q).toBe("sb c");
    expect(normaliserFiltresAnnuaire({ q: "x" }).q).toBeNull();
    expect(normaliserFiltresAnnuaire({ q: "é" }).q).toBeNull();
    expect(normaliserFiltresAnnuaire({ q: "ab" }).q).toBe("ab");
    expect(Array.from(normaliserFiltresAnnuaire({ q: "a".repeat(500) }).q ?? "")).toHaveLength(
      LONGUEUR_MAX_RECHERCHE,
    );
  });
});

describe("lireFiltresAnnuaire", () => {
  it("lit les searchParams d'une page Next (première valeur des paramètres répétés)", () => {
    expect(
      lireFiltresAnnuaire({
        discipline: ["sante", "droit-economie"],
        ville: "Cotonou",
        categorie: undefined,
        q: "SBC",
        page: "2",
        autre: "ignoré",
      }),
    ).toEqual({ discipline: "sante", ville: "cotonou", categorie: null, q: "SBC", page: 2 });
  });

  it("lit aussi un URLSearchParams", () => {
    expect(lireFiltresAnnuaire(new URLSearchParams("categorie=autre&page=4&q=%C3%A9cole"))).toEqual(
      { discipline: null, ville: null, categorie: "autre", q: "école", page: 4 },
    );
  });
});

describe("cheminAnnuaire", () => {
  it("omet les filtres absents et la page 1", () => {
    expect(cheminAnnuaire({})).toBe("/societes");
    expect(cheminAnnuaire(SANS_FILTRE)).toBe("/societes");
    expect(cheminAnnuaire({ ...SANS_FILTRE, page: 1, ville: "porto-novo" })).toBe(
      "/societes?ville=porto-novo",
    );
  });

  it("encode les valeurs, dans un ordre fixe", () => {
    expect(
      cheminAnnuaire({
        page: 3,
        q: "société & co",
        categorie: "societe_savante",
        ville: "cotonou",
        discipline: "sante",
      }),
    ).toBe(
      "/societes?discipline=sante&ville=cotonou&categorie=societe_savante&q=soci%C3%A9t%C3%A9+%26+co&page=3",
    );
  });

  it("aller-retour avec lireFiltresAnnuaire", () => {
    const filtres: FiltresAnnuaire = {
      discipline: "sante",
      ville: "porto-novo",
      categorie: "autre",
      q: "pédiatrie",
      page: 2,
    };
    const chemin = cheminAnnuaire(filtres);
    expect(lireFiltresAnnuaire(new URL(chemin, "https://origine.invalid").searchParams)).toEqual(
      filtres,
    );
  });
});

describe("comparerSocietes", () => {
  it("mises en avant d'abord, puis sigle en ordre alphabétique français", () => {
    const triees = [...SOCIETES].sort(comparerSocietes).map((s) => s.sigle);
    expect(triees).toEqual(["SBGEO", "SBMI", "abde", "ABIN", "ABPN", "ÉCOLE", "ZETA"]);
  });

  it("ignore accents et casse, et range les nombres dans l'ordre numérique", () => {
    const liste = [
      societe("a", "SB10"),
      societe("b", "sb2"),
      societe("c", "Éa"),
      societe("d", "Eb"),
      societe("e", "ea"),
    ].sort(comparerSocietes);
    expect(liste.map((s) => s.sigle)).toEqual(["Éa", "ea", "Eb", "sb2", "SB10"]);
  });

  it("départage deux sigles identiques par nom complet puis slug (ordre stable)", () => {
    const liste = [
      societe("x2", "SBC", { nomComplet: "B" }),
      societe("x1", "SBC", { nomComplet: "A" }),
      societe("x3", "sbc", { nomComplet: "A" }),
    ].sort(comparerSocietes);
    expect(liste.map((s) => s.id)).toEqual(["x1", "x3", "x2"]);
  });
});

describe("appliquerFiltresAnnuaire", () => {
  it("sans filtre : toutes les organisations, triées", () => {
    const resultat = appliquer({});
    expect(resultat.total).toBe(7);
    expect(resultat.pages).toBe(1);
    expect(resultat.page).toBe(1);
    expect(resultat.taillePage).toBe(TAILLE_PAGE_ANNUAIRE);
    expect(sigles(resultat)).toEqual(["SBGEO", "SBMI", "abde", "ABIN", "ABPN", "ÉCOLE", "ZETA"]);
    expect(resultat.filtres).toEqual(SANS_FILTRE);
  });

  it("filtre par discipline", () => {
    expect(sigles(appliquer({ discipline: "sciences-techniques" }))).toEqual(["SBGEO", "ABIN"]);
    const vide = appliquer({ discipline: "droit-economie", categorie: "autre" });
    expect(vide.total).toBe(0);
    expect(vide.pages).toBe(0);
    expect(vide.page).toBe(1);
  });

  it("filtre par ville normalisée (graphies différentes de la même ville)", () => {
    const resultat = appliquer({ ville: "porto-novo" });
    expect(sigles(resultat)).toEqual(["ABPN", "ÉCOLE", "ZETA"]);
    expect(resultat.filtres.ville).toBe("porto-novo");
  });

  it("filtre par catégorie", () => {
    expect(sigles(appliquer({ categorie: "association_professionnelle" }))).toEqual(["ABIN"]);
  });

  it("filtre par identifiants trouvés par la recherche", () => {
    const resultat = appliquer({ q: "pediatrie" }, new Set(["2", "3", "inconnu"]));
    expect(sigles(resultat)).toEqual(["SBGEO", "ABPN"]);
    expect(resultat.filtres.q).toBe("pediatrie");
  });

  it("combine les filtres (tous cumulatifs)", () => {
    expect(
      sigles(
        appliquer(
          { discipline: "sante", ville: "porto-novo", categorie: "societe_savante" },
          new Set(["2", "5", "7"]),
        ),
      ),
    ).toEqual(["ABPN"]);
  });

  it("ignore une discipline inconnue ou une ville absente, et le dit dans filtres", () => {
    const resultat = appliquer({ discipline: "astrologie", ville: "paris" });
    expect(resultat.total).toBe(7);
    expect(resultat.filtres.discipline).toBeNull();
    expect(resultat.filtres.ville).toBeNull();
  });

  it("une discipline connue sans organisation donne une liste vide (pas ignorée)", () => {
    const resultat = appliquerFiltresAnnuaire(
      SOCIETES,
      { ...SANS_FILTRE, discipline: "agronomie-environnement" },
      { disciplinesConnues: [...DISCIPLINES, "agronomie-environnement"], idsRecherche: null },
    );
    expect(resultat.total).toBe(0);
    expect(resultat.filtres.discipline).toBe("agronomie-environnement");
  });

  it("ignore q quand aucune recherche n'a été faite", () => {
    const resultat = appliquer({ q: "sbc" }, null);
    expect(resultat.total).toBe(7);
    expect(resultat.filtres.q).toBeNull();
  });

  it("pagine par 24 et borne la page demandée", () => {
    const nombreuses = Array.from({ length: 50 }, (_, i) =>
      societe(String(i), `S${String(i).padStart(2, "0")}`),
    );
    const options = { disciplinesConnues: DISCIPLINES, idsRecherche: null };

    const page1 = appliquerFiltresAnnuaire(nombreuses, SANS_FILTRE, options);
    expect(page1.total).toBe(50);
    expect(page1.pages).toBe(3);
    expect(page1.societes).toHaveLength(24);
    expect(page1.societes[0].sigle).toBe("S00");

    const page3 = appliquerFiltresAnnuaire(nombreuses, { ...SANS_FILTRE, page: 3 }, options);
    expect(page3.societes.map((s) => s.sigle)).toEqual(["S48", "S49"]);

    const tropLoin = appliquerFiltresAnnuaire(nombreuses, { ...SANS_FILTRE, page: 9 }, options);
    expect(tropLoin.page).toBe(3);
    expect(tropLoin.filtres.page).toBe(3);
    expect(tropLoin.societes).toHaveLength(2);
  });

  it("ne modifie pas la liste reçue", () => {
    const copie = SOCIETES.map((s) => s.id);
    appliquer({ ville: "porto-novo" });
    expect(SOCIETES.map((s) => s.id)).toEqual(copie);
  });
});

describe("listerVilles", () => {
  it("regroupe les graphies d'une même ville, garde la plus fréquente, trie en français", () => {
    expect(listerVilles(SOCIETES)).toEqual([
      { slug: "abomey-calavi", nom: "Abomey-Calavi", nombre: 1 },
      { slug: "cotonou", nom: "Cotonou", nombre: 1 },
      { slug: "parakou", nom: "Parakou", nombre: 1 },
      { slug: "porto-novo", nom: "Porto-Novo", nombre: 3 },
    ]);
  });

  it("ignore les villes vides ; à égalité, préfère la graphie avec majuscule", () => {
    expect(
      listerVilles([{ ville: "ouidah" }, { ville: "Ouidah" }, { ville: null }, { ville: " " }]),
    ).toEqual([{ slug: "ouidah", nom: "Ouidah", nombre: 2 }]);
  });
});

describe("cleRecherche", () => {
  it("ramène casse et espaces à une seule forme (ce que rechercher() ignore déjà)", () => {
    const cles = ["pediatrie", "Pediatrie", "PEDIATRIE", "  pediatrie  ", " PEDIATRIE\t"].map(
      cleRecherche,
    );
    expect(new Set(cles)).toEqual(new Set(["pediatrie"]));
    expect(cleRecherche("  Société   béninoise\tde\npédiatrie ")).toBe(
      "société béninoise de pédiatrie",
    );
  });

  it("garde les accents (la similarité de trigrammes sur le sigle y est sensible)", () => {
    expect(cleRecherche("Pédiatrie")).toBe("pédiatrie");
    expect(cleRecherche("Pédiatrie")).not.toBe(cleRecherche("Pediatrie"));
  });

  it("compose les accents décomposés (NFC) : une même lettre, une même forme", () => {
    expect(cleRecherche("Pe\u0301diatrie")).toBe(cleRecherche("P\u00e9diatrie"));
  });

  it("retire les caractères invisibles et de contrôle", () => {
    expect(cleRecherche("SB\u200BMI\u202E")).toBe("sb mi");
    expect(cleRecherche("sbmi\u0000")).toBe("sbmi");
  });
});
