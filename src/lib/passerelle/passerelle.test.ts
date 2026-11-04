// Tests de la passerelle `/go/[type]/[id]` (spécifications, section 10.1 ;
// prompt de la phase 2, point 4) : enchaînement complet de
// `traiterPasserelle`, avec un FAUX client Supabase en mémoire (aucun réseau,
// aucune base). Le faux client applique les filtres demandés aux lignes
// fournies et ENREGISTRE chaque requête (table, colonnes, filtres), pour
// vérifier que les filtres de statut sont bien demandés explicitement, et
// non seulement que le résultat est le bon.
import { describe, expect, it, vi } from "vitest";

import { PARAMETRES_UTM } from "@/lib/utils/urls";

import { DELAI_MAX_ENREGISTREMENT_MS, type ClientPasserelle } from "./donnees";
import {
  ENTETES_PASSERELLE,
  MESSAGE_INDISPONIBLE,
  MESSAGE_INTROUVABLE,
  traiterPasserelle,
  type DependancesPasserelle,
} from "./passerelle";

// ── Faux client Supabase ─────────────────────────────────────────────────────

type Ligne = Record<string, unknown>;
type Filtre = { operation: "eq" | "lte" | "gte"; colonne: string; valeur: unknown };
type RequeteLue = { table: string; colonnes: string; filtres: Filtre[]; signal: boolean };
type ErreurSimulee = { code: string; message: string; details?: string };

type OptionsFauxClient = {
  tables?: Record<string, Ligne[]>;
  erreurLecture?: ErreurSimulee;
  leveALaLecture?: boolean;
  erreurInsertion?: ErreurSimulee;
  leveALInsertion?: boolean;
  /**
   * L'insertion ne répond pas : le faux client attend que le signal reçu
   * (`AbortSignal.timeout` réel de `enregistrerClic`) soit déclenché, puis
   * renvoie l'erreur que produit supabase-js dans ce cas (`renvoie`) ou lève
   * la raison de l'interruption (`leve`, client en `throwOnError`).
   */
  insertionSansReponse?: "renvoie" | "leve";
};

function creerFauxClient(options: OptionsFauxClient = {}) {
  const requetes: RequeteLue[] = [];
  const insertions: { table: string; ligne: Ligne; signal: boolean }[] = [];

  function from(table: string) {
    const requete: RequeteLue = { table, colonnes: "", filtres: [], signal: false };
    let ligneAInserer: Ligne | null = null;
    let signalRecu: AbortSignal | null = null;

    const constructeur = {
      select(colonnes: string) {
        requete.colonnes = colonnes;
        requetes.push(requete);
        return constructeur;
      },
      eq(colonne: string, valeur: unknown) {
        requete.filtres.push({ operation: "eq", colonne, valeur });
        return constructeur;
      },
      lte(colonne: string, valeur: unknown) {
        requete.filtres.push({ operation: "lte", colonne, valeur });
        return constructeur;
      },
      gte(colonne: string, valeur: unknown) {
        requete.filtres.push({ operation: "gte", colonne, valeur });
        return constructeur;
      },
      abortSignal(signal: AbortSignal) {
        requete.signal = signal instanceof AbortSignal;
        signalRecu = signal;
        return constructeur;
      },
      async maybeSingle() {
        if (options.leveALaLecture) throw new Error("connexion refusée");
        if (options.erreurLecture) return { data: null, error: options.erreurLecture };
        const colonnes = requete.colonnes.split(",").map((colonne) => colonne.trim());
        const trouvees = (options.tables?.[table] ?? []).filter((ligne) =>
          requete.filtres.every(({ operation, colonne, valeur }) => {
            const actuelle = ligne[colonne];
            if (operation === "eq") return actuelle === valeur;
            // Comparaisons de dates « AAAA-MM-JJ » : ordre des chaînes.
            if (operation === "lte") return String(actuelle) <= String(valeur);
            return String(actuelle) >= String(valeur);
          }),
        );
        if (trouvees.length > 1) {
          return { data: null, error: { code: "PGRST116", message: "plusieurs lignes" } };
        }
        const ligne = trouvees[0];
        return {
          data: ligne ? Object.fromEntries(colonnes.map((c) => [c, ligne[c]])) : null,
          error: null,
        };
      },
      insert(ligne: Ligne) {
        ligneAInserer = ligne;
        return constructeur;
      },
      then<R1, R2 = never>(
        succes: (valeur: { error: ErreurSimulee | null }) => R1 | PromiseLike<R1>,
        echec?: (raison: unknown) => R2 | PromiseLike<R2>,
      ): Promise<R1 | R2> {
        const execution = (async () => {
          if (ligneAInserer === null)
            throw new Error("faux client : seule l'insertion est attendable");
          if (options.leveALInsertion) throw new Error("connexion interrompue");
          if (options.insertionSansReponse) {
            const signal = signalRecu;
            if (signal === null) throw new Error("faux client : insertion sans signal");
            await new Promise((resolve) => signal.addEventListener("abort", resolve));
            if (options.insertionSansReponse === "leve") throw signal.reason;
            // Forme renvoyée par supabase-js 2.117 (`postgrest-js`) sur une
            // requête interrompue : statut 0, code vide, nom et message de
            // l'erreur de `fetch`.
            return {
              error: { code: "", message: `${signal.reason.name}: ${signal.reason.message}` },
            };
          }
          if (options.erreurInsertion) return { error: options.erreurInsertion };
          insertions.push({ table, ligne: ligneAInserer, signal: requete.signal });
          return { error: null };
        })();
        return execution.then(succes, echec);
      },
    };
    return constructeur;
  }

  return { client: { from } as unknown as ClientPasserelle, requetes, insertions };
}

