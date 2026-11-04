import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CACHE_APERCU,
  CACHE_APERCU_SECOURS,
  ElementApercuEvenement,
  ElementApercuSociete,
  TAILLE_APERCU,
  TYPE_CONTENU_APERCU,
  pngGenerique,
  rendrePng,
} from "@/lib/og/apercus";
import { apercuEvenement, apercuSociete, type EvenementApercu } from "@/lib/og/donnees";
import { FAMILLE_TEXTE, FAMILLE_TITRE, chargerPolicesApercu } from "@/lib/og/polices";
import { repondreApercu } from "@/lib/og/reponse";
import { PLAGES_COUVERTES } from "@/lib/og/texte";

// Rendu réel des images d'aperçu par `ImageResponse` (next/og : satori puis
// resvg), sans serveur. Chaque rendu prend une à quelques secondes (moteur
// WebAssembly chargé au premier appel) : délai large.
const DELAI = 120_000;

const SIGNATURE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Vérifie la signature PNG et lit la largeur et la hauteur (en-tête IHDR). */
function dimensionsPng(png: ArrayBuffer): { width: number; height: number } {
  expect(Array.from(new Uint8Array(png, 0, 8))).toEqual(SIGNATURE_PNG);
  const vue = new DataView(png);
  return { width: vue.getUint32(16), height: vue.getUint32(20) };
}

/** Adresse d'un appel à `fetch`. */
function adresseDe(entree: Parameters<typeof fetch>[0]): string {
  return entree instanceof Request ? entree.url : String(entree);
}

/**
 * Espionne `fetch` : tout appel au réseau échoue (et est compté). Le moteur
 * de next/og n'appelle le réseau que pour un caractère absent de toutes les
 * polices fournies (police Google ou emoji de secours). Seules les adresses
 * `data:` passent : le moteur de mise en page (yoga) charge ainsi son module
 * WebAssembly embarqué, sans réseau, au premier rendu du processus.
 */
function interdireReseau() {
  const fetchReel = globalThis.fetch;
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (entree, options) => {
    const adresse = adresseDe(entree);
    if (adresse.startsWith("data:")) return fetchReel(entree, options);
    throw new Error(`Appel réseau interdit pendant les tests : ${adresse}`);
  });
}

/** Adresses demandées au réseau (`data:` exclues ; vide si aucun appel), lisibles dans un échec. */
function adressesAppelees(reseau: ReturnType<typeof interdireReseau>): string[] {
  return reseau.mock.calls
    .map(([entree]) => adresseDe(entree))
    .filter((adresse) => !adresse.startsWith("data:"));
}

/** Deux images identiques octet pour octet. */
function memesOctets(a: ArrayBuffer, b: ArrayBuffer): boolean {
  return Buffer.from(a).equals(Buffer.from(b));
}

afterEach(() => {
  vi.restoreAllMocks();
});

const evenement: EvenementApercu = {
  type: "congres",
  titre: "[DÉMO] Congrès de pédiatrie de Cotonou",
  dateDebut: "2027-03-12",
  dateFin: "2027-03-14",
  heureDebut: null,
  modalite: "hybride",
  lieuNom: "Palais des congrès",
  ville: "Cotonou",
  organisateurs: [
    { role: "organisateur", id: "o1", slug: "demo-sbp", sigle: "SBP", nomComplet: null },
    { role: "co_organisateur", id: "o2", slug: "demo-sbmi", sigle: "SBMI", nomComplet: null },
  ],
};

/** Tous les caractères couverts par les quatre polices (`PLAGES_COUVERTES`). */
function tousLesCaracteresCouverts(): string {
  let texte = "";
  for (const [debut, fin] of PLAGES_COUVERTES) {
    for (let pointDeCode = debut; pointDeCode <= fin; pointDeCode += 1) {
      texte += String.fromCodePoint(pointDeCode);
    }
  }
  return texte;
}

