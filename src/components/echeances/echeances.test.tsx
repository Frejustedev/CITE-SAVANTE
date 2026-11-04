import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EtatVideEcheances } from "@/components/echeances/EtatVideEcheances";
import {
  MENTION_URGENTE,
  QUESTION_ECHEANCE_MANQUANTE,
  decrireFiltresEcheances,
  precisionGroupe,
  resumeEcheances,
  texteIntroductionEcheances,
  texteJoursRestants,
  texteNombreEcheances,
} from "@/components/echeances/libelles";
import { LigneEcheance, ListeEcheances } from "@/components/echeances/ListeEcheances";
import {
  TITRE_ECHEANCES,
  aDesFiltresEcheances,
  metadonneesEcheances,
} from "@/components/echeances/metadonnees";
import { PanneauFiltresEcheances } from "@/components/echeances/PanneauFiltresEcheances";
import type { FiltresEcheances } from "@/lib/utils/agenda";
import { grouperEcheancesParSemaine } from "@/lib/utils/calendrier";
import { estUrgente, joursRestants } from "@/lib/utils/dates";
import type { EcheanceAVenir } from "@/lib/utils/evenements";

// `next/link` hors de Next.js : un simple <a> (même principe que
// `src/components/cartes.test.tsx`).
vi.mock("next/link", () => ({
  default: ({ href, children, ...reste }: { href: string; children: ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}));

// Le formulaire enrichi appelle `useRouter()` : hors de Next.js, un routeur
// factice suffit (les effets ne s'exécutent pas au rendu serveur).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const NB = String.fromCodePoint(0x00a0); // espace insécable
const FINE = String.fromCodePoint(0x202f); // espace fine insécable (milliers)

/** Samedi 31 octobre 2026 : la semaine va du lundi 26 octobre au dimanche 1er novembre. */
const AUJOURDHUI = "2026-10-31";

const sansFiltre: FiltresEcheances = { type: null, discipline: null };

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

/** Échéance de démonstration, jours restants et urgence calculés comme la lecture. */
function echeance(
  id: string,
  dateLimite: string,
  autres: Partial<Omit<EcheanceAVenir, "id" | "dateLimite">> = {},
): EcheanceAVenir {
  return {
    id,
    type: "soumission_resumes",
    libelle: null,
    dateLimite,
    joursRestants: joursRestants(dateLimite, AUJOURDHUI),
    urgente: estUrgente(dateLimite, AUJOURDHUI),
    evenement: {
      id: `ev-${id}`,
      slug: `demo-evenement-${id}`,
      titre: `[DÉMO] Congrès ${id}`,
      type: "congres",
      dateDebut: "2027-03-29",
      dateFin: "2027-03-31",
    },
    organisateurPrincipal: { id: "o1", slug: "demo-sbmi", sigle: "SBMI" },
    disciplines: [{ id: "d1", slug: "sante", nom: "Santé" }],
    ...autres,
  };
}

describe("metadonneesEcheances", () => {
  it("sans filtre : indexée, canonique /echeances, Open Graph", () => {
    const meta = metadonneesEcheances(sansFiltre);
    expect(meta.title).toBe(TITRE_ECHEANCES);
    expect(meta.alternates).toEqual({ canonical: "/echeances" });
    expect(meta.robots).toBeUndefined();
    expect(meta.openGraph).toMatchObject({ url: "/echeances", locale: "fr_FR" });
    expect(meta.description).toContain(`Bénin${NB}:`);
  });

  it("avec un filtre (type ou discipline) : noindex, follow, même canonique", () => {
    for (const filtres of [
      { type: "bourse", discipline: null },
      { type: null, discipline: "sante" },
      { type: "prix", discipline: "inconnue" },
    ] satisfies FiltresEcheances[]) {
      expect(aDesFiltresEcheances(filtres)).toBe(true);
      const meta = metadonneesEcheances(filtres);
      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates).toEqual({ canonical: "/echeances" });
    }
    expect(aDesFiltresEcheances(sansFiltre)).toBe(false);
  });
});

describe("libellés", () => {
  it("nombre d'échéances : 0, 1 et pluriel, nombre à la française", () => {
    expect(texteNombreEcheances(0)).toBe("Aucune échéance à venir pour le moment");
    expect(texteNombreEcheances(1)).toBe("1 échéance à venir");
    expect(texteNombreEcheances(16)).toBe("16 échéances à venir");
    expect(texteNombreEcheances(1234)).toBe(`1${FINE}234 échéances à venir`);
  });

  it("filtres actifs décrits dans l'ordre du formulaire", () => {
    expect(decrireFiltresEcheances({ type: null, discipline: null })).toEqual([]);
    expect(decrireFiltresEcheances({ type: "Bourse", discipline: "Santé" })).toEqual([
      `type «${NB}Bourse${NB}»`,
      `discipline «${NB}Santé${NB}»`,
    ]);
  });

  it("résumé : sans filtre, avec filtres, 0, 1 et pluriel", () => {
    expect(resumeEcheances({ total: 0, filtres: [] })).toBe(
      "Aucune échéance à venir pour le moment.",
    );
    expect(resumeEcheances({ total: 1, filtres: [] })).toBe(
      `Aucun filtre appliqué${NB}: 1 échéance à venir.`,
    );
    expect(resumeEcheances({ total: 16, filtres: [] })).toBe(
      `Aucun filtre appliqué${NB}: 16 échéances à venir.`,
    );
    const filtres = decrireFiltresEcheances({ type: "Bourse", discipline: "Santé" });
    const criteres = `type «${NB}Bourse${NB}» et discipline «${NB}Santé${NB}»`;
    expect(resumeEcheances({ total: 0, filtres })).toBe(
      `Aucune échéance à venir ne correspond à vos filtres${NB}: ${criteres}.`,
    );
    expect(resumeEcheances({ total: 1, filtres })).toBe(
      `1 échéance à venir correspond à vos filtres${NB}: ${criteres}.`,
    );
    expect(resumeEcheances({ total: 3, filtres })).toBe(
      `3 échéances à venir correspondent à vos filtres${NB}: ${criteres}.`,
    );
  });

  it("jours restants : aujourd'hui, demain, dans N jours", () => {
    expect(texteJoursRestants(0)).toBe("Clôture aujourd’hui");
    expect(texteJoursRestants(1)).toBe("Clôture demain");
    expect(texteJoursRestants(5)).toBe("Clôture dans 5 jours");
  });

  it("précision des deux premiers groupes (semaines du lundi au dimanche)", () => {
    expect(precisionGroupe("cette-semaine", AUJOURDHUI)).toBe(
      "Jusqu’au dimanche 1er novembre 2026",
    );
    expect(precisionGroupe("semaine-prochaine", AUJOURDHUI)).toBe("Du 2 au 8 novembre 2026");
    // Un lundi : la semaine commence le jour même.
    expect(precisionGroupe("cette-semaine", "2026-11-02")).toBe(
      "Jusqu’au dimanche 8 novembre 2026",
    );
    expect(precisionGroupe("semaine-prochaine", "2026-12-24")).toBe(
      "Du 28 décembre 2026 au 3 janvier 2027",
    );
    expect(precisionGroupe("2026-12", AUJOURDHUI)).toBeNull();
  });

  it("introduction et invitation : typographie française", () => {
    const introduction = texteIntroductionEcheances("Cité Savante");
    expect(introduction).toContain(`publiés sur Cité Savante${NB}: soumission des résumés`);
    expect(introduction).toContain(`dans 7${NB}jours ou moins`);
    expect(introduction).toContain(`«${NB}${MENTION_URGENTE}${NB}»`);
    expect(QUESTION_ECHEANCE_MANQUANTE).toBe(`Une date limite manque${NB}?`);
  });
});

describe("LigneEcheance", () => {
  const rendre = (e: EcheanceAVenir) =>
    renderToStaticMarkup(
      <ol>
        <LigneEcheance echeance={e} />
      </ol>,
    );

  it("date limite, jours restants, type, lien vers l'événement et organisateur", () => {
    const html = rendre(echeance("a", "2026-11-20"));
    expect(html).toContain('<time dateTime="2026-11-20">20 novembre 2026</time>');
    expect(html).toContain(`Date limite${NB}: `);
    expect(html).toContain("Clôture dans 20 jours");
    expect(html).toContain("Soumission des résumés");
    expect(html).toContain('<a href="/agenda/demo-evenement-a">[DÉMO] Congrès a</a>');
    expect(html).toContain("Organisé par");
    expect(html).toContain('href="/societes/demo-sbmi"');
    expect(html).not.toContain(MENTION_URGENTE);
  });

  it("à 7 jours ou moins : badge « Urgente » or (texte encre sur or)", () => {
    for (const date of ["2026-10-31", "2026-11-01", "2026-11-07"]) {
      const html = rendre(echeance("u", date));
      expect(html).toMatch(/<span class="[^"]*bg-or text-encre[^"]*">Urgente<\/span>/);
    }
    expect(rendre(echeance("u", "2026-10-31"))).toContain("Clôture aujourd’hui");
    expect(rendre(echeance("u", "2026-11-01"))).toContain("Clôture demain");
    expect(rendre(echeance("n", "2026-11-08"))).not.toContain(MENTION_URGENTE);
  });

  it("libellé libre de l'échéance s'il existe, sans organisateur sans ligne « Organisé par »", () => {
    const html = rendre(
      echeance("b", "2026-12-01", {
        type: "bourse",
        libelle: "  Bourses de   mobilité  ",
        organisateurPrincipal: null,
      }),
    );
    expect(html).toContain("Bourses de mobilité");
    expect(html).not.toContain("Organisé par");
    expect(html).not.toContain("/societes/");
  });

  it("type seul : libellé du type", () => {
    expect(
      rendre(echeance("c", "2026-12-01", { type: "inscription_tarif_preferentiel" })),
    ).toContain("Inscription à tarif préférentiel");
  });
});

describe("ListeEcheances", () => {
  const echeances = [
    echeance("mois", "2026-12-15", { type: "prix" }),
    echeance("cette", "2026-11-01"),
    echeance("prochaine", "2026-11-05", { type: "inscription" }),
    echeance("novembre", "2026-11-20"),
  ];
  const groupes = grouperEcheancesParSemaine(echeances, AUJOURDHUI);
  const html = renderToStaticMarkup(<ListeEcheances groupes={groupes} aujourdhui={AUJOURDHUI} />);

  it("une section titrée (h2) et une liste ordonnée par groupe, dans l'ordre", () => {
    expect(compter(html, /<section /g)).toBe(4);
    expect(compter(html, /<h2 /g)).toBe(4);
    expect(compter(html, /<ol /g)).toBe(4);
    expect(compter(html, /<li /g)).toBe(4);
    const titres = [...html.matchAll(/<h2 id="([^"]+)"[^>]*>([^<]+)<\/h2>/g)].map((m) => [
      m[1],
      m[2],
    ]);
    expect(titres).toEqual([
      ["echeances-cette-semaine", "Cette semaine"],
      ["echeances-semaine-prochaine", "Semaine prochaine"],
      ["echeances-2026-11", "Novembre 2026"],
      ["echeances-2026-12", "Décembre 2026"],
    ]);
    expect(html).toContain('aria-labelledby="echeances-cette-semaine"');
    expect(html.indexOf("Congrès cette")).toBeLessThan(html.indexOf("Congrès prochaine"));
    expect(html.indexOf("Congrès novembre")).toBeLessThan(html.indexOf("Congrès mois"));
  });

  it("précision sous « Cette semaine » et « Semaine prochaine » seulement", () => {
    expect(html).toContain("Jusqu’au dimanche 1er novembre 2026");
    expect(html).toContain("Du 2 au 8 novembre 2026");
    expect(compter(html, /<p class="mt-3 text-base italic">/g)).toBe(2);
  });
});

