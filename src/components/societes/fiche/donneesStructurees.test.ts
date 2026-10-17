import { describe, expect, it } from "vitest";

import type { SocieteFiche } from "@/lib/requetes/societes";

import { jsonLdFilAriane, jsonLdOrganisation, serialiserJsonLd } from "./donneesStructurees";

// Données fictives uniquement (préfixe [DÉMO], domaines example.org).
const societe: SocieteFiche = {
  id: "de110000-0000-0000-0000-000000000001",
  slug: "demo-sbmi",
  sigle: "SBMI",
  nomComplet: "[DÉMO] Société Béninoise de Médecine Interne",
  categorie: "societe_savante",
  ville: "Cotonou",
  logoPath: null,
  miseEnAvant: false,
  disciplines: [{ id: "d1", slug: "sante", nom: "Santé et médecine" }],
  description: "Présentation fictive de la société.",
  anneeCreation: 1998,
  pays: "Bénin",
  siteWeb: "https://example.org/sbmi",
  siteCongres: "https://example.org/congres",
  email: "contact@example.org",
  telephone: "01 97 00 00 00",
  reseaux: [
    { reseau: "facebook", url: "https://example.org/facebook-sbmi" },
    { reseau: "whatsapp", url: "https://wa.me/22900000000" },
  ],
};

const URL_FICHE = "https://citesavante.com/societes/demo-sbmi";

describe("serialiserJsonLd", () => {
  it("échappe <, > et & : une valeur saisie ne peut ni fermer la balise ni ouvrir un commentaire", () => {
    const donnees = { description: "</script><script>alert(1)</script><!-- & -->" };
    const texte = serialiserJsonLd(donnees);
    expect(texte).not.toMatch(/[<>&]/);
    expect(texte).toContain("\\u003c/script\\u003e");
    expect(texte).toContain("\\u003c!--");
    expect(texte).toContain("\\u0026");
  });

  it("échappe U+2028 et U+2029", () => {
    const texte = serialiserJsonLd({ nom: "a\u2028b\u2029c" });
    expect(texte).not.toMatch(/[\u2028\u2029]/);
    expect(texte).toContain("a\\u2028b\\u2029c");
  });

  it("le JSON relu est identique à l'objet d'origine", () => {
    const donnees = {
      "@type": "Organization",
      name: "<b>A & B</b>",
      ligne: "x\u2028y",
      liste: ["</script>", 1, true, null],
    };
    expect(JSON.parse(serialiserJsonLd(donnees))).toEqual(donnees);
  });
});

describe("jsonLdOrganisation", () => {
  it("fiche complète : nom, sigle, fiche, site officiel, création, adresse, contacts", () => {
    const donnees = jsonLdOrganisation({
      societe,
      urlFiche: URL_FICHE,
      urlLogo: "https://exemple.supabase.co/storage/v1/object/public/logos/x/1.webp",
    });
    expect(donnees).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${URL_FICHE}#organisation`,
      name: "[DÉMO] Société Béninoise de Médecine Interne",
      alternateName: "SBMI",
      url: URL_FICHE,
      foundingDate: "1998",
      address: { "@type": "PostalAddress", addressLocality: "Cotonou", addressCountry: "BJ" },
      logo: "https://exemple.supabase.co/storage/v1/object/public/logos/x/1.webp",
      email: "contact@example.org",
      telephone: "+2290197000000",
      description: "Présentation fictive de la société.",
    });
  });

  it("sameAs : site officiel puis réseaux, sans WhatsApp ni lien non https", () => {
    const donnees = jsonLdOrganisation({
      societe: {
        ...societe,
        reseaux: [
          ...societe.reseaux,
          { reseau: "linkedin", url: "javascript:alert(1)" },
          { reseau: "youtube", url: "https://example.org/sbmi" },
        ],
      },
      urlFiche: URL_FICHE,
      urlLogo: null,
    });
    expect(donnees.sameAs).toEqual([
      "https://example.org/sbmi",
      "https://example.org/facebook-sbmi",
    ]);
  });

  it("champs absents omis : pas de logo, de création, de contacts ni de sameAs", () => {
    const donnees = jsonLdOrganisation({
      societe: {
        ...societe,
        nomComplet: null,
        siteWeb: null,
        reseaux: [],
        anneeCreation: null,
        email: null,
        telephone: null,
        description: null,
        ville: null,
      },
      urlFiche: URL_FICHE,
      urlLogo: null,
    });
    const relu = JSON.parse(serialiserJsonLd(donnees));
    expect(relu.name).toBe("SBMI");
    expect(relu).not.toHaveProperty("alternateName");
    expect(relu).not.toHaveProperty("logo");
    expect(relu).not.toHaveProperty("foundingDate");
    expect(relu).not.toHaveProperty("email");
    expect(relu).not.toHaveProperty("telephone");
    expect(relu).not.toHaveProperty("sameAs");
    expect(relu).not.toHaveProperty("description");
    expect(relu.address).toEqual({ "@type": "PostalAddress", addressCountry: "BJ" });
  });

  it("description coupée sans demi-caractère (emoji à la limite des 300 caractères)", () => {
    const livre = String.fromCodePoint(0x1f4da);
    for (let decalage = 295; decalage <= 300; decalage += 1) {
      const donnees = jsonLdOrganisation({
        societe: { ...societe, description: `${"a".repeat(decalage)}${livre.repeat(10)} fin` },
        urlFiche: URL_FICHE,
        urlLogo: null,
      });
      const relu = JSON.parse(serialiserJsonLd(donnees));
      expect(relu.description.isWellFormed(), `décalage ${decalage}`).toBe(true);
      expect(relu.description.endsWith("…")).toBe(true);
    }
  });

  it("nom complet identique au sigle : pas d'alternateName", () => {
    const donnees = jsonLdOrganisation({
      societe: { ...societe, sigle: "UAC", nomComplet: "uac" },
      urlFiche: URL_FICHE,
      urlLogo: null,
    });
    expect(donnees.name).toBe("UAC");
    expect(donnees.alternateName).toBeUndefined();
  });

  it("pays étranger : nom du pays tel quel", () => {
    const donnees = jsonLdOrganisation({
      societe: { ...societe, pays: "Togo", ville: "Lomé" },
      urlFiche: URL_FICHE,
      urlLogo: null,
    });
    expect(donnees.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Lomé",
      addressCountry: "Togo",
    });
  });
});

describe("jsonLdFilAriane", () => {
  it("un ListItem par élément, positions à partir de 1", () => {
    expect(
      jsonLdFilAriane([
        { nom: "Accueil", url: "https://citesavante.com/" },
        { nom: "Annuaire", url: "https://citesavante.com/societes" },
        { nom: "SBMI", url: URL_FICHE },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://citesavante.com/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Annuaire",
          item: "https://citesavante.com/societes",
        },
        { "@type": "ListItem", position: 3, name: "SBMI", item: URL_FICHE },
      ],
    });
  });
});
