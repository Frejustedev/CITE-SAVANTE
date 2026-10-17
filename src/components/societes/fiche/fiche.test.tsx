import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { SocieteFiche } from "@/lib/requetes/societes";
import type { EvenementResume } from "@/lib/utils/evenements";

import { BoutonsPasserelle } from "./BoutonsPasserelle";
import { ContactsFiche } from "./ContactsFiche";
import { EnTeteFiche } from "./EnTeteFiche";
import {
  EvenementsAVenir,
  EvenementsPasses,
  texteDeplierEvenementsPasses,
} from "./EvenementsFiche";
import { FilAriane } from "./FilAriane";
import { LienGestionFiche } from "./LienGestionFiche";
import { PresentationFiche } from "./PresentationFiche";

// `next/link` hors de Next.js : un simple <a> (même principe que
// src/components/cartes.test.tsx) ; `prefetch` reporté dans `data-prefetch`
// pour pouvoir le vérifier.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    prefetch,
    ...reste
  }: {
    href: string;
    children: ReactNode;
    prefetch?: boolean;
  }) => (
    <a href={href} data-prefetch={prefetch === undefined ? undefined : String(prefetch)} {...reste}>
      {children}
    </a>
  ),
}));

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

// Données fictives uniquement (préfixe [DÉMO], domaines example.org).
const societe: SocieteFiche = {
  id: "de110000-0000-0000-0000-000000000001",
  slug: "demo-sbmi",
  sigle: "SBMI",
  nomComplet: "[DÉMO] Société Béninoise de Médecine Interne",
  categorie: "societe_savante",
  ville: "Cotonou",
  logoPath: null,
  miseEnAvant: false,
  disciplines: [
    { id: "d1", slug: "sante", nom: "Santé et médecine" },
    { id: "d2", slug: "sciences-techniques", nom: "Sciences et techniques" },
  ],
  description: "Présentation fictive.",
  anneeCreation: 1998,
  pays: "Bénin",
  siteWeb: "https://www.example.org/sbmi",
  siteCongres: "https://congres.example.org",
  email: "contact@example.org",
  telephone: "01 97 00 00 00",
  reseaux: [
    { reseau: "facebook", url: "https://example.org/facebook-sbmi" },
    { reseau: "whatsapp", url: "https://wa.me/22900000000" },
  ],
};

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
  organisateurs: [{ role: "organisateur", id: "o1", slug: "demo-sbmi", sigle: "SBMI" }],
  prochaineEcheance: null,
};

describe("EnTeteFiche", () => {
  const html = renderToStaticMarkup(<EnTeteFiche societe={societe} />);

  it("un seul h1, qui contient le sigle puis le nom complet", () => {
    expect(compter(html, /<h1[\s>]/g)).toBe(1);
    expect(html).toMatch(
      /<h1[^>]*>[\s\S]*SBMI[\s\S]*\[DÉMO\] Société Béninoise de Médecine Interne[\s\S]*<\/h1>/,
    );
  });

  it("catégorie, disciplines en liens, ville et année de création", () => {
    expect(html).toContain("Société savante");
    expect(html).toContain('href="/disciplines/sante"');
    expect(html).toContain('href="/disciplines/sciences-techniques"');
    expect(html).toContain("Cotonou");
    expect(html).toContain("1998");
  });

  it("sans nom complet ni création ni ville : seulement ce qui existe", () => {
    const minimal = renderToStaticMarkup(
      <EnTeteFiche
        societe={{
          ...societe,
          nomComplet: null,
          anneeCreation: null,
          ville: null,
          disciplines: [],
          siteWeb: null,
          siteCongres: null,
        }}
      />,
    );
    expect(minimal).toMatch(/<h1[^>]*>[\s\S]*SBMI[\s\S]*<\/h1>/);
    expect(minimal).not.toContain("Année de création");
    expect(minimal).not.toContain("Discipline");
    expect(minimal).not.toContain("Ville");
    expect(minimal).not.toContain("/go/");
  });

  it("pays étranger : affiché avec la ville", () => {
    expect(
      renderToStaticMarkup(<EnTeteFiche societe={{ ...societe, pays: "Togo", ville: "Lomé" }} />),
    ).toContain("Lomé, Togo");
  });
});

describe("BoutonsPasserelle", () => {
  it("deux boutons via /go, avec l'origine, sans nouvel onglet imposé", () => {
    const html = renderToStaticMarkup(<BoutonsPasserelle societe={societe} />);
    expect(html).toContain(
      `href="/go/societe/${societe.id}?vers=site&amp;from=/societes/demo-sbmi"`,
    );
    expect(html).toContain(
      `href="/go/societe/${societe.id}?vers=congres&amp;from=/societes/demo-sbmi"`,
    );
    expect(html).not.toContain("target=");
    expect(compter(html, /rel="noopener noreferrer"/g)).toBe(2);
    expect(html).toContain("Site officiel");
    expect(html).toContain("Plateforme de congrès");
    // Destination lisible et caractère externe dit en toutes lettres.
    expect(html).toContain("example.org");
    expect(html).toContain("congres.example.org");
    expect(html).toContain("(site externe)");
    expect(html).toContain("Ces liens mènent vers des sites extérieurs à Cité Savante.");
    // L'adresse de destination elle-même n'est jamais dans un href.
    expect(html).not.toContain('href="https://');
  });

  it("seulement la plateforme de congrès : un seul bouton, principal", () => {
    const html = renderToStaticMarkup(
      <BoutonsPasserelle societe={{ ...societe, siteWeb: null }} />,
    );
    expect(compter(html, /<a /g)).toBe(1);
    expect(html).toContain("vers=congres");
    expect(html).toContain("text-creme"); // variante principale
    expect(html).toContain("Ce lien mène vers un site extérieur à Cité Savante.");
  });

  it("aucune adresse : rien n'est affiché", () => {
    expect(
      renderToStaticMarkup(
        <BoutonsPasserelle societe={{ ...societe, siteWeb: null, siteCongres: null }} />,
      ),
    ).toBe("");
  });
});

