import type { NextConfig } from "next";

type MotifDistant = {
  protocol: "http" | "https";
  hostname: string;
  port: string;
  pathname: string;
  search: string;
};

/** Buckets publics dont `next/image` peut optimiser les images (migration 7). */
const BUCKETS_PUBLICS = ["logos", "affiches", "publicites"] as const;

/**
 * Images du stockage Supabase (src/lib/stockage.ts) : un motif par bucket
 * public, limité à l'hôte, au port et au protocole de
 * `NEXT_PUBLIC_SUPABASE_URL` (projet distant en https, ou API locale
 * `http://127.0.0.1:54321` en développement), sans chaîne de requête.
 * Variable absente ou invalide (build sans base) : aucun motif, le build
 * réussit et aucune image distante n'est acceptée.
 *
 * `hoteLocal` : Next.js 16 refuse d'optimiser une image dont l'hôte se résout
 * en adresse privée (`images.dangerouslyAllowLocalIP`, protection contre la
 * falsification de requêtes côté serveur). On ne l'autorise que si l'API
 * Supabase configurée est elle-même sur la boucle locale (localhost,
 * 127.x.x.x, [::1]) : les motifs ci-dessus restreignent alors l'optimiseur à
 * ce seul hôte, ce port et ces trois chemins publics. En production
 * (`https://….supabase.co`), la protection reste active.
 */
function imagesSupabase(): { motifs: MotifDistant[]; hoteLocal: boolean } {
  const brute = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!brute) return { motifs: [], hoteLocal: false };

  let url: URL;
  try {
    url = new URL(brute);
  } catch {
    return { motifs: [], hoteLocal: false };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    return { motifs: [], hoteLocal: false };

  const protocole = url.protocol === "https:" ? "https" : "http";
  const prefixe = url.pathname.replace(/\/+$/, "");
  const motifs = BUCKETS_PUBLICS.map((bucket) => ({
    protocol: protocole,
    hostname: url.hostname,
    port: url.port,
    pathname: `${prefixe}/storage/v1/object/public/${bucket}/**`,
    search: "",
  })) satisfies MotifDistant[];

  const hote = url.hostname;
  const hoteLocal =
    hote === "localhost" || hote.endsWith(".localhost") || /^127\./.test(hote) || hote === "[::1]";

  return { motifs, hoteLocal };
}

const supabase = imagesSupabase();

const nextConfig: NextConfig = {
  images: {
    // CLAUDE.md, section 6 : images en AVIF ou WebP.
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabase.motifs,
    dangerouslyAllowLocalIP: supabase.hoteLocal,
  },
};

export default nextConfig;
