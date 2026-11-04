import Link from "next/link";

import {
  MENTION_URGENTE,
  precisionGroupe,
  texteJoursRestants,
} from "@/components/echeances/libelles";
import { Badge } from "@/components/mise-en-page/Badge";
import { TitreSection } from "@/components/mise-en-page/TitreSection";
import type { GroupeEcheances } from "@/lib/utils/calendrier";
import { cx } from "@/lib/utils/classes";
import { formaterDate } from "@/lib/utils/dates";
import { libelleEcheance, type EcheanceAVenir } from "@/lib/utils/evenements";

export type LigneEcheanceProps = {
  echeance: EcheanceAVenir;
};

/**
 * Une échéance (spécifications 8.5) : date limite, jours restants
 * (« Clôture dans 5 jours ») avec le badge « Urgente » or à 7 jours ou moins
 * (texte encre sur or, section 7), type ou libellé de l'échéance, titre de
 * l'événement (lien vers sa fiche) et organisateur principal (lien vers sa
 * fiche). Empilé sur mobile ; à partir de 768 px, la date à gauche et
 * l'événement à droite. Jours restants et urgence viennent de la lecture
 * (`listerEcheancesAVenir`), calculés pour le même « aujourd'hui » que le
 * groupement.
 */
export function LigneEcheance({ echeance }: LigneEcheanceProps) {
  const organisateur = echeance.organisateurPrincipal;
  return (
    <li className="grid gap-x-8 gap-y-2 py-5 md:grid-cols-[16rem_minmax(0,1fr)]">
      <div>
        <p className="font-titre text-lg leading-tight font-medium text-bordeaux-profond tabular-nums">
          <span className="sr-only">{"Date limite : "}</span>
          <time dateTime={echeance.dateLimite}>{formaterDate(echeance.dateLimite)}</time>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-base tabular-nums">
          <span>{texteJoursRestants(echeance.joursRestants)}</span>
          {echeance.urgente ? <Badge variante="urgent">{MENTION_URGENTE}</Badge> : null}
        </p>
      </div>
      <div className="min-w-0">
        <p className="petites-capitales text-base leading-snug text-bordeaux">
          {libelleEcheance(echeance)}
        </p>
        <p className="mt-1 font-titre text-lg leading-snug font-medium text-pretty break-words">
          <Link href={`/agenda/${echeance.evenement.slug}`}>{echeance.evenement.titre}</Link>
        </p>
        {organisateur ? (
          <p className="mt-1 text-base">
            Organisé par{" "}
            <Link href={`/societes/${organisateur.slug}`} className="break-words">
              {organisateur.sigle}
            </Link>
          </p>
        ) : null}
      </div>
    </li>
  );
}

export type ListeEcheancesProps = {
  /** Groupes de `grouperEcheancesParSemaine`, dans l'ordre. */
  groupes: readonly GroupeEcheances<EcheanceAVenir>[];
  /** Date du jour à Porto-Novo (« AAAA-MM-JJ »), celle du groupement. */
  aujourdhui: string;
  className?: string;
};

/**
 * Échéances groupées (spécifications 8.5) : « Cette semaine », « Semaine
 * prochaine », puis un groupe par mois. Chaque groupe est une section
 * titrée (`h2`) et une liste ordonnée, de la date limite la plus proche à
 * la plus lointaine.
 */
export function ListeEcheances({ groupes, aujourdhui, className }: ListeEcheancesProps) {
  return (
    <div className={cx("space-y-10 md:space-y-12", className)}>
      {groupes.map((groupe) => {
        const idTitre = `echeances-${groupe.cle}`;
        const precision = precisionGroupe(groupe.cle, aujourdhui);
        return (
          <section key={groupe.cle} aria-labelledby={idTitre}>
            <TitreSection id={idTitre}>{groupe.titre}</TitreSection>
            {precision ? <p className="mt-3 text-base italic">{precision}</p> : null}
            <ol className="divide-y divide-or">
              {groupe.echeances.map((echeance) => (
                <LigneEcheance key={echeance.id} echeance={echeance} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
