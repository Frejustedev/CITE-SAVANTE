import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { EvenementFiche, EvenementResume } from "@/lib/utils/evenements";

import { ActionsEvenement } from "./ActionsEvenement";
import { AfficheEvenement } from "./AfficheEvenement";
import { BandeauEvenementPasse } from "./BandeauEvenementPasse";
import { DatesCles } from "./DatesCles";
import { EnTeteEvenement } from "./EnTeteEvenement";
import { InformationsEvenement } from "./InformationsEvenement";
import { MenuAjoutAgenda } from "./MenuAjoutAgenda";
import { Participation } from "./Participation";
import {
  SuggestionsEvenement,
  texteLienSuggestions,
  titreSuggestions,
} from "./SuggestionsEvenement";

// `next/link` hors de Next.js : un simple <a> ; `prefetch` reporté dans
// `data-prefetch` (même principe que src/components/societes/fiche/fiche.test.tsx).
// Un lien rendu par ce faux composant porte `data-lien-next` : sert à prouver
// que les liens sortants et le .ics sont des <a> NATIFS.
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
    <a
      href={href}
      data-lien-next=""
      data-prefetch={prefetch === undefined ? undefined : String(prefetch)}
      {...reste}
    >
      {children}
    </a>
  ),
}));

// `next/image` hors de Next.js : un simple <img> avec les mêmes attributs utiles.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    sizes,
    className,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    sizes?: string;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} sizes={sizes} className={className} />
  ),
}));

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

/** Balise ouvrante `<a …>` dont l'attribut `href` vaut exactement `href` (après échappement HTML). */
function baliseLien(html: string, href: string): string {
  const echappe = href.replace(/&/g, "&amp;");
  const balise = html.match(
    new RegExp(`<a [^>]*href="${echappe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`),
  );
  if (!balise) throw new Error(`Lien introuvable : ${href}`);
  return balise[0];
}

// Données fictives uniquement (préfixe [DÉMO], domaines example.org).
const URL_FICHE = "https://citesavante.example.org/agenda/demo-congres-pediatrie";

const evenement: EvenementFiche = {
  id: "de120000-0000-0000-0000-000000000019",
  slug: "demo-congres-pediatrie",
  titre: "[DÉMO] Congrès de pédiatrie",
  type: "congres",
  resume: "Résumé fictif.",
  description: "Description fictive.",
  dateDebut: "2027-03-29",
  dateFin: "2027-03-31",
  heureDebut: "08:30:00",
  modalite: "presentiel",
  lieuNom: "Palais des congrès",
  adresse: "Boulevard fictif",
  ville: "Cotonou",
  pays: "Bénin",
  lienInscription: "https://inscription.example.org/pediatrie",
  siteWeb: "https://www.congres.example.org/2027",
  affichePath: null,
  tarifs: "Membres : 10 000 FCFA",
  gratuit: false,
  creditsFmc: "12 crédits",
  contactEmail: "contact@example.org",
  organisateurs: [
    {
      role: "organisateur",
      id: "o1",
      slug: "demo-sobeped",
      sigle: "SOBEPED",
      nomComplet: "[DÉMO] Société de pédiatrie",
    },
    { role: "co_organisateur", id: "o2", slug: "demo-abc", sigle: "ABC", nomComplet: null },
    { role: "partenaire", id: "o3", slug: "demo-xyz", sigle: "XYZ", nomComplet: null },
  ],
  disciplines: [{ id: "d1", slug: "sante", nom: "Santé et médecine" }],
  echeances: [
    { id: "e1", type: "soumission_resumes", libelle: null, dateLimite: "2026-10-15" },
    { id: "e2", type: "inscription_tarif_preferentiel", libelle: null, dateLimite: "2026-11-03" },
    {
      id: "e3",
      type: "inscription",
      libelle: "Clôture des inscriptions",
      dateLimite: "2027-03-01",
    },
  ],
};

const AUJOURDHUI = "2026-10-31";

describe("EnTeteEvenement", () => {
  const html = renderToStaticMarkup(<EnTeteEvenement evenement={evenement} />);

  it("un seul h1 (le titre), le badge de type et le résumé", () => {
    expect(compter(html, /<h1[\s>]/g)).toBe(1);
    expect(html).toMatch(/<h1[^>]*>\[DÉMO\] Congrès de pédiatrie<\/h1>/);
    expect(html).toContain("Congrès");
    expect(html).toContain("Résumé fictif.");
  });

  it("sans résumé : pas de paragraphe vide", () => {
    const sans = renderToStaticMarkup(
      <EnTeteEvenement evenement={{ ...evenement, resume: null }} />,
    );
    expect(sans).not.toContain("<p");
  });
});

