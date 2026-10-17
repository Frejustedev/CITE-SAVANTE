import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EtatVideAnnuaire } from "@/components/societes/annuaire/EtatVideAnnuaire";
import {
  decrireFiltresActifs,
  entreGuillemets,
  resumeResultats,
  texteNombreOrganisations,
} from "@/components/societes/annuaire/libelles";
import {
  aDesFiltres,
  metadonneesAnnuaire,
  TITRE_ANNUAIRE,
} from "@/components/societes/annuaire/metadonnees";
import { ANCRE_RESULTATS, elementsPagination } from "@/components/societes/annuaire/pagination";
import { PaginationAnnuaire } from "@/components/societes/annuaire/PaginationAnnuaire";
import { PanneauFiltres } from "@/components/societes/annuaire/PanneauFiltres";
import type { FiltresAnnuaire } from "@/lib/utils/annuaire";

// `next/link` hors de Next.js : un simple <a> (même principe que
// `src/components/cartes.test.tsx`).
vi.mock("next/link", () => ({
  default: ({ href, children, ...reste }: { href: string; children: ReactNode }) => (
    <a href={href} {...reste}>
      {children}
    </a>
  ),
}));

// Le formulaire enrichi appelle `useRouter()` (navigation côté client) : hors
// de Next.js, un routeur factice suffit (les effets ne s'exécutent pas au
// rendu serveur).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const NB = " "; // espace insécable
const FINE = " "; // espace fine insécable (séparateur des milliers en français)

const sansFiltre: FiltresAnnuaire = {
  discipline: null,
  ville: null,
  categorie: null,
  q: null,
  page: 1,
};

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

describe("texteNombreOrganisations", () => {
  it("0, 1 et pluriel, nombre écrit à la française", () => {
    expect(texteNombreOrganisations(0)).toBe("Aucune organisation référencée pour le moment");
    expect(texteNombreOrganisations(-3)).toBe("Aucune organisation référencée pour le moment");
    expect(texteNombreOrganisations(1)).toBe("1 organisation référencée");
    expect(texteNombreOrganisations(2)).toBe("2 organisations référencées");
    expect(texteNombreOrganisations(1234)).toBe(`1${FINE}234 organisations référencées`);
  });
});

describe("decrireFiltresActifs", () => {
  it("aucun filtre : liste vide", () => {
    expect(
      decrireFiltresActifs({ discipline: null, ville: null, categorie: null, q: null }),
    ).toEqual([]);
  });

  it("dans l'ordre du formulaire, entre guillemets français", () => {
    expect(
      decrireFiltresActifs({
        q: "pédiatrie",
        categorie: "Société savante",
        ville: "Porto-Novo",
        discipline: "Santé",
      }),
    ).toEqual([
      `discipline «${NB}Santé${NB}»`,
      `ville «${NB}Porto-Novo${NB}»`,
      `catégorie «${NB}Société savante${NB}»`,
      `recherche «${NB}pédiatrie${NB}»`,
    ]);
    expect(entreGuillemets("x")).toBe(`«${NB}x${NB}»`);
  });
});

describe("resumeResultats", () => {
  it("sans filtre", () => {
    expect(resumeResultats({ total: 0, page: 1, pages: 0, filtres: [] })).toBe(
      "Aucune organisation n’est encore référencée.",
    );
    expect(resumeResultats({ total: 1, page: 1, pages: 1, filtres: [] })).toBe(
      `Aucun filtre appliqué${NB}: 1 organisation.`,
    );
    expect(resumeResultats({ total: 30, page: 2, pages: 2, filtres: [] })).toBe(
      `Aucun filtre appliqué${NB}: 30 organisations. Page 2 sur 2.`,
    );
  });

  it("avec filtres : 0, 1 et pluriel, critères joints par « et »", () => {
    const deux = ["discipline « Santé »", "ville « Cotonou »"];
    expect(resumeResultats({ total: 0, page: 1, pages: 0, filtres: deux })).toBe(
      `Aucune organisation ne correspond à vos filtres${NB}: discipline « Santé » et ville « Cotonou ».`,
    );
    expect(resumeResultats({ total: 1, page: 1, pages: 1, filtres: ["a"] })).toBe(
      `1 organisation correspond à vos filtres${NB}: a.`,
    );
    expect(resumeResultats({ total: 1234, page: 3, pages: 52, filtres: ["a", "b", "c"] })).toBe(
      `1${FINE}234 organisations correspondent à vos filtres${NB}: a, b et c. Page 3 sur 52.`,
    );
  });

  it("une seule page : pas de « Page 1 sur 1 »", () => {
    expect(resumeResultats({ total: 24, page: 1, pages: 1, filtres: [] })).not.toContain("Page");
  });
});

