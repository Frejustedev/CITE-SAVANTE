// Réseaux sociaux d'une organisation (`societes.reseaux`, objet JSON
// `{ facebook, linkedin, x, youtube, whatsapp }`, spécifications 5.3).
//
// La base n'impose que « un objet JSON » (contrainte `societes_reseaux_objet`,
// migration 3) : le format de chaque valeur n'est pas fixé (PROGRESS.md,
// « À valider par le porteur (phase 1) »). Avant tout affichage, chaque valeur
// est donc filtrée ici : seuls les liens `https://` sûrs sont gardés
// (spécifications, section 6 : liens externes en `https://` uniquement).
// WhatsApp : un lien `https://` est gardé tel quel ; un numéro au format
// international (« + » suivi de 8 à 15 chiffres, espaces et tirets permis)
// devient `https://wa.me/<chiffres>` ; un numéro sans indicatif est ignoré
// (impossible de savoir à quel pays il appartient).
import { estUrlHttpsSure } from "@/lib/utils/urls";

/** Réseaux reconnus, dans l'ordre d'affichage. */
export const RESEAUX = ["facebook", "linkedin", "x", "youtube", "whatsapp"] as const;

export type Reseau = (typeof RESEAUX)[number];

/** Libellés affichés (noms propres des services). */
export const libellesReseaux: Record<Reseau, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
};

/** Lien vers un réseau social, toujours une URL `https://` sûre. */
export type LienReseau = { reseau: Reseau; url: string };

function lienWhatsApp(valeur: string): string | null {
  if (estUrlHttpsSure(valeur)) return valeur;
  const compact = valeur.trim().replace(/[\s-]/g, "");
  return /^\+\d{8,15}$/.test(compact) ? `https://wa.me/${compact.slice(1)}` : null;
}

/**
 * Convertit la valeur brute de `societes.reseaux` en liste de liens sûrs,
 * dans l'ordre de `RESEAUX` ; clés inconnues, valeurs non textuelles et liens
 * non `https://` ignorés. Ne lève jamais d'erreur.
 */
export function normaliserReseaux(brut: unknown): LienReseau[] {
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) return [];
  const valeurs = brut as Record<string, unknown>;
  return RESEAUX.flatMap((reseau) => {
    const valeur = valeurs[reseau];
    if (typeof valeur !== "string" || valeur.trim() === "") return [];
    const url = reseau === "whatsapp" ? lienWhatsApp(valeur) : valeur.trim();
    return url && estUrlHttpsSure(url) ? [{ reseau, url }] : [];
  });
}
