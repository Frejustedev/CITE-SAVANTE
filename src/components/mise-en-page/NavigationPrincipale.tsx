"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PictoFleche } from "@/components/pictos";
import { navigation } from "@/config/site";

type NavigationPrincipaleProps = {
  /** « horizontale » : bandeau de l'en-tête (768 px et plus). « verticale » : menu mobile. */
  disposition: "horizontale" | "verticale";
};

/**
 * Navigation principale (liste `navigation` de `src/config/site.ts`).
 * Composant client pour une seule raison : marquer la rubrique courante avec
 * `aria-current="page"` (via `usePathname`). Les liens restent de simples
 * `<a>` rendus côté serveur : la navigation fonctionne sans JavaScript.
 */
export function NavigationPrincipale({ disposition }: NavigationPrincipaleProps) {
  const chemin = usePathname();
  const horizontale = disposition === "horizontale";

  return (
    <nav aria-label="Navigation principale">
      <ul className={horizontale ? "flex flex-wrap items-center gap-x-9 gap-y-1" : "flex flex-col"}>
        {navigation.map((element) => {
          const actif = chemin === element.href || chemin.startsWith(`${element.href}/`);
          return (
            <li key={element.href} className={horizontale ? undefined : "border-b border-or/50"}>
              <Link
                href={element.href}
                aria-current={actif ? "page" : undefined}
                className={
                  horizontale
                    ? "petites-capitales inline-flex min-h-11 items-center text-base font-medium text-bordeaux no-underline decoration-or decoration-2 underline-offset-[10px] hover:text-bordeaux-profond hover:underline aria-[current=page]:text-bordeaux-profond aria-[current=page]:underline"
                    : "group flex min-h-13 items-center justify-between gap-4 py-2 font-titre text-lg leading-tight font-medium text-bordeaux-profond no-underline hover:text-bordeaux aria-[current=page]:text-bordeaux"
                }
              >
                <span
                  className={
                    horizontale
                      ? undefined
                      : "decoration-or decoration-2 underline-offset-[6px] group-aria-[current=page]:underline"
                  }
                >
                  {element.libelle}
                </span>
                {!horizontale ? <PictoFleche taille={18} className="shrink-0 text-or" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
