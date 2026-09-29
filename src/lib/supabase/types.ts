// =============================================================================
// src/lib/supabase/types.ts — GÉNÉRÉ, ne pas modifier à la main
// =============================================================================
// Produit par `node scripts/generer-types.mjs` (`pnpm db:types`), au même
// format que « supabase gen types --lang=typescript --linked --schema public »
// (PROGRESS.md, phase 1, point 5, en donne le détail et les choix de format).
// Base source : citesavante_correctifs (grappe locale, port 54390).
// Régénérer après toute migration : PG_DB=... bash scripts/valider-base.sh
// puis PG_DB=... pnpm db:types.
// =============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      clics_sortants: {
        Row: {
          id: number;
          cible_type: Database["public"]["Enums"]["type_cible"];
          cible_id: string;
          url: string;
          page_origine: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          cible_type: Database["public"]["Enums"]["type_cible"];
          cible_id: string;
          url: string;
          page_origine?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          cible_type?: Database["public"]["Enums"]["type_cible"];
          cible_id?: string;
          url?: string;
          page_origine?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      demandes_contact: {
        Row: {
          id: string;
          type: Database["public"]["Enums"]["type_demande_contact"];
          nom: string;
          organisation: string | null;
          email: string;
          telephone: string | null;
          offre: string | null;
          message: string;
          traitee: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: Database["public"]["Enums"]["type_demande_contact"];
          nom: string;
          organisation?: string | null;
          email: string;
          telephone?: string | null;
          offre?: string | null;
          message: string;
          traitee?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: Database["public"]["Enums"]["type_demande_contact"];
          nom?: string;
          organisation?: string | null;
          email?: string;
          telephone?: string | null;
          offre?: string | null;
          message?: string;
          traitee?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      disciplines: {
        Row: {
          id: string;
          slug: string;
          nom: string;
          description: string | null;
          ordre: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          nom: string;
          description?: string | null;
          ordre?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          nom?: string;
          description?: string | null;
          ordre?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      echeances: {
        Row: {
          id: string;
          evenement_id: string;
          type: Database["public"]["Enums"]["type_echeance"];
          libelle: string | null;
          date_limite: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          evenement_id: string;
          type: Database["public"]["Enums"]["type_echeance"];
          libelle?: string | null;
          date_limite: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          evenement_id?: string;
          type?: Database["public"]["Enums"]["type_echeance"];
          libelle?: string | null;
          date_limite?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "echeances_evenement_id_fkey";
            columns: ["evenement_id"];
            isOneToOne: false;
            referencedRelation: "evenements";
            referencedColumns: ["id"];
          },
        ];
      };
      emplacements_pub: {
        Row: {
          id: string;
          type: Database["public"]["Enums"]["type_emplacement"];
          titre: string;
          annonceur: string;
          image_path: string | null;
          texte_alternatif: string | null;
          lien: string | null;
          discipline_id: string | null;
          evenement_id: string | null;
          date_debut: string;
          date_fin: string;
          actif: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: Database["public"]["Enums"]["type_emplacement"];
          titre: string;
          annonceur: string;
          image_path?: string | null;
          texte_alternatif?: string | null;
          lien?: string | null;
          discipline_id?: string | null;
          evenement_id?: string | null;
          date_debut: string;
          date_fin: string;
          actif?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: Database["public"]["Enums"]["type_emplacement"];
          titre?: string;
          annonceur?: string;
          image_path?: string | null;
          texte_alternatif?: string | null;
          lien?: string | null;
          discipline_id?: string | null;
          evenement_id?: string | null;
          date_debut?: string;
          date_fin?: string;
          actif?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emplacements_pub_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "disciplines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emplacements_pub_evenement_id_fkey";
            columns: ["evenement_id"];
            isOneToOne: false;
            referencedRelation: "evenements";
            referencedColumns: ["id"];
          },
        ];
      };
      evenement_disciplines: {
        Row: {
          evenement_id: string;
          discipline_id: string;
        };
        Insert: {
          evenement_id: string;
          discipline_id: string;
        };
        Update: {
          evenement_id?: string;
          discipline_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evenement_disciplines_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "disciplines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evenement_disciplines_evenement_id_fkey";
            columns: ["evenement_id"];
            isOneToOne: false;
            referencedRelation: "evenements";
            referencedColumns: ["id"];
          },
        ];
      };
      evenement_societes: {
        Row: {
          evenement_id: string;
          societe_id: string;
          role: Database["public"]["Enums"]["role_organisation"];
        };
        Insert: {
          evenement_id: string;
          societe_id: string;
          role?: Database["public"]["Enums"]["role_organisation"];
        };
        Update: {
          evenement_id?: string;
          societe_id?: string;
          role?: Database["public"]["Enums"]["role_organisation"];
        };
        Relationships: [
          {
            foreignKeyName: "evenement_societes_evenement_id_fkey";
            columns: ["evenement_id"];
            isOneToOne: false;
            referencedRelation: "evenements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evenement_societes_societe_id_fkey";
            columns: ["societe_id"];
            isOneToOne: false;
            referencedRelation: "societes";
            referencedColumns: ["id"];
          },
        ];
      };
      evenements: {
        Row: {
          id: string;
          slug: string;
          titre: string;
          type: Database["public"]["Enums"]["type_evenement"];
          resume: string | null;
          description: string | null;
          date_debut: string;
          date_fin: string;
          heure_debut: string | null;
          modalite: Database["public"]["Enums"]["modalite_evenement"];
          lieu_nom: string | null;
          adresse: string | null;
          ville: string | null;
          pays: string;
          lien_inscription: string | null;
          site_web: string | null;
          affiche_path: string | null;
          tarifs: string | null;
          gratuit: boolean;
          credits_fmc: string | null;
          contact_email: string | null;
          statut: Database["public"]["Enums"]["statut_publication"];
          source: Database["public"]["Enums"]["source_evenement"];
          source_ref: string | null;
          cree_par: string | null;
          soumis_par_nom: string | null;
          soumis_par_email: string | null;
          recherche: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          titre: string;
          type: Database["public"]["Enums"]["type_evenement"];
          resume?: string | null;
          description?: string | null;
          date_debut: string;
          date_fin: string;
          heure_debut?: string | null;
          modalite?: Database["public"]["Enums"]["modalite_evenement"];
          lieu_nom?: string | null;
          adresse?: string | null;
          ville?: string | null;
          pays?: string;
          lien_inscription?: string | null;
          site_web?: string | null;
          affiche_path?: string | null;
          tarifs?: string | null;
          gratuit?: boolean;
          credits_fmc?: string | null;
          contact_email?: string | null;
          statut?: Database["public"]["Enums"]["statut_publication"];
          source?: Database["public"]["Enums"]["source_evenement"];
          source_ref?: string | null;
          cree_par?: string | null;
          soumis_par_nom?: string | null;
          soumis_par_email?: string | null;
          recherche?: never;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          titre?: string;
          type?: Database["public"]["Enums"]["type_evenement"];
          resume?: string | null;
          description?: string | null;
          date_debut?: string;
          date_fin?: string;
          heure_debut?: string | null;
          modalite?: Database["public"]["Enums"]["modalite_evenement"];
          lieu_nom?: string | null;
          adresse?: string | null;
          ville?: string | null;
          pays?: string;
          lien_inscription?: string | null;
          site_web?: string | null;
          affiche_path?: string | null;
          tarifs?: string | null;
          gratuit?: boolean;
          credits_fmc?: string | null;
          contact_email?: string | null;
          statut?: Database["public"]["Enums"]["statut_publication"];
          source?: Database["public"]["Enums"]["source_evenement"];
          source_ref?: string | null;
          cree_par?: string | null;
          soumis_par_nom?: string | null;
          soumis_par_email?: string | null;
          recherche?: never;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gestionnaires: {
        Row: {
          id: string;
          user_id: string;
          societe_id: string;
          statut: Database["public"]["Enums"]["statut_demande"];
          fonction: string | null;
          message: string | null;
          decide_par: string | null;
          decide_le: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          societe_id: string;
          statut?: Database["public"]["Enums"]["statut_demande"];
          fonction?: string | null;
          message?: string | null;
          decide_par?: string | null;
          decide_le?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          societe_id?: string;
          statut?: Database["public"]["Enums"]["statut_demande"];
          fonction?: string | null;
          message?: string | null;
          decide_par?: string | null;
          decide_le?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gestionnaires_societe_id_fkey";
            columns: ["societe_id"];
            isOneToOne: false;
            referencedRelation: "societes";
            referencedColumns: ["id"];
          },
        ];
      };
      journal_moderation: {
        Row: {
          id: number;
          objet_type: string;
          objet_id: string;
          action: string;
          motif: string | null;
          auteur: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          objet_type: string;
          objet_id: string;
          action: string;
          motif?: string | null;
          auteur?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          objet_type?: string;
          objet_id?: string;
          action?: string;
          motif?: string | null;
          auteur?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profils: {
        Row: {
          id: string;
          nom: string | null;
          role: Database["public"]["Enums"]["role_utilisateur"];
          de_confiance: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          nom?: string | null;
          role?: Database["public"]["Enums"]["role_utilisateur"];
          de_confiance?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string | null;
          role?: Database["public"]["Enums"]["role_utilisateur"];
          de_confiance?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      societe_disciplines: {
        Row: {
          societe_id: string;
          discipline_id: string;
        };
        Insert: {
          societe_id: string;
          discipline_id: string;
        };
        Update: {
          societe_id?: string;
          discipline_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "societe_disciplines_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "disciplines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "societe_disciplines_societe_id_fkey";
            columns: ["societe_id"];
            isOneToOne: false;
            referencedRelation: "societes";
            referencedColumns: ["id"];
          },
        ];
      };
      societes: {
        Row: {
          id: string;
          slug: string;
          sigle: string;
          nom_complet: string | null;
          categorie: Database["public"]["Enums"]["categorie_organisation"];
          description: string | null;
          annee_creation: number | null;
          ville: string | null;
          pays: string;
          site_web: string | null;
          site_congres: string | null;
          email: string | null;
          telephone: string | null;
          reseaux: Json;
          logo_path: string | null;
          statut: Database["public"]["Enums"]["statut_publication"];
          mise_en_avant: boolean;
          soumis_par_nom: string | null;
          soumis_par_email: string | null;
          recherche: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          sigle: string;
          nom_complet?: string | null;
          categorie?: Database["public"]["Enums"]["categorie_organisation"];
          description?: string | null;
          annee_creation?: number | null;
          ville?: string | null;
          pays?: string;
          site_web?: string | null;
          site_congres?: string | null;
          email?: string | null;
          telephone?: string | null;
          reseaux?: Json;
          logo_path?: string | null;
          statut?: Database["public"]["Enums"]["statut_publication"];
          mise_en_avant?: boolean;
          soumis_par_nom?: string | null;
          soumis_par_email?: string | null;
          recherche?: never;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          sigle?: string;
          nom_complet?: string | null;
          categorie?: Database["public"]["Enums"]["categorie_organisation"];
          description?: string | null;
          annee_creation?: number | null;
          ville?: string | null;
          pays?: string;
          site_web?: string | null;
          site_congres?: string | null;
          email?: string | null;
          telephone?: string | null;
          reseaux?: Json;
          logo_path?: string | null;
          statut?: Database["public"]["Enums"]["statut_publication"];
          mise_en_avant?: boolean;
          soumis_par_nom?: string | null;
          soumis_par_email?: string | null;
          recherche?: never;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tentatives_formulaires: {
        Row: {
          id: number;
          empreinte: string;
          formulaire: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          empreinte: string;
          formulaire: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          empreinte?: string;
          formulaire?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      aujourdhui: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      auteur_soumission: {
        Args: {
          p_objet_type: string;
          p_objet_id: string;
        };
        Returns: {
          nom: string;
          email: string;
        }[];
      };
      est_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      est_moderateur: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      gere_evenement: {
        Args: {
          eid: string;
        };
        Returns: boolean;
      };
      gere_societe: {
        Args: {
          sid: string;
        };
        Returns: boolean;
      };
      rechercher: {
        Args: {
          q: string;
          limite?: number;
        };
        Returns: {
          type: string;
          id: string;
          slug: string;
          titre: string;
          sous_titre: string;
          rang: number;
        }[];
      };
      role_courant: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["role_utilisateur"];
      };
    };
    Enums: {
      categorie_organisation:
        "societe_savante" | "institution_academique" | "association_professionnelle" | "autre";
      modalite_evenement: "presentiel" | "en_ligne" | "hybride";
      role_organisation: "organisateur" | "co_organisateur" | "partenaire";
      role_utilisateur: "admin" | "moderateur" | "gestionnaire";
      source_evenement: "manuel" | "synchro";
      statut_demande: "en_attente" | "acceptee" | "refusee";
      statut_publication: "brouillon" | "en_attente" | "publie" | "refuse" | "archive";
      type_cible: "societe" | "evenement" | "emplacement";
      type_demande_contact: "contact" | "visibilite";
      type_echeance:
        | "soumission_resumes"
        | "inscription_tarif_preferentiel"
        | "inscription"
        | "bourse"
        | "prix"
        | "autre";
      type_emplacement:
        | "banniere_accueil"
        | "banniere_agenda"
        | "banniere_discipline"
        | "evenement_en_avant"
        | "lettre";
      type_evenement:
        | "congres"
        | "journees"
        | "colloque"
        | "seminaire"
        | "atelier"
        | "webinaire"
        | "formation"
        | "autre";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      categorie_organisation: [
        "societe_savante",
        "institution_academique",
        "association_professionnelle",
        "autre",
      ],
      modalite_evenement: ["presentiel", "en_ligne", "hybride"],
      role_organisation: ["organisateur", "co_organisateur", "partenaire"],
      role_utilisateur: ["admin", "moderateur", "gestionnaire"],
      source_evenement: ["manuel", "synchro"],
      statut_demande: ["en_attente", "acceptee", "refusee"],
      statut_publication: ["brouillon", "en_attente", "publie", "refuse", "archive"],
      type_cible: ["societe", "evenement", "emplacement"],
      type_demande_contact: ["contact", "visibilite"],
      type_echeance: [
        "soumission_resumes",
        "inscription_tarif_preferentiel",
        "inscription",
        "bourse",
        "prix",
        "autre",
      ],
      type_emplacement: [
        "banniere_accueil",
        "banniere_agenda",
        "banniere_discipline",
        "evenement_en_avant",
        "lettre",
      ],
      type_evenement: [
        "congres",
        "journees",
        "colloque",
        "seminaire",
        "atelier",
        "webinaire",
        "formation",
        "autre",
      ],
    },
  },
} as const;
