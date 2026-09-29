// Client Supabase côté navigateur, pour les composants clients (phase 5 et
// suivantes : formulaires interactifs de l'espace gestionnaire, par exemple).
// Aucun `import "server-only"` ici : ce module est justement fait pour être
// importé depuis le navigateur.
//
// La gestion des cookies est laissée à `@supabase/ssr` (option `cookies`
// omise) : elle lit et écrit `document.cookie` elle-même, et
// `createBrowserClient` retourne une instance UNIQUE par défaut
// (`isSingleton`), donc `creerClientNavigateur()` peut être appelée
// plusieurs fois sans dupliquer la connexion.
import { createBrowserClient } from "@supabase/ssr";

import { envPublic } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export function creerClientNavigateur() {
  const env = envPublic();
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
