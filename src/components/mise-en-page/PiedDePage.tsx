import Link from "next/link";
import { PictoEmail, PictoLienExterne } from "@/components/pictos";
import { site } from "@/config/site";
import { Conteneur } from "./Conteneur";

type LienPied = { libelle: string; href: string };

const liensSite: LienPied[] = [
  { libelle: "À propos", href: "/a-propos" },
  { libelle: "Contact", href: "/contact" },
  { libelle: "Référencer", href: "/referencer" },
  { libelle: "Visibilité", href: "/visibilite" },
];

const liensLegaux: LienPied[] = [
  { libelle: "Mentions légales", href: "/mentions-legales" },
  { libelle: "Confidentialité", href: "/confidentialite" },
];

// Les liens du pied de page doivent porter leur couleur eux-mêmes : la règle
// de base `a { color: bordeaux }` ne se transmet pas par héritage.
const classesLien =
  "text-creme no-underline decoration-or-clair underline-offset-4 hover:text-or-clair hover:underline";

function ColonneLiens({ titre, liens }: { titre: string; liens: LienPied[] }) {
  return (
    <div>
      <h2 className="petites-capitales border-b border-or/60 pb-2 font-texte text-base font-medium text-or-clair">
        {titre}
      </h2>
      <ul className="mt-3 flex flex-col">
        {liens.map((lien) => (
          <li key={lien.href}>
            <Link href={lien.href} className={`${classesLien} inline-flex min-h-10 items-center`}>
              {lien.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Pied de page (charte, section 4.4) : fond bordeaux profond, texte crème ;
 * liens institutionnels, slogan, contact et signature de conception
 * (texte et lien définis dans `src/config/site.ts`).
 */
export function PiedDePage() {
  return (
    <footer className="bg-bordeaux-profond text-creme">
      <Conteneur className="pt-12 pb-8 md:pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
          <div className="col-span-2 md:col-span-1">
            <p className="font-titre text-xl leading-none font-bold tracking-[-0.01em]">
              {site.nom}
            </p>
            <p className="mt-3 max-w-[40ch] text-base leading-snug text-pretty italic">
              {site.slogan}
            </p>
          </div>
          <ColonneLiens titre="Le site" liens={liensSite} />
          <ColonneLiens titre="Informations légales" liens={liensLegaux} />
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-or/60 pt-5 text-sm md:flex-row md:items-center md:justify-between">
          <p>
            <a
              href={`mailto:${site.emailContact}`}
              className={`${classesLien} inline-flex min-h-10 items-center gap-2`}
            >
              <PictoEmail taille={18} className="shrink-0 text-or-clair" />
              {site.emailContact}
            </a>
          </p>
          <p>
            <a
              href={site.signature.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${classesLien} inline-flex min-h-10 items-center gap-1.5`}
            >
              {site.signature.texte}
              <PictoLienExterne taille={16} className="shrink-0 text-or-clair" />
              <span className="sr-only">(s’ouvre dans un nouvel onglet)</span>
            </a>
          </p>
        </div>
      </Conteneur>
    </footer>
  );
}