describe("PanneauFiltresEcheances", () => {
  const types = [
    { valeur: "bourse", libelle: "Bourse" },
    { valeur: "prix", libelle: "Prix" },
  ];
  const disciplines = [{ valeur: "sante", libelle: "Santé" }];

  it("formulaire GET vers /echeances, utilisable sans JavaScript, deux listes libellées", () => {
    const html = renderToStaticMarkup(
      <PanneauFiltresEcheances
        filtres={sansFiltre}
        types={types}
        disciplines={disciplines}
        filtresActifs={false}
      />,
    );
    expect(html).toMatch(/<form [^>]*action="\/echeances"/);
    expect(html).toMatch(/<form [^>]*method="get"/);
    expect(html).toContain('role="search"');
    expect(html).toContain('<select name="type" id="filtre-type"');
    expect(html).toContain('<select name="discipline" id="filtre-discipline"');
    expect(html).toContain('<label for="filtre-type"');
    expect(html).toContain('<label for="filtre-discipline"');
    expect(html).toContain("Tous les types");
    expect(html).toContain("Toutes les disciplines");
    expect(html).toContain('type="submit"');
    expect(html).not.toContain("Effacer les filtres");
  });

  it("filtres appliqués présélectionnés, lien « Effacer les filtres »", () => {
    const html = renderToStaticMarkup(
      <PanneauFiltresEcheances
        filtres={{ type: "prix", discipline: "sante" }}
        types={types}
        disciplines={disciplines}
        filtresActifs
      />,
    );
    expect(html).toContain('<option value="prix" selected="">Prix</option>');
    expect(html).toContain('<option value="sante" selected="">Santé</option>');
    expect(html).toContain('<a href="/echeances">Effacer les filtres</a>');
  });
});

describe("EtatVideEcheances", () => {
  it("sans filtre : agenda et « Annoncer un événement »", () => {
    const html = renderToStaticMarkup(<EtatVideEcheances filtresActifs={false} />);
    expect(html).toContain('href="/agenda"');
    expect(html).toContain('href="/referencer/evenement"');
    expect(html).not.toContain("Effacer les filtres");
  });

  it("avec filtres : propose d'abord de les effacer", () => {
    const html = renderToStaticMarkup(<EtatVideEcheances filtresActifs />);
    expect(html).toContain('href="/echeances"');
    expect(html.indexOf("Effacer les filtres")).toBeLessThan(html.indexOf("Annoncer un événement"));
  });
});

describe("page /echeances", () => {
  it("dynamique (le build se fait sans base de données)", () => {
    const source = readFileSync(join(process.cwd(), "src/app/echeances/page.tsx"), "utf8");
    expect(source).toContain('export const dynamic = "force-dynamic";');
  });
});
