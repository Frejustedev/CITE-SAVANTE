import { Fragment, type ReactNode } from "react";

import { Carte } from "@/components/mise-en-page/Carte";
import { PictoEmail } from "@/components/pictos";
import { paragraphes } from "@/components/societes/fiche/utilitaires";
import { cx } from "@/lib/utils/classes";
import type { EvenementFiche } from "@/lib/utils/evenements";
import { hrefCourriel } from "@/lib/utils/urls";

type ParticipationProps = {
  evenement: Pick<EvenementFiche, "tarifs" | "gratuit" | "creditsFmc" | "contactEmail">;
  className?: string;
};

/** Texte libre en paragraphes (lignes vides) et lignes (`<br>`), affiché comme du texte. */
function TexteLibre({ texte }: { texte: string }) {
  return (
    <>
      {paragraphes(texte).map((lignes, index) => (
        <p key={index} className={index > 0 ? "mt-2" : undefined}>
          {lignes.map((ligne, rang) => (
            <Fragment key={rang}>
              {rang > 0 ? <br /> : null}
              {ligne}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}

function Ligne({ terme, children }: { terme: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="petites-capitales text-base text-bordeaux">{terme}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}

/**
 * Bloc « Participation » de la fiche événement (spécifications 8.4), en
 * carte : tarifs (texte libre ; « Participation gratuite » en tête si
 * l'événement est gratuit), crédits de formation médicale continue, contact
 * (lien `mailto:` si l'adresse a une forme sûre, `hrefCourriel` ; sinon
 * affichée sans lien). Les textes libres restent du texte (React les
 * échappe). Un événement non gratuit sans tarifs n'est pas dit « payant » :
 * la ligne est simplement omise. Sans aucune information : une phrase sobre.
 */
export function Participation({ evenement, className }: ParticipationProps) {
  const { tarifs, gratuit, creditsFmc, contactEmail } = evenement;
  const lienCourriel = hrefCourriel(contactEmail);
  const aucune = !tarifs && !gratuit && !creditsFmc && !contactEmail;

  return (
    <Carte as="section" aria-labelledby="participation-titre" className={cx("min-w-0", className)}>
      <h2
        id="participation-titre"
        className="font-titre text-lg leading-tight font-medium text-bordeaux-profond"
      >
        Participation
      </h2>

      {aucune ? (
        <p className="mt-3">Les conditions de participation ne sont pas encore précisées.</p>
      ) : (
        <dl className="mt-4 space-y-4">
          {gratuit || tarifs ? (
            <Ligne terme="Tarifs">
              {gratuit ? <p className="font-medium">Participation gratuite</p> : null}
              {tarifs ? (
                <div className={gratuit ? "mt-2" : undefined}>
                  <TexteLibre texte={tarifs} />
                </div>
              ) : null}
            </Ligne>
          ) : null}

          {creditsFmc ? (
            <Ligne terme="Crédits de formation médicale continue">
              <TexteLibre texte={creditsFmc} />
            </Ligne>
          ) : null}

          {contactEmail ? (
            <Ligne terme="Contact">
              <span className="flex items-start gap-2">
                <PictoEmail taille={20} className="mt-1 shrink-0 text-bordeaux" />
                <span className="sr-only">E-mail : </span>
                {lienCourriel ? (
                  <a href={lienCourriel} className="break-all">
                    {contactEmail}
                  </a>
                ) : (
                  <span className="break-all">{contactEmail}</span>
                )}
              </span>
            </Ligne>
          ) : null}
        </dl>
      )}
    </Carte>
  );
}