describe("InformationsEvenement", () => {
  const html = renderToStaticMarkup(<InformationsEvenement evenement={evenement} />);

  it("dates, heure (espaces insécables), modalité", () => {
    expect(html).toContain("Du 29 au 31 mars 2027");
    expect(html).toContain("8 h 30");
    expect(html).toContain("le premier jour");
    expect(html).toContain("En présentiel");
  });

  it("heure de 24 h ou plus : considérée comme absente, aucune ligne « Heure de début »", () => {
    for (const dateFin of [evenement.dateFin, evenement.dateDebut]) {
      const sansHeure = renderToStaticMarkup(
        <InformationsEvenement evenement={{ ...evenement, dateFin, heureDebut: "24:00:00" }} />,
      );
      expect(sansHeure).not.toContain("Heure de début");
      expect(sansHeure).not.toContain("24 h");
      expect(sansHeure).not.toContain("premier jour");
      expect(sansHeure).toBe(
        renderToStaticMarkup(
          <InformationsEvenement evenement={{ ...evenement, dateFin, heureDebut: null }} />,
        ),
      );
    }
  });

  it("rôle d'une organisation : séparé du nom pour les lecteurs d'écran, sans changement visuel", () => {
    const texteLu = (fragment: string) => fragment.replace(/<[^>]+>/g, "");
    const roleDe = (nomComplet: string | null) => {
      const rendu = renderToStaticMarkup(
        <InformationsEvenement
          evenement={{
            ...evenement,
            organisateurs: [
              { role: "co_organisateur", id: "o", slug: "demo-abp", sigle: "ABP", nomComplet },
            ],
          }}
        />,
      );
      return rendu.match(/<li class="min-w-0">.*?<\/li>/)?.[0] ?? "";
    };
    // Le texte lu ne colle plus les mots, avec ou sans nom complet.
    expect(texteLu(roleDe("[DÉMO] Association de pneumologie"))).toBe(
      "ABP, [DÉMO] Association de pneumologie, Co-organisateur",
    );
    expect(texteLu(roleDe(null))).toBe("ABP, Co-organisateur");
    // Le séparateur est masqué : le texte visible et le libellé restent les mêmes.
    const avecRole = roleDe(null);
    expect(avecRole).toContain('<span class="sr-only">, </span>Co-organisateur</span>');
    expect(avecRole.replace('<span class="sr-only">, </span>', "")).toContain(
      'whitespace-nowrap text-bordeaux">Co-organisateur</span>',
    );
  });

  it("lieu et adresse, sans le pays quand c'est le Bénin", () => {
    expect(html).toContain("Palais des congrès");
    expect(html).toContain("Boulevard fictif");
    expect(html).toContain("Cotonou");
    expect(html).not.toContain("Bénin");
  });

  it("« Voir sur la carte » : OpenStreetMap, nouvel onglet, nofollow, mention site externe", () => {
    const lien = baliseLien(
      html,
      "https://www.openstreetmap.org/search?query=Palais%20des%20congr%C3%A8s%2C%20Boulevard%20fictif%2C%20Cotonou%2C%20B%C3%A9nin",
    );
    expect(lien).toContain('target="_blank"');
    expect(lien).toContain('rel="noopener noreferrer nofollow"');
    expect(lien).not.toContain("data-lien-next");
    expect(html).toContain("Voir sur la carte");
    expect(html).toContain("(site externe, nouvel onglet)");
  });

  it("organisateurs, co-organisateur signalé, partenaires à part, disciplines : liens internes", () => {
    expect(html).toContain('href="/societes/demo-sobeped"');
    expect(html).toContain("[DÉMO] Société de pédiatrie");
    expect(html).toContain('href="/societes/demo-abc"');
    expect(html).toContain("Co-organisateur");
    expect(html).toContain(">Partenaire<");
    expect(html).toContain('href="/societes/demo-xyz"');
    expect(html).toContain('href="/disciplines/sante"');
  });

  it("en ligne : ni lieu ni carte ; un seul jour : pas de « premier jour »", () => {
    const enLigne = renderToStaticMarkup(
      <InformationsEvenement
        evenement={{ ...evenement, modalite: "en_ligne", dateFin: evenement.dateDebut }}
      />,
    );
    expect(enLigne).toContain("En ligne");
    expect(enLigne).not.toContain("openstreetmap");
    expect(enLigne).not.toContain(">Lieu<");
    expect(enLigne).not.toContain("premier jour");
    expect(enLigne).toContain(">Date<");
  });

  it("présentiel sans lieu connu : « Lieu à préciser », pas de carte ; pays étranger affiché", () => {
    const inconnu = renderToStaticMarkup(
      <InformationsEvenement
        evenement={{ ...evenement, lieuNom: null, adresse: null, ville: null, heureDebut: null }}
      />,
    );
    expect(inconnu).toContain("Lieu à préciser");
    expect(inconnu).not.toContain("openstreetmap");
    expect(inconnu).not.toContain("Heure de début");
    const etranger = renderToStaticMarkup(
      <InformationsEvenement evenement={{ ...evenement, ville: "Lomé", pays: "Togo" }} />,
    );
    expect(etranger).toContain("Lomé, Togo");
  });
});