describe("polices des aperçus", () => {
  it("quatre fichiers .woff locaux : Fraunces 500 et 700, EB Garamond 400 et 500", async () => {
    const polices = await chargerPolicesApercu();
    expect(polices.map(({ name, weight, style }) => ({ name, weight, style }))).toEqual([
      { name: FAMILLE_TITRE, weight: 500, style: "normal" },
      { name: FAMILLE_TITRE, weight: 700, style: "normal" },
      { name: FAMILLE_TEXTE, weight: 400, style: "normal" },
      { name: FAMILLE_TEXTE, weight: 500, style: "normal" },
    ]);
    for (const police of polices) {
      const octets = new Uint8Array(police.data).slice(0, 4);
      expect(String.fromCharCode(...octets)).toBe("wOFF");
    }
    // Lues une seule fois par processus.
    expect(await chargerPolicesApercu()).toBe(polices);
  });
});

describe("rendu des images d'aperçu", () => {
  it(
    "événement : PNG de 1 200 × 630 px, sans appel réseau",
    async () => {
      const reseau = interdireReseau();
      const apercu = apercuEvenement(evenement);
      expect(apercu).not.toBeNull();
      if (!apercu) return;
      const png = await rendrePng(<ElementApercuEvenement apercu={apercu} />);
      expect(dimensionsPng(png)).toEqual(TAILLE_APERCU);
      expect(adressesAppelees(reseau)).toEqual([]);
    },
    DELAI,
  );

  it(
    "événement au titre de 120 caractères et à six organisateurs, d'un seul jour avec heure",
    async () => {
      const reseau = interdireReseau();
      const titre =
        "[DÉMO] Journées scientifiques nationales de la Société béninoise de santé publique et d’épidémiologie appliquée, Parakou";
      expect(titre.length).toBe(120);
      const apercu = apercuEvenement({
        ...evenement,
        titre,
        dateFin: evenement.dateDebut,
        heureDebut: "08:30:00",
        organisateurs: ["SBP", "SBMI", "ABDE", "ABIN", "ABPN", "SBGEO"].map((sigle, index) => ({
          role: "co_organisateur" as const,
          id: `o${index}`,
          slug: `demo-${sigle.toLowerCase()}`,
          sigle,
          nomComplet: null,
        })),
      });
      expect(apercu).not.toBeNull();
      if (!apercu) return;
      const png = await rendrePng(<ElementApercuEvenement apercu={apercu} />);
      expect(dimensionsPng(png)).toEqual(TAILLE_APERCU);
      expect(adressesAppelees(reseau)).toEqual([]);
    },
    DELAI,
  );

  it(
    "organisation : PNG de 1 200 × 630 px, sans appel réseau",
    async () => {
      const reseau = interdireReseau();
      const apercu = apercuSociete({
        sigle: "SBMI",
        nomComplet: "[DÉMO] Société béninoise de médecine interne",
        categorie: "societe_savante",
        disciplines: [{ nom: "Santé" }],
      });
      expect(apercu).not.toBeNull();
      if (!apercu) return;
      const png = await rendrePng(<ElementApercuSociete apercu={apercu} />);
      expect(dimensionsPng(png)).toEqual(TAILLE_APERCU);
      expect(adressesAppelees(reseau)).toEqual([]);
    },
    DELAI,
  );

  it(
    "image générique : dessinée une seule fois, puis resservie",
    async () => {
      const reseau = interdireReseau();
      const premiere = await pngGenerique();
      expect(dimensionsPng(premiere)).toEqual(TAILLE_APERCU);
      expect(await pngGenerique()).toBe(premiere);
      expect(adressesAppelees(reseau)).toEqual([]);
    },
    DELAI,
  );

  it(
    "chaque caractère couvert se dessine dans les quatre polices sans appel réseau",
    async () => {
      const reseau = interdireReseau();
      const texte = tousLesCaracteresCouverts();
      const styles = [
        { fontFamily: FAMILLE_TITRE, fontWeight: 500 },
        { fontFamily: FAMILLE_TITRE, fontWeight: 700 },
        { fontFamily: FAMILLE_TEXTE, fontWeight: 400 },
        { fontFamily: FAMILLE_TEXTE, fontWeight: 500 },
      ] as const;
      const png = await rendrePng(
        <div style={{ display: "flex", flexDirection: "column", width: "100%", fontSize: 16 }}>
          {styles.map((style) => (
            <div key={`${style.fontFamily}-${style.fontWeight}`} style={{ ...style }}>
              {texte}
            </div>
          ))}
        </div>,
      );
      expect(dimensionsPng(png)).toEqual(TAILLE_APERCU);
      expect(adressesAppelees(reseau)).toEqual([]);
    },
    DELAI,
  );

  it(
    "témoin : un caractère absent des polices, non nettoyé, déclenche bien un appel réseau",
    async () => {
      // Sans ce témoin, les tests « sans appel réseau » pourraient passer
      // même si l'espion ne voyait pas les appels du moteur.
      const reseau = interdireReseau();
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      try {
        await rendrePng(<div style={{ display: "flex", fontFamily: FAMILLE_TEXTE }}>漢</div>);
      } catch {
        // Le rendu peut échouer faute de police : seul l'appel compte ici.
      }
      expect(adressesAppelees(reseau).length).toBeGreaterThan(0);
    },
    DELAI,
  );
});

