import { describe, expect, it } from "vitest";

import {
  DUREE_PAR_DEFAUT_MINUTES,
  OCTETS_MAX_PAR_LIGNE,
  TYPE_CONTENU_ICS,
  descriptionAgenda,
  echapperTexteIcs,
  genererIcs,
  instantUtcCompact,
  nomFichierIcs,
  plageEvenement,
  plierLigneIcs,
  type EvenementExportable,
} from "./ics";
import type { EvenementFiche, EvenementResume } from "./evenements";

const URL_FICHE = "https://citesavante.com/agenda/demo-congres-pediatrie-cotonou";
const MAINTENANT = new Date("2026-10-30T08:15:00Z");

function evenement(surcharges: Partial<EvenementExportable> = {}): EvenementExportable {
  return {
    id: "ee110000-0000-0000-0000-000000000001",
    titre: "[DÉMO] Congrès de pédiatrie",
    resume: "Trois jours d'échanges sur la santé de l'enfant.",
    dateDebut: "2027-03-12",
    dateFin: "2027-03-12",
    heureDebut: null,
    modalite: "presentiel",
    lieuNom: "Palais des congrès",
    adresse: null,
    ville: "Cotonou",
    pays: "Bénin",
    ...surcharges,
  };
}

function generer(surcharges: Partial<EvenementExportable> = {}): string {
  return genererIcs(evenement(surcharges), { urlFiche: URL_FICHE, maintenant: MAINTENANT });
}

const encodeur = new TextEncoder();
const decodeurStrict = new TextDecoder("utf-8", { fatal: true });

/** Lignes physiques (après découpe sur CRLF), sans la chaîne vide finale. */
function lignesPhysiques(ics: string): string[] {
  expect(ics.endsWith("\r\n")).toBe(true);
  return ics.slice(0, -2).split("\r\n");
}

/** Dépliage RFC 5545 (CRLF suivi d'une espace ou d'une tabulation) puis découpe. */
function lignesLogiques(ics: string): string[] {
  return ics
    .replace(/\r\n[ \t]/g, "")
    .split("\r\n")
    .filter((ligne) => ligne !== "");
}

/** Lecture inverse d'une valeur TEXT. */
function desechapper(valeur: string): string {
  return valeur.replace(/\\([\\;,nN])/g, (_tout, c: string) => (c === "n" || c === "N" ? "\n" : c));
}

type Propriete = { nom: string; parametres: Record<string, string>; valeur: string };

/** Analyse simple d'un fichier .ics : propriétés « NOM;PARAM=VAL:valeur ». */
function analyser(ics: string): Propriete[] {
  return lignesLogiques(ics).map((ligne) => {
    const deuxPoints = ligne.indexOf(":");
    expect(deuxPoints).toBeGreaterThan(0);
    const [nom, ...parametres] = ligne.slice(0, deuxPoints).split(";");
    return {
      nom,
      parametres: Object.fromEntries(parametres.map((parametre) => parametre.split("="))),
      valeur: ligne.slice(deuxPoints + 1),
    };
  });
}

/** Propriétés du VEVENT, par nom (une seule occurrence attendue). */
function proprietesEvenement(ics: string): Record<string, Propriete> {
  const proprietes = analyser(ics);
  const debut = proprietes.findIndex((p) => p.nom === "BEGIN" && p.valeur === "VEVENT");
  const fin = proprietes.findIndex((p) => p.nom === "END" && p.valeur === "VEVENT");
  expect(debut).toBeGreaterThan(-1);
  expect(fin).toBeGreaterThan(debut);
  const resultat: Record<string, Propriete> = {};
  for (const propriete of proprietes.slice(debut + 1, fin)) {
    expect(resultat[propriete.nom], `propriété ${propriete.nom} en double`).toBeUndefined();
    resultat[propriete.nom] = propriete;
  }
  return resultat;
}

/** Contrôles communs à TOUT fichier généré. */
function verifierForme(ics: string) {
  // CRLF partout : aucun LF seul, aucun CR seul.
  expect(ics).not.toMatch(/[^\r]\n/);
  expect(ics).not.toMatch(/\r[^\n]/);
  expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  for (const ligne of lignesPhysiques(ics)) {
    const octets = encodeur.encode(ligne);
    expect(octets.length, `ligne trop longue : ${ligne}`).toBeLessThanOrEqual(75);
    // Aucun caractère multi-octets coupé : chaque ligne physique se décode seule.
    expect(() => decodeurStrict.decode(octets)).not.toThrow();
  }
}

