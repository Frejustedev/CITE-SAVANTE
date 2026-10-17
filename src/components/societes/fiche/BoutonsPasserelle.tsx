import { classesBouton } from "@/components/mise-en-page/Bouton";
import { PictoLienExterne } from "@/components/pictos";
import type { SocieteFiche } from "@/lib/requetes/societes";
import { cheminPasserelle, type DestinationPasserelle } from "@/lib/utils/urls";

import { nomHote } from "./utilitaires";

type BoutonsPasserelleProps = {
  societe: Pick<SocieteFiche, "id" | "slug" | "siteWeb" | "siteCongres">;
  className?: string;
};

type LienSortant = {
  vers: DestinationPasserelle<"societe">;
  libelle: string;
  url: string;
  variante: "principal" | "secondaire";
};

/**
 * Boutons « Site officiel » et « Plateforme de congrès » de la fiche
 * (spécifications 8.2), affichés seulement si l'adresse correspondante
 * existe (`siteWeb`, `siteCongres` : déjà filtrées en `https://` sûr par
 * `obtenirSocietePubliee`). Sans aucune des deux, rien n'est affiché : une
 * organisation sans site est une information interne, jamais publique
 * (spécifications, section 7).
 *
 * Chaque bouton passe par la passerelle tracée
 * `/go/societe/{id}?vers=site|congres&from=/societes/{slug}` (section 10.1),
 * par une balise `<a>` NATIVE, jamais `next/link` : le préchargement de
 * `Link` appellerait la route `/go` sans clic et enregistrerait de faux clics
 * dans `clics_sortants`. Ouverture dans le même onglet ; la destination
 * (nom d'hôte) est écrite dans le bouton, puisque l'adresse `/go/…` ne la
 * montre pas au survol, et le caractère externe est dit en toutes lettres
 * (pictogramme, texte pour les lecteurs d'écran, phrase sous les boutons).
 * `rel="noopener noreferrer"` : liens externes saisis par les utilisateurs
 * (section 6) ; pas de `nofollow`, réservé aux liens qui ne passent pas par
 * `/go` (interdit aux robots par `robots.ts`).
 *
 * Mise en forme : aucune classe ajoutée ne contredit celles de
 * `classesBouton` (`justify-center`, `text-center`, `gap-2`), car deux
 * classes Tailwind sur la même propriété ne s'appliquent pas selon leur
 * ordre dans l'attribut. Le texte prend la place libre (`flex-1`, aligné à
 * gauche), ce qui pousse le pictogramme à droite sur toute la largeur.
 */
export function BoutonsPasserelle({ societe, className }: BoutonsPasserelleProps) {
  const liens: LienSortant[] = [];
  if (societe.siteWeb) {
    liens.push({
      vers: "site",
      libelle: "Site officiel",
      url: societe.siteWeb,
      variante: "principal",
    });
  }
  if (societe.siteCongres) {
    liens.push({
      vers: "congres",
      libelle: "Plateforme de congrès",
      url: societe.siteCongres,
      variante: liens.length === 0 ? "principal" : "secondaire",
    });
  }
  if (liens.length === 0) return null;

  const origine = `/societes/${societe.slug}`;

  return (
    <div className={className}>
      <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {liens.map((lien) => {
          const hote = nomHote(lien.url);
          return (
            <li key={lien.vers}>
              <a
                href={cheminPasserelle(
                  { type: "societe", id: societe.id, vers: lien.vers },
                  origine,
                )}
                rel="noopener noreferrer"
                className={classesBouton(lien.variante, "w-full sm:w-auto sm:min-w-56")}
              >
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span>{lien.libelle}</span>
                  {hote ? (
                    <span className="text-sm font-normal break-all">
                      <span className="sr-only">, vers </span>
                      {hote}
                    </span>
                  ) : null}
                </span>
                <PictoLienExterne taille={18} className="shrink-0" />
                <span className="sr-only"> (site externe)</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm italic">
        {liens.length > 1
          ? "Ces liens mènent vers des sites extérieurs à Cité Savante."
          : "Ce lien mène vers un site extérieur à Cité Savante."}
      </p>
    </div>
  );
}
