import { describe, expect, it } from "vitest";

import { site } from "@/config/site";

import {
  DESTINATIONS_PASSERELLE,
  LONGUEUR_MAX_CHEMIN_ORIGINE,
  ajouterUtm,
  cheminOrigineValide,
  cheminPasserelle,
  estDestinationValide,
  estUrlHttpsSure,
  hrefCourriel,
  hrefTelephone,
  urlAbsolue,
} from "./urls";

describe("ajouterUtm", () => {
  it("ajoute utm_source et utm_medium (section 10.1)", () => {
    expect(ajouterUtm("https://example.org/congres")).toBe(
      "https://example.org/congres?utm_source=citesavante&utm_medium=referral",
    );
  });

  it("ajoute un « / » à un chemin vide (sérialisation de URL)", () => {
    expect(ajouterUtm("https://example.org")).toBe(
      "https://example.org/?utm_source=citesavante&utm_medium=referral",
    );
  });

  it("conserve les paramètres existants tels quels, sans les réencoder", () => {
    expect(ajouterUtm("https://example.org/inscription?a=1&b=deux+mots&c=%C3%A9&drapeau")).toBe(
      "https://example.org/inscription?a=1&b=deux+mots&c=%C3%A9&drapeau&utm_source=citesavante&utm_medium=referral",
    );
  });

  it("conserve le fragment, après les paramètres", () => {
    expect(ajouterUtm("https://example.org/programme?jour=2#atelier-3")).toBe(
      "https://example.org/programme?jour=2&utm_source=citesavante&utm_medium=referral#atelier-3",
    );
    expect(ajouterUtm("https://example.org/#haut")).toBe(
      "https://example.org/?utm_source=citesavante&utm_medium=referral#haut",
    );
  });

  it("n'écrase jamais un UTM existant : chacun n'est ajouté que s'il manque", () => {
    expect(ajouterUtm("https://example.org/?utm_source=lettre")).toBe(
      "https://example.org/?utm_source=lettre&utm_medium=referral",
    );
    expect(ajouterUtm("https://example.org/?utm_medium=email&utm_source=partenaire")).toBe(
      "https://example.org/?utm_medium=email&utm_source=partenaire",
    );
    expect(ajouterUtm("https://example.org/?utm_campaign=congres2027")).toBe(
      "https://example.org/?utm_campaign=congres2027&utm_source=citesavante&utm_medium=referral",
    );
  });

  it("gère un « ? » ou un « & » final sans doubler les séparateurs", () => {
    expect(ajouterUtm("https://example.org/page?")).toBe(
      "https://example.org/page?utm_source=citesavante&utm_medium=referral",
    );
    expect(ajouterUtm("https://example.org/page?a=1&")).toBe(
      "https://example.org/page?a=1&utm_source=citesavante&utm_medium=referral",
    );
  });

  it("accepte « HTTPS:// » (comme les contraintes de la base) et normalise l'hôte", () => {
    expect(ajouterUtm("HTTPS://Example.ORG/Page")).toBe(
      "https://example.org/Page?utm_source=citesavante&utm_medium=referral",
    );
  });

  it("refuse tout ce qui n'est pas https:// (null)", () => {
    for (const url of [
      "http://example.org",
      "javascript:alert(1)",
      "JaVaScRiPt:alert(document.cookie)",
      "data:text/html,<script>alert(1)</script>",
      "ftp://example.org",
      "//example.org",
      "/societes/sobeped",
      "example.org",
      "https:example.org",
      "https:/example.org",
      "",
    ]) {
      expect(ajouterUtm(url)).toBeNull();
    }
  });

  it("refuse espaces, retours à la ligne et caractères de contrôle, que URL effacerait", () => {
    for (const url of [
      " https://example.org",
      "https://example.org ",
      "https://exa\nmple.org",
      "https://example.org/\tpage",
      "https://example.org/\u0000",
      "https://example.org/a b",
      "https://example.org/\u202Egpj.exe",
    ]) {
      expect(ajouterUtm(url)).toBeNull();
    }
  });

  it("refuse une URL avec identifiants ou sans hôte", () => {
    expect(ajouterUtm("https://citesavante.com@example.org/")).toBeNull();
    expect(ajouterUtm("https://utilisateur:secret@example.org/")).toBeNull();
    expect(ajouterUtm("https://")).toBeNull();
  });

  it("refuse une URL trop longue", () => {
    expect(ajouterUtm(`https://example.org/${"a".repeat(2100)}`)).toBeNull();
  });
});

