// Tests de la route `GET /agenda/[slug]/ics` (spécifications, section 10.2) :
// logique de la réponse (`repondreFichierAgenda`), avec un FAUX accès aux
// données (aucun réseau, aucune base), puis le branchement de `route.ts`
// (lecture `obtenirEvenementPublie` simulée : le vrai module commence par
// `import "server-only"`, qui lève hors de Next.js).
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TYPE_CONTENU_ICS } from "@/lib/utils/ics";

import {
  CACHE_CONTROL_ICS,
  MESSAGE_ICS_ERREUR,
  MESSAGE_ICS_INDISPONIBLE,
  MESSAGE_ICS_INTROUVABLE,
  repondreFichierAgenda,
  type DependancesFichierAgenda,
  type EvenementFichierAgenda,
} from "./fichierAgenda";

const { obtenirEvenementPublie } = vi.hoisted(() => ({
  obtenirEvenementPublie: vi.fn<(slug: string) => Promise<EvenementFichierAgenda | null>>(),
}));
vi.mock("@/lib/requetes/evenements", () => ({ obtenirEvenementPublie }));

// Données fictives uniquement (préfixe [DÉMO], domaines example.org).
const evenement: EvenementFichierAgenda = {
  id: "de120000-0000-0000-0000-000000000019",
  slug: "demo-congres-pediatrie-cotonou",
  titre: "[DÉMO] Congrès de pédiatrie, Cotonou 2027",
  resume: "Résumé fictif ; deux lignes,\nla seconde ici.",
  dateDebut: "2027-03-29",
  dateFin: "2027-03-31",
  heureDebut: null,
  modalite: "presentiel",
  lieuNom: "Palais des congrès",
  adresse: null,
  ville: "Cotonou",
  pays: "Bénin",
};

const URL_FICHE = "https://citesavante.example.org/agenda/demo-congres-pediatrie-cotonou";
const MAINTENANT = new Date("2026-10-31T08:15:00Z");

function dependances(
  surcharge: Partial<DependancesFichierAgenda> = {},
): DependancesFichierAgenda & { journal: string[] } {
  const journal: string[] = [];
  return {
    lireEvenement: vi.fn(async (slug: string) => (slug === evenement.slug ? evenement : null)),
    urlFiche: (slug) => `https://citesavante.example.org/agenda/${slug}`,
    maintenant: MAINTENANT,
    journaliser: (message) => journal.push(message),
    journal,
    ...surcharge,
  };
}

