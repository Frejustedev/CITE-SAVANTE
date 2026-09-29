import "server-only";

// Client de service (clé `service_role`, RLS contournée). CLAUDE.md, section
// 6 : « la clé service_role n'est utilisée que côté serveur, dans
// src/lib/supabase/service.ts, et seulement pour les cas listés dans les
// spécifications ». Usages AUTORISÉS, et aucun autre :
//   - formulaires publics (src/lib/actions/) : un visiteur anonyme n'a pas de
//     compte, donc pas de rôle `authenticated` — l'écriture (referencer,
//     contact, visibilité) passe par ce client, après validation Zod et
//     vérification anti-spam (spécifications, section 12.1) ;
//   - passerelle /go (spécifications, section 10.1) : enregistrement d'un
//     clic sortant dans `clics_sortants`, sans session utilisateur ;
//   - e-mails (Resend, section 14 ; phase 5, puis décisions de modération en
//     phase 6) : lecture des données nécessaires à l'envoi, dont les
//     coordonnées de l'auteur d'une soumission ;
//   - envois de fichiers dans le stockage (logos, affiches, publicités),
//     UNIQUEMENT après que le code appelant a vérifié lui-même les droits de
//     l'utilisateur (ce client contourne la RLS : aucune politique de
//     stockage n'existe pour anon/authenticated, spécifications 5.7). La même
//     server action enregistre `logo_path` / `affiche_path` avec ce client :
//     ces colonnes sont figées pour un gestionnaire (déclencheurs de la
//     migration 4).
// `persistSession: false` : ce client ne représente aucun utilisateur, il n'y
// a donc pas de session à conserver.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { envServeur } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export function creerClientService(): SupabaseClient<Database> {
  const env = envServeur();
  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
