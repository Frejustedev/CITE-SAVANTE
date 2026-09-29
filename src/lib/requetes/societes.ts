import "server-only";

// Lecture publique : les organisations publiées (annuaire, spécifications
// section 8.1). Filtre EXPLICITE sur `statut = 'publie'`, même si la RLS
// l'impose déjà (CLAUDE.md, section 6 : « Seul le statut publie est visible
// du public. Toute requête publique filtre explicitement sur ce statut »).
// Mises en avant d'abord, puis ordre alphabétique du sigle — comme le lira
// la page `/societes` (phase 2). Les filtres de cette page (discipline,
// ville, catégorie, recherche) et la pagination par 24 viendront avec elle :
// cette fonction ne fait, pour l'instant, que la lecture de base.
//
// Règle de rendu : mis en cache (`societes` + `disciplines`, puisque chaque
// société embarque ses disciplines), invalidé par
// `invalider(ETIQUETTES.SOCIETES, ETIQUETTES.DISCIPLINES)` après toute
// écriture sur `societes` ou `societe_disciplines` (server actions de
// l'espace gestionnaire, phase 5, et du back-office, phase 6 : organisations,
// modération, demandes de gestion).
import { unstable_cache } from "next/cache";

import { ETIQUETTES } from "@/lib/cache";
import { creerClientPublic } from "@/lib/supabase/public";
import type { Enums } from "@/lib/supabase/types";

export type SocieteAnnuaire = {
  id: string;
  slug: string;
  sigle: string;
  nomComplet: string | null;
  categorie: Enums<"categorie_organisation">;
  ville: string | null;
  logoPath: string | null;
  miseEnAvant: boolean;
  disciplines: { id: string; slug: string; nom: string }[];
};

const SELECTION_SOCIETE_PUBLIEE = `
  id,
  slug,
  sigle,
  nom_complet,
  categorie,
  ville,
  logo_path,
  mise_en_avant,
  societe_disciplines ( disciplines ( id, slug, nom ) )
` as const;

const listerSocietesPublieesEnCache = unstable_cache(
  async (): Promise<SocieteAnnuaire[]> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("societes")
      .select(SELECTION_SOCIETE_PUBLIEE)
      .eq("statut", "publie")
      .order("mise_en_avant", { ascending: false })
      .order("sigle", { ascending: true });

    if (error) {
      throw new Error(`Lecture des sociétés publiées impossible : ${error.message}`);
    }

    return data.map((societe) => ({
      id: societe.id,
      slug: societe.slug,
      sigle: societe.sigle,
      nomComplet: societe.nom_complet,
      categorie: societe.categorie,
      ville: societe.ville,
      logoPath: societe.logo_path,
      miseEnAvant: societe.mise_en_avant,
      // `societe_disciplines.discipline_id` est NOT NULL : supabase-js infère
      // `disciplines` comme un objet non nul.
      disciplines: societe.societe_disciplines.map((rattachement) => rattachement.disciplines),
    }));
  },
  ["requetes/societes/lister-societes-publiees"],
  { tags: [ETIQUETTES.SOCIETES, ETIQUETTES.DISCIPLINES] },
);

/**
 * Organisations publiées (sigle, nom, slug, ville, catégorie, logo, mise en
 * avant, disciplines), mises en avant d'abord puis triées par sigle.
 */
export async function listerSocietesPubliees(): Promise<SocieteAnnuaire[]> {
  return listerSocietesPublieesEnCache();
}
