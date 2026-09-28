import { Conteneur } from "@/components/mise-en-page/Conteneur";

/**
 * Accueil provisoire (phase 0) : la phrase d'ouverture prévue par les
 * spécifications (section 9.1) et la mention « Site en construction ».
 * Le Plan de la Cité arrive en phase 4.
 */
export default function Accueil() {
  return (
    <Conteneur className="py-16 md:py-28">
      <h1 className="max-w-[22ch] font-titre text-2xl leading-[1.15] font-medium tracking-[-0.01em] text-balance text-bordeaux-profond md:text-3xl">
        Toutes les sociétés savantes et tous les congrès scientifiques du Bénin, au même endroit.
      </h1>
      <p className="mt-10 flex items-center gap-4 text-base text-encre italic">
        <span aria-hidden="true" className="h-px w-12 bg-or" />
        Site en construction.
      </p>
    </Conteneur>
  );
}