describe("estUrlHttpsSure", () => {
  it("vrai pour un lien https ordinaire, faux sinon", () => {
    expect(estUrlHttpsSure("https://example.org/a?b=c#d")).toBe(true);
    expect(estUrlHttpsSure("http://example.org")).toBe(false);
    expect(estUrlHttpsSure(null)).toBe(false);
    expect(estUrlHttpsSure(42)).toBe(false);
  });
});

describe("cheminOrigineValide", () => {
  it("accepte un chemin interne et le renvoie normalisé", () => {
    expect(cheminOrigineValide("/societes/sobeped")).toBe("/societes/sobeped");
    expect(cheminOrigineValide("/")).toBe("/");
    expect(cheminOrigineValide("/societes?ville=cotonou&page=2")).toBe(
      "/societes?ville=cotonou&page=2",
    );
    expect(cheminOrigineValide("/agenda/congres-2027#dates")).toBe("/agenda/congres-2027#dates");
    expect(cheminOrigineValide("/a/b/../c")).toBe("/a/c");
  });

  it("encode les caractères non ASCII du chemin", () => {
    expect(cheminOrigineValide("/sociétés")).toBe("/soci%C3%A9t%C3%A9s");
  });

  it("refuse les redirections ouvertes", () => {
    for (const from of [
      "//example.org",
      "//example.org/societes",
      "/\\example.org",
      "/\\/example.org",
      "\\\\example.org",
      "/%2F%2Fexample.org",
      "/%2f%2fexample.org",
      "/%5Cexample.org",
      "https://example.org",
      "http://example.org/societes",
      "example.org/societes",
      "societes/sobeped",
      "javascript:alert(1)",
      "/../..//example.org",
    ]) {
      expect(cheminOrigineValide(from), from).toBeNull();
    }
  });

  it("refuse les caractères de contrôle, espaces et injections d'en-tête", () => {
    for (const from of [
      "/societes\r\nSet-Cookie: x=1",
      "/\t/example.org",
      "/societes\u0000",
      "/a b",
      "/%0d%0aSet-Cookie:x",
      "/%00",
      "/\u200Bsocietes",
    ]) {
      expect(cheminOrigineValide(from), JSON.stringify(from)).toBeNull();
    }
  });

  it("refuse une séquence « % » invalide", () => {
    expect(cheminOrigineValide("/%E0%A4%A")).toBeNull();
  });

  it("borne la longueur", () => {
    expect(cheminOrigineValide(`/${"a".repeat(LONGUEUR_MAX_CHEMIN_ORIGINE - 1)}`)).not.toBeNull();
    expect(cheminOrigineValide(`/${"a".repeat(LONGUEUR_MAX_CHEMIN_ORIGINE)}`)).toBeNull();
  });

  it("refuse toute valeur qui n'est pas une chaîne non vide", () => {
    for (const from of [undefined, null, "", ["/societes"], 42, {}]) {
      expect(cheminOrigineValide(from)).toBeNull();
    }
  });
});

describe("urlAbsolue", () => {
  it("préfixe le chemin par l'URL du site", () => {
    expect(urlAbsolue("/societes/sobeped")).toBe(`${site.url}/societes/sobeped`);
    expect(urlAbsolue("/")).toBe(`${site.url}/`);
  });

  it("refuse ce qui n'est pas un chemin interne", () => {
    expect(() => urlAbsolue("societes")).toThrow(/Chemin interne attendu/);
    expect(() => urlAbsolue("//example.org")).toThrow(/Chemin interne attendu/);
    expect(() => urlAbsolue("https://example.org")).toThrow(/Chemin interne attendu/);
  });
});