describe("ActionsEvenement", () => {
  const html = renderToStaticMarkup(
    <ActionsEvenement evenement={evenement} urlFiche={URL_FICHE} passe={false} />,
  );

  it("« S'inscrire » et « Site de l'événement » par la passerelle, en <a> natifs, même onglet", () => {
    const inscription = baliseLien(
      html,
      `/go/evenement/${evenement.id}?vers=inscription&from=/agenda/demo-congres-pediatrie`,
    );
    const site = baliseLien(
      html,
      `/go/evenement/${evenement.id}?vers=site&from=/agenda/demo-congres-pediatrie`,
    );
    for (const lien of [inscription, site]) {
      expect(lien).toContain('rel="noopener noreferrer"');
      expect(lien).not.toContain("target=");
      expect(lien).not.toContain("data-lien-next");
    }
    expect(html).toContain("S’inscrire");
    expect(html).toContain("Site de l’événement");
    expect(html).toContain("inscription.example.org");
    expect(html).toContain("congres.example.org");
    expect(html).toContain("Ces liens mènent vers des sites extérieurs à Cité Savante.");
    // Jamais de lien direct vers les sites saisis.
    expect(html).not.toContain('href="https://inscription.example.org');
    expect(html).not.toContain('href="https://www.congres.example.org');
  });

  it("seulement les boutons dont l'adresse existe", () => {
    const sansSite = renderToStaticMarkup(
      <ActionsEvenement
        evenement={{ ...evenement, siteWeb: null }}
        urlFiche={URL_FICHE}
        passe={false}
      />,
    );
    expect(sansSite).toContain("vers=inscription");
    expect(sansSite).not.toContain("vers=site");
    expect(sansSite).toContain("Ce lien mène vers un site extérieur à Cité Savante.");
    const aucun = renderToStaticMarkup(
      <ActionsEvenement
        evenement={{ ...evenement, siteWeb: null, lienInscription: null }}
        urlFiche={URL_FICHE}
        passe={false}
      />,
    );
    expect(aucun).not.toContain("/go/");
    expect(aucun).not.toContain("sites extérieurs");
  });

  it("WhatsApp : wa.me, nouvel onglet, nofollow, mention visible", () => {
    const lien = html.match(/<a [^>]*href="https:\/\/wa\.me\/\?text=[^"]+"[^>]*>/)?.[0] ?? "";
    expect(lien).toContain('target="_blank"');
    expect(lien).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain("Partager sur WhatsApp");
    expect(html).toContain("Site externe, nouvel onglet");
  });

  it("menu « Ajouter à mon agenda » présent pour un événement à venir", () => {
    expect(html).toContain("<details");
    expect(html).toContain("Ajouter à mon agenda");
  });

  it("événement passé : ni « S'inscrire » ni menu, mais le site et le partage restent", () => {
    const passe = renderToStaticMarkup(
      <ActionsEvenement evenement={evenement} urlFiche={URL_FICHE} passe />,
    );
    expect(passe).not.toContain("vers=inscription");
    expect(passe).not.toContain("S’inscrire");
    expect(passe).not.toContain("<details");
    expect(passe).toContain("vers=site");
    expect(passe).toContain("wa.me");
  });
});

