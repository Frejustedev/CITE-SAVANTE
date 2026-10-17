// API Supabase locale, sans Docker : PostgREST branché sur la grappe PostgreSQL
// du projet, derrière un relais qui reproduit les adresses de Supabase.
//
// Pourquoi : tant que le projet Supabase distant n'existe pas (et que Docker
// Desktop ne démarre pas sur ce poste), les pages publiques ont besoin d'une
// API REST réelle pour être vérifiées sur les données de démonstration.
// PostgREST est le moteur de l'API REST de Supabase : mêmes requêtes, même RLS,
// mêmes rôles (anon, authenticated, service_role) que sur le projet distant.
//
// Ce qui est servi sur http://127.0.0.1:54321 (comme `supabase start`) :
//   /rest/v1/*                    → PostgREST (préfixe retiré)
//   /storage/v1/object/public/*   → 404 (pas de stockage local)
//   /auth/v1/*                    → 501 (pas d'authentification : phases 5 et 6
//                                   à vérifier avec Supabase local sous Docker
//                                   ou sur le projet distant)
//
// Usage :
//   PG_DB=citesavante_api SANS_DEMO=0 bash scripts/valider-base.sh   # base à jour
//   node scripts/api-locale.mjs cles      # écrit les clés locales dans .env.local
//   node scripts/api-locale.mjs           # démarre l'API (Ctrl+C pour arrêter)
//
// Variables (toutes facultatives) : PG_HOST (localhost), PG_PORT (54390),
// PG_DB (citesavante_api), POSTGREST_BIN (PostgREST 16.3, la version du
// CLI Supabase 2.118), PG_BIN (dossier de libpq.dll), API_PORT (54321),
// POSTGREST_PORT (54320).
//
// Les clés produites sont des clés de DÉVELOPPEMENT, signées avec un secret
// aléatoire propre à ce poste (API_LOCALE_JWT_SECRET dans .env.local, jamais
// commité). Elles ne donnent accès qu'à la base locale.

import { spawn } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FICHIER_ENV = path.join(RACINE, ".env.local");
const FICHIER_EXEMPLE = path.join(RACINE, ".env.example");

const PG_HOST = process.env.PG_HOST ?? "localhost";
const PG_PORT = process.env.PG_PORT ?? "54390";
const PG_DB = process.env.PG_DB ?? "citesavante_api";
const POSTGREST_BIN =
  process.env.POSTGREST_BIN ?? "C:/Users/agbot/Desktop/PROJETS/pgsql/postgrest/postgrest.exe";
// PostgREST pour Windows charge libpq.dll, fournie avec les binaires PostgreSQL.
const PG_BIN = process.env.PG_BIN ?? "C:/Users/agbot/Desktop/PROJETS/pgsql/pgsql/bin";
const API_PORT = Number(process.env.API_PORT ?? 54321);
const POSTGREST_PORT = Number(process.env.POSTGREST_PORT ?? 54320);
const URL_API = `http://127.0.0.1:${API_PORT}`;

// --- .env.local ---------------------------------------------------------------

function lireEnv() {
  if (!existsSync(FICHIER_ENV)) return null;
  return readFileSync(FICHIER_ENV, "utf8");
}

function valeur(contenu, nom) {
  const ligne = contenu.split(/\r?\n/).find((l) => l.startsWith(`${nom}=`));
  return ligne ? ligne.slice(nom.length + 1).trim() : "";
}

function remplacer(contenu, nom, nouvelle) {
  const lignes = contenu.split(/\r?\n/);
  const i = lignes.findIndex((l) => l.startsWith(`${nom}=`));
  if (i === -1) lignes.push(`${nom}=${nouvelle}`);
  else lignes[i] = `${nom}=${nouvelle}`;
  return lignes.join("\n");
}

// --- JWT HS256, comme les clés anon et service_role de Supabase ----------------

function base64url(donnees) {
  return Buffer.from(donnees).toString("base64url");
}

function signerJwt(charge, secret) {
  const entete = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corps = base64url(JSON.stringify(charge));
  const signature = createHmac("sha256", secret).update(`${entete}.${corps}`).digest("base64url");
  return `${entete}.${corps}.${signature}`;
}

function cles(secret) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 10 * 365 * 24 * 3600;
  return {
    anon: signerJwt({ iss: "api-locale", role: "anon", iat, exp }, secret),
    service: signerJwt({ iss: "api-locale", role: "service_role", iat, exp }, secret),
  };
}

