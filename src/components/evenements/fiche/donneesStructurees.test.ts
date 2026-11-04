import { describe, expect, it } from "vitest";

import { serialiserJsonLd } from "@/components/societes/fiche/donneesStructurees";
import type { EvenementFiche } from "@/lib/utils/evenements";

import { DECALAGE_PORTO_NOVO, datesJsonLd, jsonLdEvenement } from "./donneesStructurees";

// Données fictives uniquement (préfixe [DÉMO], domaines example.org).
const URL_FICHE = "https://citesavante.example.org/agenda/demo-congres-pediatrie";
const urlOrganisation = (slug: string) => `https://citesavante.example.org/societes/${slug}`;

const evenement: EvenementFiche = {
  id: "de120000-0000-0000-0000-000000000019",
  slug: "demo-congres-pediatrie",
  titre: "[DÉMO]  Congrès de pédiatrie",
  type: "congres",
  resume: "Résumé fictif.",
  description: "Description fictive.",
  dateDebut: "2027-03-29",
  dateFin: "2027-03-31",
  heureDebut: null,
  modalite: "presentiel",
  lieuNom: "Palais des congrès",
  adresse: "Boulevard fictif",
  ville: "Cotonou",
  pays: "Bénin",
  lienInscription: "https://inscription.example.org/pediatrie",
  siteWeb: "https://congres.example.org",
  affichePath: null,
  tarifs: null,
  gratuit: false,
  creditsFmc: null,
  contactEmail: null,
  organisateurs: [
    {
      role: "organisateur",
      id: "o1",
      slug: "demo-sobeped",
      sigle: "SOBEPED",
      nomComplet: "[DÉMO] Société de pédiatrie",
    },
    { role: "co_organisateur", id: "o2", slug: "demo-abc", sigle: "ABC", nomComplet: null },
    { role: "partenaire", id: "o3", slug: "demo-xyz", sigle: "XYZ", nomComplet: "[DÉMO] XYZ" },
  ],
  disciplines: [{ id: "d1", slug: "sante", nom: "Santé et médecine" }],
  echeances: [],
};

const jsonLd = (surcharge: Partial<EvenementFiche> = {}, urlImage: string | null = null) =>
  jsonLdEvenement({
    evenement: { ...evenement, ...surcharge },
    urlFiche: URL_FICHE,
    urlOrganisation,
    urlImage,
  });

describe("datesJsonLd", () => {
  it("journées entières : dates seules, fin INCLUSE (dernier jour)", () => {
    expect(datesJsonLd(evenement)).toEqual({ startDate: "2027-03-29", endDate: "2027-03-31" });
    expect(datesJsonLd({ ...evenement, dateFin: "2027-03-29" })).toEqual({
      startDate: "2027-03-29",
      endDate: "2027-03-29",
    });
  });

  it("un jour avec une heure : début et fin (+ 1 h) datés-heure, décalage de Porto-Novo", () => {
    expect(DECALAGE_PORTO_NOVO).toBe("+01:00");
    expect(datesJsonLd({ ...evenement, dateFin: "2027-03-29", heureDebut: "08:30:00" })).toEqual({
      startDate: "2027-03-29T08:30:00+01:00",
      endDate: "2027-03-29T09:30:00+01:00",
    });
  });

  it("passage de minuit : la fin tombe le lendemain", () => {
    expect(datesJsonLd({ ...evenement, dateFin: "2027-03-29", heureDebut: "23:30:00" })).toEqual({
      startDate: "2027-03-29T23:30:00+01:00",
      endDate: "2027-03-30T00:30:00+01:00",
    });
  });

  it("plusieurs jours avec une heure : début daté-heure, fin = dernier jour (aucune heure inventée)", () => {
    expect(datesJsonLd({ ...evenement, heureDebut: "08:30" })).toEqual({
      startDate: "2027-03-29T08:30:00+01:00",
      endDate: "2027-03-31",
    });
  });
});

describe("datesJsonLd : heure de 24 h ou plus", () => {
  it("considérée comme absente : dates seules, un jour comme plusieurs", () => {
    expect(datesJsonLd({ ...evenement, heureDebut: "24:00:00" })).toEqual({
      startDate: "2027-03-29",
      endDate: "2027-03-31",
    });
    expect(datesJsonLd({ ...evenement, dateFin: "2027-03-29", heureDebut: "24:00:00" })).toEqual({
      startDate: "2027-03-29",
      endDate: "2027-03-29",
    });
  });
});

