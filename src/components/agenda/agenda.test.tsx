import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BanniereAgenda } from "@/components/agenda/BanniereAgenda";
import { CalendrierMois, nombreEvenementsDuMois } from "@/components/agenda/CalendrierMois";
import { EtatVideAgenda } from "@/components/agenda/EtatVideAgenda";
import {
  dateCase,
  decrireFiltresAgenda,
  deMois,
  resumeAgenda,
  texteNombreEvenements,
  titreJour,
} from "@/components/agenda/libelles";
import { ListeAgenda } from "@/components/agenda/ListeAgenda";
import {
  CHEMIN_ARCHIVES,
  TITRE_AGENDA,
  TITRE_ARCHIVES,
  metadonneesAgenda,
  titreAgenda,
} from "@/components/agenda/metadonnees";
import { PanneauFiltresAgenda } from "@/components/agenda/PanneauFiltresAgenda";
import { SelecteurVue } from "@/components/agenda/SelecteurVue";
import { CHEMIN_ANNONCER_EVENEMENT } from "@/config/site";
import type { BanniereAgenda as DonneesBanniere } from "@/lib/requetes/emplacements";
import { FILTRES_AGENDA_VIDES, type FiltresAgenda } from "@/lib/utils/agenda";
import { grilleMois } from "@/lib/utils/calendrier";
import type { EvenementResume } from "@/lib/utils/evenements";

// `next/link` hors de Next.js : un simple <a> (même principe que
// `src/components/cartes.test.tsx` et `annuaire.test.tsx`).
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

// `next/image` hors de Next.js : une simple balise <img>.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const NB = " "; // espace insécable
const FINE = " "; // espace fine insécable (séparateur des milliers en français)

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length;

