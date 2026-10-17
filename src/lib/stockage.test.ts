import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cheminObjetValide, urlLogo, urlPubliqueStockage } from "./stockage";

const ID = "de110000-0000-0000-0000-000000000001";

describe("cheminObjetValide", () => {
  it("accepte un chemin relatif au bucket", () => {
    expect(cheminObjetValide("logos", `${ID}/1727000000000.webp`)).toBe(`${ID}/1727000000000.webp`);
    expect(cheminObjetValide("affiches", "fichier.png")).toBe("fichier.png");
  });

  it("retire un préfixe égal au nom du bucket", () => {
    expect(cheminObjetValide("logos", `logos/${ID}/a.webp`)).toBe(`${ID}/a.webp`);
    // Le préfixe d'un AUTRE bucket n'est pas retiré : c'est alors un dossier.
    expect(cheminObjetValide("logos", `affiches/${ID}/a.webp`)).toBe(`affiches/${ID}/a.webp`);
  });

  it("refuse les chemins suspects", () => {
    for (const chemin of [
      null,
      undefined,
      "",
      "/x.webp",
      "../affiches/x.webp",
      `${ID}/../../x.webp`,
      `${ID}/..`,
      `${ID}//x.webp`,
      `${ID}/.cache`,
      `${ID}/a..b.webp`,
      `${ID}/x y.webp`,
      `${ID}/é.webp`,
      `${ID}\\x.webp`,
      `${ID}/x.webp?download`,
      `${ID}/x.webp#frag`,
      "https://example.org/x.webp",
      `${ID}/${"a".repeat(300)}.webp`,
    ]) {
      expect(cheminObjetValide("logos", chemin), String(chemin)).toBeNull();
    }
  });
});

describe("urlPubliqueStockage et urlLogo", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://citesavante.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "cle-publique-de-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("construit l'URL publique du bucket (projet distant)", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdefgh.supabase.co");
    expect(urlLogo(`${ID}/1727000000000.webp`)).toBe(
      `https://abcdefgh.supabase.co/storage/v1/object/public/logos/${ID}/1727000000000.webp`,
    );
    expect(urlPubliqueStockage("affiches", `${ID}/a.png`)).toBe(
      `https://abcdefgh.supabase.co/storage/v1/object/public/affiches/${ID}/a.png`,
    );
  });

  it("fonctionne avec l'API locale (http://127.0.0.1:54321) et une barre finale", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321/");
    expect(urlLogo(`${ID}/a.webp`)).toBe(
      `http://127.0.0.1:54321/storage/v1/object/public/logos/${ID}/a.webp`,
    );
  });

  it("renvoie null sans logo ou pour un chemin suspect", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdefgh.supabase.co");
    expect(urlLogo(null)).toBeNull();
    expect(urlLogo("")).toBeNull();
    expect(urlLogo("../affiches/x.webp")).toBeNull();
  });
});