describe("passerelle : destinations et chemins", () => {
  const id = "de110000-0000-0000-0000-000000000001";

  it("destinations admises par type (section 10.1)", () => {
    expect(DESTINATIONS_PASSERELLE).toEqual({
      societe: ["site", "congres"],
      evenement: ["inscription", "site"],
      emplacement: [],
    });
    expect(estDestinationValide("societe", "site")).toBe(true);
    expect(estDestinationValide("societe", "congres")).toBe(true);
    expect(estDestinationValide("societe", "inscription")).toBe(false);
    expect(estDestinationValide("evenement", "inscription")).toBe(true);
    expect(estDestinationValide("evenement", "congres")).toBe(false);
    expect(estDestinationValide("emplacement", "site")).toBe(false);
    expect(estDestinationValide("societe", null)).toBe(false);
    expect(estDestinationValide("societe", ["site"])).toBe(false);
  });

  it("construit le lien de la section 8.2", () => {
    expect(cheminPasserelle({ type: "societe", id, vers: "site" }, "/societes/demo-sbmi")).toBe(
      `/go/societe/${id}?vers=site&from=/societes/demo-sbmi`,
    );
    expect(cheminPasserelle({ type: "evenement", id, vers: "inscription" })).toBe(
      `/go/evenement/${id}?vers=inscription`,
    );
    expect(cheminPasserelle({ type: "emplacement", id }, "/agenda")).toBe(
      `/go/emplacement/${id}?from=/agenda`,
    );
    expect(cheminPasserelle({ type: "emplacement", id })).toBe(`/go/emplacement/${id}`);
  });

  it("encode les paramètres de l'origine et omet une origine non sûre", () => {
    const chemin = cheminPasserelle(
      { type: "societe", id, vers: "congres" },
      "/societes?ville=cotonou&page=2",
    );
    expect(chemin).toBe(
      `/go/societe/${id}?vers=congres&from=/societes%3Fville%3Dcotonou%26page%3D2`,
    );
    const relu = new URL(chemin, "https://origine.invalid");
    expect(relu.searchParams.get("from")).toBe("/societes?ville=cotonou&page=2");
    expect(relu.searchParams.get("vers")).toBe("congres");

    expect(cheminPasserelle({ type: "societe", id, vers: "site" }, "//example.org")).toBe(
      `/go/societe/${id}?vers=site`,
    );
  });

  it("encode l'identifiant", () => {
    expect(cheminPasserelle({ type: "emplacement", id: "a/../b" })).toBe(
      "/go/emplacement/a%2F..%2Fb",
    );
  });
});

describe("hrefTelephone", () => {
  it("compacte un numéro béninois", () => {
    expect(hrefTelephone("+229 01 97 00 00 00")).toBe("tel:+2290197000000");
    expect(hrefTelephone("(+229) 01.97.00-00-00")).toBe("tel:+2290197000000");
  });

  it("refuse ce qui n'est pas un numéro", () => {
    for (const numero of [
      null,
      undefined,
      "",
      "123",
      "appelez-nous",
      "+229 01 97 00 00 00 ext 4",
    ]) {
      expect(hrefTelephone(numero)).toBeNull();
    }
  });
});

describe("hrefCourriel", () => {
  it("construit un lien mailto pour une adresse simple", () => {
    expect(hrefCourriel("contact@example.org")).toBe("mailto:contact@example.org");
    expect(hrefCourriel(" secretariat.general+congres@sous.example.org ")).toBe(
      "mailto:secretariat.general+congres@sous.example.org",
    );
  });

  it("refuse une adresse mal formée ou qui ajouterait des en-têtes", () => {
    for (const email of [
      null,
      "",
      "contact",
      "contact@",
      "@example.org",
      "contact@example",
      "a@example.org?bcc=b@example.org",
      "a@example.org&subject=x",
      "a b@example.org",
      "a@example.org\nBcc: b@example.org",
    ]) {
      expect(hrefCourriel(email)).toBeNull();
    }
  });
});
