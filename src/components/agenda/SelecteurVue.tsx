import Link from "next/link";

import { classesBouton } from "@/components/mise-en-page/Bouton";
import { PictoFleche } from "@/components/pictos";
import { vueAgendaLabels } from "@/lib/textes";
import { cheminAgenda, type FiltresAgenda, type VueAgenda } from "@/lib/utils/agenda";
import { cx } from "@/lib/utils/classes";

const VUES: readonly VueAgenda[] = ["liste", "calendrier"];

export type SelecteurVueProps = {
  /** Filtres réellement appliqués (`resultat.filtres`) : conservés par chaque lien. */
  filtres: FiltresAgenda;
  className?: string;
};

/**
 * Choix de la vue de l'agenda (spécifications 8.3) : deux liens, « Liste »
 * (`?vue=liste`, par défaut) et « Calendrier » (`?vue=calendrier`), qui
 * gardent les filtres en cours ; la vue affichée porte
 * `aria-current="page"` et l'apparence du bouton principal. Des liens
 * plutôt que des onglets ou des boutons : chaque vue a sa propre adresse et
 * fonctionne sans JavaScript.
 *
 * À côté, le lien vers les archives (`?periode=passes`, filtres gardés) ou,
 * dans les archives, le lien de retour vers les événements à venir.
 *
 * `cheminAgenda` omet `mois` hors du calendrier et `periode` dans le
 * calendrier : passer du calendrier à la liste ramène aux événements à
 * venir ; de la liste au calendrier, au mois en cours.
 */
export function SelecteurVue({ filtres, className }: SelecteurVueProps) {
  const archives = filtres.vue === "liste" && filtres.periode === "passes";

  return (
    <div className={cx("flex flex-wrap items-center justify-between gap-x-6 gap-y-4", className)}>
      <nav aria-label="Présentation de l’agenda">
        <ul className="flex flex-wrap gap-2">
          {VUES.map((vue) => {
            const actif = filtres.vue === vue;
            return (
              <li key={vue}>
                <Link
                  href={cheminAgenda({ ...filtres, vue })}
                  aria-current={actif ? "page" : undefined}
                  className={classesBouton(actif ? "principal" : "secondaire", "min-w-32")}
                >
                  {vueAgendaLabels[vue]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p>
        {archives ? (
          <Link
            href={cheminAgenda({ ...filtres, vue: "liste", periode: "a_venir" })}
            className="inline-flex items-center gap-2"
          >
            <PictoFleche direction="gauche" taille={18} className="shrink-0" />
            Revenir aux événements à venir
          </Link>
        ) : (
          <Link
            href={cheminAgenda({ ...filtres, vue: "liste", periode: "passes", mois: null })}
            className="inline-flex items-center gap-2"
          >
            Consulter les événements passés
            <PictoFleche taille={18} className="shrink-0" />
          </Link>
        )}
      </p>
    </div>
  );
}
