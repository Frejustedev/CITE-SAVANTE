// URL publiques des fichiers des buckets Supabase (spécifications, section
// 5.7) : `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/<bucket>/<chemin>`.
// Les trois buckets sont publics : leurs fichiers se lisent par cette URL
// sans aucune politique (migration 7).
//
// Convention de chemin (à respecter par les envois de la phase 5) : la
// colonne (`societes.logo_path`, `evenements.affiche_path`,
// `emplacements_pub.image_path`) contient le chemin RELATIF AU BUCKET,
// `{identifiant}/{horodatage}.webp`, sans le nom du bucket. Par tolérance, un
// préfixe égal au nom du bucket (`logos/{id}/….webp`) est retiré. Tout chemin
// suspect (`..`, segment vide ou commençant par un point, « / » initial,
// caractère hors [A-Za-z0-9._-]) donne `null` : l'appelant affiche alors un
// substitut (monogramme). Les URL de `next/image` doivent aussi être
// autorisées par `images.remotePatterns` (next.config.ts).
import { envPublic } from "@/lib/env";

/** Buckets publics du projet (migration 7). */
export type BucketPublic = "logos" | "affiches" | "publicites";

const SEGMENT_SUR = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const LONGUEUR_MAX_CHEMIN = 300;

/**
 * Chemin d'objet validé (segments sûrs, préfixe du bucket retiré), ou `null`.
 * Exportée pour les tests et pour valider un chemin avant écriture.
 */
export function cheminObjetValide(
  bucket: BucketPublic,
  chemin: string | null | undefined,
): string | null {
  if (!chemin || chemin.length > LONGUEUR_MAX_CHEMIN) return null;
  const relatif = chemin.startsWith(`${bucket}/`) ? chemin.slice(bucket.length + 1) : chemin;
  const segments = relatif.split("/");
  if (segments.length === 0 || !segments.every((segment) => SEGMENT_SUR.test(segment))) return null;
  if (segments.some((segment) => segment.includes(".."))) return null;
  return relatif;
}

/**
 * URL publique d'un fichier d'un bucket, ou `null` si le chemin est vide ou
 * suspect. Lève une erreur si les variables publiques sont absentes
 * (`envPublic()`), comme toute lecture de la base.
 */
export function urlPubliqueStockage(
  bucket: BucketPublic,
  chemin: string | null | undefined,
): string | null {
  const relatif = cheminObjetValide(bucket, chemin);
  if (!relatif) return null;
  const base = envPublic().supabaseUrl.replace(/\/+$/, "");
  const encode = relatif.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encode}`;
}

/** URL publique du logo d'une organisation (`societes.logo_path`), ou `null`. */
export function urlLogo(logoPath: string | null | undefined): string | null {
  return urlPubliqueStockage("logos", logoPath);
}
