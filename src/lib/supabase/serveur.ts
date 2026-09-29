import "server-only";

// Client Supabase côté serveur, lié aux cookies de la requête (session de
// l'utilisateur connecté) : espace gestionnaire (phase 5) et back-office
// (phase 6). `cookies()` est ASYNCHRONE depuis Next 15 et le reste en
// Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md) ;
// `creerClientServeur` est donc elle-même asynchrone.
//
// `setAll` est protégée par un `try/catch` : Next.js interdit d'écrire des
// cookies pendant le rendu d'un Server Component (seuls une server action ou
// un route handler le peuvent — même documentation, « Understanding Cookie
// Behavior in Server Components »). Aucune page n'utilise encore ce client ;
// l'erreur est silencieuse. Avec l'authentification (lien magique, phase 5),
// un middleware devra rafraîchir la session à chaque requête, comme le
// recommande `@supabase/ssr`.
//
// Créé PARESSEUSEMENT, à chaque appel (jamais un client partagé au niveau du
// module) : `@supabase/ssr` l'exige, une session ne doit jamais fuiter d'une
// requête à l'autre.
//
// `envPublic()` et non `envServeur()` (relecture de sécurité) : ce client
// n'utilise que l'URL et la clé publique ; exiger la clé de service ici la
// ferait charger à chaque rendu authentifié sans raison, et son absence
// casserait la connexion des utilisateurs. Seul `service.ts` s'en sert
// (garde-fou : src/lib/securite.test.ts).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { envPublic } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export async function creerClientServeur() {
  const magasinCookies = await cookies();
  const env = envPublic();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return magasinCookies.getAll();
      },
      setAll(cookiesAEcrire) {
        try {
          for (const { name, value, options } of cookiesAEcrire) {
            magasinCookies.set(name, value, options);
          }
        } catch {
          // Rendu d'un Server Component : écriture impossible, sans
          // conséquence tant qu'un middleware rafraîchit la session
          // (à mettre en place en phase 5, avec l'authentification).
        }
      },
    },
  });
}
