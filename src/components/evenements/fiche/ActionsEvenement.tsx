import { classesBouton } from "@/components/mise-en-page/Bouton";
import { PictoLienExterne, PictoWhatsApp } from "@/components/pictos";
import { nomHote } from "@/components/societes/fiche/utilitaires";
import { cx } from "@/lib/utils/classes";
import type { EvenementFiche } from "@/lib/utils/evenements";
import { lienWhatsApp } from "@/lib/utils/partage";
import { premiereLettreMajuscule } from "@/lib/utils/texte";
import { cheminPasserelle, type DestinationPasserelle } from "@/lib/utils/urls";

import { MenuAjoutAgenda } from "./MenuAjoutAgenda";
import { MENTION_SITE_EXTERNE_NOUVEL_ONGLET } from "./utilitaires";

type ActionsEvenementProps = {
  evenement: EvenementFiche;
  /** Adresse ABSOLUE de la fiche (`urlAbsolue("/agenda/{slug}")`) : agenda et partage. */
  urlFiche: string;
  /** Événement passé (`date_fin` avant aujourd'hui) : ni inscription ni ajout à l'agenda. */
  passe: boolean;
  className?: string;
};

type LienSortant = {
  vers: DestinationPasserelle<"evenement">;
  libelle: string;
  url: string;
  variante: "principal" | "secondaire";
};

/**
 * Boutons de la fiche événement (spécifications 8.4).
 *
 * 1. « S'inscrire » et « Site de l'événement », seulement si l'adresse
 *    correspondante existe (`lienInscription`, `siteWeb` : déjà filtrées en
 *    `https://` sûr par `obtenirEvenementPublie`), par la passerelle tracée
 *    `/go/evenement/{id}?vers=inscription|site&from=/agenda/{slug}`
 *    (section 10.1), en `<a>` NATIF, jamais `next/link` : le préchargement
 *    appellerait `/go` sans clic et enregistrerait de faux clics. Même onglet,
 *    nom d'hôte écrit dans le bouton (l'adresse `/go/…` ne montre pas la
 *    destination), caractère externe dit en toutes lettres (pictogramme,
 *    texte pour les lecteurs d'écran, phrase sous les boutons) ;
 *    `rel="noopener noreferrer"`, sans `nofollow` (réservé aux liens hors
 *    `/go`), comme les boutons de la fiche organisation.
 * 2. « Partager sur WhatsApp » (`lienWhatsApp`, section 10.4) et le menu
 *    « Ajouter à mon agenda » (`MenuAjoutAgenda`) : liens construits par le
 *    site, hors `/go` (ce ne sont pas des sites d'organisations), donc
 *    `rel="noopener noreferrer nofollow"`, nouvel onglet annoncé.
 *
 * Événement passé (choix de la fiche) : « S'inscrire » et « Ajouter à mon
 * agenda » sont retirés (plus d'inscription possible, rien à mettre dans un
 * agenda) ; « Site de l'événement » (actes, photos…) et le partage restent.
 * Le menu est placé en DERNIER dans sa rangée : en se dépliant, il ne
 * déplace aucun autre bouton.
 */
export function ActionsEvenement({ evenement, urlFiche, passe, className }: ActionsEvenementProps) {
  const liens: LienSortant[] = [];
  if (evenement.lienInscription && !passe) {
    liens.push({
      vers: "inscription",
      libelle: "S’inscrire",
      url: evenement.lienInscription,
      variante: "principal",
    });
  }
  if (evenement.siteWeb) {
    liens.push({
      vers: "site",
      libelle: "Site de l’événement",
      url: evenement.siteWeb,
      variante: liens.length === 0 ? "principal" : "secondaire",
    });
  }

  const origine = `/agenda/${evenement.slug}`;

  return (
    <div className={cx("min-w-0", className)}>
      {liens.length > 0 ? (
        <div className="mb-6">
          <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {liens.map((lien) => {
              const hote = nomHote(lien.url);
              return (
                <li key={lien.vers}>
                  <a
                    href={cheminPasserelle(
                      { type: "evenement", id: evenement.id, vers: lien.vers },
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
      ) : null}

      <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        <li>
          <a
            href={lienWhatsApp(evenement, urlFiche)}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={classesBouton("secondaire", "w-full sm:w-auto")}
          >
            <PictoWhatsApp taille={18} className="shrink-0" />
            <span className="flex min-w-0 flex-col text-left">
              <span>Partager sur WhatsApp</span>
              <span className="text-sm font-normal">
                {premiereLettreMajuscule(MENTION_SITE_EXTERNE_NOUVEL_ONGLET)}
              </span>
            </span>
          </a>
        </li>
        {passe ? null : (
          <li className="min-w-0">
            <MenuAjoutAgenda slug={evenement.slug} evenement={evenement} urlFiche={urlFiche} />
          </li>
        )}
      </ul>
    </div>
  );
}
