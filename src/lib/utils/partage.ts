// Liens de partage et d'ajout à un agenda de la fiche événement
// (spécifications, sections 8.4, 10.3 et 10.4) : Google Agenda, WhatsApp,
// carte OpenStreetMap. Fonctions pures, testées (`partage.test.ts`).
//
// Ces liens ne passent PAS par la passerelle /go : ils ne mènent pas au site
// d'une organisation ou d'un annonceur (section 10.1), et leur adresse est
// construite ici, jamais saisie par un utilisateur. Sur la page, les afficher
// en `<a>` avec `target="_blank"` et `rel="noopener noreferrer nofollow"`
// (section 6 : liens externes hors /go).
//
// Plage horaire : la même que le fichier .ics (`plageEvenement`, ics.ts) —
// journées entières (fin exclusive) sans heure ou sur plusieurs jours, sinon
// début et fin (début + 1 h) à l'heure de Porto-Novo avec `ctz`.
import { formaterPeriode } from "@/lib/utils/dates";
import { lieuAgenda } from "@/lib/utils/evenements";
import {
  FUSEAU_HORAIRE,
  dateCompacte,
  descriptionAgenda,
  instantCompact,
  plageEvenement,
  type EvenementExportable,
} from "@/lib/utils/ics";

/** Paramètre `dates` de Google Agenda : « AAAAMMJJ/AAAAMMJJ » ou « AAAAMMJJTHHMMSS/AAAAMMJJTHHMMSS ». */
export function datesGoogleAgenda(
  evenement: Pick<EvenementExportable, "dateDebut" | "dateFin" | "heureDebut">,
): string {
  const plage = plageEvenement(evenement);
  return plage.journeeEntiere
    ? `${dateCompacte(plage.debut)}/${dateCompacte(plage.finExclusive)}`
    : `${instantCompact(plage.debut)}/${instantCompact(plage.fin)}`;
}

/**
 * Lien « Ajouter à Google Agenda » (section 10.3) :
 * `https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=…&details=…&location=…`
 * - `dates` : `AAAAMMJJ/AAAAMMJJ` (fin EXCLUSIVE : lendemain du dernier jour)
 *   pour un événement sur journées entières ou de plusieurs jours ;
 *   `AAAAMMJJTHHMMSS/AAAAMMJJTHHMMSS` suivi de `&ctz=Africa/Porto-Novo` (non encodé) pour
 *   un événement d'un jour avec une heure (fin = début + 1 h) ;
 * - `details` : la même description que le .ics (`descriptionAgenda`) ;
 * - `location` : `lieuAgenda` (« En ligne » pour un événement en ligne),
 *   omis s'il n'y a aucun lieu.
 * Valeurs encodées par `encodeURIComponent` (espaces en `%20`, accents en
 * UTF-8). `urlFiche` : adresse ABSOLUE de la fiche.
 */
export function lienGoogleAgenda(evenement: EvenementExportable, urlFiche: string): string {
  const plage = plageEvenement(evenement);
  const parametres: [string, string][] = [
    ["action", "TEMPLATE"],
    ["text", evenement.titre.replace(/\s+/g, " ").trim()],
    ["dates", datesGoogleAgenda(evenement)],
    ["details", descriptionAgenda(evenement, urlFiche)],
  ];
  const lieu = lieuAgenda(evenement);
  if (lieu) parametres.push(["location", lieu]);
  if (!plage.journeeEntiere) parametres.push(["ctz", FUSEAU_HORAIRE]);
  const requete = parametres
    .map(([cle, valeur]) =>
      // « / » laissé lisible dans `dates` et `ctz` (forme documentée par
      // Google ; valeurs sans caractère à encoder, construites ici).
      cle === "dates" || cle === "ctz"
        ? `${cle}=${valeur}`
        : `${cle}=${encodeURIComponent(valeur)}`,
    )
    .join("&");
  return `https://calendar.google.com/calendar/render?${requete}`;
}

/**
 * Lieu glissé dans la phrase WhatsApp, ou `null` (segment omis) : en
 * minuscules pour un libellé fixe pris au milieu d'une phrase (« en ligne »,
 * « en présentiel et en ligne ») ; présentiel sans lieu connu : `null`.
 */
function lieuEnPhrase(evenement: EvenementExportable): string | null {
  if (evenement.modalite === "en_ligne") return "en ligne";
  const lieu = lieuAgenda({ ...evenement, adresse: null, pays: null });
  if (evenement.modalite === "hybride" && (lieu === null || lieu === "En ligne")) {
    return "en présentiel et en ligne";
  }
  return lieu;
}

/**
 * Texte partagé sur WhatsApp (section 10.4) :
 * « {titre} — {dates}, {lieu}. Détails : {url de la fiche} »
 * - `{dates}` : `formaterPeriode` (« du 12 au 14 mars 2027 ») ;
 * - `{lieu}` : nom du lieu et ville (« Palais des congrès, Cotonou »),
 *   « en ligne », « Cotonou et en ligne » ; présentiel sans lieu connu : le
 *   segment « , {lieu} » est omis ;
 * - espace insécable avant « : », tiret cadratin « — ».
 */
export function texteWhatsApp(evenement: EvenementExportable, urlFiche: string): string {
  const titre = evenement.titre.replace(/\s+/g, " ").trim();
  const dates = formaterPeriode(evenement.dateDebut, evenement.dateFin);
  const lieu = lieuEnPhrase(evenement);
  return `${titre} — ${dates}${lieu ? `, ${lieu}` : ""}. Détails : ${urlFiche}`;
}

/**
 * Lien « Partager sur WhatsApp » (section 10.4) :
 * `https://wa.me/?text=` + `texteWhatsApp(...)` encodé
 * (`encodeURIComponent`). L'aperçu (image) vient de l'image Open Graph de la
 * fiche, que WhatsApp lit à l'adresse `urlFiche`.
 */
export function lienWhatsApp(evenement: EvenementExportable, urlFiche: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texteWhatsApp(evenement, urlFiche))}`;
}

/**
 * Lien « Voir sur la carte » (section 8.4), vers la recherche d'OpenStreetMap :
 * `https://www.openstreetmap.org/search?query={lieu, adresse, ville, pays}`.
 * `null` (pas de lien) sans adresse ni ville : un nom de lieu seul
 * (« Palais des congrès ») est trop ambigu pour une recherche. Le nom du
 * lieu et le pays (`options`) précisent la recherche quand ils sont connus.
 */
export function lienCarte(
  adresse: string | null | undefined,
  ville: string | null | undefined,
  options: { lieuNom?: string | null; pays?: string | null } = {},
): string | null {
  const propre = (valeur: string | null | undefined) => valeur?.replace(/\s+/g, " ").trim() ?? "";
  if (!propre(adresse) && !propre(ville)) return null;
  const vues = new Set<string>();
  const requete = [options.lieuNom, adresse, ville, options.pays]
    .map(propre)
    .filter((partie) => {
      const cle = partie.toLocaleLowerCase("fr");
      if (!partie || vues.has(cle)) return false;
      vues.add(cle);
      return true;
    })
    .join(", ");
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(requete)}`;
}
