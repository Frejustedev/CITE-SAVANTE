import { afterEach, describe, expect, it, vi } from "vitest";

import { resoudreUrlSite } from "./site";

/** `site` et `urlAbsolue` relus avec les variables du moment (`site.url` se calcule à l'import). */
async function chargerAvec(variables: { url?: string; environnement: string }) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", variables.environnement);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", variables.url);
  const { site } = await import("./site");
  const { urlAbsolue } = await import("@/lib/utils/urls");
  return { site, urlAbsolue };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("resoudreUrlSite", () => {
  it("variable présente : elle prime, sans « / » final, quel que soit l'environnement", () => {
    expect(resoudreUrlSite("https://exemple.test", "production")).toBe("https://exemple.test");
    expect(resoudreUrlSite("https://exemple.test/", "production")).toBe("https://exemple.test");
    expect(resoudreUrlSite("http://localhost:4000/", "development")).toBe("http://localhost:4000");
    expect(resoudreUrlSite("  https://exemple.test  ", "production")).toBe("https://exemple.test");
  });

  it.each([undefined, "", "   "])(
    "production, variable « %s » : le domaine officiel",
    (variable) => {
      expect(resoudreUrlSite(variable, "production")).toBe("https://citesavante.com");
    },
  );

  it.each([undefined, "", "   "])("hors production, variable « %s » : localhost", (variable) => {
    expect(resoudreUrlSite(variable, "development")).toBe("http://localhost:3000");
    expect(resoudreUrlSite(variable, "test")).toBe("http://localhost:3000");
    expect(resoudreUrlSite(variable, undefined)).toBe("http://localhost:3000");
  });
});

describe("site.url : NEXT_PUBLIC_SITE_URL manquante en production", () => {
  it("aucune adresse localhost ne sort, sans erreur à l'import", async () => {
    const { site, urlAbsolue } = await chargerAvec({ environnement: "production" });
    expect(site.url).toBe(`https://${site.domaine}`);
    expect(urlAbsolue("/agenda/demo-congres")).toBe("https://citesavante.com/agenda/demo-congres");
    expect(new URL(site.url).hostname).toBe(site.domaine);
  });

  it('variable vide : même repli (`new URL("")` ferait échouer la mise en page)', async () => {
    const { site } = await chargerAvec({ url: "", environnement: "production" });
    expect(site.url).toBe("https://citesavante.com");
  });

  it("variable renseignée en production : elle est utilisée", async () => {
    const { site, urlAbsolue } = await chargerAvec({
      url: "https://apercu.exemple.test/",
      environnement: "production",
    });
    expect(site.url).toBe("https://apercu.exemple.test");
    expect(urlAbsolue("/agenda")).toBe("https://apercu.exemple.test/agenda");
  });

  it("en développement, localhost reste le défaut", async () => {
    const { site } = await chargerAvec({ environnement: "development" });
    expect(site.url).toBe("http://localhost:3000");
  });
});