describe("plageEvenement", () => {
  it("journée entière : fin exclusive = lendemain", () => {
    expect(plageEvenement(evenement())).toEqual({
      journeeEntiere: true,
      debut: "2027-03-12",
      finExclusive: "2027-03-13",
      heureDebut: null,
    });
  });

  it("plusieurs jours avec une heure : journées entières, heure gardée pour la description", () => {
    expect(
      plageEvenement(
        evenement({ dateDebut: "2027-03-12", dateFin: "2027-03-14", heureDebut: "08:30:00" }),
      ),
    ).toEqual({
      journeeEntiere: true,
      debut: "2027-03-12",
      finExclusive: "2027-03-15",
      heureDebut: "08:30:00",
    });
  });

  it(`un jour avec une heure : fin = début + ${DUREE_PAR_DEFAUT_MINUTES} min`, () => {
    expect(plageEvenement(evenement({ heureDebut: "09:00:00" }))).toEqual({
      journeeEntiere: false,
      debut: { date: "2027-03-12", heure: "09:00:00" },
      fin: { date: "2027-03-12", heure: "10:00:00" },
    });
    expect(plageEvenement(evenement({ heureDebut: "14:45" }))).toMatchObject({
      fin: { date: "2027-03-12", heure: "15:45:00" },
    });
  });

  it("heure de fin absente : passage à minuit, au mois et à l'année suivants", () => {
    expect(
      plageEvenement(
        evenement({ dateDebut: "2026-12-31", dateFin: "2026-12-31", heureDebut: "23:30:00" }),
      ),
    ).toEqual({
      journeeEntiere: false,
      debut: { date: "2026-12-31", heure: "23:30:00" },
      fin: { date: "2027-01-01", heure: "00:30:00" },
    });
  });

  it("heure de 24 h ou plus : considérée comme absente, jamais reportée au lendemain", () => {
    expect(
      plageEvenement(
        evenement({ dateDebut: "2028-02-29", dateFin: "2028-02-29", heureDebut: "24:00:00" }),
      ),
    ).toEqual({
      journeeEntiere: true,
      debut: "2028-02-29",
      finExclusive: "2028-03-01",
      heureDebut: null,
    });
    expect(
      plageEvenement(
        evenement({ dateDebut: "2027-03-12", dateFin: "2027-03-14", heureDebut: "24:00:00" }),
      ),
    ).toEqual({
      journeeEntiere: true,
      debut: "2027-03-12",
      finExclusive: "2027-03-15",
      heureDebut: null,
    });
  });

  it("refuse une période inversée, une date ou une heure invalide", () => {
    expect(() => plageEvenement(evenement({ dateFin: "2027-03-11" }))).toThrow(/précède/);
    expect(() => plageEvenement(evenement({ dateDebut: "2027-02-30" }))).toThrow(/Date invalide/);
    expect(() => plageEvenement(evenement({ heureDebut: "9h" }))).toThrow(/Heure invalide/);
  });
});

describe("echapperTexteIcs", () => {
  it("échappe \\, ;, , et les retours à la ligne", () => {
    expect(echapperTexteIcs("a\\b;c,d")).toBe("a\\\\b\\;c\\,d");
    expect(echapperTexteIcs("ligne 1\r\nligne 2\nligne 3\rligne 4")).toBe(
      "ligne 1\\nligne 2\\nligne 3\\nligne 4",
    );
  });

  it("ne touche ni aux deux-points, ni aux guillemets, ni aux accents", () => {
    expect(echapperTexteIcs('Détails : « congrès » "x"')).toBe('Détails : « congrès » "x"');
  });

  it("remplace les caractères de contrôle et la tabulation par une espace", () => {
    expect(echapperTexteIcs("a\u0000b\tc\u0007d\u007Fe")).toBe("a b c d e");
  });

  it("une barre oblique inverse avant n reste littérale (pas un retour à la ligne)", () => {
    const texte = "C:\\nouveau";
    expect(desechapper(echapperTexteIcs(texte))).toBe(texte);
  });
});

