import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CarteEvenement } from "@/components/evenements/CarteEvenement";
import { CarteSociete } from "@/components/societes/CarteSociete";
import { Monogramme } from "@/components/societes/Monogramme";
import type { EvenementResume } from "@/lib/utils/evenements";

// `next/link` hors de Next.js : un simple <a>, suffisant pour vérifier la
// structure (un seul lien, sa cible).
vi.mock("next/link", () => ({
  default: ({ href, children, ...reste }: { href: string; children: ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}));

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

describe("Monogramme", () => {
  it("décoratif par défaut, avec le sigle en texte", () => {
    const html = renderToStaticMarkup(<Monogramme sigle="SBMI" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
    expect(html).toContain(">SBMI</tspan>");
    expect(html).toContain('width="64"');
  });

  it("image accessible quand un titre est fourni", () => {
    const html = renderToStaticMarkup(
      <Monogramme sigle="SBMI" titre="Monogramme de la SBMI" taille={96} />,
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Monogramme de la SBMI"');
    expect(html).toContain("<title>Monogramme de la SBMI</title>");
    expect(html).toContain('width="96"');
  });

  it("sigle vide : aucun texte ; sigle très long : compressé", () => {
    expect(renderToStaticMarkup(<Monogramme sigle="" />)).not.toContain("<text");
    expect(renderToStaticMarkup(<Monogramme sigle="ABCDEFGHKLNOPQRSTUVXYZ" />)).toContain(
      'lengthAdjust="spacingAndGlyphs"',
    );
  });

  it("aucune couleur en dur : seulement des classes de jetons", () => {
    const html = renderToStaticMarkup(<Monogramme sigle="SOBEPED" />);
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(|fill="(?!none)/i);
  });
});

describe("CarteSociete", () => {
  const societe = {
    id: "de110000-0000-0000-0000-000000000001",
    slug: "demo-sbmi",
    sigle: "SBMI",
    nomComplet: "[DÉMO] Société Béninoise de Médecine Interne",
    categorie: "societe_savante" as const,
    ville: "Cotonou",
    logoPath: null,
    miseEnAvant: true,
    disciplines: [
      { id: "d1", slug: "sante", nom: "Santé et médecine" },
      { id: "d2", slug: "sciences-techniques", nom: "Sciences et techniques" },
    ],
    nombreEvenementsAVenir: 2,
  };

  it("un seul lien, vers la fiche, dans un titre h3", () => {
    const html = renderToStaticMarkup(<CarteSociete societe={societe} />);
    expect(compter(html, /<a /g)).toBe(1);
    expect(html).toContain('href="/societes/demo-sbmi"');
    expect(html).toMatch(/<h3[^>]*><a /);
    expect(html).toContain("<article");
  });

  it("montre sigle, nom, disciplines, ville, événements à venir et mise en avant", () => {
    const html = renderToStaticMarkup(<CarteSociete societe={societe} />);
    expect(html).toContain("SBMI");
    expect(html).toContain("[DÉMO] Société Béninoise de Médecine Interne");
    expect(html).toContain("Santé et médecine · Sciences et techniques");
    expect(html).toContain("Cotonou");
    expect(html).toContain("2 événements à venir");
    expect(html).toContain("Mise en avant");
  });

  it("variantes : aucun événement, compteur absent, pas de mise en avant, niveau et élément", () => {
    const sansEvenement = renderToStaticMarkup(
      <CarteSociete societe={{ ...societe, nombreEvenementsAVenir: 0, miseEnAvant: false }} />,
    );
    expect(sansEvenement).toContain("Aucun événement à venir");
    expect(sansEvenement).not.toContain("Mise en avant");

    const sansCompteur = { ...societe, nombreEvenementsAVenir: undefined };
    const html = renderToStaticMarkup(
      <CarteSociete societe={sansCompteur} niveauTitre="h2" as="li" />,
    );
    expect(html).not.toContain("à venir");
    expect(html).toMatch(/^<li/);
    expect(html).toMatch(/<h2[^>]*><a /);
  });
});

describe("CarteEvenement", () => {
  const evenement: EvenementResume = {
    id: "e1",
    slug: "congres-sbmi-2027",
    titre: "[DÉMO] Congrès de médecine interne",
    type: "congres",
    dateDebut: "2027-03-12",
    dateFin: "2027-03-14",
    heureDebut: null,
    modalite: "presentiel",
    lieuNom: "Palais des congrès",
    ville: "Cotonou",
    gratuit: false,
    organisateurs: [
      { role: "organisateur", id: "o1", slug: "demo-sbmi", sigle: "SBMI" },
      { role: "co_organisateur", id: "o2", slug: "demo-abpn", sigle: "ABPN" },
      { role: "partenaire", id: "o3", slug: "demo-abin", sigle: "ABIN" },
    ],
    prochaineEcheance: {
      id: "x1",
      type: "soumission_resumes",
      libelle: null,
      dateLimite: "2027-02-01",
    },
    disciplines: [{ id: "d1", slug: "sante", nom: "Santé et médecine" }],
    miseEnAvant: false,
  };

  it("un seul lien, vers la fiche de l'événement", () => {
    const html = renderToStaticMarkup(
      <CarteEvenement evenement={evenement} aujourdhui="2027-01-01" />,
    );
    expect(compter(html, /<a /g)).toBe(1);
    expect(html).toContain('href="/agenda/congres-sbmi-2027"');
    expect(html).toMatch(/<h3[^>]*><a /);
  });

  it("type, période, lieu, organisateurs (partenaires exclus), échéance", () => {
    const html = renderToStaticMarkup(
      <CarteEvenement evenement={evenement} aujourdhui="2027-01-01" />,
    );
    expect(html).toContain("Congrès");
    expect(html).toContain("du 12 au 14 mars 2027");
    expect(html).toContain("Palais des congrès, Cotonou");
    expect(html).toContain("Organisé par SBMI et ABPN");
    expect(html).not.toContain("ABIN");
    // Espace insécable avant « : », comme partout sur le site.
    expect(html).toContain("Soumission des résumés : 1er février 2027");
    expect(html).not.toContain("Clôture");
  });

  it("badge d'urgence à 7 jours ou moins", () => {
    expect(
      renderToStaticMarkup(<CarteEvenement evenement={evenement} aujourdhui="2027-01-29" />),
    ).toContain("Clôture dans 3 jours");
    expect(
      renderToStaticMarkup(<CarteEvenement evenement={evenement} aujourdhui="2027-02-01" />),
    ).toContain("Clôture aujourd’hui");
    expect(
      renderToStaticMarkup(<CarteEvenement evenement={evenement} aujourdhui="2027-01-24" />),
    ).not.toContain("Clôture");
  });

  it("badge d'urgence or : texte encre sur fond or (section 7 : « badge or »)", () => {
    const html = renderToStaticMarkup(
      <CarteEvenement evenement={evenement} aujourdhui="2027-01-29" />,
    );
    const badge = /<span class="([^"]*)">Clôture dans 3 jours<\/span>/.exec(html);
    expect(badge?.[1].split(" ")).toEqual(expect.arrayContaining(["bg-or", "text-encre"]));
    expect(badge?.[1]).not.toMatch(/\bbg-bordeaux\b|\btext-creme\b/);
  });

  it("« En ligne » pour un événement en ligne ; « … et en ligne » pour un hybride", () => {
    expect(
      renderToStaticMarkup(
        <CarteEvenement
          evenement={{ ...evenement, modalite: "en_ligne" }}
          aujourdhui="2027-01-01"
        />,
      ),
    ).toContain("En ligne");
    expect(
      renderToStaticMarkup(
        <CarteEvenement
          evenement={{ ...evenement, modalite: "hybride", lieuNom: null }}
          aujourdhui="2027-01-01"
        />,
      ),
    ).toContain("Cotonou et en ligne");
  });
});

describe("CarteEvenement : phase 3", () => {
  const base: EvenementResume = {
    id: "e2",
    slug: "demo-congres-pediatrie-cotonou",
    titre: "[DÉMO] Congrès de pédiatrie",
    type: "congres",
    dateDebut: "2027-03-29",
    dateFin: "2027-03-31",
    heureDebut: null,
    modalite: "presentiel",
    lieuNom: null,
    ville: "Cotonou",
    gratuit: false,
    organisateurs: [{ role: "organisateur", id: "o1", slug: "demo-sobeped", sigle: "SOBEPED" }],
    prochaineEcheance: {
      id: "x2",
      type: "inscription_tarif_preferentiel",
      libelle: "  Inscription anticipée ",
      dateLimite: "2027-03-01",
    },
    disciplines: [{ id: "d1", slug: "sante", nom: "Santé et médecine" }],
    miseEnAvant: true,
  };

  it("mention « Mis en avant » (texte, pas un lien) et badge de type", () => {
    const html = renderToStaticMarkup(<CarteEvenement evenement={base} aujourdhui="2027-02-01" />);
    expect(html).toContain("Mis en avant");
    expect(compter(html, /<a /g)).toBe(1);
    expect(html).toMatch(/<span class="[^"]*bg-or-clair[^"]*text-bordeaux[^"]*">Congrès<\/span>/);
  });

  it("sans mise en avant : aucune mention", () => {
    const html = renderToStaticMarkup(
      <CarteEvenement evenement={{ ...base, miseEnAvant: false }} aujourdhui="2027-02-01" />,
    );
    expect(html).not.toContain("Mis en avant");
  });

  it("prochaine échéance : libellé libre nettoyé, badge urgent à 7 jours", () => {
    const html = renderToStaticMarkup(<CarteEvenement evenement={base} aujourdhui="2027-02-25" />);
    expect(html).toContain("Inscription anticipée : 1er mars 2027");
    expect(html).toContain("Clôture dans 4 jours");
  });

  it("lieu « Lieu à préciser » sans lieu ni ville", () => {
    const html = renderToStaticMarkup(
      <CarteEvenement evenement={{ ...base, ville: null }} aujourdhui="2027-02-01" />,
    );
    expect(html).toContain("Lieu à préciser");
  });
});