function ecrireCles() {
  let contenu = lireEnv();
  if (contenu === null) {
    contenu = readFileSync(FICHIER_EXEMPLE, "utf8");
    console.log("Création de .env.local à partir de .env.example.");
  }
  let secret = valeur(contenu, "API_LOCALE_JWT_SECRET");
  if (!secret) secret = randomBytes(48).toString("base64url");
  const { anon, service } = cles(secret);
  contenu = remplacer(contenu, "API_LOCALE_JWT_SECRET", secret);
  contenu = remplacer(contenu, "NEXT_PUBLIC_SUPABASE_URL", URL_API);
  contenu = remplacer(contenu, "NEXT_PUBLIC_SUPABASE_ANON_KEY", anon);
  contenu = remplacer(contenu, "SUPABASE_SERVICE_ROLE_KEY", service);
  writeFileSync(FICHIER_ENV, contenu.endsWith("\n") ? contenu : `${contenu}\n`);
  console.log(`.env.local : URL ${URL_API}, clés anon et service_role locales écrites.`);
}

// --- Démarrage ----------------------------------------------------------------

function demarrer() {
  const contenu = lireEnv();
  const secret = contenu ? valeur(contenu, "API_LOCALE_JWT_SECRET") : "";
  if (!secret) {
    console.error("Aucune clé locale : lancez d'abord « node scripts/api-locale.mjs cles ».");
    process.exit(1);
  }
  if (!existsSync(POSTGREST_BIN)) {
    console.error(`PostgREST introuvable : ${POSTGREST_BIN} (variable POSTGREST_BIN).`);
    process.exit(1);
  }

  const postgrest = spawn(POSTGREST_BIN, [], {
    env: {
      ...process.env,
      PATH: `${PG_BIN}${path.delimiter}${process.env.PATH ?? ""}`,
      PGRST_DB_URI: `postgres://authenticator@${PG_HOST}:${PG_PORT}/${PG_DB}`,
      PGRST_DB_SCHEMAS: "public",
      PGRST_DB_EXTRA_SEARCH_PATH: "public,extensions",
      PGRST_DB_ANON_ROLE: "anon",
      PGRST_JWT_SECRET: secret,
      PGRST_SERVER_HOST: "127.0.0.1",
      PGRST_SERVER_PORT: String(POSTGREST_PORT),
      PGRST_LOG_LEVEL: "warn",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
  postgrest.on("exit", (code) => {
    console.error(`PostgREST s'est arrêté (code ${code}).`);
    process.exit(code ?? 1);
  });

  const relais = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", URL_API);
    const entetesCors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers":
        "authorization, apikey, content-type, prefer, range, accept-profile, content-profile, x-client-info",
      "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD",
      "access-control-expose-headers": "content-range, content-location",
    };
    if (req.method === "OPTIONS") {
      res.writeHead(204, entetesCors);
      res.end();
      return;
    }
    if (!url.pathname.startsWith("/rest/v1")) {
      const auth = url.pathname.startsWith("/auth/v1");
      res.writeHead(auth ? 501 : 404, { ...entetesCors, "content-type": "application/json" });
      res.end(
        JSON.stringify({
          message: auth
            ? "Authentification indisponible sur l'API locale (PostgREST seul)."
            : "Ressource indisponible sur l'API locale.",
        }),
      );
      return;
    }
    const cible = (url.pathname.slice("/rest/v1".length) || "/") + url.search;
    const entetes = { ...req.headers, host: `127.0.0.1:${POSTGREST_PORT}` };
    const amont = http.request(
      {
        host: "127.0.0.1",
        port: POSTGREST_PORT,
        method: req.method,
        path: cible,
        headers: entetes,
      },
      (reponse) => {
        res.writeHead(reponse.statusCode ?? 502, { ...reponse.headers, ...entetesCors });
        reponse.pipe(res);
      },
    );
    amont.on("error", (erreur) => {
      res.writeHead(502, { ...entetesCors, "content-type": "application/json" });
      res.end(JSON.stringify({ message: `PostgREST injoignable : ${erreur.message}` }));
    });
    req.pipe(amont);
  });

  relais.listen(API_PORT, "127.0.0.1", () => {
    console.log(
      `API locale prête : ${URL_API}/rest/v1 → PostgREST ${POSTGREST_PORT}, base ${PG_DB}.`,
    );
  });

  const arreter = () => {
    relais.close();
    postgrest.kill();
    process.exit(0);
  };
  process.on("SIGINT", arreter);
  process.on("SIGTERM", arreter);
}

if (process.argv[2] === "cles") ecrireCles();
else demarrer();
