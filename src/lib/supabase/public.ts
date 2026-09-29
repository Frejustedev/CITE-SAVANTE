import "server-only";

// Client anonyme, SANS cookies, pour les lectures publiques mises en cache
// (src/lib/requetes/, spécifications section 8). N'importe pas
// `@supabase/ssr` : une lecture publique ne dépend d'aucune session, et un
// client lié aux cookies de la requête ne pourrait pas être partagé par
// `unstable_cache` entre plusieurs visiteurs (règle de rendu, voir
// PROGRESS.md). `import "server-only"` : ce module ne doit jamais être
// importé par du code destiné au navigateur.
//
// Créé PARESSEUSEMENT (jamais au niveau du module) : instancier le client à
// l'import forcerait la lecture des variables d'environnement pendant
// `pnpm build`, qui doit réussir sans base de données ni variables Supabase.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { envPublic } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export function creerClientPublic(): SupabaseClient<Database> {
  const env = envPublic();
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
