import { describe, expect, it } from "vitest";

import {
  analyserRequete,
  destinationEmplacement,
  destinationEvenement,
  destinationSociete,
  doitCompterClic,
  estTypeCible,
  estUuid,
  pageOrigine,
  type LigneEmplacement,
  type LigneEvenement,
  type LigneSociete,
} from "./analyse";

const ID = "de110000-0000-0000-0000-000000000001";

describe("estUuid", () => {
  it.each([
    ID,
    "DE110000-0000-0000-0000-000000000001",
    "6f1c2a5e-8d3b-4c7a-9e21-0b4d5f6a7c8e",
    "00000000-0000-0000-0000-000000000000",
  ])("accepte %s", (valeur) => {
    expect(estUuid(valeur)).toBe(true);
  });

  it.each([
    "",
    "123",
    "de110000-0000-0000-0000-00000000000g",
    "de110000000000000000000000000001",
    "{de110000-0000-0000-0000-000000000001}",
    " de110000-0000-0000-0000-000000000001",
    "de110000-0000-0000-0000-000000000001 ",
    "de110000-0000-0000-0000-000000000001\n",
    "de110000-0000-0000-0000-0000000000011",
    "' or 1=1 --",
    "../../societes",
  ])("refuse %j", (valeur) => {
    expect(estUuid(valeur)).toBe(false);
  });

  it("refuse ce qui n'est pas une chaîne", () => {
    expect(estUuid(undefined)).toBe(false);
    expect(estUuid(null)).toBe(false);
    expect(estUuid(["de110000-0000-0000-0000-000000000001"])).toBe(false);
  });
});

describe("estTypeCible", () => {
  it.each(["societe", "evenement", "emplacement"])("accepte %s", (type) => {
    expect(estTypeCible(type)).toBe(true);
  });

  it.each(["", "Societe", "SOCIETE", "organisation", "societes", "societe ", "../societe", "lien"])(
    "refuse %j",
    (type) => {
      expect(estTypeCible(type)).toBe(false);
    },
  );
});

/** Fiche d'organisation reconnue : son slug reste à vérifier (passerelle.ts). */
const ficheSociete = (slug: string) => ({
  chemin: `/societes/${slug}`,
  fiche: { rubrique: "societes", slug },
});

const ficheEvenement = (slug: string) => ({
  chemin: `/agenda/${slug}`,
  fiche: { rubrique: "agenda", slug },
});

describe("pageOrigine", () => {
  it("reconnaît une fiche d'organisation, dont le slug reste à vérifier", () => {
    expect(pageOrigine("/societes/sobeped")).toEqual(ficheSociete("sobeped"));
  });

  it("retire les paramètres et le fragment (aucune saisie libre enregistrée)", () => {
    expect(pageOrigine("/recherche?q=un+nom")).toEqual({ chemin: "/recherche", fiche: null });
    expect(pageOrigine("/societes/sobeped#contacts")).toEqual(ficheSociete("sobeped"));
    expect(pageOrigine("/societes?discipline=sante&page=2#liste")).toEqual({
      chemin: "/societes",
      fiche: null,
    });
  });

  it.each([
    "//evil.example",
    "//evil.example/societes",
    "https://evil.example",
    "http://evil.example/x",
    "javascript:alert(1)",
    "/\\evil.example",
    "\\\\evil.example",
    "/%2F%2Fevil.example",
    "/%5Cevil.example",
    "/societes\u0000",
    "/societes\r\nSet-Cookie: a=b",
    "/societes%0d%0aSet-Cookie:%20a=b",
    "/societes\u202eexe",
    "societes/sobeped",
    "",
    "/" + "a".repeat(600),
  ])("enregistre null pour une origine dangereuse ou invalide : %j", (from) => {
    expect(pageOrigine(from)).toBeNull();
  });

  it("enregistre null sans paramètre ou pour une valeur qui n'est pas une chaîne", () => {
    expect(pageOrigine(null)).toBeNull();
    expect(pageOrigine(undefined)).toBeNull();
    expect(pageOrigine(["/societes"])).toBeNull();
  });

  it.each(["/", "/societes", "/agenda", "/echeances", "/recherche"])(
    "garde une page publique fixe, sans vérification : %s",
    (from) => {
      expect(pageOrigine(from)).toEqual({ chemin: from, fiche: null });
    },
  );

  it("reconnaît le chemin décodé (et seulement s'il est une page connue)", () => {
    expect(pageOrigine("/societes/%73obeped")).toEqual(ficheSociete("sobeped"));
    expect(pageOrigine("/societes%2Fsobeped")).toEqual(ficheSociete("sobeped"));
    expect(pageOrigine("/societes/demo-sbmi")).toEqual(ficheSociete("demo-sbmi"));
    expect(pageOrigine("/agenda/congr%C3%A8s-2027")).toBeNull();
  });

  // Vérification complète de la phase 2 : ces formes étaient enregistrées
  // telles quelles (jusqu'à 120 caractères libres). Les fiches d'événement
  // sont admises depuis la phase 3, avec la vérification de leur slug par la
  // passerelle ; les disciplines le seront en phase 4.
  it("enregistre null pour une page de détail sans vérification d'existence : /disciplines/sante", () => {
    expect(pageOrigine("/disciplines/sante")).toBeNull();
  });

  it.each(["congres-sobeped-2027", "jean-dupont-exemple-org-0100000000"])(
    "reconnaît une fiche d'événement, dont le slug reste à vérifier : /agenda/%s",
    (slug) => {
      expect(pageOrigine(`/agenda/${slug}`)).toEqual(ficheEvenement(slug));
      expect(pageOrigine(`/agenda/${slug}?vue=calendrier#dates`)).toEqual(ficheEvenement(slug));
    },
  );

  it.each([
    "/jean.dupont@exemple.org",
    "/jean%2Edupont%40exemple%2Eorg",
    "/societes/jean.dupont@exemple.org",
    "/recherche/jean-dupont",
    "/espace/reclamer/sobeped",
    "/admin",
    "/go/societe/de110000-0000-0000-0000-000000000001",
    "/societes/DEMO-SBMI",
    "/Societes",
    "/societes/",
    "/societes//sobeped",
    "/societes/sobeped/contacts",
    "/disciplines",
    "/a-propos",
    "/page-inexistante",
    `/societes/${"a".repeat(121)}`,
    "/societes/demo--sbmi",
    "/societes/demo sbmi",
  ])("enregistre null pour un chemin qui n'est pas une page publique connue : %j", (from) => {
    expect(pageOrigine(from)).toBeNull();
  });
});