describe("MenuAjoutAgenda", () => {
  const html = renderToStaticMarkup(
    <MenuAjoutAgenda slug={evenement.slug} evenement={evenement} urlFiche={URL_FICHE} />,
  );

  it("<details>/<summary> natifs (sans JavaScript)", () => {
    expect(html).toMatch(/^<details[^>]*><summary[^>]*>/);
    expect(html).toContain("Ajouter à mon agenda");
  });

  it("« Fichier .ics » : route du site, <a> natif, nofollow, pas d'attribut download", () => {
    const lien = baliseLien(html, "/agenda/demo-congres-pediatrie/ics");
    expect(lien).toContain('rel="nofollow"');
    expect(lien).not.toContain("download");
    expect(lien).not.toContain("data-lien-next");
    expect(html).toContain("Fichier .ics");
  });

  it("« Google Agenda » : lien direct vers calendar.google.com, nouvel onglet, nofollow", () => {
    const lien =
      html.match(
        /<a [^>]*href="https:\/\/calendar\.google\.com\/calendar\/render\?[^"]+"[^>]*>/,
      )?.[0] ?? "";
    expect(lien).toContain("action=TEMPLATE");
    expect(lien).toContain('target="_blank"');
    expect(lien).toContain('rel="noopener noreferrer nofollow"');
    expect(lien).not.toContain("/go/");
    expect(html).toContain("Google Agenda");
  });
});

describe("DatesCles", () => {
  const html = renderToStaticMarkup(
    <DatesCles echeances={evenement.echeances} aujourdhui={AUJOURDHUI} />,
  );

  it("toutes les échéances, dans l'ordre reçu, avec <time>", () => {
    const ordre = [...html.matchAll(/<time dateTime="([^"]+)"/g)].map((resultat) => resultat[1]);
    expect(ordre).toEqual(["2026-10-15", "2026-11-03", "2027-03-01"]);
    expect(html).toContain("Soumission des résumés");
    expect(html).toContain("Inscription à tarif préférentiel");
    expect(html).toContain("Clôture des inscriptions");
  });

  it("passée : barrée ET signalée par écrit", () => {
    const ligne = html.match(/<li data-etat="passee"[\s\S]*?<\/li>/)?.[0] ?? "";
    expect(ligne).toMatch(
      /<s(?:\s[^>]*)?>[\s\S]*15 octobre 2026[\s\S]*Soumission des résumés[\s\S]*<\/s>/,
    );
    expect(ligne).toContain("Date passée");
  });

  it("urgente (7 jours ou moins) : badge or « Clôture dans 3 jours »", () => {
    const ligne = html.match(/<li data-etat="urgente"[\s\S]*?<\/li>/)?.[0] ?? "";
    expect(ligne).toContain("bg-or ");
    expect(ligne).toContain("Clôture dans 3 jours");
    expect(ligne).not.toMatch(/<s[\s>]/);
  });

  it("plus lointaine : jours restants en texte simple", () => {
    const ligne = html.match(/<li data-etat="a_venir"[\s\S]*?<\/li>/)?.[0] ?? "";
    expect(ligne).toContain("Clôture dans 121 jours");
    expect(ligne).not.toContain("bg-or ");
  });

  it("le jour même : urgente, « Clôture aujourd’hui »", () => {
    const jour = renderToStaticMarkup(
      <DatesCles
        echeances={[{ id: "e", type: "bourse", libelle: null, dateLimite: AUJOURDHUI }]}
        aujourdhui={AUJOURDHUI}
      />,
    );
    expect(jour).toContain('data-etat="urgente"');
    expect(jour).toContain("Clôture aujourd’hui");
  });

  it("sans échéance : une phrase", () => {
    const vide = renderToStaticMarkup(<DatesCles echeances={[]} aujourdhui={AUJOURDHUI} />);
    expect(vide).toContain("Aucune date clé n’est annoncée pour cet événement.");
    expect(vide).toContain("Dates clés");
  });
});

describe("Participation", () => {
  it("tarifs, crédits FMC et contact en mailto", () => {
    const html = renderToStaticMarkup(<Participation evenement={evenement} />);
    expect(html).toContain("Membres : 10 000 FCFA");
    expect(html).toContain("12 crédits");
    expect(html).toContain('href="mailto:contact@example.org"');
    expect(html).not.toContain("Participation gratuite");
  });

  it("gratuit : mention écrite", () => {
    const html = renderToStaticMarkup(
      <Participation evenement={{ ...evenement, gratuit: true, tarifs: null }} />,
    );
    expect(html).toContain("Participation gratuite");
  });

  it("adresse de forme douteuse : affichée sans lien", () => {
    const html = renderToStaticMarkup(
      <Participation evenement={{ ...evenement, contactEmail: "contact@exemple?cc=x" }} />,
    );
    expect(html).toContain("contact@exemple?cc=x");
    expect(html).not.toContain("mailto:");
  });

  it("aucune information : une phrase, sans « payant »", () => {
    const html = renderToStaticMarkup(
      <Participation
        evenement={{ tarifs: null, gratuit: false, creditsFmc: null, contactEmail: null }}
      />,
    );
    expect(html).toContain("Les conditions de participation ne sont pas encore précisées.");
    expect(html).not.toMatch(/payant/i);
  });
});

