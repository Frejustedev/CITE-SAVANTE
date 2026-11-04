import { Badge } from "@/components/mise-en-page/Badge";
import { typeEvenementLabels, type TypeEvenement } from "@/lib/textes";

type BadgeTypeEvenementProps = {
  type: TypeEvenement;
  className?: string;
};

/**
 * Badge du type d'un événement (charte, section 4.3) : texte bordeaux sur
 * or clair, petites capitales (« Congrès », « Webinaire »…). Libellés de
 * `typeEvenementLabels` (src/lib/textes.ts). Carte, fiche et agenda.
 */
export function BadgeTypeEvenement({ type, className }: BadgeTypeEvenementProps) {
  return <Badge className={className}>{typeEvenementLabels[type]}</Badge>;
}