describe("analyserRequete", () => {
  it("organisation : vers = site ou congres", () => {
    expect(analyserRequete({ type: "societe", id: ID, vers: "site", from: null })).toEqual({
      valide: true,
      cible: { type: "societe", id: ID, vers: "site" },
      pageOrigine: null,
    });
    expect(
      analyserRequete({ type: "societe", id: ID, vers: "congres", from: "/societes/sobeped" }),
    ).toEqual({
      valide: true,
      cible: { type: "societe", id: ID, vers: "congres" },
      pageOrigine: ficheSociete("sobeped"),
    });
  });

  it("événement : vers = inscription ou site", () => {
    expect(analyserRequete({ type: "evenement", id: ID, vers: "inscription", from: null })).toEqual(
      {
        valide: true,
        cible: { type: "evenement", id: ID, vers: "inscription" },
        pageOrigine: null,
      },
    );
    expect(analyserRequete({ type: "evenement", id: ID, vers: "site", from: null })).toMatchObject({
      valide: true,
      cible: { vers: "site" },
    });
  });

  it("emplacement : vers ignoré, quelle que soit sa valeur", () => {
    for (const vers of [null, "site", "n-importe-quoi", "https://evil.example"]) {
      expect(analyserRequete({ type: "emplacement", id: ID, vers, from: null })).toEqual({
        valide: true,
        cible: { type: "emplacement", id: ID },
        pageOrigine: null,
      });
    }
  });

  it("ramène l'identifiant en minuscules", () => {
    const analyse = analyserRequete({
      type: "societe",
      id: ID.toUpperCase(),
      vers: "site",
      from: null,
    });
    expect(analyse).toMatchObject({ valide: true, cible: { id: ID } });
  });

  it.each([
    ["societe", null],
    ["societe", ""],
    ["societe", "inscription"],
    ["societe", "SITE"],
    ["societe", "https://evil.example"],
    ["evenement", null],
    ["evenement", "congres"],
    ["evenement", "Inscription"],
    ["evenement", "//evil.example"],
  ])("rejette %s avec vers = %j", (type, vers) => {
    expect(analyserRequete({ type, id: ID, vers, from: null })).toEqual({
      valide: false,
      motif: "destination_invalide",
    });
  });

  it("rejette un type invalide avant tout le reste", () => {
    expect(analyserRequete({ type: "organisation", id: "x", vers: "x", from: null })).toEqual({
      valide: false,
      motif: "type_invalide",
    });
  });

  it("rejette un identifiant invalide", () => {
    expect(analyserRequete({ type: "societe", id: "123", vers: "site", from: null })).toEqual({
      valide: false,
      motif: "identifiant_invalide",
    });
  });

  it("une origine dangereuse ne rejette pas la requête : elle devient null", () => {
    expect(
      analyserRequete({ type: "societe", id: ID, vers: "site", from: "//evil.example" }),
    ).toMatchObject({ valide: true, pageOrigine: null });
  });
});

