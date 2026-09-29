import "server-only";

// Lecture publique : la liste des disciplines (« quartiers » du Plan de la
// Cité, spécifications section 9.2), triée par `ordre`. Toutes les
// disciplines sont publiques par nature (la table n'a pas de colonne
// `statut`) : rien à filtrer ici, contrairement aux sociétés et aux
// événements.
//
// Règle de rendu (CLAUDE.md section 6, PROGRESS.md phase 1) : mis en cache
// avec `unstable_cache`, étiqueté `disciplines`, invalidé par
// `invalider(ETIQUETTES.DISCIPLINES)` depuis la server action qui écrit sur
// cette table : l'écran « Disciplines » du back-office, réservé aux
// administrateurs (phase 6, spécifications section 13). Aucune avant.
import { unstable_cache } from "next/cache";

import { ETIQUETTES } from "@/lib/cache";
import { creerClientPublic } from "@/lib/supabase/public";
import type { Tables } from "@/lib/supabase/types";

export type Discipline = Tables<"disciplines">;

const listerDisciplinesEnCache = unstable_cache(
  async (): Promise<Discipline[]> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("disciplines")
      .select("*")
      .order("ordre", { ascending: true });

    if (error) {
      throw new Error(`Lecture des disciplines impossible : ${error.message}`);
    }
    return data;
  },
  ["requetes/disciplines/lister-disciplines"],
  { tags: [ETIQUETTES.DISCIPLINES] },
);

/** Toutes les disciplines, triées par `ordre` (spécifications, section 9.2). */
export async function listerDisciplines(): Promise<Discipline[]> {
  return listerDisciplinesEnCache();
}