describe("repondreFichierAgenda : événement publié", () => {
  it("200, en-têtes du fichier agenda", async () => {
    const reponse = await repondreFichierAgenda(evenement.slug, dependances());
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get("Content-Type")).toBe(TYPE_CONTENU_ICS);
    expect(reponse.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    expect(reponse.headers.get("Content-Disposition")).toBe(
      'attachment; filename="demo-congres-pediatrie-cotonou.ics"',
    );
    expect(reponse.headers.get("Cache-Control")).toBe(CACHE_CONTROL_ICS);
    expect(reponse.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("corps : VCALENDAR complet, UID, journées entières, URL de la fiche, CRLF", async () => {
    const corps = await (await repondreFichierAgenda(evenement.slug, dependances())).text();
    expect(corps.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(corps.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n")).toBe(true);
    // Aucune fin de ligne nue : chaque LF est précédé d'un CR.
    expect(corps.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    const deplie = corps.replace(/\r\n /g, "");
    expect(deplie).toContain(`UID:${evenement.id}@citesavante.com\r\n`);
    expect(deplie).toContain("DTSTAMP:20261031T081500Z\r\n");
    expect(deplie).toContain("DTSTART;VALUE=DATE:20270329\r\n");
    // Fin exclusive : lendemain du dernier jour.
    expect(deplie).toContain("DTEND;VALUE=DATE:20270401\r\n");
    expect(deplie).toContain("SUMMARY:[DÉMO] Congrès de pédiatrie\\, Cotonou 2027\r\n");
    expect(deplie).toContain("LOCATION:Palais des congrès\\, Cotonou\\, Bénin\r\n");
    expect(deplie).toContain(`URL:${URL_FICHE}\r\n`);
    // Espace insécable avant « : », comme partout sur le site.
    expect(deplie).toContain(`\\n\\nDétails : ${URL_FICHE}\r\n`);
  });

  it("lit l'événement une seule fois, avec le slug reçu", async () => {
    const deps = dependances();
    await repondreFichierAgenda(evenement.slug, deps);
    expect(deps.lireEvenement).toHaveBeenCalledTimes(1);
    expect(deps.lireEvenement).toHaveBeenCalledWith(evenement.slug);
    expect(deps.journal).toEqual([]);
  });

  it("événement d'un jour avec une heure : TZID de Porto-Novo et VTIMEZONE", async () => {
    const unJour = { ...evenement, dateFin: evenement.dateDebut, heureDebut: "08:30:00" };
    const corps = await (
      await repondreFichierAgenda(unJour.slug, dependances({ lireEvenement: async () => unJour }))
    ).text();
    expect(corps).toContain("BEGIN:VTIMEZONE\r\nTZID:Africa/Porto-Novo\r\n");
    expect(corps).toContain("DTSTART;TZID=Africa/Porto-Novo:20270329T083000\r\n");
    expect(corps).toContain("DTEND;TZID=Africa/Porto-Novo:20270329T093000\r\n");
  });
});

describe("repondreFichierAgenda : 404", () => {
  it("événement non publié ou absent (lecture → null) : 404 en français, no-store", async () => {
    const deps = dependances({ lireEvenement: vi.fn(async () => null) });
    const reponse = await repondreFichierAgenda("demo-seminaire-sociologie-urbaine", deps);
    expect(reponse.status).toBe(404);
    expect(await reponse.text()).toBe(MESSAGE_ICS_INTROUVABLE);
    expect(reponse.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(reponse.headers.get("Cache-Control")).toBe("no-store");
    expect(reponse.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(reponse.headers.get("Content-Disposition")).toBeNull();
    expect(deps.lireEvenement).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["majuscules", "DEMO-CONGRES-PEDIATRIE-COTONOU"],
    ["chemin", "../secret"],
    ["espace", "demo congres"],
    ["vide", ""],
    ["accent", "congrès-2027"],
    ["tiret final", "demo-"],
    ["trop long", "a".repeat(121)],
  ])("slug invalide (%s) : 404 SANS aucune lecture", async (_cas, slug) => {
    const deps = dependances();
    const reponse = await repondreFichierAgenda(slug, deps);
    expect(reponse.status).toBe(404);
    expect(await reponse.text()).toBe(MESSAGE_ICS_INTROUVABLE);
    expect(reponse.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(deps.lireEvenement).not.toHaveBeenCalled();
  });
});

describe("repondreFichierAgenda : erreurs", () => {
  it("lecture impossible : 503 en français, journalisé, no-store", async () => {
    const deps = dependances({
      lireEvenement: async () => {
        throw new Error("connexion refusée");
      },
    });
    const reponse = await repondreFichierAgenda(evenement.slug, deps);
    expect(reponse.status).toBe(503);
    expect(await reponse.text()).toBe(MESSAGE_ICS_INDISPONIBLE);
    expect(reponse.headers.get("Cache-Control")).toBe("no-store");
    expect(reponse.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(deps.journal).toHaveLength(1);
    expect(deps.journal[0]).toContain("connexion refusée");
  });

  it("donnée invalide (fin avant le début) : 500 en français, journalisé", async () => {
    const invalide = { ...evenement, dateFin: "2027-03-01" };
    const deps = dependances({ lireEvenement: async () => invalide });
    const reponse = await repondreFichierAgenda(invalide.slug, deps);
    expect(reponse.status).toBe(500);
    expect(await reponse.text()).toBe(MESSAGE_ICS_ERREUR);
    expect(reponse.headers.get("Cache-Control")).toBe("no-store");
    expect(deps.journal).toHaveLength(1);
  });

  it("adresse de fiche non absolue : 500 plutôt qu'un fichier faux", async () => {
    const deps = dependances({ urlFiche: (slug) => `/agenda/${slug}` });
    const reponse = await repondreFichierAgenda(evenement.slug, deps);
    expect(reponse.status).toBe(500);
  });
});

describe("route GET /agenda/[slug]/ics", () => {
  beforeEach(() => {
    obtenirEvenementPublie.mockReset();
  });

  it("params en promesse, lecture par obtenirEvenementPublie, fichier de l'événement", async () => {
    obtenirEvenementPublie.mockResolvedValue(evenement);
    const { GET, dynamic } = await import("./route");
    expect(dynamic).toBe("force-dynamic");
    const reponse = await GET(new Request("http://localhost/agenda/x/ics"), {
      params: Promise.resolve({ slug: evenement.slug }),
    });
    expect(obtenirEvenementPublie).toHaveBeenCalledWith(evenement.slug);
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get("Content-Disposition")).toBe(
      'attachment; filename="demo-congres-pediatrie-cotonou.ics"',
    );
    const corps = (await reponse.text()).replace(/\r\n /g, "");
    // Adresse ABSOLUE de la fiche, construite sur `site.url`.
    expect(corps).toMatch(/\r\nURL:https?:\/\/[^/\s]+\/agenda\/demo-congres-pediatrie-cotonou\r\n/);
  });

  it("événement non publié : 404", async () => {
    obtenirEvenementPublie.mockResolvedValue(null);
    const { GET } = await import("./route");
    const reponse = await GET(new Request("http://localhost/agenda/x/ics"), {
      params: Promise.resolve({ slug: "demo-congres-agroforesterie" }),
    });
    expect(reponse.status).toBe(404);
  });

  it("slug invalide : 404 sans appel à la lecture", async () => {
    const { GET } = await import("./route");
    const reponse = await GET(new Request("http://localhost/agenda/x/ics"), {
      params: Promise.resolve({ slug: "Inconnu!" }),
    });
    expect(reponse.status).toBe(404);
    expect(obtenirEvenementPublie).not.toHaveBeenCalled();
  });
});
