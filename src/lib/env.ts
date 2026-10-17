// Accès typé et validé aux variables d'environnement (spécifications, section 18).
//
// Deux fonctions PARESSEUSES : `envPublic()` et `envServeur()` ne lisent
// `process.env` qu'à l'appel, jamais à l'import. C'est indispensable pour que
// `pnpm build` réussisse sans base de données ni variables Supabase (règle de
// rendu, voir PROGRESS.md, phase 1) : importer ce module ne doit jamais faire
// échouer un build, seul l'APPEL d'une des deux fonctions, au moment où une
// route en a réellement besoin, peut lever une erreur.
//
// Variables requises maintenant (phase 1) : l'URL du site et les trois
// variables Supabase. Les autres (Resend, Turnstile, sel des formulaires,
// tâches planifiées) sont facultatives tant que leur phase n'est pas
// atteinte ; un `.env.local` partiel, tel qu'on l'a en développement avant la
// phase 5, reste utilisable : ces variables valent `null` si absentes, c'est
// au code qui les UTILISE de vérifier leur présence en temps voulu.
//
// Une variable facultative présente mais VIDE (`RESEND_API_KEY=`, comme dans
// `.env.example`, que l'on copie en `.env.local`) vaut « absente » : sans
// cela, `z.string().min(1).optional()` refuse "" et tout appel de
// `envServeur()` échouait avec le `.env.local` fourni (relecture de la
// phase 2 : aucun clic de la passerelle n'était enregistré).
import { z } from "zod";

/**
 * Variable facultative : absente, vide ou faite d'espaces → `undefined` ;
 * sinon validée par `schema`. Les variables REQUISES ne passent pas par ici :
 * vides, elles restent refusées.
 */
function facultative<T extends z.ZodType<string>>(schema: T) {
  return z.preprocess(
    (valeur) => (typeof valeur === "string" && valeur.trim() === "" ? undefined : valeur),
    schema.optional(),
  );
}

const schemaPublic = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ message: "NEXT_PUBLIC_SITE_URL doit être une URL valide." }),
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    message: "NEXT_PUBLIC_SUPABASE_URL doit être une URL valide.",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ message: "NEXT_PUBLIC_SUPABASE_ANON_KEY est requise." })
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY est requise."),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: facultative(z.string().min(1)),
});

const schemaServeur = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ message: "SUPABASE_SERVICE_ROLE_KEY est requise." })
    .min(1, "SUPABASE_SERVICE_ROLE_KEY est requise."),
  RESEND_API_KEY: facultative(z.string().min(1)),
  EMAIL_FROM: facultative(z.string().min(1)),
  ADMIN_NOTIFY_EMAIL: facultative(z.email()),
  TURNSTILE_SECRET_KEY: facultative(z.string().min(1)),
  FORM_HASH_SALT: facultative(z.string().min(1)),
  CRON_SECRET: facultative(z.string().min(1)),
});

/** Traduit les erreurs Zod en un message français lisible, une ligne par variable. */
function messageErreur(erreur: z.ZodError, contexte: string): string {
  const lignes = erreur.issues.map((probleme) => {
    const variable = probleme.path.join(".") || "?";
    if (probleme.code === "invalid_type" && "input" in probleme && probleme.input === undefined) {
      return `  - ${variable} : variable manquante`;
    }
    return `  - ${variable} : ${probleme.message}`;
  });
  return [
    `Configuration ${contexte} invalide (voir .env.example et docs/SPECIFICATIONS.md, section 18) :`,
    ...lignes,
  ].join("\n");
}

/**
 * Variables utilisables côté navigateur (préfixées `NEXT_PUBLIC_`).
 *
 * Chaque référence à `process.env.NEXT_PUBLIC_...` est écrite littéralement
 * ci-dessous (jamais `process.env[cle]`) : Next.js remplace ces expressions
 * au moment du build, ce qui permet d'appeler cette fonction depuis un
 * composant client aussi bien que depuis le serveur.
 */
export function envPublic() {
  const resultat = schemaPublic.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });
  if (!resultat.success) {
    throw new Error(messageErreur(resultat.error, "publique"));
  }
  return {
    siteUrl: resultat.data.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: resultat.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: resultat.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    turnstileSiteKey: resultat.data.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null,
  };
}

/**
 * Variables serveur uniquement (inclut les variables publiques : le serveur
 * en a aussi besoin, par exemple pour construire les clients Supabase).
 *
 * Les variables encore facultatives à ce stade du projet (Resend, Turnstile,
 * sel des formulaires, tâches planifiées) valent `null` si absentes : c'est
 * au code qui les UTILISE (phase 5 ; `CRON_SECRET` : évolution P1-a) de
 * vérifier qu'elles sont définies et d'échouer clairement à ce moment-là,
 * pas ici.
 */
export function envServeur() {
  const public_ = envPublic();
  const resultat = schemaServeur.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    ADMIN_NOTIFY_EMAIL: process.env.ADMIN_NOTIFY_EMAIL,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    FORM_HASH_SALT: process.env.FORM_HASH_SALT,
    CRON_SECRET: process.env.CRON_SECRET,
  });
  if (!resultat.success) {
    throw new Error(messageErreur(resultat.error, "serveur"));
  }
  return {
    ...public_,
    supabaseServiceRoleKey: resultat.data.SUPABASE_SERVICE_ROLE_KEY,
    resendApiKey: resultat.data.RESEND_API_KEY ?? null,
    emailFrom: resultat.data.EMAIL_FROM ?? null,
    adminNotifyEmail: resultat.data.ADMIN_NOTIFY_EMAIL ?? null,
    turnstileSecretKey: resultat.data.TURNSTILE_SECRET_KEY ?? null,
    formHashSalt: resultat.data.FORM_HASH_SALT ?? null,
    cronSecret: resultat.data.CRON_SECRET ?? null,
  };
}