describe("elementsPagination", () => {
  const numeros = (page: number, pages: number) =>
    elementsPagination(page, pages).map((element) =>
      element.type === "page" ? element.numero : "…",
    );

  it("aucune page ou nombre invalide : liste vide", () => {
    expect(elementsPagination(1, 0)).toEqual([]);
    expect(elementsPagination(1, -2)).toEqual([]);
    expect(elementsPagination(1, 2.5)).toEqual([]);
  });

  it("peu de pages : toutes affichées", () => {
    expect(numeros(1, 1)).toEqual([1]);
    expect(numeros(2, 3)).toEqual([1, 2, 3]);
    expect(numeros(1, 3)).toEqual([1, 2, 3]);
  });

  it("un trou d'une page montre la page, un trou plus grand devient « … »", () => {
    expect(numeros(4, 10)).toEqual([1, 2, 3, 4, 5, "…", 10]);
    expect(numeros(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10]);
    expect(numeros(1, 10)).toEqual([1, 2, "…", 10]);
    expect(numeros(10, 10)).toEqual([1, "…", 9, 10]);
  });

  it("page hors limites ramenée dans [1, pages]", () => {
    expect(numeros(99, 3)).toEqual([1, 2, 3]);
    expect(numeros(0, 3)).toEqual([1, 2, 3]);
    expect(numeros(Number.NaN, 12)).toEqual([1, 2, "…", 12]);
  });

  it("au plus 7 éléments, clés des « … » distinctes, numéros croissants", () => {
    for (let pages = 1; pages <= 40; pages += 1) {
      for (let page = 1; page <= pages; page += 1) {
        const elements = elementsPagination(page, pages);
        expect(elements.length).toBeLessThanOrEqual(7);
        const cles = elements.flatMap((element) =>
          element.type === "ellipse" ? [element.cle] : [],
        );
        expect(new Set(cles).size).toBe(cles.length);
        const pagesVues = elements.flatMap((element) =>
          element.type === "page" ? [element.numero] : [],
        );
        expect(pagesVues).toEqual([...pagesVues].sort((a, b) => a - b));
        expect(pagesVues).toContain(page);
        expect(pagesVues[0]).toBe(1);
        expect(pagesVues.at(-1)).toBe(pages);
      }
    }
  });
});

describe("metadonneesAnnuaire", () => {
  it("sans filtre, page 1 : indexable, canonique /societes", () => {
    const meta = metadonneesAnnuaire(sansFiltre);
    expect(meta.title).toBe(TITRE_ANNUAIRE);
    expect(meta.alternates?.canonical).toBe("/societes");
    expect(meta.robots).toBeUndefined();
    expect(meta.openGraph).toMatchObject({ url: "/societes", locale: "fr_FR", type: "website" });
    expect(typeof meta.description).toBe("string");
  });

  it("filtre ou page > 1 : noindex, follow ; canonique inchangée", () => {
    const variantes: FiltresAnnuaire[] = [
      { ...sansFiltre, discipline: "sante" },
      { ...sansFiltre, ville: "cotonou" },
      { ...sansFiltre, categorie: "societe_savante" },
      { ...sansFiltre, q: "pédiatrie" },
      { ...sansFiltre, page: 2 },
    ];
    for (const filtres of variantes) {
      const meta = metadonneesAnnuaire(filtres);
      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.canonical).toBe("/societes");
    }
  });

  it("aDesFiltres ignore la page", () => {
    expect(aDesFiltres(sansFiltre)).toBe(false);
    expect(aDesFiltres({ ...sansFiltre, page: 3 })).toBe(false);
    expect(aDesFiltres({ ...sansFiltre, q: "sbmi" })).toBe(true);
  });
});