/** Texte réellement affiché : textes masqués (`sr-only`) et balises retirés, espaces réduites. */
const texteVisible = (html: string) =>
  html
    .replace(/<span class="sr-only">[^<]*<\/span>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Événement de démonstration ; chaque test ne précise que ce qui compte. */
function evenement(partiel: Partial<EvenementResume> & { id: string }): EvenementResume {
  return {
    slug: `demo-${partiel.id}`,
    titre: `[DÉMO] Événement ${partiel.id}`,
    type: "congres",
    dateDebut: "2026-11-12",
    dateFin: "2026-11-12",
    heureDebut: null,
    modalite: "presentiel",
    lieuNom: null,
    ville: "Cotonou",
    gratuit: false,
    organisateurs: [{ role: "organisateur", id: "o1", slug: "demo-sbmi", sigle: "SBMI" }],
    prochaineEcheance: null,
    disciplines: [{ id: "d1", slug: "sante", nom: "Santé et médecine" }],
    miseEnAvant: false,
    ...partiel,
  };
}

const filtres = (partiel: Partial<FiltresAgenda> = {}): FiltresAgenda => ({
  ...FILTRES_AGENDA_VIDES,
  ...partiel,
});

/** Partie grille (`<table>`) et partie liste mobile (après la table) du calendrier. */
function decouperCalendrier(html: string): { grille: string; liste: string } {
  const fin = html.indexOf("</table>");
  return {
    grille: html.slice(html.indexOf("<table"), fin),
    liste: html.slice(fin),
  };
}

describe("texteNombreEvenements", () => {
  it("0, 1 et pluriel, à venir et passés, nombre écrit à la française", () => {
    expect(texteNombreEvenements(0, "a_venir")).toBe("Aucun événement à venir pour le moment");
    expect(texteNombreEvenements(-1, "passes")).toBe("Aucun événement passé pour le moment");
    expect(texteNombreEvenements(1, "a_venir")).toBe("1 événement à venir");
    expect(texteNombreEvenements(1, "passes")).toBe("1 événement passé");
    expect(texteNombreEvenements(15, "a_venir")).toBe("15 événements à venir");
    expect(texteNombreEvenements(1234, "passes")).toBe(`1${FINE}234 événements passés`);
  });
});

describe("deMois", () => {
  it("« d’ » devant avril, août et octobre, « de » ailleurs", () => {
    expect(deMois({ annee: 2027, mois: 4 })).toBe("d’avril 2027");
    expect(deMois({ annee: 2027, mois: 8 })).toBe("d’août 2027");
    expect(deMois({ annee: 2026, mois: 10 })).toBe("d’octobre 2026");
    expect(deMois({ annee: 2026, mois: 11 })).toBe("de novembre 2026");
    expect(deMois({ annee: 2027, mois: 1 })).toBe("de janvier 2027");
  });
});

describe("decrireFiltresAgenda", () => {
  const vides = {
    type: null,
    discipline: null,
    ville: null,
    modalite: null,
    gratuit: false,
    du: null,
    au: null,
    q: null,
  };

  it("aucun filtre : liste vide", () => {
    expect(decrireFiltresAgenda(vides)).toEqual([]);
  });

  it("dans l'ordre du formulaire, entre guillemets français", () => {
    expect(
      decrireFiltresAgenda({
        type: "Congrès",
        discipline: "Santé",
        ville: "Cotonou",
        modalite: "En ligne",
        gratuit: true,
        du: "2027-03-12",
        au: "2027-03-14",
        q: "pédiatrie",
      }),
    ).toEqual([
      `recherche «${NB}pédiatrie${NB}»`,
      `type «${NB}Congrès${NB}»`,
      `discipline «${NB}Santé${NB}»`,
      `ville «${NB}Cotonou${NB}»`,
      `modalité «${NB}En ligne${NB}»`,
      "période du 12 au 14 mars 2027",
      "événements gratuits",
    ]);
  });

  it("période : une seule borne, ou un seul jour", () => {
    expect(decrireFiltresAgenda({ ...vides, du: "2027-03-12" })).toEqual([
      "à partir du 12 mars 2027",
    ]);
    expect(decrireFiltresAgenda({ ...vides, au: "2027-05-01" })).toEqual(["jusqu’au 1er mai 2027"]);
    expect(decrireFiltresAgenda({ ...vides, du: "2027-03-12", au: "2027-03-12" })).toEqual([
      "date du 12 mars 2027",
    ]);
  });
});

describe("resumeAgenda", () => {
  const criteres = [`type «${NB}Congrès${NB}»`, `ville «${NB}Cotonou${NB}»`];

  it("liste sans filtre", () => {
    expect(resumeAgenda({ mode: "a_venir", total: 15, filtres: [] })).toBe(
      `Aucun filtre appliqué${NB}: 15 événements à venir.`,
    );
    expect(resumeAgenda({ mode: "a_venir", total: 0, filtres: [] })).toBe(
      "Aucun événement à venir n’est annoncé pour le moment.",
    );
    expect(resumeAgenda({ mode: "passes", total: 0, filtres: [] })).toBe(
      "Aucun événement passé n’est encore archivé.",
    );
  });

  it("liste filtrée : 0, 1 et pluriel, critères joints par « et »", () => {
    expect(resumeAgenda({ mode: "a_venir", total: 3, filtres: criteres })).toBe(
      `3 événements à venir correspondent à vos filtres${NB}: type «${NB}Congrès${NB}» et ville «${NB}Cotonou${NB}».`,
    );
    expect(resumeAgenda({ mode: "passes", total: 1, filtres: criteres.slice(0, 1) })).toBe(
      `1 événement passé correspond à vos filtres${NB}: type «${NB}Congrès${NB}».`,
    );
    expect(resumeAgenda({ mode: "a_venir", total: 0, filtres: criteres.slice(1) })).toBe(
      `Aucun événement à venir ne correspond à vos filtres${NB}: ville «${NB}Cotonou${NB}».`,
    );
  });

  it("calendrier : nombre d'événements du mois", () => {
    const mois = { annee: 2026, mois: 11 };
    expect(resumeAgenda({ mode: "calendrier", total: 6, filtres: [], mois })).toBe(
      "6 événements en novembre 2026.",
    );
    expect(resumeAgenda({ mode: "calendrier", total: 0, filtres: [], mois })).toBe(
      "Aucun événement en novembre 2026.",
    );
    expect(
      resumeAgenda({ mode: "calendrier", total: 1, filtres: criteres.slice(0, 1), mois }),
    ).toBe(`1 événement correspond à vos filtres en novembre 2026${NB}: type «${NB}Congrès${NB}».`);
  });
});

describe("titreJour et dateCase", () => {
  it("jour de la semaine, « 1er », majuscule initiale pour le titre", () => {
    expect(titreJour("2026-11-01")).toBe("Dimanche 1er novembre");
    expect(titreJour("2026-10-30")).toBe("Vendredi 30 octobre");
    expect(dateCase("2026-10-15", false)).toBe("jeudi 15 octobre 2026");
    expect(dateCase("2026-10-15", true)).toBe("jeudi 15 octobre 2026, aujourd’hui");
  });
});

describe("metadonneesAgenda", () => {
  const aujourdhui = "2026-10-15";

  it("liste à venir sans filtre : indexée, canonique /agenda", () => {
    const meta = metadonneesAgenda(filtres(), aujourdhui);
    expect(meta.title).toBe(TITRE_AGENDA);
    expect(meta.alternates?.canonical).toBe("/agenda");
    expect(meta.robots).toBeUndefined();
    expect(meta.openGraph).toMatchObject({
      url: "/agenda",
      title: `${TITRE_AGENDA} — Cité Savante`,
      locale: "fr_FR",
    });
  });

  it("liste à venir filtrée : noindex, follow ; canonique /agenda", () => {
    const meta = metadonneesAgenda(filtres({ type: "congres" }), aujourdhui);
    expect(meta.alternates?.canonical).toBe("/agenda");
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("archives sans filtre : indexées, canonique des archives", () => {
    const meta = metadonneesAgenda(filtres({ periode: "passes" }), aujourdhui);
    expect(meta.title).toBe(TITRE_ARCHIVES);
    expect(meta.alternates?.canonical).toBe(CHEMIN_ARCHIVES);
    expect(CHEMIN_ARCHIVES).toBe("/agenda?periode=passes");
    expect(meta.robots).toBeUndefined();
  });

  it("archives filtrées : noindex, follow ; canonique des archives", () => {
    const meta = metadonneesAgenda(filtres({ periode: "passes", gratuit: true }), aujourdhui);
    expect(meta.alternates?.canonical).toBe(CHEMIN_ARCHIVES);
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("calendrier, filtré ou non : noindex, follow ; canonique /agenda ; titre du mois", () => {
    const courant = metadonneesAgenda(filtres({ vue: "calendrier" }), aujourdhui);
    expect(courant.title).toBe("Calendrier des événements d’octobre 2026");
    expect(courant.alternates?.canonical).toBe("/agenda");
    expect(courant.robots).toEqual({ index: false, follow: true });

    const novembre = metadonneesAgenda(filtres({ vue: "calendrier", mois: "2026-11" }), aujourdhui);
    expect(novembre.title).toBe("Calendrier des événements de novembre 2026");
    expect(novembre.robots).toEqual({ index: false, follow: true });
  });

  it("titre h1 : archives en liste seulement", () => {
    expect(titreAgenda({ vue: "liste", periode: "passes" })).toBe(TITRE_ARCHIVES);
    expect(titreAgenda({ vue: "liste", periode: "a_venir" })).toBe(TITRE_AGENDA);
    expect(titreAgenda({ vue: "calendrier", periode: "a_venir" })).toBe(TITRE_AGENDA);
  });
});

describe("SelecteurVue", () => {
  it("deux liens, vue affichée en aria-current, filtres gardés", () => {
    const html = renderToStaticMarkup(
      <SelecteurVue filtres={filtres({ type: "congres", discipline: "sante" })} />,
    );
    expect(html).toContain('aria-label="Présentation de l’agenda"');
    expect(html).toMatch(
      /<a href="\/agenda\?type=congres&amp;discipline=sante" aria-current="page"[^>]*>Liste<\/a>/,
    );
    expect(html).toMatch(
      /<a href="\/agenda\?vue=calendrier&amp;type=congres&amp;discipline=sante"[^>]*>Calendrier<\/a>/,
    );
    expect(compter(html, /aria-current="page"/g)).toBe(1);
    expect(html).toContain('href="/agenda?periode=passes&amp;type=congres&amp;discipline=sante"');
    expect(html).toContain("Consulter les événements passés");
  });

  it("calendrier : « Calendrier » courant ; archives : lien de retour", () => {
    const calendrier = renderToStaticMarkup(
      <SelecteurVue filtres={filtres({ vue: "calendrier", mois: "2026-11" })} />,
    );
    expect(calendrier).toMatch(
      /<a href="\/agenda\?vue=calendrier&amp;mois=2026-11" aria-current="page"[^>]*>Calendrier<\/a>/,
    );
    // Vers la liste : le mois n'est pas gardé.
    expect(calendrier).toMatch(/<a href="\/agenda"[^>]*>Liste<\/a>/);

    const archives = renderToStaticMarkup(
      <SelecteurVue filtres={filtres({ periode: "passes" })} />,
    );
    expect(archives).toContain("Revenir aux événements à venir");
    expect(archives).not.toContain("Consulter les événements passés");
  });
});

describe("PanneauFiltresAgenda", () => {
  const options = {
    disciplines: [
      { valeur: "sante", libelle: "Santé" },
      { valeur: "agronomie", libelle: "Agronomie" },
    ],
    villes: [
      { valeur: "cotonou", libelle: "Cotonou" },
      { valeur: "porto-novo", libelle: "Porto-Novo" },
    ],
  };
  const NOMS = ["q", "type", "discipline", "ville", "modalite", "du", "au", "gratuit"];

  it("formulaire GET vers /agenda, utilisable sans JavaScript, champs libellés", () => {
    const html = renderToStaticMarkup(
      <PanneauFiltresAgenda filtres={filtres()} filtresActifs={false} {...options} />,
    );
    expect(html).toMatch(/<form [^>]*method="get"/);
    expect(html).toMatch(/<form [^>]*action="\/agenda"/);
    expect(html).toMatch(/<form [^>]*role="search"/);
    expect(html).toMatch(/<form [^>]*aria-labelledby="titre-filtres-agenda"/);
    expect(html).toContain('<button type="submit"');
    for (const nom of NOMS) {
      expect(html).toContain(`name="${nom}"`);
      expect(html).toContain(`for="filtre-agenda-${nom}"`);
      expect(html).toContain(`id="filtre-agenda-${nom}"`);
    }
    expect(html).toMatch(/<input [^>]*type="date"[^>]*name="du"|name="du"[^>]*type="date"/);
    // Liste à venir : aucun champ caché.
    expect(html).not.toContain('type="hidden"');
    expect(html).not.toContain("Effacer les filtres");
    expect(html).toContain('<option value="" selected="">Tous les types</option>');
  });

  it("calendrier : vue et mois en champs cachés ; « Effacer » garde vue et mois", () => {
    const html = renderToStaticMarkup(
      <PanneauFiltresAgenda
        filtres={filtres({ vue: "calendrier", mois: "2026-11", type: "atelier" })}
        filtresActifs
        {...options}
      />,
    );
    expect(html).toContain('<input type="hidden" name="vue" value="calendrier"/>');
    expect(html).toContain('<input type="hidden" name="mois" value="2026-11"/>');
    expect(html).not.toContain('name="periode"');
    expect(html).toMatch(
      /<a href="\/agenda\?vue=calendrier&amp;mois=2026-11"[^>]*>Effacer les filtres<\/a>/,
    );
  });

  it("archives : période en champ caché ; valeurs appliquées présélectionnées", () => {
    const html = renderToStaticMarkup(
      <PanneauFiltresAgenda
        filtres={filtres({
          periode: "passes",
          type: "congres",
          discipline: "sante",
          ville: "porto-novo",
          modalite: "hybride",
          gratuit: true,
          du: "2026-01-01",
          au: "2026-06-30",
          q: "pédiatrie",
        })}
        filtresActifs
        {...options}
      />,
    );
    expect(html).toContain('<input type="hidden" name="periode" value="passes"/>');
    expect(html).not.toContain('name="vue"');
    expect(html).toMatch(/<input [^>]*name="q"[^>]*value="pédiatrie"/);
    expect(html).toMatch(/<input [^>]*name="du"[^>]*value="2026-01-01"/);
    expect(html).toMatch(/<input [^>]*name="au"[^>]*value="2026-06-30"/);
    expect(html).toMatch(/<input [^>]*name="gratuit"[^>]*checked=""/);
    expect(html).toContain('<option value="congres" selected="">Congrès</option>');
    expect(html).toContain('<option value="sante" selected="">Santé</option>');
    expect(html).toContain('<option value="porto-novo" selected="">Porto-Novo</option>');
    expect(html).toMatch(/<option value="hybride" selected="">[^<]+<\/option>/);
    expect(compter(html, /selected=""/g)).toBe(4);
    expect(html).toMatch(/<a href="\/agenda\?periode=passes"[^>]*>Effacer les filtres<\/a>/);
  });
});

describe("ListeAgenda", () => {
  it("mis en avant en tête, non répétés dans leur mois ; un h2 par mois de début", () => {
    const html = renderToStaticMarkup(
      <ListeAgenda
        archives={false}
        aujourdhui="2026-10-15"
        evenements={[
          evenement({
            id: "vedette",
            dateDebut: "2026-12-03",
            dateFin: "2026-12-04",
            miseEnAvant: true,
          }),
          evenement({ id: "a", dateDebut: "2026-10-30", dateFin: "2026-11-02" }),
          evenement({ id: "b", dateDebut: "2026-11-20", dateFin: "2026-11-20" }),
          evenement({ id: "c", dateDebut: "2026-12-10", dateFin: "2026-12-10" }),
        ]}
      />,
    );
    expect(html).toContain('<h2 id="mis-en-avant"');
    expect(html).toContain("Événements mis en avant");
    expect(html).toContain('href="/visibilite"');
    // Chaque événement une seule fois.
    for (const id of ["vedette", "a", "b", "c"]) {
      expect(compter(html, new RegExp(`href="/agenda/demo-${id}"`, "g"))).toBe(1);
    }
    // Ordre : mis en avant, octobre (a, à cheval sur deux mois), novembre, décembre.
    const positions = ["mis-en-avant", "mois-2026-10", "mois-2026-11", "mois-2026-12"].map((id) =>
      html.indexOf(`id="${id}"`),
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
    expect(html.indexOf("demo-vedette")).toBeLessThan(html.indexOf('id="mois-2026-10"'));
    expect(html.indexOf("demo-a")).toBeLessThan(html.indexOf('id="mois-2026-11"'));
    // Cartes en h3 sous les h2.
    expect(compter(html, /<h3 /g)).toBe(4);
  });

  it("archives : mois du plus récent au plus ancien, jamais de bloc « mis en avant »", () => {
    const html = renderToStaticMarkup(
      <ListeAgenda
        archives
        aujourdhui="2026-10-15"
        evenements={[
          evenement({
            id: "sept",
            dateDebut: "2026-09-10",
            dateFin: "2026-09-11",
            miseEnAvant: true,
          }),
          evenement({ id: "aout", dateDebut: "2026-08-05", dateFin: "2026-08-05" }),
        ]}
      />,
    );
    expect(html).not.toContain("Événements mis en avant");
    expect(html.indexOf('id="mois-2026-09"')).toBeLessThan(html.indexOf('id="mois-2026-08"'));
  });

  it("aucun événement : rien", () => {
    expect(
      renderToStaticMarkup(
        <ListeAgenda archives={false} aujourdhui="2026-10-15" evenements={[]} />,
      ),
    ).toBe("");
  });
});

describe("CalendrierMois", () => {
  const aujourdhui = "2026-10-15";
  // Congrès à cheval sur deux mois : du vendredi 30 octobre au lundi 2 novembre 2026.
  const congres = evenement({
    id: "congres",
    dateDebut: "2026-10-30",
    dateFin: "2026-11-02",
    miseEnAvant: true,
  });
  const atelier = evenement({
    id: "atelier",
    type: "atelier",
    dateDebut: "2026-10-15",
    dateFin: "2026-10-15",
    modalite: "en_ligne",
  });
  const filtresMois = (mois: string | null) =>
    filtres({ vue: "calendrier", mois, type: "congres", discipline: "sante" });

  it("grille accessible : 7 en-têtes de colonnes, aujourd'hui marqué une fois", () => {
    const html = renderToStaticMarkup(
      <CalendrierMois
        grille={grilleMois({ annee: 2026, mois: 10 }, aujourdhui)}
        evenements={[atelier, congres]}
        filtres={filtresMois(null)}
        aujourdhui={aujourdhui}
      />,
    );
    expect(html).toContain('<section id="calendrier" aria-labelledby="titre-calendrier"');
    expect(html).toContain('<h2 id="titre-calendrier"');
    expect(html).toContain(">Octobre 2026</h2>");
    expect(html).toContain("Calendrier des événements d’octobre 2026</caption>");
    expect(compter(html, /<th scope="col"/g)).toBe(7);
    expect(html).toContain('<span class="sr-only">lundi</span>');
    expect(compter(html, /aria-current="date"/g)).toBe(1);
    expect(html).toContain("jeudi 15 octobre 2026, aujourd’hui");
    // 5 semaines : du lundi 28 septembre au dimanche 1er novembre.
    expect(compter(html, /<tr>/g)).toBe(6); // 1 ligne d'en-têtes + 5 semaines
    // Grille masquée sous 768 px, liste masquée au-delà.
    expect(html).toMatch(/<table class="[^"]*hidden[^"]*md:table/);
    expect(html).toMatch(/<ol class="[^"]*md:hidden/);
  });

  it("octobre : le congrès sur ses jours d'octobre ET le 1er novembre de la grille ; liste du mois seulement", () => {
    const html = renderToStaticMarkup(
      <CalendrierMois
        grille={grilleMois({ annee: 2026, mois: 10 }, aujourdhui)}
        evenements={[atelier, congres]}
        filtres={filtresMois(null)}
        aujourdhui={aujourdhui}
      />,
    );
    const { grille, liste } = decouperCalendrier(html);
    // Grille : 30 et 31 octobre, 1er novembre (dernière case).
    expect(compter(grille, /href="\/agenda\/demo-congres"/g)).toBe(3);
    expect(compter(grille, />Suite</g)).toBe(2);
    // Seule la première apparition est atteinte par Tab.
    expect(compter(grille, /href="\/agenda\/demo-congres" tabindex="-1"/g)).toBe(2);
    // Mention écrite en clair sur chaque jour du congrès mis en avant, pas sur l'atelier.
    expect(compter(texteVisible(grille), /Mis en avant/g)).toBe(3);
    // Liste mobile : jours DU MOIS qui ont un événement (15, 30, 31 octobre).
    expect(compter(liste, /<h3 /g)).toBe(3);
    expect(liste).toContain("Jeudi 15 octobre");
    expect(liste).toContain("Vendredi 30 octobre");
    expect(liste).toContain("Samedi 31 octobre");
    expect(liste).not.toContain("novembre</h3>");
    expect(compter(liste, /href="\/agenda\/demo-congres"/g)).toBe(2);
    expect(liste).toContain("Aujourd’hui");
    expect(liste).toContain("En ligne");
  });

  it("grille : « Mis en avant » lisible sans le fanion, fanion décoratif, nom du lien correct", () => {
    const html = renderToStaticMarkup(
      <CalendrierMois
        grille={grilleMois({ annee: 2026, mois: 11 }, aujourdhui)}
        evenements={[
          evenement({
            id: "avant",
            titre: "[DÉMO] Congrès de test",
            dateDebut: "2026-11-12",
            dateFin: "2026-11-12",
            miseEnAvant: true,
          }),
          evenement({
            id: "simple",
            titre: "[DÉMO] Atelier de test",
            dateDebut: "2026-11-13",
            dateFin: "2026-11-13",
          }),
        ]}
        filtres={filtresMois("2026-11")}
        aujourdhui={aujourdhui}
      />,
    );
    const { grille } = decouperCalendrier(html);
    const lien = (slug: string) =>
      grille.match(new RegExp(`<a href="/agenda/${slug}"[^>]*>.*?</a>`))?.[0] ?? "";

    // Le texte VISIBLE du lien mis en avant porte la mention, avant le titre.
    expect(texteVisible(lien("demo-avant"))).toBe("Mis en avant [DÉMO] Congrès de test");
    // Le pictogramme en or reste, décoratif (masqué aux lecteurs d'écran).
    expect(lien("demo-avant")).toMatch(/<svg[^>]*aria-hidden="true"[^>]*class="[^"]*text-or/);
    expect(lien("demo-avant")).not.toContain('role="img"');
    // Nom du lien : mention et titre séparés, la mention une seule fois.
    expect(lien("demo-avant").replace(/<[^>]+>/g, "")).toBe(
      `Mis en avant${NB}: [DÉMO] Congrès de test`,
    );
    // Événement ordinaire : ni mention ni fanion.
    expect(texteVisible(lien("demo-simple"))).toBe("[DÉMO] Atelier de test");
    expect(lien("demo-simple")).not.toContain("<svg");
  });

  it("novembre : le même congrès du 30 octobre au 2 novembre dans la grille ; 1er et 2 novembre en liste", () => {
    const html = renderToStaticMarkup(
      <CalendrierMois
        grille={grilleMois({ annee: 2026, mois: 11 }, aujourdhui)}
        evenements={[congres]}
        filtres={filtresMois("2026-11")}
        aujourdhui={aujourdhui}
      />,
    );
    const { grille, liste } = decouperCalendrier(html);
    expect(compter(grille, /href="\/agenda\/demo-congres"/g)).toBe(4);
    expect(compter(grille, />Suite</g)).toBe(3);
    // Aujourd'hui (octobre) n'est pas dans la grille de novembre.
    expect(html).not.toContain('aria-current="date"');
    expect(compter(liste, /<h3 /g)).toBe(2);
    expect(liste).toContain("Dimanche 1er novembre");
    expect(liste).toContain("Lundi 2 novembre");
    expect(liste).not.toContain("octobre</h3>");
    // Dans la liste de novembre, les deux jours sont des suites.
    expect(compter(liste, />Suite</g)).toBe(2);
  });

  it("navigation : liens qui gardent les filtres ; retour au mois en cours ; nombre du mois", () => {
    const courant = renderToStaticMarkup(
      <CalendrierMois
        grille={grilleMois({ annee: 2026, mois: 10 }, aujourdhui)}
        evenements={[]}
        filtres={filtresMois(null)}
        aujourdhui={aujourdhui}
      />,
    );
    expect(courant).toContain('aria-label="Changer de mois"');
    expect(courant).toContain(
      'href="/agenda?vue=calendrier&amp;mois=2026-09&amp;type=congres&amp;discipline=sante#calendrier"',
    );
    expect(courant).toContain(
      'href="/agenda?vue=calendrier&amp;mois=2026-11&amp;type=congres&amp;discipline=sante#calendrier"',
    );
    expect(courant).toContain(`Mois précédent${NB}: `);
    expect(courant).not.toContain("Revenir au mois en cours");

    const autre = renderToStaticMarkup(
      <CalendrierMois
        grille={grilleMois({ annee: 2026, mois: 12 }, aujourdhui)}
        evenements={[]}
        filtres={filtresMois("2026-12")}
        aujourdhui={aujourdhui}
      />,
    );
    // Le mois en cours s'écrit sans `mois=`.
    expect(autre).toMatch(
      /<a href="\/agenda\?vue=calendrier&amp;type=congres&amp;discipline=sante#calendrier"[^>]*>Revenir au mois en cours<\/a>/,
    );

    // Mois voisin du mois en cours : « mois précédent » y mène déjà, pas de
    // second lien vers la même adresse.
    const voisin = renderToStaticMarkup(
      <CalendrierMois
        grille={grilleMois({ annee: 2026, mois: 11 }, aujourdhui)}
        evenements={[]}
        filtres={filtresMois("2026-11")}
        aujourdhui={aujourdhui}
      />,
    );
    expect(voisin).not.toContain("Revenir au mois en cours");
    expect(
      compter(
        voisin,
        /href="\/agenda\?vue=calendrier&amp;type=congres&amp;discipline=sante#calendrier"/g,
      ),
    ).toBe(1);

    expect(nombreEvenementsDuMois([congres, atelier], { annee: 2026, mois: 11 })).toBe(1);
    expect(nombreEvenementsDuMois([congres, atelier], { annee: 2026, mois: 10 })).toBe(2);
    expect(nombreEvenementsDuMois([congres, atelier], { annee: 2026, mois: 12 })).toBe(0);
  });

  it("bords de la fenêtre (12 mois avant, 24 après) : lien absent, sans élément de liste vide", () => {
    const premier = renderToStaticMarkup(
      <CalendrierMois
        grille={grilleMois({ annee: 2025, mois: 10 }, aujourdhui)}
        evenements={[]}
        filtres={filtresMois("2025-10")}
        aujourdhui={aujourdhui}
      />,
    );
    expect(premier).not.toContain("Mois précédent");
    expect(premier).toContain("Mois suivant");
    expect(premier).not.toMatch(/<li><\/li>|<li[^>]*><\/li>/);

    const dernier = renderToStaticMarkup(
      <CalendrierMois
        grille={grilleMois({ annee: 2028, mois: 10 }, aujourdhui)}
        evenements={[]}
        filtres={filtresMois("2028-10")}
        aujourdhui={aujourdhui}
      />,
    );
    expect(dernier).toContain("Mois précédent");
    expect(dernier).not.toContain("Mois suivant");
  });

  it("mois sans événement : état vide à la place de la liste des jours", () => {
    const html = renderToStaticMarkup(
      <CalendrierMois
        grille={grilleMois({ annee: 2026, mois: 12 }, aujourdhui)}
        evenements={[]}
        filtres={filtresMois("2026-12")}
        aujourdhui={aujourdhui}
        etatVide={<p>ÉTAT VIDE</p>}
      />,
    );
    expect(html).toContain("<p>ÉTAT VIDE</p>");
    expect(html).not.toContain("<ol");
  });
});

describe("EtatVideAgenda", () => {
  it("avec filtres : effacer les filtres et annoncer un événement", () => {
    const html = renderToStaticMarkup(
      <EtatVideAgenda mode="a_venir" filtresActifs cheminEffacer="/agenda?periode=passes" />,
    );
    expect(html).toMatch(/<a href="\/agenda\?periode=passes"[^>]*>Effacer les filtres<\/a>/);
    expect(html).toContain(`href="${CHEMIN_ANNONCER_EVENEMENT}"`);
    expect(CHEMIN_ANNONCER_EVENEMENT).toBe("/referencer/evenement");
  });

  it("sans filtre : lien utile selon la vue, toujours « Annoncer un événement »", () => {
    const aVenir = renderToStaticMarkup(
      <EtatVideAgenda mode="a_venir" filtresActifs={false} cheminEffacer="/agenda" />,
    );
    expect(aVenir).toMatch(
      /<a href="\/agenda\?periode=passes"[^>]*>Consulter les événements passés/,
    );
    expect(aVenir).not.toContain("Effacer les filtres");
    expect(aVenir).toContain(">Annoncer un événement</a>");

    const passes = renderToStaticMarkup(
      <EtatVideAgenda mode="passes" filtresActifs={false} cheminEffacer="/agenda?periode=passes" />,
    );
    expect(passes).toMatch(/<a href="\/agenda"[^>]*>Revenir aux événements à venir/);

    const calendrier = renderToStaticMarkup(
      <EtatVideAgenda
        mode="calendrier"
        filtresActifs={false}
        cheminEffacer="/agenda?vue=calendrier"
      />,
    );
    expect(calendrier).toMatch(/<a href="\/agenda"[^>]*>Consulter la liste des événements/);
  });
});

describe("BanniereAgenda", () => {
  const base: DonneesBanniere = {
    id: "11111111-1111-4111-8111-111111111111",
    titre: "[DÉMO] Laboratoire partenaire",
    annonceur: "[DÉMO] Annonceur",
    texteAlternatif: null,
    imagePath: null,
    urlImage: null,
    lienPasserelle: "/go/emplacement/11111111-1111-4111-8111-111111111111?from=/agenda",
    dateDebut: "2026-10-01",
    dateFin: "2026-12-31",
  };

  it("mention « Publicité » visible, nommant la zone ; lien natif par la passerelle", () => {
    const html = renderToStaticMarkup(<BanniereAgenda banniere={base} />);
    expect(html).toMatch(/<aside aria-labelledby="mention-publicite-agenda"/);
    expect(html).toMatch(
      /<p id="mention-publicite-agenda" class="(?![^"]*sr-only)[^"]*">Publicité<\/p>/,
    );
    expect(html).toContain(
      '<a href="/go/emplacement/11111111-1111-4111-8111-111111111111?from=/agenda" rel="sponsored noopener noreferrer"',
    );
    expect(compter(html, /<a /g)).toBe(1);
    // Sans visuel : bannière typographique (titre et annonceur en texte).
    expect(html).not.toContain("<img");
    expect(html).toContain("[DÉMO] Laboratoire partenaire");
    expect(html).toContain("[DÉMO] Annonceur");
    expect(html).toContain("Consulter le site de l’annonceur");
  });

  it("avec visuel : texte alternatif saisi, à défaut le titre", () => {
    const avecImage = { ...base, urlImage: "https://exemple.test/publicite.webp" };
    expect(renderToStaticMarkup(<BanniereAgenda banniere={avecImage} />)).toContain(
      'alt="[DÉMO] Laboratoire partenaire"',
    );
    expect(
      renderToStaticMarkup(
        <BanniereAgenda banniere={{ ...avecImage, texteAlternatif: "Affiche du partenaire" }} />,
      ),
    ).toContain('alt="Affiche du partenaire"');
  });

  it("avec visuel et lien : « (site externe) » dans le lien, en texte masqué, alt inchangé", () => {
    const html = renderToStaticMarkup(
      <BanniereAgenda banniere={{ ...base, urlImage: "https://exemple.test/publicite.webp" }} />,
    );
    const lien = html.match(/<a [^>]*>.*<\/a>/)?.[0] ?? "";
    expect(lien).toContain('<span class="sr-only"> (site externe)</span></a>');
    expect(lien).toContain('alt="[DÉMO] Laboratoire partenaire"');
    expect(texteVisible(lien)).toBe("");
  });

  it("avec visuel sans lien sûr : aucune mention (rien n'est cliquable)", () => {
    const html = renderToStaticMarkup(
      <BanniereAgenda
        banniere={{
          ...base,
          urlImage: "https://exemple.test/publicite.webp",
          lienPasserelle: null,
        }}
      />,
    );
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("site externe");
  });

  it("sans lien sûr : bannière non cliquable", () => {
    const html = renderToStaticMarkup(
      <BanniereAgenda banniere={{ ...base, lienPasserelle: null }} />,
    );
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("Consulter le site de l’annonceur");
    expect(html).toContain("Publicité");
  });
});
