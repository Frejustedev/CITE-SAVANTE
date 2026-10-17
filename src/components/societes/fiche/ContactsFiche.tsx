import type { ReactNode } from "react";

import { Carte } from "@/components/mise-en-page/Carte";
import { PictoEmail, PictoLienExterne, PictoTelephone, PictoWhatsApp } from "@/components/pictos";
import type { SocieteFiche } from "@/lib/requetes/societes";
import { cx } from "@/lib/utils/classes";
import { libellesReseaux } from "@/lib/utils/reseaux";
import { hrefCourriel } from "@/lib/utils/urls";

import { hrefTelephoneInternational } from "./utilitaires";

type ContactsFicheProps = {
  societe: Pick<SocieteFiche, "email" | "telephone" | "pays" | "reseaux">;
  className?: string;
};

function Element({ picto, children }: { picto: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 shrink-0 text-bordeaux">{picto}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/**
 * Bloc « Contacts » de la fiche (spécifications 8.2), en carte :
 * - e-mail en lien `mailto:` (`hrefCourriel` : une adresse de forme douteuse
 *   reste affichée, sans lien) ;
 * - téléphone affiché tel que saisi, en lien `tel:` au format international
 *   (`hrefTelephoneInternational` : sans lien si le pays du numéro ne peut
 *   pas être établi) ;
 * - réseaux sociaux de la colonne `reseaux`, déjà réduits par
 *   `normaliserReseaux` aux seuls liens `https://` sûrs. Liens directs (ils
 *   ne passent pas par `/go`), donc `rel="noopener noreferrer nofollow"`
 *   (section 6), même onglet, caractère externe dit en toutes lettres.
 * Sans aucune coordonnée : une phrase sobre.
 */
export function ContactsFiche({ societe, className }: ContactsFicheProps) {
  const email = societe.email;
  const lienCourriel = hrefCourriel(email);
  const telephone = societe.telephone;
  const lienTelephone = hrefTelephoneInternational(telephone, societe.pays);
  const aucun = !email && !telephone && societe.reseaux.length === 0;

  return (
    <Carte as="section" aria-labelledby="contacts-titre" className={cx("min-w-0", className)}>
      <h2
        id="contacts-titre"
        className="font-titre text-lg leading-tight font-medium text-bordeaux-profond"
      >
        Contacts
      </h2>

      {aucun ? (
        <p className="mt-3">Aucune coordonnée publique pour le moment.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {email ? (
            <Element picto={<PictoEmail taille={20} />}>
              <span className="sr-only">E-mail : </span>
              {lienCourriel ? (
                <a href={lienCourriel} className="break-all">
                  {email}
                </a>
              ) : (
                <span className="break-all">{email}</span>
              )}
            </Element>
          ) : null}

          {telephone ? (
            <Element picto={<PictoTelephone taille={20} />}>
              <span className="sr-only">Téléphone : </span>
              {lienTelephone ? (
                <a href={lienTelephone} className="tabular-nums">
                  {telephone}
                </a>
              ) : (
                <span className="tabular-nums">{telephone}</span>
              )}
            </Element>
          ) : null}

          {societe.reseaux.map((lien) => (
            <Element
              key={lien.reseau}
              picto={
                lien.reseau === "whatsapp" ? (
                  <PictoWhatsApp taille={20} />
                ) : (
                  <PictoLienExterne taille={20} />
                )
              }
            >
              <a href={lien.url} rel="noopener noreferrer nofollow">
                {libellesReseaux[lien.reseau]}
                <span className="sr-only"> (site externe)</span>
              </a>
            </Element>
          ))}
        </ul>
      )}
    </Carte>
  );
}
