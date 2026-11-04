import { describe, expect, it } from "vitest";

import {
  ROLES_ORGANISATEURS,
  choisirSuggestions,
  comparerEvenementsAVenir,
  comparerEvenementsChronologique,
  comparerEvenementsPasses,
  estAVenir,
  libelleEcheance,
  lieuAgenda,
  marquerMiseEnAvant,
  organisateurPrincipal,
  repartirEvenements,
  siglesOrganisateurs,
  texteLieu,
  versEcheanceAVenir,
  versEvenementFiche,
  versEvenementResume,
  type EvenementResume,
  type LigneEcheanceAVenir,
  type LigneEvenementFiche,
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
    evenement_disciplines: [],
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

describe("comparerEvenementsChronologique : heure de 24 h ou plus", () => {
  const jour = { dateDebut: "2027-03-05", dateFin: "2027-03-05" };

  it("se trie comme une heure absente, avant le matin", () => {
    const ordre = [
      resume({ ...jour, id: "matin", heureDebut: "09:00:00", titre: "A" }),
      resume({ ...jour, id: "minuit", heureDebut: "24:00:00", titre: "B" }),
    ].sort(comparerEvenementsChronologique);
    expect(ordre.map((e) => e.id)).toEqual(["minuit", "matin"]);
  });

  it("à égalité avec une heure absente : le titre départage", () => {
    const ordre = [
      resume({ ...jour, id: "minuit", heureDebut: "24:00:00", titre: "B" }),
      resume({ ...jour, id: "sans", heureDebut: null, titre: "A" }),
    ].sort(comparerEvenementsChronologique);
    expect(ordre.map((e) => e.id)).toEqual(["sans", "minuit"]);
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

// ── Phase 3 ──────────────────────────────────────────────────────────────────

describe("versEvenementResume : disciplines et mise en avant", () => {
  it("disciplines triées par ordre, nulles et doublons ignorés ; mise en avant à false", () => {
    const converti = versEvenementResume(
      ligne({
        evenement_disciplines: [
          { disciplines: { id: "d5", slug: "droit-economie", nom: "Droit et économie", ordre: 5 } },
          { disciplines: null },
          { disciplines: { id: "d1", slug: "sante", nom: "Santé et médecine", ordre: 1 } },
          { disciplines: { id: "d1", slug: "sante", nom: "Santé et médecine", ordre: 1 } },
        ],
      }),
      "2027-01-01",
    );
    expect(converti.disciplines).toEqual([
      { id: "d1", slug: "sante", nom: "Santé et médecine" },
      { id: "d5", slug: "droit-economie", nom: "Droit et économie" },
    ]);
    expect(converti.miseEnAvant).toBe(false);
  });
});

describe("marquerMiseEnAvant et tris", () => {
  const a = resume({ id: "a", titre: "A", dateDebut: "2027-03-10", dateFin: "2027-03-10" });
  const b = resume({ id: "b", titre: "B", dateDebut: "2027-03-05", dateFin: "2027-03-05" });
  const c = resume({ id: "c", titre: "C", dateDebut: "2027-04-01", dateFin: "2027-04-02" });

  it("marque les événements désignés, sans modifier les objets reçus", () => {
    const marques = marquerMiseEnAvant([a, b, c], ["c", "inconnu"]);
    expect(marques.map((e) => [e.id, e.miseEnAvant])).toEqual([
      ["a", false],
      ["b", false],
      ["c", true],
    ]);
    expect(c.miseEnAvant).toBe(false);
  });

  it("à venir : mis en avant d'abord, puis ordre chronologique", () => {
    const marques = marquerMiseEnAvant([a, b, c], ["c"]);
    expect([...marques].sort(comparerEvenementsAVenir).map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect([a, b, c].sort(comparerEvenementsChronologique).map((e) => e.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("archives : du plus récent au plus ancien", () => {
    expect([a, b, c].sort(comparerEvenementsPasses).map((e) => e.id)).toEqual(["c", "a", "b"]);
  });
});

describe("choisirSuggestions", () => {
  const sante = [{ id: "d1", slug: "sante", nom: "Santé et médecine" }];
  const droit = [{ id: "d5", slug: "droit-economie", nom: "Droit et économie" }];
  const aVenir = [
    resume({ id: "s3", dateDebut: "2027-05-01", dateFin: "2027-05-01", disciplines: sante }),
    resume({ id: "s1", dateDebut: "2027-03-01", dateFin: "2027-03-01", disciplines: sante }),
    resume({ id: "d1", dateDebut: "2027-02-01", dateFin: "2027-02-01", disciplines: droit }),
    resume({ id: "moi", dateDebut: "2027-01-01", dateFin: "2027-01-01", disciplines: sante }),
    resume({ id: "s2", dateDebut: "2027-04-01", dateFin: "2027-04-01", disciplines: sante }),
    resume({ id: "s4", dateDebut: "2027-06-01", dateFin: "2027-06-01", disciplines: sante }),
    resume({ id: "s5", dateDebut: "2027-07-01", dateFin: "2027-07-01", disciplines: sante }),
  ];

  it("même discipline, lui-même exclu, ordre chronologique, 4 au plus", () => {
    expect(
      choisirSuggestions({ id: "moi", disciplines: sante }, aVenir, 4).map((e) => e.id),
    ).toEqual(["s1", "s2", "s3", "s4"]);
    expect(
      choisirSuggestions({ id: "x", disciplines: [...droit, ...sante] }, aVenir, 2).map(
        (e) => e.id,
      ),
    ).toEqual(["moi", "d1"]);
  });

  it("aucune discipline : aucune suggestion", () => {
    expect(choisirSuggestions({ id: "x", disciplines: [] }, aVenir, 4)).toEqual([]);
  });
});

describe("libellés et lieux", () => {
  it("libelleEcheance : libellé libre nettoyé, sinon libellé du type", () => {
    expect(libelleEcheance({ type: "bourse", libelle: null })).toBe("Bourse");
    expect(libelleEcheance({ type: "bourse", libelle: "   " })).toBe("Bourse");
    expect(libelleEcheance({ type: "prix", libelle: " Prix  jeune chercheur " })).toBe(
      "Prix jeune chercheur",
    );
  });

  const lieu = {
    modalite: "presentiel" as const,
    lieuNom: "Palais des congrès",
    adresse: "Boulevard de la Marina",
    ville: "Cotonou",
    pays: "Bénin",
  };

  it("texteLieu : carte et fiche, jamais le pays", () => {
    expect(texteLieu(lieu)).toBe("Palais des congrès, Cotonou");
    expect(texteLieu(lieu, { adresse: true })).toBe(
      "Palais des congrès, Boulevard de la Marina, Cotonou",
    );
    expect(texteLieu({ ...lieu, modalite: "en_ligne" })).toBe("En ligne");
    expect(texteLieu({ ...lieu, modalite: "hybride", lieuNom: null })).toBe("Cotonou et en ligne");
    expect(texteLieu({ ...lieu, modalite: "hybride", lieuNom: null, ville: null })).toBe(
      "En présentiel et en ligne",
    );
    expect(texteLieu({ ...lieu, lieuNom: " ", ville: null })).toBe("Lieu à préciser");
    expect(texteLieu({ ...lieu, lieuNom: "Cotonou", ville: "cotonou" })).toBe("Cotonou");
  });

  it("lieuAgenda : pour .ics et Google Agenda, avec adresse et pays", () => {
    expect(lieuAgenda(lieu)).toBe("Palais des congrès, Boulevard de la Marina, Cotonou, Bénin");
    expect(lieuAgenda({ ...lieu, modalite: "en_ligne" })).toBe("En ligne");
    expect(lieuAgenda({ ...lieu, modalite: "hybride", adresse: null, pays: null })).toBe(
      "Palais des congrès, Cotonou et en ligne",
    );
    expect(
      lieuAgenda({ ...lieu, modalite: "hybride", lieuNom: null, adresse: null, ville: null }),
    ).toBe("En ligne");
    expect(lieuAgenda({ ...lieu, lieuNom: null, adresse: null, ville: null })).toBeNull();
  });

  it("organisateurPrincipal : organisatrice d'abord, partenaires exclus", () => {
    expect(
      organisateurPrincipal([
        { role: "partenaire", sigle: "AAA" },
        { role: "co_organisateur", sigle: "ABPN" },
        { role: "organisateur", sigle: "SBMI" },
      ]),
    ).toEqual({ role: "organisateur", sigle: "SBMI" });
    expect(organisateurPrincipal([{ role: "partenaire", sigle: "AAA" }])).toBeNull();
    expect(organisateurPrincipal([])).toBeNull();
  });
});

describe("versEvenementFiche", () => {
  const ligneFiche: LigneEvenementFiche = {
    id: "e1",
    slug: "congres-test-2027",
    titre: "[TEST] Congrès",
    type: "congres",
    resume: "  Résumé.  ",
    description: "   ",
    date_debut: "2027-03-12",
    date_fin: "2027-03-14",
    heure_debut: "08:30:00",
    modalite: "hybride",
    lieu_nom: "Palais des congrès",
    adresse: null,
    ville: " Cotonou ",
    pays: "Bénin",
    lien_inscription: "https://example.org/inscription",
    site_web: "javascript:alert(1)",
    affiche_path: "",
    tarifs: "50 000 FCFA",
    gratuit: false,
    credits_fmc: null,
    contact_email: " contact@example.org ",
    evenement_societes: [
      {
        role: "partenaire",
        societes: { id: "p", slug: "demo-aaa", sigle: "AAA", nom_complet: null },
      },
      { role: "organisateur", societes: null },
      {
        role: "organisateur",
        societes: { id: "o", slug: "demo-sbmi", sigle: "SBMI", nom_complet: " [TEST] Société " },
      },
    ],
    evenement_disciplines: [
      { disciplines: { id: "d1", slug: "sante", nom: "Santé et médecine", ordre: 1 } },
    ],
    echeances: [
      { id: "x2", type: "inscription", libelle: null, date_limite: "2027-03-01" },
      { id: "x1", type: "soumission_resumes", libelle: " Résumés ", date_limite: "2027-01-15" },
    ],
  };

  it("textes nettoyés, liens non sûrs retirés, organisateurs et échéances triés", () => {
    const fiche = versEvenementFiche(ligneFiche);
    expect(fiche).toMatchObject({
      resume: "Résumé.",
      description: null,
      ville: "Cotonou",
      lienInscription: "https://example.org/inscription",
      siteWeb: null,
      affichePath: null,
      tarifs: "50 000 FCFA",
      creditsFmc: null,
      contactEmail: "contact@example.org",
      heureDebut: "08:30:00",
    });
    expect(fiche).not.toHaveProperty("misAJourLe");
    expect(fiche.organisateurs).toEqual([
      {
        role: "organisateur",
        id: "o",
        slug: "demo-sbmi",
        sigle: "SBMI",
        nomComplet: "[TEST] Société",
      },
      { role: "partenaire", id: "p", slug: "demo-aaa", sigle: "AAA", nomComplet: null },
    ]);
    expect(fiche.echeances.map((e) => [e.id, e.libelle])).toEqual([
      ["x1", "Résumés"],
      ["x2", null],
    ]);
    expect(fiche.disciplines).toEqual([{ id: "d1", slug: "sante", nom: "Santé et médecine" }]);
  });

  it("pays vide : « Bénin »", () => {
    expect(versEvenementFiche({ ...ligneFiche, pays: " " }).pays).toBe("Bénin");
  });
});

describe("versEcheanceAVenir", () => {
  const evenementLie: NonNullable<LigneEcheanceAVenir["evenements"]> = {
    id: "e1",
    slug: "congres-test-2027",
    titre: "[TEST] Congrès",
    type: "congres",
    date_debut: "2027-03-12",
    date_fin: "2027-03-14",
    evenement_societes: [
      { role: "co_organisateur", societes: { id: "c", slug: "demo-abpn", sigle: "ABPN" } },
      { role: "organisateur", societes: { id: "o", slug: "demo-sbmi", sigle: "SBMI" } },
      { role: "organisateur", societes: null },
    ],
    evenement_disciplines: [
      { disciplines: { id: "d1", slug: "sante", nom: "Santé et médecine", ordre: 1 } },
    ],
  };
  const ligneEcheance: LigneEcheanceAVenir = {
    id: "x1",
    type: "inscription_tarif_preferentiel",
    libelle: null,
    date_limite: "2027-03-05",
    evenements: evenementLie,
  };

  it("jours restants, urgence, événement, organisateur principal, disciplines", () => {
    expect(versEcheanceAVenir(ligneEcheance, "2027-03-01")).toEqual({
      id: "x1",
      type: "inscription_tarif_preferentiel",
      libelle: null,
      dateLimite: "2027-03-05",
      joursRestants: 4,
      urgente: true,
      evenement: {
        id: "e1",
        slug: "congres-test-2027",
        titre: "[TEST] Congrès",
        type: "congres",
        dateDebut: "2027-03-12",
        dateFin: "2027-03-14",
      },
      organisateurPrincipal: { id: "o", slug: "demo-sbmi", sigle: "SBMI" },
      disciplines: [{ id: "d1", slug: "sante", nom: "Santé et médecine" }],
    });
    expect(versEcheanceAVenir(ligneEcheance, "2027-02-01")?.urgente).toBe(false);
  });

  it("événement masqué (null) : ligne ignorée ; aucune organisatrice : null", () => {
    expect(versEcheanceAVenir({ ...ligneEcheance, evenements: null }, "2027-03-01")).toBeNull();
    const sansOrganisateur = versEcheanceAVenir(
      { ...ligneEcheance, evenements: { ...evenementLie, evenement_societes: [] } },
      "2027-03-01",
    );
    expect(sansOrganisateur?.organisateurPrincipal).toBeNull();
  });
});