describe("plierLigneIcs", () => {
  it("75 octets : aucune coupe ; 76 : une coupe, suite précédée d'une espace", () => {
    const a75 = "A".repeat(75);
    expect(plierLigneIcs(a75)).toBe(a75);
    expect(plierLigneIcs(`${a75}B`)).toBe(`${a75}\r\n B`);
  });

  it("la suite compte son espace : 74 octets de contenu au plus", () => {
    const ligne = "X".repeat(75 + 74 + 1);
    const morceaux = plierLigneIcs(ligne).split("\r\n");
    expect(morceaux.map((m) => m.length)).toEqual([75, 75, 2]);
    expect(morceaux.slice(1).every((m) => m.startsWith(" "))).toBe(true);
  });

  it("ne coupe jamais un caractère multi-octets (accent : 2 octets, emoji : 4)", () => {
    for (let decalage = 0; decalage < 8; decalage += 1) {
      const ligne = `SUMMARY:${"a".repeat(60 + decalage)}éèçà🎓👩🏾‍⚕️ congrès de pédiatrie à Cotonou ${"é".repeat(40)}`;
      const plie = plierLigneIcs(ligne);
      for (const morceau of plie.split("\r\n")) {
        const octets = encodeur.encode(morceau);
        expect(octets.length).toBeLessThanOrEqual(OCTETS_MAX_PAR_LIGNE);
        expect(() => decodeurStrict.decode(octets)).not.toThrow();
      }
      expect(plie.replace(/\r\n /g, "")).toBe(ligne);
    }
  });
});

describe("genererIcs : journées entières", () => {
  it("un jour : DTSTART et DTEND de type DATE, sans VTIMEZONE", () => {
    const ics = generer();
    verifierForme(ics);
    const p = proprietesEvenement(ics);
    expect(p.DTSTART).toEqual({
      nom: "DTSTART",
      parametres: { VALUE: "DATE" },
      valeur: "20270312",
    });
    expect(p.DTEND).toEqual({ nom: "DTEND", parametres: { VALUE: "DATE" }, valeur: "20270313" });
    expect(ics).not.toContain("VTIMEZONE");
    expect(ics).not.toContain("TZID");
  });

  it.each([
    ["plusieurs jours", "2027-03-12", "2027-03-14", "20270312", "20270315"],
    ["à cheval sur deux mois", "2027-03-30", "2027-04-02", "20270330", "20270403"],
    ["fin de février", "2027-02-27", "2027-02-28", "20270227", "20270301"],
    ["29 février (bissextile)", "2028-02-28", "2028-02-29", "20280228", "20280301"],
    ["à cheval sur deux années", "2026-12-30", "2027-01-02", "20261230", "20270103"],
    ["31 décembre seul", "2026-12-31", "2026-12-31", "20261231", "20270101"],
  ])("%s : du %s au %s → DTSTART %s, DTEND %s", (_cas, debut, fin, dtstart, dtend) => {
    const ics = generer({ dateDebut: debut, dateFin: fin });
    verifierForme(ics);
    const p = proprietesEvenement(ics);
    expect(p.DTSTART.valeur).toBe(dtstart);
    expect(p.DTEND.valeur).toBe(dtend);
    expect(p.DTSTART.parametres).toEqual({ VALUE: "DATE" });
  });

  it("plusieurs jours avec une heure : journées entières, heure dans la description", () => {
    const ics = generer({ dateDebut: "2027-03-12", dateFin: "2027-03-14", heureDebut: "08:30:00" });
    verifierForme(ics);
    const p = proprietesEvenement(ics);
    expect(p.DTSTART.parametres).toEqual({ VALUE: "DATE" });
    expect(p.DTEND.valeur).toBe("20270315");
    expect(desechapper(p.DESCRIPTION.valeur)).toContain(
      "Début le 12 mars 2027 à 8\u00a0h\u00a030.",
    );
    expect(ics).not.toContain("VTIMEZONE");
  });
});

describe("genererIcs : heure et fuseau", () => {
  const ics = generer({ heureDebut: "09:00:00" });

  it("DTSTART et DTEND avec TZID=Africa/Porto-Novo, fin = début + 1 h", () => {
    verifierForme(ics);
    const p = proprietesEvenement(ics);
    expect(p.DTSTART).toEqual({
      nom: "DTSTART",
      parametres: { TZID: "Africa/Porto-Novo" },
      valeur: "20270312T090000",
    });
    expect(p.DTEND).toEqual({
      nom: "DTEND",
      parametres: { TZID: "Africa/Porto-Novo" },
      valeur: "20270312T100000",
    });
  });

  it("bloc VTIMEZONE valide (UTC+1, sans heure d'été), avant le VEVENT", () => {
    const lignes = lignesLogiques(ics);
    const debut = lignes.indexOf("BEGIN:VTIMEZONE");
    const fin = lignes.indexOf("END:VTIMEZONE");
    expect(debut).toBeGreaterThan(-1);
    expect(fin).toBeLessThan(lignes.indexOf("BEGIN:VEVENT"));
    expect(lignes.slice(debut, fin + 1)).toEqual([
      "BEGIN:VTIMEZONE",
      "TZID:Africa/Porto-Novo",
      "X-LIC-LOCATION:Africa/Porto-Novo",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0100",
      "TZOFFSETTO:+0100",
      "TZNAME:WAT",
      "DTSTART:19700101T000000",
      "END:STANDARD",
      "END:VTIMEZONE",
    ]);
    expect(ics).not.toContain("DAYLIGHT");
  });

  it("heure de fin absente à 23 h 30 : fin le lendemain à 0 h 30", () => {
    const p = proprietesEvenement(
      generer({ dateDebut: "2026-12-31", dateFin: "2026-12-31", heureDebut: "23:30:00" }),
    );
    expect(p.DTSTART.valeur).toBe("20261231T233000");
    expect(p.DTEND.valeur).toBe("20270101T003000");
  });
});

