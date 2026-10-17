// Passerelle `GET /go/[type]/[id]?vers=…&from=…` (spécifications, section
// 10.1) : vérifie la cible, enregistre le clic, redirige en 302 vers le lien
// officiel complété des UTM. Toute la logique est dans src/lib/passerelle/
// (testée) ; ce fichier ne fournit que les clients Supabase et la date du
// jour.
//
// Clients : lecture avec le client anonyme (RLS en plus des filtres
// explicites), écriture du clic avec le client de service — usage autorisé,
// listé en tête de src/lib/supabase/service.ts. Les deux sont créés
// paresseusement, seulement si la requête en a besoin.
//
// Page d'origine d'une fiche (`from=/societes/{slug}`) : vérifiée contre les
// slugs des organisations publiées (`listerSlugsSocietesPubliees`, lecture
// mise en cache de src/lib/requetes/, la même que la fiche).
//
// `params` est une promesse depuis Next.js 15
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md).
// HEAD est déclarée explicitement : sans elle, Next.js répondrait aux HEAD
// avec GET ; ici, une HEAD reçoit la même réponse mais n'est jamais comptée
// comme un clic (`doitCompterClic`).
import type { NextRequest } from "next/server";

import { traiterPasserelle } from "@/lib/passerelle/passerelle";
import { listerSlugsSocietesPubliees } from "@/lib/requetes/societes";
import { creerClientPublic } from "@/lib/supabase/public";
import { creerClientService } from "@/lib/supabase/service";
import { aujourdhuiPortoNovo } from "@/lib/utils/dates";

// Jamais tentée au build (aucune base à ce moment-là), jamais mise en cache.
export const dynamic = "force-dynamic";

type ContexteRoute = { params: Promise<{ type: string; id: string }> };

async function repondre(requete: NextRequest, { params }: ContexteRoute): Promise<Response> {
  return traiterPasserelle(requete, await params, {
    clientLecture: creerClientPublic,
    clientEcriture: creerClientService,
    aujourdhui: aujourdhuiPortoNovo(),
    slugsPublies: { societes: listerSlugsSocietesPubliees },
  });
}

export async function GET(requete: NextRequest, contexte: ContexteRoute): Promise<Response> {
  return repondre(requete, contexte);
}

export async function HEAD(requete: NextRequest, contexte: ContexteRoute): Promise<Response> {
  return repondre(requete, contexte);
}
