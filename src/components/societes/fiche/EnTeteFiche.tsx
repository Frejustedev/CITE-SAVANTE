import Link from "next/link";
import type { ReactNode } from "react";

import { LogoSociete } from "@/components/societes/LogoSociete";
import type { SocieteFiche } from "@/lib/requetes/societes";
import { categorieOrganisationLabels } from "@/lib/textes";
import { cx } from "@/lib/utils/classes";

import { BoutonsPasserelle } from "./BoutonsPasserelle";
import { estPaysBenin, nomCompletDistinct } from "./utilitaires";

type EnTeteFicheProps = {
  societe: SocieteFiche;
  className?: string;
};

function Ligne({ terme, children }: { terme: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="petites-capitales text-base text-bordeaux">{terme}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/**
 * En-tête de la fiche organisation (spécifications 8.2) : logo (ou
 * monogramme), puis le SEUL `h1` de la page, qui contient le sigle (en
 * grand) et le nom complet (en dessous, séparés pour les lecteurs d'écran
 * par une virgule) — le nom accessible de la page identifie ainsi
 * l'organisation sans ambiguïté (deux sigles peuvent se ressembler), comme
 * le titre des cartes de l'annuaire. Viennent ensuite la catégorie, les
 * disciplines (liens vers `/disciplines/{slug}`), la ville (et le pays s'il
 * n'est pas le Bénin), l'année de création, puis les boutons de la
 * passerelle.
 */
export function EnTeteFiche({ societe, className }: EnTeteFicheProps) {
  const nom = nomCompletDistinct(societe);
  const ville = societe.ville?.trim() || null;
  const paysEtranger = estPaysBenin(societe.pays) ? null : societe.pays.trim() || null;
  const lieu = [ville, paysEtranger].filter(Boolean).join(", ");

  return (
    <header className={cx("min-w-0", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <LogoSociete
          sigle={societe.sigle}
          logoPath={societe.logoPath}
          taille={128}
          preload
          className="size-20 sm:size-28 md:size-32"
        />
        <h1 className="min-w-0 font-titre text-bordeaux-profond">
          <span className="block text-2xl leading-[1.1] font-medium tracking-[-0.01em] break-words md:text-3xl">
            {societe.sigle}
          </span>
          {nom ? (
            <>
              <span className="sr-only">, </span>
              <span className="mt-2 block font-texte text-lg leading-snug font-normal text-balance text-encre md:text-xl">
                {nom}
              </span>
            </>
          ) : null}
        </h1>
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Ligne terme="Catégorie">{categorieOrganisationLabels[societe.categorie]}</Ligne>
        {societe.disciplines.length > 0 ? (
          <Ligne terme={societe.disciplines.length > 1 ? "Disciplines" : "Discipline"}>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {societe.disciplines.map((discipline) => (
                <li key={discipline.id}>
                  <Link href={`/disciplines/${discipline.slug}`}>{discipline.nom}</Link>
                </li>
              ))}
            </ul>
          </Ligne>
        ) : null}
        {lieu ? <Ligne terme={ville ? "Ville" : "Pays"}>{lieu}</Ligne> : null}
        {societe.anneeCreation !== null ? (
          <Ligne terme="Année de création">
            <span className="tabular-nums">{societe.anneeCreation}</span>
          </Ligne>
        ) : null}
      </dl>

      <BoutonsPasserelle societe={societe} className="mt-8" />
    </header>
  );
}