describe("ContactsFiche", () => {
  it("e-mail en mailto, téléphone en tel international, réseaux en liens directs", () => {
    const html = renderToStaticMarkup(<ContactsFiche societe={societe} />);
    expect(html).toContain('href="mailto:contact@example.org"');
    expect(html).toContain('href="tel:+2290197000000"');
    expect(html).toContain("01 97 00 00 00");
    expect(html).toContain('href="https://example.org/facebook-sbmi"');
    expect(html).toContain('href="https://wa.me/22900000000"');
    expect(compter(html, /rel="noopener noreferrer nofollow"/g)).toBe(2);
    expect(html).toContain("Facebook");
    expect(html).toContain("WhatsApp");
    expect(html).not.toContain("target=");
  });

  it("coordonnées sans forme sûre : affichées en texte, sans lien", () => {
    const html = renderToStaticMarkup(
      <ContactsFiche
        societe={{
          ...societe,
          email: "contact@example.org?bcc=x@example.org",
          telephone: "97 00 00 00",
          reseaux: [],
        }}
      />,
    );
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("tel:");
    expect(html).toContain("97 00 00 00");
  });

  it("aucune coordonnée : une phrase sobre", () => {
    const html = renderToStaticMarkup(
      <ContactsFiche societe={{ ...societe, email: null, telephone: null, reseaux: [] }} />,
    );
    expect(html).toContain("Aucune coordonnée publique pour le moment.");
    expect(html).not.toContain("<ul");
  });
});

describe("PresentationFiche", () => {
  it("paragraphes et retours à la ligne conservés, HTML saisi affiché en texte", () => {
    const html = renderToStaticMarkup(
      <PresentationFiche description={"Premier <b>gras</b>.\nSuite.\n\nSecond."} />,
    );
    expect(compter(html, /<p>/g)).toBe(2);
    expect(html).toContain("Premier &lt;b&gt;gras&lt;/b&gt;.<br/>Suite.");
    expect(html).not.toContain("<b>");
  });

  it("sans présentation : une phrase sobre", () => {
    expect(renderToStaticMarkup(<PresentationFiche description={null} />)).toContain(
      "Aucune présentation n’est disponible pour le moment.",
    );
  });
});

describe("EvenementsAVenir et EvenementsPasses", () => {
  it("à venir : une carte par événement, dans une liste", () => {
    const html = renderToStaticMarkup(
      <EvenementsAVenir evenements={[evenement]} aujourdhui="2027-01-01" />,
    );
    expect(html).toContain("<ul");
    expect(html).toMatch(/<li[^>]*>[\s\S]*href="\/agenda\/congres-sbmi-2027"/);
    expect(html).toMatch(/<h3[^>]*><a /);
  });

  it("à venir, aucun : phrase et lien vers l'agenda", () => {
    const html = renderToStaticMarkup(<EvenementsAVenir evenements={[]} aujourdhui="2027-01-01" />);
    expect(html).toContain("Aucun événement à venir n’est annoncé pour le moment.");
    expect(html).toContain('href="/agenda"');
  });

  it("passés : liste compacte repliée dans un <details>", () => {
    const html = renderToStaticMarkup(
      <EvenementsPasses evenements={[evenement, { ...evenement, id: "e2", slug: "autre-2026" }]} />,
    );
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("<summary");
    expect(html).toContain("Afficher les 2 événements passés");
    expect(html).toContain("du 12 au 14 mars 2027");
    expect(html).toContain('href="/agenda/autre-2026"');
    expect(html).toContain("Congrès · Cotonou");
  });

  it("passés, aucun : pas de <details>, une phrase sobre", () => {
    const html = renderToStaticMarkup(<EvenementsPasses evenements={[]} />);
    expect(html).not.toContain("<details");
    expect(html).toContain("Aucun événement passé n’est enregistré pour cette organisation.");
  });

  it("texte du bouton selon le nombre et l'état", () => {
    expect(texteDeplierEvenementsPasses(1, false)).toBe("Afficher l’événement passé");
    expect(texteDeplierEvenementsPasses(3, true)).toBe("Masquer les 3 événements passés");
  });
});

describe("FilAriane et LienGestionFiche", () => {
  it("fil d'Ariane : liens puis page courante", () => {
    const html = renderToStaticMarkup(
      <FilAriane
        elements={[
          { nom: "Accueil", chemin: "/" },
          { nom: "Annuaire", chemin: "/societes" },
          { nom: "SBMI", chemin: "/societes/demo-sbmi" },
        ]}
      />,
    );
    expect(html).toContain('aria-label="Fil d’Ariane"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/societes"');
    expect(html).not.toContain('href="/societes/demo-sbmi"');
    expect(html).toContain('<span aria-current="page" class="break-words">SBMI</span>');
  });

  it("lien de gestion vers /espace/reclamer/{slug}", () => {
    const html = renderToStaticMarkup(<LienGestionFiche slug="demo-sbmi" />);
    expect(html).toContain("Vous faites partie du bureau\u00a0?");
    expect(html).toContain('href="/espace/reclamer/demo-sbmi"');
    // Espace réservé aux personnes connectées : rien à précharger.
    expect(html).toContain('data-prefetch="false"');
    expect(html).toContain("Gérer cette fiche");
  });
});
