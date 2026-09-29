// Date du jour dans le fuseau Africa/Porto-Novo (UTC+1, sans heure d'été),
// pour le code TypeScript qui doit correspondre à `public.aujourdhui()` côté
// SQL (supabase/migrations/20260928000400_fonctions_declencheurs.sql,
// PROGRESS.md, phase 1, décision 2) : le serveur tourne en UTC, et
// `current_date`/`new Date()` y donnent encore la veille entre minuit et 1 h
// à Porto-Novo.
//
// `maintenant` est un paramètre (par défaut `new Date()`) plutôt qu'un appel
// interne : cela rend la fonction testable (voir dates.test.ts) et permet de
// la passer en argument à une fonction mise en cache (`unstable_cache`), où
// elle doit être calculée AVANT l'entrée en cache pour faire partie de la
// clé (src/lib/requetes/evenements.ts).

/** Date du jour à Porto-Novo, au format « AAAA-MM-JJ ». */
export function aujourdhuiPortoNovo(maintenant: Date = new Date()): string {
  const parties = new Intl.DateTimeFormat("fr", {
    timeZone: "Africa/Porto-Novo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(maintenant);

  const valeur = (type: "year" | "month" | "day") =>
    parties.find((partie) => partie.type === type)?.value ?? "";

  return `${valeur("year")}-${valeur("month")}-${valeur("day")}`;
}
