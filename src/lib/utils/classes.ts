/**
 * Assemble des noms de classes en ignorant les valeurs vides
 * (`false`, `null`, `undefined`, chaîne vide). Quelques lignes maison plutôt
 * qu'une dépendance (`clsx`) : c'est tout ce dont les composants ont besoin.
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
