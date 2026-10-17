// Textes calculés de l'annuaire (`/societes`, spécifications 8.1) : nombre
// d'organisations, description des filtres actifs, résumé des résultats lu
// par les lecteurs d'écran. Fonctions pures, testées (`annuaire.test.tsx`,
// même dossier). Espace insécable (U+00A0) avant « : », « ? » et à
// l'intérieur des guillemets, comme ailleurs sur le site.

const nombres = new Intl.NumberFormat("fr-FR");
const listes = new Intl.ListFormat("fr", { style: "long", type: "conjunction" });

/** Nombre écrit à la française (« 1 234 », espace fine insécable). */
export function formaterNombre(nombre: number): string {
  return nombres.format(nombre);
}

/** Texte entre guillemets français, espaces insécables à l'intérieur. */
export function entreGuillemets(texte: string): string {
  return `« ${texte} »`;
}

/**
 * Ligne d'en-tête de l'annuaire : « Aucune organisation référencée pour le
 * moment », « 1 organisation référencée », « 38 organisations référencées ».
 */
export function texteNombreOrganisations(nombre: number): string {
  if (nombre <= 0) return "Aucune organisation référencée pour le moment";
  if (nombre === 1) return "1 organisation référencée";
  return `${formaterNombre(nombre)} organisations référencées`;
}

/** Filtres actifs, sous leur forme lisible (nom de la discipline, de la ville…). */
export type FiltresLisibles = {
  discipline: string | null;
  ville: string | null;
  categorie: string | null;
  q: string | null;
};

/**
 * Description de chaque filtre actif, dans l'ordre du formulaire :
 * « discipline « Santé » », « ville « Cotonou » », « catégorie « Société
 * savante » », « recherche « pédiatrie » ». Liste vide sans filtre.
 */
export function decrireFiltresActifs(filtres: FiltresLisibles): string[] {
  const descriptions: string[] = [];
  if (filtres.discipline) descriptions.push(`discipline ${entreGuillemets(filtres.discipline)}`);
  if (filtres.ville) descriptions.push(`ville ${entreGuillemets(filtres.ville)}`);
  if (filtres.categorie) descriptions.push(`catégorie ${entreGuillemets(filtres.categorie)}`);
  if (filtres.q) descriptions.push(`recherche ${entreGuillemets(filtres.q)}`);
  return descriptions;
}

export type DonneesResume = {
  /** Nombre d'organisations qui correspondent aux filtres. */
  total: number;
  /** Page affichée (à partir de 1). */
  page: number;
  /** Nombre de pages (0 si aucun résultat). */
  pages: number;
  /** Descriptions des filtres actifs (`decrireFiltresActifs`). */
  filtres: readonly string[];
};

/**
 * Résumé des résultats, annoncé poliment par les lecteurs d'écran à chaque
 * changement de filtre ou de page : nombre de résultats (0, 1 et pluriel),
 * filtres actifs, puis « Page 2 sur 3. » s'il y a plusieurs pages.
 */
export function resumeResultats({ total, page, pages, filtres }: DonneesResume): string {
  let phrase: string;
  if (filtres.length === 0) {
    if (total <= 0) {
      phrase = "Aucune organisation n’est encore référencée.";
    } else {
      const organisations =
        total === 1 ? "1 organisation" : `${formaterNombre(total)} organisations`;
      phrase = `Aucun filtre appliqué : ${organisations}.`;
    }
  } else {
    const criteres = listes.format(filtres);
    if (total <= 0) {
      phrase = `Aucune organisation ne correspond à vos filtres : ${criteres}.`;
    } else if (total === 1) {
      phrase = `1 organisation correspond à vos filtres : ${criteres}.`;
    } else {
      phrase = `${formaterNombre(total)} organisations correspondent à vos filtres : ${criteres}.`;
    }
  }
  return pages > 1 ? `${phrase} Page ${page} sur ${pages}.` : phrase;
}
