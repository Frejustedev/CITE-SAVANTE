import { afterEach, describe, expect, it, vi } from "vitest";

import { envPublic, envServeur } from "./env";

const VARIABLES_PUBLIQUES_VALIDES = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "cle-anon-de-test",
} as const;

function stub(variables: Record<string, string | undefined>) {
  for (const [nom, valeur] of Object.entries(variables)) {
    vi.stubEnv(nom, valeur);
  }
}

describe("envPublic", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lève une erreur claire en français quand une variable requise manque", () => {
    stub({
      NEXT_PUBLIC_SITE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_URL: VARIABLES_PUBLIQUES_VALIDES.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: VARIABLES_PUBLIQUES_VALIDES.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
    expect(() => envPublic()).toThrow(/NEXT_PUBLIC_SITE_URL/);
    expect(() => envPublic()).toThrow(/variable manquante|Configuration/);
  });

  it("rejette une URL mal formée avec un message qui nomme la variable", () => {
    stub({ ...VARIABLES_PUBLIQUES_VALIDES, NEXT_PUBLIC_SITE_URL: "pas-une-url" });
    expect(() => envPublic()).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("accepte une configuration valide et laisse la clé Turnstile à null si absente", () => {
    stub({ ...VARIABLES_PUBLIQUES_VALIDES, NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined });
    const env = envPublic();
    expect(env).toEqual({
      siteUrl: VARIABLES_PUBLIQUES_VALIDES.NEXT_PUBLIC_SITE_URL,
      supabaseUrl: VARIABLES_PUBLIQUES_VALIDES.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: VARIABLES_PUBLIQUES_VALIDES.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      turnstileSiteKey: null,
    });
  });

  it("lit process.env à chaque appel (pas de mise en cache du premier résultat)", () => {
    stub(VARIABLES_PUBLIQUES_VALIDES);
    expect(envPublic().siteUrl).toBe(VARIABLES_PUBLIQUES_VALIDES.NEXT_PUBLIC_SITE_URL);
    stub({ NEXT_PUBLIC_SITE_URL: "http://localhost:4000" });
    expect(envPublic().siteUrl).toBe("http://localhost:4000");
  });
});

describe("envServeur", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lève une erreur claire en français quand SUPABASE_SERVICE_ROLE_KEY manque", () => {
    stub({ ...VARIABLES_PUBLIQUES_VALIDES, SUPABASE_SERVICE_ROLE_KEY: undefined });
    expect(() => envServeur()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("laisse à null les variables encore facultatives à ce stade du projet", () => {
    stub({ ...VARIABLES_PUBLIQUES_VALIDES, SUPABASE_SERVICE_ROLE_KEY: "cle-service-de-test" });
    const env = envServeur();
    expect(env.supabaseServiceRoleKey).toBe("cle-service-de-test");
    expect(env.resendApiKey).toBeNull();
    expect(env.emailFrom).toBeNull();
    expect(env.adminNotifyEmail).toBeNull();
    expect(env.turnstileSecretKey).toBeNull();
    expect(env.formHashSalt).toBeNull();
    expect(env.cronSecret).toBeNull();
    // envServeur() inclut aussi les variables publiques.
    expect(env.siteUrl).toBe(VARIABLES_PUBLIQUES_VALIDES.NEXT_PUBLIC_SITE_URL);
  });

  it("remonte les variables facultatives quand elles sont définies", () => {
    stub({
      ...VARIABLES_PUBLIQUES_VALIDES,
      SUPABASE_SERVICE_ROLE_KEY: "cle-service-de-test",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "Cité Savante <notifications@example.org>",
      ADMIN_NOTIFY_EMAIL: "moderation@example.org",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      FORM_HASH_SALT: "sel-de-test",
      CRON_SECRET: "secret-de-test",
    });
    const env = envServeur();
    expect(env.resendApiKey).toBe("re_test");
    expect(env.adminNotifyEmail).toBe("moderation@example.org");
    expect(env.cronSecret).toBe("secret-de-test");
  });

  it("rejette une adresse ADMIN_NOTIFY_EMAIL mal formée", () => {
    stub({
      ...VARIABLES_PUBLIQUES_VALIDES,
      SUPABASE_SERVICE_ROLE_KEY: "cle-service-de-test",
      ADMIN_NOTIFY_EMAIL: "pas-une-adresse",
    });
    expect(() => envServeur()).toThrow(/ADMIN_NOTIFY_EMAIL/);
  });
});