// ── Données de test (fictives) ───────────────────────────────────────────────

const AUJOURDHUI = "2026-10-05";

const S_PUBLIEE = "de110000-0000-0000-0000-000000000001";
const S_EN_ATTENTE = "de110000-0000-0000-0000-000000000002";
const S_ARCHIVEE = "de110000-0000-0000-0000-000000000003";
const S_LIENS_DOUTEUX = "de110000-0000-0000-0000-000000000004";
const S_SANS_LIEN = "de110000-0000-0000-0000-000000000005";
const E_PUBLIE = "de220000-0000-0000-0000-000000000001";
const E_EN_ATTENTE = "de220000-0000-0000-0000-000000000002";
const E_LIEN_JAVASCRIPT = "de220000-0000-0000-0000-000000000003";
const P_ACTIF = "de330000-0000-0000-0000-000000000001";
const P_INACTIF = "de330000-0000-0000-0000-000000000002";
const P_A_VENIR = "de330000-0000-0000-0000-000000000003";
const P_TERMINE = "de330000-0000-0000-0000-000000000004";
const P_DEBUT_AUJOURDHUI = "de330000-0000-0000-0000-000000000005";
const P_FIN_AUJOURDHUI = "de330000-0000-0000-0000-000000000006";
const INCONNU = "de990000-0000-0000-0000-000000000001";

const TABLES: Record<string, Ligne[]> = {
  societes: [
    {
      id: S_PUBLIEE,
      statut: "publie",
      site_web: "https://societe.example.org/accueil?lang=fr#haut",
      site_congres: "https://congres.example.org/2027?utm_source=lettre",
    },
    {
      id: S_EN_ATTENTE,
      statut: "en_attente",
      site_web: "https://attente.example.org",
      site_congres: null,
    },
    {
      id: S_ARCHIVEE,
      statut: "archive",
      site_web: "https://archive.example.org",
      site_congres: null,
    },
    {
      // Interdit par les contraintes de la migration 3, mais la passerelle
      // ne se fie pas à la base seule.
      id: S_LIENS_DOUTEUX,
      statut: "publie",
      site_web: "http://non-chiffre.example.org",
      site_congres: "https://utilisateur@identifiants.example.org",
    },
    { id: S_SANS_LIEN, statut: "publie", site_web: null, site_congres: null },
  ],
  evenements: [
    {
      id: E_PUBLIE,
      statut: "publie",
      site_web: "https://evenement.example.org",
      lien_inscription: "https://inscription.example.org/formulaire?session=2",
    },
    {
      id: E_EN_ATTENTE,
      statut: "en_attente",
      site_web: "https://attente.example.org",
      lien_inscription: "https://attente.example.org/inscription",
    },
    {
      id: E_LIEN_JAVASCRIPT,
      statut: "publie",
      site_web: "javascript:alert(1)",
      lien_inscription: " https://espace.example.org",
    },
  ],
  emplacements_pub: [
    {
      id: P_ACTIF,
      actif: true,
      date_debut: "2026-10-01",
      date_fin: "2026-10-31",
      lien: "https://annonceur.example.org/offre",
    },
    {
      id: P_INACTIF,
      actif: false,
      date_debut: "2026-10-01",
      date_fin: "2026-10-31",
      lien: "https://inactif.example.org",
    },
    {
      id: P_A_VENIR,
      actif: true,
      date_debut: "2026-10-06",
      date_fin: "2026-11-30",
      lien: "https://a-venir.example.org",
    },
    {
      id: P_TERMINE,
      actif: true,
      date_debut: "2026-09-01",
      date_fin: "2026-10-04",
      lien: "https://termine.example.org",
    },
    {
      id: P_DEBUT_AUJOURDHUI,
      actif: true,
      date_debut: AUJOURDHUI,
      date_fin: "2026-10-20",
      lien: "https://debut.example.org",
    },
    {
      id: P_FIN_AUJOURDHUI,
      actif: true,
      date_debut: "2026-09-20",
      date_fin: AUJOURDHUI,
      lien: "https://fin.example.org",
    },
  ],
};

// ── Aide ─────────────────────────────────────────────────────────────────────

type Scenario = {
  chemin: string;
  methode?: string;
  entetes?: Record<string, string>;
  options?: OptionsFauxClient;
  dependances?: Partial<DependancesPasserelle>;
};