describe("genererIcs : heure de 24 h ou plus, considérée comme absente", () => {
  it("un seul jour : même fichier que sans heure, ni VTIMEZONE ni TZID", () => {
    const ics = generer({ heureDebut: "24:00:00" });
    expect(ics).toBe(generer({ heureDebut: null }));
    verifierForme(ics);
    expect(ics).not.toContain("VTIMEZONE");
    expect(ics).not.toContain("TZID");
    expect(proprietesEvenement(ics).DTSTART.valeur).toBe("20270312");
    expect(proprietesEvenement(ics).DTEND.valeur).toBe("20270313");
  });

  it("plusieurs jours : même fichier que sans heure, aucune mention « à 24 h »", () => {
    const multi = { dateDebut: "2027-03-12", dateFin: "2027-03-14" };
    const ics = generer({ ...multi, heureDebut: "24:00:00" });
    expect(ics).toBe(generer({ ...multi, heureDebut: null }));
    expect(ics).not.toContain("24 h");
    expect(ics).not.toContain("Début le");
  });

  it("descriptionAgenda : aucune heure", () => {
    expect(
      descriptionAgenda(
        evenement({ dateDebut: "2027-03-12", dateFin: "2027-03-14", heureDebut: "24:00:00" }),
        URL_FICHE,
      ),
    ).toBe(`Trois jours d'échanges sur la santé de l'enfant.\n\nDétails : ${URL_FICHE}`);
  });
});