describe("PaginationAnnuaire", () => {
  const filtres: FiltresAnnuaire = { ...sansFiltre, discipline: "sante", ville: "cotonou" };

  it("une seule page (ou aucune) : rien", () => {
    expect(renderToStaticMarkup(<PaginationAnnuaire page={1} pages={1} filtres={filtres} />)).toBe(
      "",
    );
    expect(renderToStaticMarkup(<PaginationAnnuaire page={1} pages={0} filtres={filtres} />)).toBe(
      "",
    );
  });

  it("navigation nommée, page courante, précédent et suivant qui gardent les filtres", () => {
    const html = renderToStaticMarkup(<PaginationAnnuaire page={2} pages={3} filtres={filtres} />);
    expect(html).toContain('<nav aria-label="Pagination de l’annuaire"');
    expect(compter(html, /aria-current="page"/g)).toBe(1);
    expect(html).toMatch(/<a href="[^"]*page=2#resultats" aria-current="page"/);
    // Page 1 : paramètre `page` omis.
    expect(html).toContain(
      `<a href="/societes?discipline=sante&amp;ville=cotonou#${ANCRE_RESULTATS}" rel="prev"`,
    );
    expect(html).toContain(
      `<a href="/societes?discipline=sante&amp;ville=cotonou&amp;page=3#${ANCRE_RESULTATS}" rel="next"`,
    );
    expect(html).toContain("Page précédente");
    expect(html).toContain("Page suivante");
    // Numéros lus « Page 1 », « Page 2 »… par les lecteurs d'écran.
    expect(compter(html, /<span class="sr-only">Page <\/span>/g)).toBe(3);
  });

  it("première et dernière page : pas de lien précédent / suivant", () => {
    const premiere = renderToStaticMarkup(
      <PaginationAnnuaire page={1} pages={3} filtres={sansFiltre} />,
    );
    expect(premiere).not.toContain('rel="prev"');
    expect(premiere).toContain('<a href="/societes?page=2#resultats" rel="next"');

    const derniere = renderToStaticMarkup(
      <PaginationAnnuaire page={3} pages={3} filtres={sansFiltre} />,
    );
    expect(derniere).not.toContain('rel="next"');
    expect(derniere).toContain('<a href="/societes?page=2#resultats" rel="prev"');
  });
});

describe("EtatVideAnnuaire", () => {
  it("avec filtres : effacer les filtres et référencer une société", () => {
    const html = renderToStaticMarkup(<EtatVideAnnuaire filtresActifs />);
    expect(html).toMatch(/<a href="\/societes"[^>]*>Effacer les filtres<\/a>/);
    expect(html).toMatch(/<a href="\/referencer\/societe"[^>]*>Référencer une société<\/a>/);
  });

  it("sans filtre : seulement référencer une société", () => {
    const html = renderToStaticMarkup(<EtatVideAnnuaire filtresActifs={false} />);
    expect(html).not.toContain("Effacer les filtres");
    expect(html).toMatch(/<a href="\/referencer\/societe"[^>]*>Référencer une société<\/a>/);
  });
});

describe("PanneauFiltres", () => {
  const options = {
    disciplines: [
      { valeur: "sante", libelle: "Santé" },
      { valeur: "agronomie", libelle: "Agronomie" },
    ],
    villes: [
      { valeur: "cotonou", libelle: "Cotonou" },
      { valeur: "porto-novo", libelle: "Porto-Novo" },
    ],
    categories: [
      { valeur: "societe_savante", libelle: "Société savante" },
      { valeur: "autre", libelle: "Autre" },
    ],
  };

  it("formulaire GET vers /societes, utilisable sans JavaScript", () => {
    const html = renderToStaticMarkup(
      <PanneauFiltres filtres={sansFiltre} filtresActifs={false} {...options} />,
    );
    expect(html).toMatch(/<form [^>]*method="get"/);
    expect(html).toMatch(/<form [^>]*action="\/societes"/);
    expect(html).toMatch(/<form [^>]*role="search"/);
    expect(html).toMatch(/<form [^>]*aria-labelledby="titre-filtres"/);
    expect(html).toContain('<button type="submit"');
    expect(html).toContain(">Filtrer</button>");
    for (const nom of ["q", "discipline", "ville", "categorie"]) {
      expect(html).toContain(`name="${nom}"`);
      // Chaque champ a un libellé relié.
      expect(html).toContain(`for="filtre-${nom}"`);
      expect(html).toContain(`id="filtre-${nom}"`);
    }
    // Aucun filtre : l'option vide de chaque liste est présélectionnée.
    expect(html).toContain('<option value="" selected="">Toutes les disciplines</option>');
    expect(html).toContain('<option value="" selected="">Toutes les villes</option>');
    expect(html).toContain('<option value="" selected="">Toutes les catégories</option>');
    expect(html).not.toContain("Effacer les filtres");
  });

  it("valeurs appliquées présélectionnées, lien « Effacer les filtres »", () => {
    const html = renderToStaticMarkup(
      <PanneauFiltres
        filtres={{
          discipline: "sante",
          ville: "porto-novo",
          categorie: "societe_savante",
          q: "pédiatrie",
          page: 1,
        }}
        filtresActifs
        {...options}
      />,
    );
    expect(html).toMatch(/<input [^>]*name="q"[^>]*value="pédiatrie"/);
    expect(html).toContain('<option value="sante" selected="">Santé</option>');
    expect(html).toContain('<option value="porto-novo" selected="">Porto-Novo</option>');
    expect(html).toContain('<option value="societe_savante" selected="">Société savante</option>');
    expect(compter(html, /selected=""/g)).toBe(3);
    expect(html).toMatch(/<a href="\/societes"[^>]*>Effacer les filtres<\/a>/);
  });
});