describe("AfficheEvenement", () => {
  it("sans affiche : rien", () => {
    expect(renderToStaticMarkup(<AfficheEvenement url={null} titre="x" />)).toBe("");
  });

  it("avec affiche : image aux dimensions explicites et texte alternatif", () => {
    const html = renderToStaticMarkup(
      <AfficheEvenement url="https://stockage.example.org/a.webp" titre="[DÉMO] Congrès" />,
    );
    expect(html).toContain('src="https://stockage.example.org/a.webp"');
    expect(html).toContain('width="800"');
    expect(html).toContain('height="1131"');
    expect(html).toContain("Affiche de l’événement « [DÉMO] Congrès »");
  });
});

describe("BandeauEvenementPasse", () => {
  it("un jour : « Cet événement a eu lieu le 1er août 2026. »", () => {
    const html = renderToStaticMarkup(
      <BandeauEvenementPasse dateDebut="2026-08-01" dateFin="2026-08-01" />,
    );
    expect(html.replace(/<[^>]+>/g, "")).toBe("Cet événement a eu lieu le 1er août 2026.");
  });

  it("plusieurs jours, avec le lien vers les suggestions", () => {
    const html = renderToStaticMarkup(
      <BandeauEvenementPasse
        dateDebut="2026-04-13"
        dateFin="2026-04-15"
        lienSuggestions={{ ancre: "suggestions", texte: texteLienSuggestions(1) }}
      />,
    );
    expect(html).toContain("du 13 au 15 avril 2026");
    expect(html).toContain('href="#suggestions"');
    expect(html).toContain("Voir les prochains événements de la même discipline");
  });
});

describe("SuggestionsEvenement", () => {
  const suggestion: EvenementResume = {
    id: "s1",
    slug: "demo-journees-pneumologie",
    titre: "[DÉMO] Journées de pneumologie",
    type: "journees",
    dateDebut: "2026-11-19",
    dateFin: "2026-11-20",
    heureDebut: null,
    modalite: "presentiel",
    lieuNom: null,
    ville: "Porto-Novo",
    gratuit: false,
    organisateurs: [],
    prochaineEcheance: null,
    disciplines: [{ id: "d1", slug: "sante", nom: "Santé et médecine" }],
    miseEnAvant: false,
  };

  it("titres selon le nombre de disciplines", () => {
    expect(titreSuggestions(1)).toBe("Prochains événements de la même discipline");
    expect(titreSuggestions(2)).toBe("Prochains événements dans les mêmes disciplines");
    expect(texteLienSuggestions(2)).toBe(
      "Voir les prochains événements dans les mêmes disciplines",
    );
  });

  it("cartes (h3 sous le h2 de la section), ancre de la section", () => {
    const html = renderToStaticMarkup(
      <SuggestionsEvenement
        evenements={[suggestion]}
        nombreDisciplines={1}
        aujourdhui={AUJOURDHUI}
      />,
    );
    expect(html).toContain('id="suggestions"');
    expect(html).toMatch(/<h2[^>]*>Prochains événements de la même discipline<\/h2>/);
    expect(compter(html, /<h3[\s>]/g)).toBe(1);
    expect(html).toContain('href="/agenda/demo-journees-pneumologie"');
  });

  it("aucune suggestion : phrase et lien vers l'agenda", () => {
    const html = renderToStaticMarkup(
      <SuggestionsEvenement evenements={[]} nombreDisciplines={1} aujourdhui={AUJOURDHUI} />,
    );
    expect(html).toContain("Aucun événement à venir n’est annoncé dans cette discipline");
    expect(html).toContain('href="/agenda"');
    const sansDiscipline = renderToStaticMarkup(
      <SuggestionsEvenement evenements={[]} nombreDisciplines={0} aujourdhui={AUJOURDHUI} />,
    );
    expect(sansDiscipline).toMatch(/<h2[^>]*>Prochains événements<\/h2>/);
  });
});