/** Slugs des fiches d'organisation publiées (pages d'origine admises), fictifs. */
const SLUGS_SOCIETES_PUBLIEES: ReadonlySet<string> = new Set(["sobeped", "demo-sbmi"]);

/** Slugs des fiches d'événement publiées (pages d'origine admises), fictifs. */
const SLUGS_EVENEMENTS_PUBLIES: ReadonlySet<string> = new Set(["demo-congres-pediatrie-cotonou"]);

/** Exécute la passerelle sur `chemin` (« /go/{type}/{id}?… ») avec un faux client. */
async function executer({ chemin, methode = "GET", entetes, options, dependances }: Scenario) {
  const faux = creerFauxClient({ tables: TABLES, ...options });
  const journal: string[] = [];
  const clientLecture = vi.fn(() => faux.client);
  const clientEcriture = vi.fn(() => faux.client);
  const slugsSocietes = vi.fn(async () => SLUGS_SOCIETES_PUBLIEES);
  const slugsEvenements = vi.fn(async () => SLUGS_EVENEMENTS_PUBLIES);
  const url = new URL(chemin, "https://citesavante.com");
  const [, , type = "", id = ""] = url.pathname.split("/");
  const reponse = await traiterPasserelle(
    new Request(url, { method: methode, headers: entetes }),
    { type: decodeURIComponent(type), id: decodeURIComponent(id) },
    {
      clientLecture,
      clientEcriture,
      aujourdhui: AUJOURDHUI,
      slugsPublies: { societes: slugsSocietes, agenda: slugsEvenements },
      journaliser: (message) => journal.push(message),
      ...dependances,
    },
  );
  return {
    reponse,
    faux,
    journal,
    clientLecture,
    clientEcriture,
    slugsSocietes,
    slugsEvenements,
  };
}

function attendreEntetesPasserelle(reponse: Response) {
  expect(reponse.headers.get("X-Robots-Tag")).toBe(ENTETES_PASSERELLE["X-Robots-Tag"]);
  expect(reponse.headers.get("X-Robots-Tag")).toBe("noindex");
  expect(reponse.headers.get("Cache-Control")).toBe("no-store");
}