describe("jsonLdEvenement", () => {
  it("Event : contexte, type, nom, description, url, @id, statut", () => {
    const donnees = jsonLd();
    expect(donnees["@context"]).toBe("https://schema.org");
    expect(donnees["@type"]).toBe("Event");
    expect(donnees["@id"]).toBe(`${URL_FICHE}#evenement`);
    expect(donnees.name).toBe("[DÉMO] Congrès de pédiatrie");
    expect(donnees.description).toBe("Résumé fictif.");
    expect(donnees.url).toBe(URL_FICHE);
    expect(donnees.eventStatus).toBe("https://schema.org/EventScheduled");
  });

  it("description : la description si pas de résumé, omise si aucune", () => {
    expect(jsonLd({ resume: null }).description).toBe("Description fictive.");
    expect(
      "description" in JSON.parse(serialiserJsonLd(jsonLd({ resume: null, description: null }))),
    ).toBe(false);
  });

  it("présentiel : Place + PostalAddress, pays BJ", () => {
    const donnees = jsonLd();
    expect(donnees.eventAttendanceMode).toBe("https://schema.org/OfflineEventAttendanceMode");
    expect(donnees.location).toEqual({
      "@type": "Place",
      name: "Palais des congrès",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Boulevard fictif",
        addressLocality: "Cotonou",
        addressCountry: "BJ",
      },
    });
  });

  it("pays étranger : écrit tel quel", () => {
    const lieu = jsonLd({ pays: "Togo", ville: "Lomé" }).location as {
      address: { addressCountry: string };
    };
    expect(lieu.address.addressCountry).toBe("Togo");
  });

  it("en ligne : VirtualLocation (site de l'événement, sinon la fiche)", () => {
    const donnees = jsonLd({ modalite: "en_ligne" });
    expect(donnees.eventAttendanceMode).toBe("https://schema.org/OnlineEventAttendanceMode");
    expect(donnees.location).toEqual({
      "@type": "VirtualLocation",
      url: "https://congres.example.org",
    });
    expect(jsonLd({ modalite: "en_ligne", siteWeb: null }).location).toEqual({
      "@type": "VirtualLocation",
      url: URL_FICHE,
    });
  });

  it("hybride : Place et VirtualLocation, mode mixte", () => {
    const donnees = jsonLd({ modalite: "hybride" });
    expect(donnees.eventAttendanceMode).toBe("https://schema.org/MixedEventAttendanceMode");
    expect(Array.isArray(donnees.location)).toBe(true);
    expect((donnees.location as { "@type": string }[]).map((lieu) => lieu["@type"])).toEqual([
      "Place",
      "VirtualLocation",
    ]);
  });

  it("organizer : organisatrices et co-organisatrices (pas les partenaires), url de leur fiche", () => {
    expect(jsonLd().organizer).toEqual([
      {
        "@type": "Organization",
        "@id": "https://citesavante.example.org/societes/demo-sobeped#organisation",
        name: "[DÉMO] Société de pédiatrie",
        alternateName: "SOBEPED",
        url: "https://citesavante.example.org/societes/demo-sobeped",
      },
      {
        "@type": "Organization",
        "@id": "https://citesavante.example.org/societes/demo-abc#organisation",
        name: "ABC",
        alternateName: undefined,
        url: "https://citesavante.example.org/societes/demo-abc",
      },
    ]);
    expect(jsonLd({ organisateurs: [] }).organizer).toBeUndefined();
  });

  it("image : l'affiche seulement si elle existe", () => {
    expect(jsonLd().image).toBeUndefined();
    expect(jsonLd({}, "https://stockage.example.org/affiches/a.webp").image).toEqual([
      "https://stockage.example.org/affiches/a.webp",
    ]);
  });

  it("offers : gratuit (0 XOF), tarifs en texte, ou rien", () => {
    expect(jsonLd({ gratuit: true }).offers).toEqual({
      "@type": "Offer",
      price: "0",
      priceCurrency: "XOF",
      description: undefined,
      url: URL_FICHE,
    });
    expect(jsonLd({ tarifs: "Membres : 10 000 FCFA\nAutres : 20 000 FCFA" }).offers).toEqual({
      "@type": "Offer",
      description: "Membres : 10 000 FCFA Autres : 20 000 FCFA",
      url: URL_FICHE,
    });
    expect(jsonLd().offers).toBeUndefined();
  });

  it("aucune adresse de la passerelle /go (un robot y créerait de faux clics)", () => {
    const texte = serialiserJsonLd(jsonLd({ modalite: "hybride", gratuit: true }));
    expect(texte).not.toContain("/go/");
    expect(texte).not.toContain("inscription.example.org");
  });

  it("sérialisation sûre : une valeur saisie ne ferme pas la balise script", () => {
    const texte = serialiserJsonLd(jsonLd({ titre: "</script><script>alert(1)</script>" }));
    expect(texte).not.toContain("</script>");
    expect(JSON.parse(texte).name).toBe("</script><script>alert(1)</script>");
  });
});