describe("repondreApercu", () => {
  it(
    "fiche publiée : son image, mise en cache 5 minutes",
    async () => {
      const reponse = await repondreApercu(
        async () => evenement,
        (donnees) => {
          const apercu = apercuEvenement(donnees);
          return apercu ? <ElementApercuEvenement apercu={apercu} /> : null;
        },
      );
      expect(reponse.status).toBe(200);
      expect(reponse.headers.get("Content-Type")).toBe(TYPE_CONTENU_APERCU);
      expect(reponse.headers.get("Cache-Control")).toBe(CACHE_APERCU);
      const png = await reponse.arrayBuffer();
      expect(dimensionsPng(png)).toEqual(TAILLE_APERCU);
      expect(memesOctets(png, await pngGenerique())).toBe(false);
    },
    DELAI,
  );

  it(
    "slug inconnu ou non publié (null) : image générique, statut 200",
    async () => {
      const construire = vi.fn();
      const reponse = await repondreApercu(async () => null, construire);
      expect(construire).not.toHaveBeenCalled();
      expect(reponse.status).toBe(200);
      expect(reponse.headers.get("Cache-Control")).toBe(CACHE_APERCU);
      expect(memesOctets(await reponse.arrayBuffer(), await pngGenerique())).toBe(true);
    },
    DELAI,
  );

  it(
    "contenu sans caractère dessinable : image générique",
    async () => {
      const reponse = await repondreApercu(
        async () => ({ ...evenement, titre: "🎉" }),
        (donnees) => {
          const apercu = apercuEvenement(donnees);
          return apercu ? <ElementApercuEvenement apercu={apercu} /> : null;
        },
      );
      expect(reponse.status).toBe(200);
      expect(memesOctets(await reponse.arrayBuffer(), await pngGenerique())).toBe(true);
    },
    DELAI,
  );

  it(
    "lecture impossible : image générique jamais gardée en cache, erreur journalisée, pas de 500",
    async () => {
      const journal = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const reponse = await repondreApercu(
        async () => {
          throw new Error("Base indisponible");
        },
        () => null,
      );
      expect(reponse.status).toBe(200);
      expect(reponse.headers.get("Cache-Control")).toBe(CACHE_APERCU_SECOURS);
      expect(memesOctets(await reponse.arrayBuffer(), await pngGenerique())).toBe(true);
      expect(journal).toHaveBeenCalledTimes(1);
    },
    DELAI,
  );
});

describe("routes opengraph-image", () => {
  // Garde-fou statique : le build se fait sans base de données (règle de
  // rendu, PROGRESS.md, décision 20). Ces routes doivent rester dynamiques
  // et ne jamais déclarer de paramètres à générer au build.
  const routes = [
    "src/app/agenda/[slug]/opengraph-image.tsx",
    "src/app/societes/[slug]/opengraph-image.tsx",
  ];

  it.each(routes)("%s : dynamique, moteur Node.js, texte de remplacement en français", (route) => {
    const source = readFileSync(join(process.cwd(), route), "utf8");
    expect(source).toContain('export const dynamic = "force-dynamic";');
    expect(source).toContain('export const runtime = "nodejs";');
    expect(source).not.toMatch(
      /export\s+(async\s+)?(function|const)\s+(generateImageMetadata|generateStaticParams|revalidate)\b/,
    );
    expect(source).toMatch(/export const alt =\s*"Aperçu de l’/);
  });
});