async function attendre404(resultat: Awaited<ReturnType<typeof executer>>) {
  const { reponse, faux, clientEcriture } = resultat;
  expect(reponse.status).toBe(404);
  expect(reponse.headers.get("Location")).toBeNull();
  expect(reponse.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  expect(await reponse.text()).toBe(MESSAGE_INTROUVABLE);
  attendreEntetesPasserelle(reponse);
  expect(faux.insertions).toEqual([]);
  expect(clientEcriture).not.toHaveBeenCalled();
}

const UTM = `utm_source=${PARAMETRES_UTM.utm_source}&utm_medium=${PARAMETRES_UTM.utm_medium}`;

// ── Redirection et clic ──────────────────────────────────────────────────────

describe("organisation publiée", () => {
  it("vers=site : clic enregistré, 302 vers le site officiel avec les UTM", async () => {
    const { reponse, faux, journal } = await executer({
      chemin: `/go/societe/${S_PUBLIEE}?vers=site&from=/societes/sobeped`,
    });
    const attendue = `https://societe.example.org/accueil?lang=fr&${UTM}#haut`;
    expect(reponse.status).toBe(302);
    expect(reponse.headers.get("Location")).toBe(attendue);
    expect(reponse.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    attendreEntetesPasserelle(reponse);
    expect(faux.insertions).toEqual([
      {
        table: "clics_sortants",
        ligne: {
          cible_type: "societe",
          cible_id: S_PUBLIEE,
          url: attendue,
          page_origine: "/societes/sobeped",
        },
        signal: true,
      },
    ]);
    expect(journal).toEqual([]);
  });

  it("vers=congres : les UTM existants ne sont pas écrasés", async () => {
    const { reponse } = await executer({ chemin: `/go/societe/${S_PUBLIEE}?vers=congres` });
    const location = new URL(reponse.headers.get("Location") ?? "");
    expect(reponse.status).toBe(302);
    expect(location.origin + location.pathname).toBe("https://congres.example.org/2027");
    expect(location.searchParams.getAll("utm_source")).toEqual(["lettre"]);
    expect(location.searchParams.getAll("utm_medium")).toEqual(["referral"]);
  });

  it("le clic ne contient que les quatre colonnes prévues (ni IP, ni identifiant, ni agent)", async () => {
    const { faux } = await executer({
      chemin: `/go/societe/${S_PUBLIEE}?vers=site`,
      entetes: {
        "user-agent": "Navigateur/1.0",
        "x-forwarded-for": "203.0.113.7",
        cookie: "session=abc",
        referer: "https://citesavante.com/societes/sobeped",
      },
    });
    expect(faux.insertions).toHaveLength(1);
    expect(Object.keys(faux.insertions[0].ligne).sort()).toEqual([
      "cible_id",
      "cible_type",
      "page_origine",
      "url",
    ]);
    expect(faux.insertions[0].ligne.page_origine).toBeNull();
  });

  it("filtre explicitement statut = publie et liste ses colonnes (jamais « * »)", async () => {
    const { faux } = await executer({ chemin: `/go/societe/${S_PUBLIEE}?vers=site` });
    expect(faux.requetes).toEqual([
      {
        table: "societes",
        colonnes: "id, statut, site_web, site_congres",
        filtres: [
          { operation: "eq", colonne: "id", valeur: S_PUBLIEE },
          { operation: "eq", colonne: "statut", valeur: "publie" },
        ],
        signal: true,
      },
    ]);
  });

  it("identifiant en majuscules : ramené en minuscules pour la lecture et le clic", async () => {
    const { reponse, faux } = await executer({
      chemin: `/go/societe/${S_PUBLIEE.toUpperCase()}?vers=site`,
    });
    expect(reponse.status).toBe(302);
    expect(faux.requetes[0].filtres[0]).toEqual({
      operation: "eq",
      colonne: "id",
      valeur: S_PUBLIEE,
    });
    expect(faux.insertions[0].ligne.cible_id).toBe(S_PUBLIEE);
  });
});

describe("événement publié", () => {
  it("vers=inscription → lien_inscription", async () => {
    const { reponse, faux } = await executer({
      chemin: `/go/evenement/${E_PUBLIE}?vers=inscription&from=/agenda`,
    });
    expect(reponse.status).toBe(302);
    expect(reponse.headers.get("Location")).toBe(
      `https://inscription.example.org/formulaire?session=2&${UTM}`,
    );
    expect(faux.insertions[0].ligne).toMatchObject({
      cible_type: "evenement",
      cible_id: E_PUBLIE,
      page_origine: "/agenda",
    });
    expect(faux.requetes[0]).toMatchObject({
      table: "evenements",
      colonnes: "id, statut, site_web, lien_inscription",
      filtres: expect.arrayContaining([{ operation: "eq", colonne: "statut", valeur: "publie" }]),
    });
  });

  it("vers=site → site_web", async () => {
    const { reponse } = await executer({ chemin: `/go/evenement/${E_PUBLIE}?vers=site` });
    expect(reponse.headers.get("Location")).toBe(`https://evenement.example.org/?${UTM}`);
  });
});

describe("emplacement publicitaire", () => {
  it("actif dans sa période : 302, vers ignoré, filtres actif et période demandés", async () => {
    const { reponse, faux } = await executer({
      chemin: `/go/emplacement/${P_ACTIF}?vers=n-importe-quoi&from=/agenda`,
    });
    expect(reponse.status).toBe(302);
    expect(reponse.headers.get("Location")).toBe(`https://annonceur.example.org/offre?${UTM}`);
    expect(faux.insertions[0].ligne).toMatchObject({
      cible_type: "emplacement",
      cible_id: P_ACTIF,
      page_origine: "/agenda",
    });
    expect(faux.requetes[0]).toEqual({
      table: "emplacements_pub",
      colonnes: "id, actif, date_debut, date_fin, lien",
      filtres: [
        { operation: "eq", colonne: "id", valeur: P_ACTIF },
        { operation: "eq", colonne: "actif", valeur: true },
        { operation: "lte", colonne: "date_debut", valeur: AUJOURDHUI },
        { operation: "gte", colonne: "date_fin", valeur: AUJOURDHUI },
      ],
      signal: true,
    });
  });

  it("premier et dernier jour de la période : acceptés", async () => {
    for (const id of [P_DEBUT_AUJOURDHUI, P_FIN_AUJOURDHUI]) {
      const { reponse, faux } = await executer({ chemin: `/go/emplacement/${id}` });
      expect(reponse.status).toBe(302);
      expect(faux.insertions).toHaveLength(1);
    }
  });

  it.each([
    ["inactif", P_INACTIF],
    ["pas encore commencé (début demain)", P_A_VENIR],
    ["terminé (fin hier)", P_TERMINE],
  ])("%s : 404 sans clic", async (_cas, id) => {
    await attendre404(await executer({ chemin: `/go/emplacement/${id}` }));
  });

  it("seconde vérification : une ligne inactive renvoyée malgré les filtres reste refusée", async () => {
    // Faux client qui ignore les filtres (simule une erreur de requête) :
    // la vérification en JavaScript suffit à refuser.
    const lignes = TABLES.emplacements_pub.filter((ligne) => ligne.id === P_INACTIF);
    const faux = creerFauxClient({ tables: { emplacements_pub: lignes } });
    const ignorerFiltres = {
      from: (table: string) => {
        const constructeur = (faux.client as unknown as { from: (t: string) => object }).from(
          table,
        ) as Record<string, (...args: unknown[]) => unknown>;
        for (const methode of ["eq", "lte", "gte"]) constructeur[methode] = () => constructeur;
        return constructeur;
      },
    } as unknown as ClientPasserelle;
    const reponse = await traiterPasserelle(
      new Request(`https://citesavante.com/go/emplacement/${P_INACTIF}`),
      { type: "emplacement", id: P_INACTIF },
      {
        clientLecture: () => ignorerFiltres,
        clientEcriture: () => faux.client,
        aujourdhui: AUJOURDHUI,
        slugsPublies: {
          societes: async () => SLUGS_SOCIETES_PUBLIEES,
          agenda: async () => SLUGS_EVENEMENTS_PUBLIES,
        },
      },
    );
    expect(reponse.status).toBe(404);
    expect(faux.insertions).toEqual([]);
  });
});

// ── 404 : cible non publiée, paramètres invalides, lien non sûr ─────────────

describe("cible absente ou non publiée → 404, aucun clic", () => {
  it.each([
    ["organisation en attente", `/go/societe/${S_EN_ATTENTE}?vers=site`],
    ["organisation archivée", `/go/societe/${S_ARCHIVEE}?vers=site`],
    ["événement en attente", `/go/evenement/${E_EN_ATTENTE}?vers=inscription`],
    ["organisation inconnue", `/go/societe/${INCONNU}?vers=site`],
    ["événement inconnu", `/go/evenement/${INCONNU}?vers=site`],
    ["emplacement inconnu", `/go/emplacement/${INCONNU}`],
    ["identifiant d'organisation demandé comme événement", `/go/evenement/${S_PUBLIEE}?vers=site`],
  ])("%s", async (_cas, chemin) => {
    await attendre404(await executer({ chemin }));
  });

  it("seconde vérification : une fiche non publiée renvoyée malgré le filtre reste refusée", async () => {
    const faux = creerFauxClient({
      tables: { societes: [{ ...TABLES.societes[1], statut: "publie" }] },
    });
    // La ligne lue dit « publie » pour passer le faux filtre, puis on la
    // remplace par sa vraie valeur dans la réponse : la vérification en
    // JavaScript doit refuser.
    const menteur = {
      from: (table: string) => {
        const constructeur = (faux.client as unknown as { from: (t: string) => object }).from(
          table,
        ) as Record<string, (...args: unknown[]) => unknown>;
        const original = constructeur.maybeSingle as () => Promise<{ data: Ligne | null }>;
        constructeur.maybeSingle = async () => {
          const resultat = await original();
          return { ...resultat, data: resultat.data && { ...resultat.data, statut: "en_attente" } };
        };
        return constructeur;
      },
    } as unknown as ClientPasserelle;
    const reponse = await traiterPasserelle(
      new Request(`https://citesavante.com/go/societe/${S_EN_ATTENTE}?vers=site`),
      { type: "societe", id: S_EN_ATTENTE },
      {
        clientLecture: () => menteur,
        clientEcriture: () => faux.client,
        aujourdhui: AUJOURDHUI,
        slugsPublies: {
          societes: async () => SLUGS_SOCIETES_PUBLIEES,
          agenda: async () => SLUGS_EVENEMENTS_PUBLIES,
        },
      },
    );
    expect(reponse.status).toBe(404);
    expect(faux.insertions).toEqual([]);
  });
});

describe("paramètre vers invalide → 404, ni lecture ni clic", () => {
  it.each([
    ["absent (organisation)", `/go/societe/${S_PUBLIEE}`],
    ["vide", `/go/societe/${S_PUBLIEE}?vers=`],
    ["inscription pour une organisation", `/go/societe/${S_PUBLIEE}?vers=inscription`],
    ["congres pour un événement", `/go/evenement/${E_PUBLIE}?vers=congres`],
    ["absent (événement)", `/go/evenement/${E_PUBLIE}`],
    ["en majuscules", `/go/societe/${S_PUBLIEE}?vers=SITE`],
    ["URL", `/go/societe/${S_PUBLIEE}?vers=https://evil.example`],
    ["nom de colonne", `/go/societe/${S_PUBLIEE}?vers=site_web`],
  ])("%s", async (_cas, chemin) => {
    const resultat = await executer({ chemin });
    await attendre404(resultat);
    expect(resultat.faux.requetes).toEqual([]);
    expect(resultat.clientLecture).not.toHaveBeenCalled();
  });
});

describe("type ou identifiant invalide → 404, ni lecture ni clic", () => {
  it.each([
    ["type inconnu", `/go/organisation/${S_PUBLIEE}?vers=site`],
    ["type en majuscules", `/go/Societe/${S_PUBLIEE}?vers=site`],
    ["type au pluriel", `/go/societes/${S_PUBLIEE}?vers=site`],
    ["identifiant trop court", `/go/societe/123?vers=site`],
    ["identifiant non hexadécimal", `/go/societe/de110000-0000-0000-0000-00000000000z?vers=site`],
    ["identifiant sans tirets", `/go/societe/de110000000000000000000000000001?vers=site`],
    ["identifiant entre accolades", `/go/societe/%7B${S_PUBLIEE}%7D?vers=site`],
    ["identifiant suivi d'un espace", `/go/societe/${S_PUBLIEE}%20?vers=site`],
    ["injection", `/go/societe/'%20or%201=1%20--?vers=site`],
    ["slug à la place de l'identifiant", `/go/societe/sobeped?vers=site`],
  ])("%s", async (_cas, chemin) => {
    const resultat = await executer({ chemin });
    await attendre404(resultat);
    expect(resultat.faux.requetes).toEqual([]);
    expect(resultat.clientLecture).not.toHaveBeenCalled();
  });
});

describe("lien en base qui n'est pas https:// sûr → 404, aucun clic", () => {
  it.each([
    ["http://", `/go/societe/${S_LIENS_DOUTEUX}?vers=site`],
    ["identifiants dans l'URL", `/go/societe/${S_LIENS_DOUTEUX}?vers=congres`],
    ["javascript:", `/go/evenement/${E_LIEN_JAVASCRIPT}?vers=site`],
    ["espace en tête", `/go/evenement/${E_LIEN_JAVASCRIPT}?vers=inscription`],
    ["lien absent (site)", `/go/societe/${S_SANS_LIEN}?vers=site`],
    ["lien absent (congrès)", `/go/societe/${S_SANS_LIEN}?vers=congres`],
  ])("%s", async (_cas, chemin) => {
    await attendre404(await executer({ chemin }));
  });
});

// ── Aucune redirection ouverte ───────────────────────────────────────────────

describe("aucune redirection ouverte", () => {
  it("la destination vient toujours de la base, jamais d'un paramètre", async () => {
    const { reponse, faux } = await executer({
      chemin:
        `/go/societe/${S_PUBLIEE}?vers=site&url=https://evil.example&destination=https://evil.example` +
        `&redirect=//evil.example&next=https://evil.example&from=https://evil.example`,
    });
    expect(reponse.status).toBe(302);
    expect(new URL(reponse.headers.get("Location") ?? "").host).toBe("societe.example.org");
    expect(faux.insertions[0].ligne.page_origine).toBeNull();
  });

  it("vers répété : seule la première valeur compte", async () => {
    const { reponse } = await executer({
      chemin: `/go/societe/${S_PUBLIEE}?vers=congres&vers=site`,
    });
    expect(new URL(reponse.headers.get("Location") ?? "").host).toBe("congres.example.org");
  });
});

// ── Origine (from) ───────────────────────────────────────────────────────────

describe("paramètre from", () => {
  it.each([
    ["//evil.example", "//evil.example"],
    ["URL absolue", "https://evil.example/societes"],
    ["barre oblique inverse", "/%5Cevil.example"],
    ["barre oblique inverse brute", "/\\evil.example"],
    ["double barre encodée", "/%2F%2Fevil.example"],
    ["retour à la ligne", "/societes%0d%0aSet-Cookie:%20a=b"],
    ["caractère nul", "/societes%00"],
    ["tabulation", "/soc%09ietes"],
    ["javascript:", "javascript:alert(1)"],
    ["chemin relatif", "societes/sobeped"],
    ["trop long", `/${"a".repeat(600)}`],
  ])(
    "dangereux (%s) → clic enregistré avec page_origine = null, redirection maintenue",
    async (_cas, from) => {
      const { reponse, faux } = await executer({
        chemin: `/go/societe/${S_PUBLIEE}?vers=site&from=${from}`,
      });
      expect(reponse.status).toBe(302);
      expect(faux.insertions).toHaveLength(1);
      expect(faux.insertions[0].ligne.page_origine).toBeNull();
    },
  );

  it("chemin valide avec paramètres : seul le chemin est enregistré", async () => {
    const { faux } = await executer({
      chemin: `/go/societe/${S_PUBLIEE}?vers=site&from=${encodeURIComponent("/recherche?q=un+nom#r")}`,
    });
    expect(faux.insertions[0].ligne.page_origine).toBe("/recherche");
  });
});

// Vérification complète de la phase 2 : toute forme `/societes|agenda|
// disciplines/{slug}` était enregistrée, même inventée (jusqu'à 120
// caractères libres, par exemple un nom en forme de slug).
describe("page d'origine d'une fiche : slug publié exigé", () => {
  it("fiche publiée : chemin enregistré, une seule lecture des slugs", async () => {
    const { reponse, faux, slugsSocietes } = await executer({
      chemin: `/go/societe/${S_PUBLIEE}?vers=site&from=/societes/demo-sbmi`,
    });
    expect(reponse.status).toBe(302);
    expect(faux.insertions[0].ligne.page_origine).toBe("/societes/demo-sbmi");
    expect(slugsSocietes).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["slug inventé", "/societes/n-importe-quoi"],
    ["nom en forme de slug", "/societes/jean-dupont-exemple-org-0100000000"],
    ["fiche non publiée (absente de la liste)", "/societes/sbc"],
  ])("%s → clic enregistré avec page_origine = null", async (_cas, from) => {
    const { reponse, faux, journal } = await executer({
      chemin: `/go/societe/${S_PUBLIEE}?vers=site&from=${from}`,
    });
    expect(reponse.status).toBe(302);
    expect(faux.insertions).toHaveLength(1);
    expect(faux.insertions[0].ligne.page_origine).toBeNull();
    expect(journal).toEqual([]);
  });

  it("page de détail encore sans vérification (/disciplines/sante) → null, sans lecture", async () => {
    const { faux, slugsSocietes, slugsEvenements } = await executer({
      chemin: `/go/societe/${S_PUBLIEE}?vers=site&from=/disciplines/sante`,
    });
    expect(faux.insertions[0].ligne.page_origine).toBeNull();
    expect(slugsSocietes).not.toHaveBeenCalled();
    expect(slugsEvenements).not.toHaveBeenCalled();
  });

  // Phase 3 : la fiche événement porte des liens /go (« S'inscrire », « Site
  // de l'événement ») ; son chemin est admis si le slug est publié.
  it("fiche événement publiée : chemin enregistré, une seule lecture des slugs d'événements", async () => {
    const { reponse, faux, slugsSocietes, slugsEvenements } = await executer({
      chemin: `/go/evenement/${E_PUBLIE}?vers=inscription&from=/agenda/demo-congres-pediatrie-cotonou`,
    });
    expect(reponse.status).toBe(302);
    expect(faux.insertions[0].ligne.page_origine).toBe("/agenda/demo-congres-pediatrie-cotonou");
    expect(slugsEvenements).toHaveBeenCalledTimes(1);
    expect(slugsSocietes).not.toHaveBeenCalled();
  });

  it.each([
    ["slug inventé", "/agenda/n-importe-quoi"],
    ["nom en forme de slug", "/agenda/jean-dupont-exemple-org-0100000000"],
    ["slug d'organisation sous /agenda", "/agenda/demo-sbmi"],
  ])("fiche événement : %s → page_origine = null", async (_cas, from) => {
    const { reponse, faux, journal } = await executer({
      chemin: `/go/evenement/${E_PUBLIE}?vers=inscription&from=${from}`,
    });
    expect(reponse.status).toBe(302);
    expect(faux.insertions).toHaveLength(1);
    expect(faux.insertions[0].ligne.page_origine).toBeNull();
    expect(journal).toEqual([]);
  });

  it("page fixe (/societes) : enregistrée sans lecture des slugs", async () => {
    const { faux, slugsSocietes } = await executer({
      chemin: `/go/societe/${S_PUBLIEE}?vers=site&from=/societes`,
    });
    expect(faux.insertions[0].ligne.page_origine).toBe("/societes");
    expect(slugsSocietes).not.toHaveBeenCalled();
  });

  it("lecture des slugs impossible : null, journalisé sans le slug, redirection maintenue", async () => {
    const { reponse, faux, journal } = await executer({
      chemin: `/go/societe/${S_PUBLIEE}?vers=site&from=/societes/demo-sbmi`,
      dependances: {
        slugsPublies: {
          societes: async () => {
            throw new Error("Lecture des sociétés publiées impossible : panne");
          },
          agenda: async () => SLUGS_EVENEMENTS_PUBLIES,
        },
      },
    });
    expect(reponse.status).toBe(302);
    expect(reponse.headers.get("Location")).toBe(
      `https://societe.example.org/accueil?lang=fr&${UTM}#haut`,
    );
    expect(faux.insertions).toHaveLength(1);
    expect(faux.insertions[0].ligne.page_origine).toBeNull();
    expect(journal).toEqual([
      "[passerelle] Page d'origine non vérifiée (societes) : Error : Lecture des sociétés publiées impossible : panne",
    ]);
    expect(journal[0]).not.toContain("demo-sbmi");
  });

  it.each([
    ["HEAD", "HEAD", undefined],
    ["préchargement du routeur", "GET", { rsc: "1", "next-router-prefetch": "1" }],
  ])("requête non comptée (%s) : aucune lecture des slugs", async (_cas, methode, entetes) => {
    const { reponse, slugsSocietes } = await executer({
      chemin: `/go/societe/${S_PUBLIEE}?vers=site&from=/societes/demo-sbmi`,
      methode,
      entetes,
    });
    expect(reponse.status).toBe(302);
    expect(slugsSocietes).not.toHaveBeenCalled();
  });

  it("cible introuvable (404) : aucune lecture des slugs", async () => {
    const { reponse, slugsSocietes } = await executer({
      chemin: `/go/societe/${INCONNU}?vers=site&from=/societes/demo-sbmi`,
    });
    expect(reponse.status).toBe(404);
    expect(slugsSocietes).not.toHaveBeenCalled();
  });
});

// ── Échec de l'enregistrement du clic ────────────────────────────────────────

describe("échec de l'enregistrement du clic → redirection quand même", () => {
  const chemin = `/go/societe/${S_PUBLIEE}?vers=site&from=/societes/sobeped`;
  const location = `https://societe.example.org/accueil?lang=fr&${UTM}#haut`;

  it("erreur renvoyée par Supabase : journalisée sans la ligne en cause", async () => {
    const { reponse, journal } = await executer({
      chemin,
      options: {
        erreurInsertion: {
          code: "23514",
          message: "la ligne viole une contrainte",
          details: "Failing row contains (… /societes/sobeped …)",
        },
      },
    });
    expect(reponse.status).toBe(302);
    expect(reponse.headers.get("Location")).toBe(location);
    attendreEntetesPasserelle(reponse);
    expect(journal).toHaveLength(1);
    expect(journal[0]).toContain("[passerelle] Clic non enregistré (societe) : 23514");
    expect(journal[0]).not.toContain("délai");
    expect(journal[0]).not.toContain("Failing row");
    expect(journal[0]).not.toContain("/societes/sobeped");
    expect(journal[0]).not.toContain("societe.example.org");
  });

  it("insertion qui lève avant le délai (réseau) : clic non enregistré", async () => {
    const { reponse, journal } = await executer({ chemin, options: { leveALInsertion: true } });
    expect(reponse.status).toBe(302);
    expect(reponse.headers.get("Location")).toBe(location);
    expect(journal).toEqual([
      "[passerelle] Clic non enregistré (societe) : Error : connexion interrompue",
    ]);
  });

  // Délai réel de `enregistrerClic` (2 s) : le faux client attend le
  // déclenchement de l'`AbortSignal.timeout` qu'il a reçu.
  it.each(["renvoie", "leve"] as const)(
    "délai d'écriture dépassé (supabase-js %s l'interruption) : enregistrement non confirmé",
    async (insertionSansReponse) => {
      const { reponse, faux, journal } = await executer({
        chemin,
        options: { insertionSansReponse },
      });
      expect(reponse.status).toBe(302);
      expect(reponse.headers.get("Location")).toBe(location);
      attendreEntetesPasserelle(reponse);
      expect(faux.insertions).toEqual([]);
      expect(journal).toEqual([
        `[passerelle] Clic (societe) : délai d'écriture dépassé (${DELAI_MAX_ENREGISTREMENT_MS} ms), enregistrement non confirmé`,
      ]);
      expect(journal[0]).not.toContain("non enregistré");
      expect(journal[0]).not.toContain("/societes/sobeped");
      expect(journal[0]).not.toContain("societe.example.org");
    },
    15_000,
  );

  it("client de service impossible à créer (clé de service absente)", async () => {
    const { reponse, journal } = await executer({
      chemin,
      dependances: {
        clientEcriture: () => {
          throw new Error("Configuration serveur invalide : clé de service manquante");
        },
      },
    });
    expect(reponse.status).toBe(302);
    expect(reponse.headers.get("Location")).toBe(location);
    expect(journal).toEqual([
      "[passerelle] Clic non enregistré (societe) : Error : Configuration serveur invalide : clé de service manquante",
    ]);
  });
});

// ── Lecture impossible → 503 ─────────────────────────────────────────────────

describe("lecture impossible → 503, aucun clic", () => {
  async function attendre503(resultat: Awaited<ReturnType<typeof executer>>) {
    const { reponse, faux, clientEcriture, journal } = resultat;
    expect(reponse.status).toBe(503);
    expect(reponse.headers.get("Location")).toBeNull();
    expect(reponse.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(await reponse.text()).toBe(MESSAGE_INDISPONIBLE);
    attendreEntetesPasserelle(reponse);
    expect(faux.insertions).toEqual([]);
    expect(clientEcriture).not.toHaveBeenCalled();
    expect(journal).toHaveLength(1);
  }

  const chemin = `/go/societe/${S_PUBLIEE}?vers=site`;

  it("erreur renvoyée par Supabase", async () => {
    await attendre503(
      await executer({ chemin, options: { erreurLecture: { code: "08006", message: "panne" } } }),
    );
  });

  it("lecture qui lève", async () => {
    await attendre503(await executer({ chemin, options: { leveALaLecture: true } }));
  });

  it("client de lecture impossible à créer", async () => {
    await attendre503(
      await executer({
        chemin,
        dependances: {
          clientLecture: () => {
            throw new Error("Configuration publique invalide");
          },
        },
      }),
    );
  });
});

// ── Requêtes qui ne sont pas des clics ───────────────────────────────────────

describe("requêtes non comptées", () => {
  const chemin = `/go/societe/${S_PUBLIEE}?vers=site`;

  it("HEAD : même redirection, aucun clic", async () => {
    const { reponse, faux, clientEcriture } = await executer({ chemin, methode: "HEAD" });
    expect(reponse.status).toBe(302);
    attendreEntetesPasserelle(reponse);
    expect(faux.insertions).toEqual([]);
    expect(clientEcriture).not.toHaveBeenCalled();
  });

  it.each([
    [{ rsc: "1" }],
    [{ "next-router-prefetch": "1", rsc: "1" }],
    [{ "sec-purpose": "prefetch" }],
  ])("préchargement %j : même redirection, aucun clic", async (entetes) => {
    const { reponse, faux } = await executer({ chemin, entetes });
    expect(reponse.status).toBe(302);
    expect(faux.insertions).toEqual([]);
  });
});
