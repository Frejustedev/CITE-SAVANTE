import { cx } from "@/lib/utils/classes";
import {
  INTERLIGNE_DEUX_LIGNES,
  LARGEUR_TEXTE_MONOGRAMME,
  RAPPORT_CAPITALES,
  disposerMonogramme,
  type DispositionMonogramme,
} from "@/lib/utils/monogramme";

export type MonogrammeProps = {
  /** Sigle de l'organisation (casse conservée ; vide : ornement seul). */
  sigle: string;
  /** Côté du carré, en pixels (64 par défaut). */
  taille?: number;
  /**
   * Nom accessible. Fourni : le monogramme est une image (`role="img"`).
   * Absent (cas courant : le sigle est écrit à côté) : décoratif, masqué
   * aux technologies d'assistance.
   */
  titre?: string;
  className?: string;
};

// Graduations du bas, à la manière de l'échelle d'un plan (hauteur en unités).
const GRADUATIONS: [number, number][] = [
  [30, 2],
  [40, 3],
  [50, 4],
  [60, 3],
  [70, 2],
];

/** Ordonnées des lignes de base : le sigle est centré sur la hauteur de ses capitales (0,7 em). */
function lignesDeBase({ lignes, taillePolice }: DispositionMonogramme): number[] {
  const demiCapitale = (taillePolice * RAPPORT_CAPITALES) / 2;
  if (lignes.length === 2) {
    const ecart = (taillePolice * INTERLIGNE_DEUX_LIGNES) / 2;
    return [50 - ecart + demiCapitale, 50 + ecart + demiCapitale];
  }
  return [50 + demiCapitale];
}

/**
 * Monogramme d'une organisation sans logo (spécifications 8.1) : cartouche
 * de plan d'architecte dessiné au trait fin — double cadre (filet or
 * extérieur, filet bordeaux intérieur), repères d'angle, deux filets or
 * ponctués d'un losange qui encadrent le sigle en Fraunces, graduations
 * d'échelle en pied. Fond crème, sigle bordeaux profond. Traits d'épaisseur
 * constante quelle que soit la taille (`vector-effect: non-scaling-stroke`).
 * Un sigle trop long pour une ligne lisible (en général 5 lettres ou plus)
 * passe sur deux lignes, empilées comme sur un cachet, pour que ses
 * capitales gardent 11 px sur la carte de 64 px ; si ce n'est pas assez, la
 * seule ligne qui déborderait est resserrée de 15 % au plus ; les plus longs
 * sont réduits puis, en dernier recours, compressés
 * (`src/lib/utils/monogramme.ts`) pour toujours tenir dans le cartouche. Le
 * resserrement porte sur la ligne seule (`textLength` sur son `tspan`) : les
 * autres lignes gardent leur chasse.
 * Aucune couleur en dur : classes des jetons de la charte.
 */
export function Monogramme({ sigle, taille = 64, titre, className }: MonogrammeProps) {
  const disposition = disposerMonogramme(sigle);
  const bases = lignesDeBase(disposition);
  const accessible = Boolean(titre);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={taille}
      height={taille}
      role={accessible ? "img" : undefined}
      aria-label={accessible ? titre : undefined}
      aria-hidden={accessible ? undefined : true}
      focusable="false"
      className={cx("shrink-0", className)}
    >
      {accessible ? <title>{titre}</title> : null}

      {/* Fond et double cadre. */}
      <rect x="0" y="0" width="100" height="100" className="fill-creme" />
      <rect
        x="2.5"
        y="2.5"
        width="95"
        height="95"
        fill="none"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        className="stroke-or"
      />
      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        fill="none"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        className="stroke-bordeaux"
      />

      {/* Repères d'angle, entre les deux cadres. */}
      <path
        d="M2.5 8H8V2.5M92 2.5V8h5.5M97.5 92H92v5.5M8 97.5V92H2.5"
        fill="none"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        className="stroke-or"
      />

      {/* Filets du cartouche, ponctués d'un losange. */}
      <path
        d="M20 20H45M55 20H80M20 80H45M55 80H80"
        fill="none"
        strokeWidth="1"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-or"
      />
      <path d="M50 17l3 3-3 3-3-3ZM50 77l3 3-3 3-3-3Z" className="fill-or" />

      {/* Graduations d'échelle, en pied. */}
      <path
        d={GRADUATIONS.map(([x, h]) => `M${x} 92V${92 - h}`).join("")}
        fill="none"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        className="stroke-or"
      />

      {disposition.lignes.length === 0 ? (
        // Sigle vide : un losange au centre, rien d'autre.
        <path
          d="M50 42l8 8-8 8-8-8Z"
          fill="none"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          className="stroke-bordeaux"
        />
      ) : (
        <text
          textAnchor="middle"
          fontSize={disposition.taillePolice}
          fontWeight={500}
          className="fill-bordeaux-profond font-titre"
        >
          {disposition.lignes.map((ligne, index) => (
            <tspan
              key={index}
              x="50"
              y={bases[index]}
              textLength={ligne.compresser ? LARGEUR_TEXTE_MONOGRAMME : undefined}
              lengthAdjust={ligne.compresser ? "spacingAndGlyphs" : undefined}
            >
              {ligne.texte}
            </tspan>
          ))}
        </text>
      )}
    </svg>
  );
}