describe("destinationSociete", () => {
  const ligne: LigneSociete = {
    id: ID,
    statut: "publie",
    site_web: "https://exemple.org",
    site_congres: "https://congres.exemple.org",
  };

  it("site → site_web, congres → site_congres", () => {
    expect(destinationSociete(ligne, ID, "site")).toBe("https://exemple.org");
    expect(destinationSociete(ligne, ID, "congres")).toBe("https://congres.exemple.org");
  });

  it.each(["brouillon", "en_attente", "refuse", "archive"] as const)(
    "null si la fiche est « %s »",
    (statut) => {
      expect(destinationSociete({ ...ligne, statut }, ID, "site")).toBeNull();
    },
  );

  it("null si la ligne manque, ne correspond pas, ou si le lien est vide", () => {
    expect(destinationSociete(null, ID, "site")).toBeNull();
    expect(destinationSociete(ligne, "de110000-0000-0000-0000-000000000002", "site")).toBeNull();
    expect(destinationSociete({ ...ligne, site_congres: null }, ID, "congres")).toBeNull();
  });
});

describe("destinationEvenement", () => {
  const ligne: LigneEvenement = {
    id: ID,
    statut: "publie",
    site_web: "https://evenement.exemple.org",
    lien_inscription: "https://inscription.exemple.org",
  };

  it("inscription → lien_inscription, site → site_web", () => {
    expect(destinationEvenement(ligne, ID, "inscription")).toBe("https://inscription.exemple.org");
    expect(destinationEvenement(ligne, ID, "site")).toBe("https://evenement.exemple.org");
  });

  it("null si l'événement n'est pas publié", () => {
    expect(destinationEvenement({ ...ligne, statut: "archive" }, ID, "site")).toBeNull();
    expect(destinationEvenement({ ...ligne, statut: "en_attente" }, ID, "inscription")).toBeNull();
  });
});

describe("destinationEmplacement", () => {
  const ligne: LigneEmplacement = {
    id: ID,
    actif: true,
    date_debut: "2026-10-01",
    date_fin: "2026-10-31",
    lien: "https://annonceur.exemple.org",
  };

  it("lien si actif et dans la période, bornes comprises", () => {
    expect(destinationEmplacement(ligne, ID, "2026-10-15")).toBe("https://annonceur.exemple.org");
    expect(destinationEmplacement(ligne, ID, "2026-10-01")).toBe("https://annonceur.exemple.org");
    expect(destinationEmplacement(ligne, ID, "2026-10-31")).toBe("https://annonceur.exemple.org");
  });

  it("null la veille du début et le lendemain de la fin", () => {
    expect(destinationEmplacement(ligne, ID, "2026-09-30")).toBeNull();
    expect(destinationEmplacement(ligne, ID, "2026-11-01")).toBeNull();
  });

  it("null si inactif ou sans lien", () => {
    expect(destinationEmplacement({ ...ligne, actif: false }, ID, "2026-10-15")).toBeNull();
    expect(destinationEmplacement({ ...ligne, lien: null }, ID, "2026-10-15")).toBeNull();
    expect(destinationEmplacement(null, ID, "2026-10-15")).toBeNull();
  });
});

describe("doitCompterClic", () => {
  it("compte une requête GET ordinaire", () => {
    expect(doitCompterClic("GET", new Headers({ accept: "text/html" }))).toBe(true);
  });

  it.each(["HEAD", "OPTIONS", "POST"])("ne compte pas une requête %s", (methode) => {
    expect(doitCompterClic(methode, new Headers())).toBe(false);
  });

  it.each([
    [{ rsc: "1" }],
    [{ "next-router-prefetch": "1" }],
    [{ "sec-purpose": "prefetch" }],
    [{ "sec-purpose": "prefetch;prerender" }],
    [{ purpose: "prefetch" }],
    [{ "x-moz": "prefetch" }],
  ])("ne compte pas un préchargement : %j", (entetes) => {
    expect(doitCompterClic("GET", new Headers(entetes))).toBe(false);
  });
});
