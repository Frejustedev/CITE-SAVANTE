import "server-only";

// Lecture publique des emplacements publicitaires actifs (spécifications,
// sections 7, 8.3 et 6) : mises en avant d'événements (`evenement_en_avant`,
// en tête de l'agenda avec la mention « Mis en avant ») et bannière de
// l'agenda (`banniere_agenda`, signalée « Publicité »).
//
// Filtre EXPLICITE sur `actif` et sur la période (`date_debut <= aujourd'hui
// <= date_fin`, Porto-Novo), même si la RLS l'impose déjà à `anon`
// (CLAUDE.md, section 6). Colonnes listées (jamais `select("*")`).
//
// Règle de rendu : mis en cache (`unstable_cache`), clé = « aujourd'hui »
// passé en ARGUMENT par l'appelant (un emplacement commence ou finit à minuit
// à Porto-Novo), étiquette `emplacements`, durée de validité de 5 minutes.
// Le cache stocke du JSON : la lecture renvoie des TABLEAUX (jamais de
// `Set`, qui deviendrait `{}`).
//
// Liens : jamais l'URL de l'annonceur en direct ; toujours la passerelle
// `/go/emplacement/{id}?from=…` (section 10.1), qui vérifie de nouveau que
// l'emplacement est actif, compte le clic et ajoute les UTM.
import { unstable_cache } from "next/cache";

import { DUREE_VALIDITE_CACHE, ETIQUETTES } from "@/lib/cache";
import { urlPublicite } from "@/lib/stockage";
import { creerClientPublic } from "@/lib/supabase/public";
import type { Enums } from "@/lib/supabase/types";
import { lireDateIso } from "@/lib/utils/dates";
import { cheminPasserelle, estUrlHttpsSure } from "@/lib/utils/urls";

/** Bannière publicitaire de l'agenda (section 8.3), à signaler « Publicité ». */
export type BanniereAgenda = {
  id: string;
  titre: string;
  annonceur: string;
  /** Texte alternatif du visuel saisi par l'administrateur, ou `null` (alors `alt` = titre). */
  texteAlternatif: string | null;
  /** Chemin relatif au bucket `publicites`, ou `null`. */
  imagePath: string | null;
  /** URL publique du visuel (`urlPublicite`), ou `null` : afficher alors le titre en texte. */
  urlImage: string | null;
  /**
   * Lien tracé `/go/emplacement/{id}?from=/agenda` (`<a>` natif, jamais
   * `next/link`), ou `null` si l'emplacement n'a pas de lien `https://` sûr
   * (bannière sans lien).
   */
  lienPasserelle: string | null;
  /** « AAAA-MM-JJ ». */
  dateDebut: string;
  /** « AAAA-MM-JJ ». */
  dateFin: string;
};

/** Emplacements actifs ce jour-là, utiles à l'agenda. */
export type EmplacementsActifs = {
  /** Identifiants des événements mis en avant (`evenement_en_avant` actifs), sans doublon. */
  evenementsEnAvant: string[];
  /** Bannières `banniere_agenda` actives, la plus récemment commencée d'abord ; afficher la première. */
  bannieresAgenda: BanniereAgenda[];
};

type LigneEmplacement = {
  id: string;
  type: Enums<"type_emplacement">;
  titre: string;
  annonceur: string;
  image_path: string | null;
  texte_alternatif: string | null;
  lien: string | null;
  evenement_id: string | null;
  date_debut: string;
  date_fin: string;
  actif: boolean;
};

const TYPES_LUS = [
  "evenement_en_avant",
  "banniere_agenda",
] as const satisfies readonly Enums<"type_emplacement">[];

const lireEmplacementsActifsEnCache = unstable_cache(
  async (aujourdhui: string): Promise<LigneEmplacement[]> => {
    const supabase = creerClientPublic();
    const { data, error } = await supabase
      .from("emplacements_pub")
      .select(
        "id, type, titre, annonceur, image_path, texte_alternatif, lien, evenement_id, date_debut, date_fin, actif",
      )
      .eq("actif", true)
      .lte("date_debut", aujourdhui)
      .gte("date_fin", aujourdhui)
      .in("type", TYPES_LUS)
      .order("date_debut", { ascending: false })
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Lecture des emplacements actifs impossible : ${error.message}`);
    }
    return data;
  },
  ["requetes/emplacements/lire-emplacements-actifs"],
  { tags: [ETIQUETTES.EMPLACEMENTS], revalidate: DUREE_VALIDITE_CACHE },
);

/**
 * Emplacements actifs le jour `aujourdhui` (« AAAA-MM-JJ », Porto-Novo,
 * calculé par l'appelant avec `aujourdhuiPortoNovo()`) : identifiants des
 * événements mis en avant et bannières de l'agenda (lien par la passerelle,
 * `from=/agenda`). Une mise en avant d'un événement non publié est sans
 * effet : seuls les événements déjà lus (publiés) sont marqués.
 */
export async function lireEmplacementsActifs(aujourdhui: string): Promise<EmplacementsActifs> {
  lireDateIso(aujourdhui);
  const lignes = await lireEmplacementsActifsEnCache(aujourdhui);
  // Seconde vérification (CLAUDE.md, section 6) : actif dans sa période.
  const actives = lignes.filter(
    (ligne) => ligne.actif && ligne.date_debut <= aujourdhui && ligne.date_fin >= aujourdhui,
  );

  const evenementsEnAvant = [
    ...new Set(
      actives.flatMap((ligne) =>
        ligne.type === "evenement_en_avant" && ligne.evenement_id ? [ligne.evenement_id] : [],
      ),
    ),
  ];

  const bannieresAgenda = actives
    .filter((ligne) => ligne.type === "banniere_agenda")
    .map((ligne) => ({
      id: ligne.id,
      titre: ligne.titre,
      annonceur: ligne.annonceur,
      texteAlternatif: ligne.texte_alternatif?.trim() || null,
      imagePath: ligne.image_path,
      urlImage: urlPublicite(ligne.image_path),
      lienPasserelle: estUrlHttpsSure(ligne.lien)
        ? cheminPasserelle({ type: "emplacement", id: ligne.id }, "/agenda")
        : null,
      dateDebut: ligne.date_debut,
      dateFin: ligne.date_fin,
    }));

  return { evenementsEnAvant, bannieresAgenda };
}