describe("genererIcs : en-tête, champs et analyse", () => {
  const ics = generer({ dateDebut: "2027-03-12", dateFin: "2027-03-14" });

  it("VCALENDAR complet, dans l'ordre", () => {
    const lignes = lignesLogiques(ics);
    expect(lignes.slice(0, 5)).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Cite Savante//Agenda//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ]);
    expect(lignes.at(-2)).toBe("END:VEVENT");
    expect(lignes.at(-1)).toBe("END:VCALENDAR");
    expect(lignes.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
  });

  it("un analyseur simple retrouve chaque champ", () => {
    const p = proprietesEvenement(ics);
    expect(p.UID.valeur).toBe("ee110000-0000-0000-0000-000000000001@citesavante.com");
    expect(p.DTSTAMP.valeur).toBe("20261030T081500Z");
    expect(desechapper(p.SUMMARY.valeur)).toBe("[DÉMO] Congrès de pédiatrie");
    expect(desechapper(p.LOCATION.valeur)).toBe("Palais des congrès, Cotonou, Bénin");
    expect(desechapper(p.DESCRIPTION.valeur)).toBe(
      `Trois jours d'échanges sur la santé de l'enfant.\n\nDétails\u00a0: ${URL_FICHE}`,
    );
    expect(p.URL.valeur).toBe(URL_FICHE);
    expect(Object.keys(p).sort()).toEqual(
      ["DESCRIPTION", "DTEND", "DTSTAMP", "DTSTART", "LOCATION", "SUMMARY", "UID", "URL"].sort(),
    );
  });

  it("échappements dans SUMMARY, LOCATION et DESCRIPTION ; URL non échappée", () => {
    const urlFiche = "https://citesavante.com/agenda/congres-a-b?x=1,2;3";
    const fichier = genererIcs(
      evenement({
        titre: "Congrès ; santé, \\ enfants\nédition 2027",
        lieuNom: "Salle A; bâtiment B",
        adresse: "12, rue des Écoles",
        resume: "Ligne 1\nLigne 2, suite ; fin \\ ok",
      }),
      { urlFiche, maintenant: MAINTENANT },
    );
    verifierForme(fichier);
    const p = proprietesEvenement(fichier);
    expect(p.SUMMARY.valeur).toBe("Congrès \\; santé\\, \\\\ enfants édition 2027");
    expect(p.LOCATION.valeur).toBe(
      "Salle A\\; bâtiment B\\, 12\\, rue des Écoles\\, Cotonou\\, Bénin",
    );
    expect(desechapper(p.DESCRIPTION.valeur)).toBe(
      `Ligne 1\nLigne 2, suite ; fin \\ ok\n\nDétails\u00a0: ${urlFiche}`,
    );
    expect(p.DESCRIPTION.valeur).toContain("Ligne 1\\nLigne 2\\, suite \\; fin \\\\ ok\\n\\n");
    expect(p.URL.valeur).toBe(urlFiche);
  });

  it("pliage : titre long avec accents et emoji, aucune ligne de plus de 75 octets", () => {
    const titre = `Congrès 🎓 de pédiatrie — « Santé de l'enfant » 👩🏾‍⚕️ ${"édition spéciale ".repeat(8)}`;
    const fichier = generer({ titre, resume: "é".repeat(200) });
    verifierForme(fichier);
    expect(lignesPhysiques(fichier).some((ligne) => ligne.startsWith(" "))).toBe(true);
    const p = proprietesEvenement(fichier);
    expect(desechapper(p.SUMMARY.valeur)).toBe(titre.replace(/\s+/g, " ").trim());
    expect(desechapper(p.DESCRIPTION.valeur).startsWith("é".repeat(200))).toBe(true);
  });

  it("lieu : « En ligne », hybride, et aucun LOCATION sans lieu connu", () => {
    expect(proprietesEvenement(generer({ modalite: "en_ligne" })).LOCATION.valeur).toBe("En ligne");
    expect(
      desechapper(
        proprietesEvenement(generer({ modalite: "hybride", lieuNom: null, pays: null })).LOCATION
          .valeur,
      ),
    ).toBe("Cotonou et en ligne");
    expect(
      proprietesEvenement(generer({ lieuNom: null, ville: null, adresse: null })).LOCATION,
    ).toBeUndefined();
  });

  it("sans résumé : description réduite au lien de la fiche", () => {
    const p = proprietesEvenement(generer({ resume: null }));
    expect(desechapper(p.DESCRIPTION.valeur)).toBe(`Détails\u00a0: ${URL_FICHE}`);
  });

  it("DTSTAMP par défaut : maintenant, en UTC", () => {
    const fichier = genererIcs(evenement(), { urlFiche: URL_FICHE });
    expect(proprietesEvenement(fichier).DTSTAMP.valeur).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it("refuse une adresse de fiche relative ou avec espace", () => {
    expect(() => genererIcs(evenement(), { urlFiche: "/agenda/x" })).toThrow(/Adresse de fiche/);
    expect(() => genererIcs(evenement(), { urlFiche: "https://x.org/a b" })).toThrow(
      /Adresse de fiche/,
    );
    expect(() => genererIcs(evenement(), { urlFiche: "https://x.org/a\r\nX-INJECTION:1" })).toThrow(
      /Adresse de fiche/,
    );
  });
});

describe("utilitaires", () => {
  it("instantUtcCompact", () => {
    expect(instantUtcCompact(new Date("2027-01-05T23:04:09Z"))).toBe("20270105T230409Z");
    expect(() => instantUtcCompact(new Date("x"))).toThrow(/Horodatage invalide/);
  });

  it("descriptionAgenda partage le texte du .ics", () => {
    expect(descriptionAgenda(evenement({ resume: "  " }), URL_FICHE)).toBe(
      `Détails\u00a0: ${URL_FICHE}`,
    );
  });

  it("nom de fichier et type de contenu", () => {
    expect(nomFichierIcs("congres-sobeped-2027")).toBe("congres-sobeped-2027.ics");
    expect(() => nomFichierIcs("../x")).toThrow(/Slug invalide/);
    expect(TYPE_CONTENU_ICS).toBe("text/calendar; charset=utf-8");
  });
});

/**
 * Vérification de type, compilée par `pnpm typecheck` et jamais appelée : la
 * fiche d'un événement (`obtenirEvenementPublie`) se passe telle quelle à
 * `genererIcs`, `lienGoogleAgenda`, `lienWhatsApp` ; une carte
 * (`EvenementResume`) aussi, avec `adresse` et `pays` absents.
 */
export const verificationsDeTypes = {
  fiche: (fiche: EvenementFiche): EvenementExportable => fiche,
  carte: (carte: EvenementResume): EvenementExportable => ({ ...carte, resume: null }),
};
