// Images d'aperçu (Open Graph, spécifications 10.5), 1 200 × 630 px, PNG,
// dessinées par `ImageResponse` (next/og) : fiche événement, fiche
// organisation et image générique « Cité Savante » (slug inconnu, non publié,
// ou lecture impossible).
//
// Mise en page commune (`Cadre`) : fond crème, cadre et filets or (décor
// seulement : jamais de texte or, charte 4.1), pied « Cité Savante » et
// « citesavante.com ». Couleurs : les 7 jetons de la charte, en
// hexadécimal (`valeurCouleur`, src/lib/charte.ts) — une image ne lit pas
// les variables CSS. Polices : Fraunces et EB Garamond locales
// (`polices.ts`) ; textes déjà nettoyés et coupés par `donnees.ts`.
//
// Règles du moteur (satori) suivies ici : tout élément qui a plus d'un
// enfant porte `display: "flex"` ; un texte long est un bloc
// (`display: "block"`) borné par `lineClamp` (« … » au-delà) ; pas de
// petites capitales (`font-variant` non pris en charge) : capitales et
// interlettrage à la place ; graisse toujours explicite.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { ImageResponse } from "next/og";

import { site } from "@/config/site";
import { DUREE_VALIDITE_CACHE } from "@/lib/cache";
import { valeurCouleur } from "@/lib/charte";
import type { ApercuEvenement, ApercuSociete } from "@/lib/og/donnees";
import { chargerPolicesApercu, FAMILLE_TEXTE, FAMILLE_TITRE } from "@/lib/og/polices";

/** Format des images d'aperçu (spécifications 10.5). */
export const TAILLE_APERCU = { width: 1200, height: 630 };

export const TYPE_CONTENU_APERCU = "image/png";

/**
 * Domaine écrit au pied des images, quel que soit l'environnement (en local,
 * `site.url` vaut `http://localhost:3000`) : `site.domaine`, valeur fixe.
 */
export const MENTION_DOMAINE = site.domaine;

/**
 * `Cache-Control` d'une image servie normalement : 5 minutes, comme les
 * lectures de la base (`DUREE_VALIDITE_CACHE`), puis resservie au plus une
 * heure le temps de la redessiner. Remplace l'en-tête par défaut
 * d'`ImageResponse` en production (`public, immutable, max-age=31536000`) :
 * l'adresse de l'image ne change qu'avec le code de la route (empreinte du
 * fichier), pas avec les données ; un titre corrigé resterait sinon figé un
 * an dans les caches.
 */
export const CACHE_APERCU = `public, max-age=${DUREE_VALIDITE_CACHE}, s-maxage=${DUREE_VALIDITE_CACHE}, stale-while-revalidate=3600`;

/** `Cache-Control` de l'image de secours servie après une erreur de lecture : jamais gardée. */
export const CACHE_APERCU_SECOURS = "no-store";

const COULEUR = valeurCouleur;

/** Marge entre le bord de l'image et le cadre or. */
const MARGE = 24;

/** Badge (type d'événement, catégorie d'organisation) : texte bordeaux sur or clair, comme sur le site. */
function Badge({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        backgroundColor: COULEUR["or-clair"],
        color: COULEUR.bordeaux,
        fontFamily: FAMILLE_TITRE,
        fontWeight: 500,
        fontSize: 24,
        lineHeight: 1,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "7px 14px 8px",
        borderRadius: 4,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Texte sur `lignes` lignes au plus, « … » au-delà. Un mot plus large que
 * la colonne (sigle de 40 lettres, adresse web) est coupé à la largeur de
 * la colonne au lieu de l'élargir (`wordBreak`, `maxWidth`).
 */
function Bloc({
  lignes,
  style,
  children,
}: {
  lignes: number;
  style: CSSProperties;
  children: string;
}) {
  return (
    <div
      style={{
        ...style,
        display: "block",
        maxWidth: "100%",
        wordBreak: "break-word",
        lineClamp: lignes,
      }}
    >
      {children}
    </div>
  );
}

/** Pied : filet or (renforcé à gauche, comme les titres de section du site), nom du site, domaine. */
function Pied({ avecNom = true }: { avecNom?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        alignItems: "flex-end",
        justifyContent: avecNom ? "space-between" : "flex-end",
        marginTop: "auto",
        paddingTop: 16,
        borderTop: `1px solid ${COULEUR.or}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -2,
          left: 0,
          width: 64,
          height: 3,
          backgroundColor: COULEUR.or,
        }}
      />
      {avecNom ? (
        <div
          style={{
            fontFamily: FAMILLE_TITRE,
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1,
            color: COULEUR["bordeaux-profond"],
          }}
        >
          {site.nom}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: FAMILLE_TEXTE,
          fontWeight: 500,
          fontSize: 28,
          lineHeight: 1,
          color: COULEUR.bordeaux,
        }}
      >
        {MENTION_DOMAINE}
      </div>
    </div>
  );
}

/** Fond crème, cadre or de 2 px, contenu en colonne de 1 044 px de large. */
function Cadre({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: MARGE,
        backgroundColor: COULEUR.creme,
        color: COULEUR.encre,
        fontFamily: FAMILLE_TEXTE,
      }}
    >
      {/* Colonne de largeur fixe : `flexShrink` et `minWidth: 0` l'empêchent de
          s'élargir au-delà du cadre (le moteur ne rétrécit pas un élément
          flexible par défaut), `overflow` cache ce qui dépasserait encore. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          flexShrink: 1,
          minWidth: 0,
          overflow: "hidden",
          border: `2px solid ${COULEUR.or}`,
          padding: "40px 52px 30px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Image d'un événement : badge de type, titre, dates, lieu, organisateurs. */
export function ElementApercuEvenement({ apercu }: { apercu: ApercuEvenement }): ReactElement {
  return (
    <Cadre>
      <Badge>{apercu.type}</Badge>
      <Bloc
        lignes={apercu.tailleTitre.lignes}
        style={{
          marginTop: 26,
          fontFamily: FAMILLE_TITRE,
          fontWeight: 500,
          fontSize: apercu.tailleTitre.taille,
          lineHeight: 1.12,
          letterSpacing: "-0.01em",
          color: COULEUR["bordeaux-profond"],
        }}
      >
        {apercu.titre}
      </Bloc>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 24,
          fontFamily: FAMILLE_TEXTE,
          fontWeight: 500,
          fontSize: 34,
          lineHeight: 1.25,
          color: COULEUR.encre,
        }}
      >
        <Bloc lignes={1} style={{}}>
          {apercu.dates}
        </Bloc>
        <Bloc lignes={1} style={{}}>
          {apercu.lieu}
        </Bloc>
        {apercu.organisateurs ? (
          <Bloc lignes={1} style={{ color: COULEUR.bordeaux }}>
            {apercu.organisateurs}
          </Bloc>
        ) : null}
      </div>
      <Pied />
    </Cadre>
  );
}

/** Image d'une organisation : badge de catégorie, sigle en grand, nom complet, disciplines. */
export function ElementApercuSociete({ apercu }: { apercu: ApercuSociete }): ReactElement {
  return (
    <Cadre>
      <Badge>{apercu.categorie}</Badge>
      <Bloc
        lignes={1}
        style={{
          marginTop: 22,
          fontFamily: FAMILLE_TITRE,
          fontWeight: 700,
          fontSize: apercu.tailleSigle,
          lineHeight: 1.05,
          letterSpacing: "0.01em",
          color: COULEUR["bordeaux-profond"],
        }}
      >
        {apercu.sigle}
      </Bloc>
      {apercu.nomComplet ? (
        <Bloc
          lignes={2}
          style={{
            marginTop: 14,
            fontFamily: FAMILLE_TITRE,
            fontWeight: 500,
            fontSize: 42,
            lineHeight: 1.15,
            color: COULEUR.encre,
          }}
        >
          {apercu.nomComplet}
        </Bloc>
      ) : null}
      {apercu.disciplines ? (
        <Bloc
          lignes={1}
          style={{
            marginTop: 22,
            fontFamily: FAMILLE_TEXTE,
            fontWeight: 500,
            fontSize: 32,
            lineHeight: 1.25,
            color: COULEUR.bordeaux,
          }}
        >
          {apercu.disciplines}
        </Bloc>
      ) : null}
      <Pied />
    </Cadre>
  );
}

/** Image générique : nom du site, slogan, rubriques. */
export function ElementApercuGenerique(): ReactElement {
  return (
    <Cadre>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: FAMILLE_TITRE,
            fontWeight: 700,
            fontSize: 120,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            color: COULEUR["bordeaux-profond"],
          }}
        >
          {site.nom}
        </div>
        <Bloc
          lignes={2}
          style={{
            marginTop: 28,
            fontFamily: FAMILLE_TEXTE,
            fontWeight: 500,
            fontSize: 42,
            lineHeight: 1.25,
            color: COULEUR.encre,
          }}
        >
          {site.slogan}
        </Bloc>
        <div
          style={{
            marginTop: 30,
            fontFamily: FAMILLE_TITRE,
            fontWeight: 500,
            fontSize: 26,
            lineHeight: 1,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: COULEUR.bordeaux,
          }}
        >
          Annuaire · Agenda · Échéances
        </div>
      </div>
      <Pied avecNom={false} />
    </Cadre>
  );
}

/** Dessine un élément en PNG (1 200 × 630) avec les polices locales. */
export async function rendrePng(element: ReactElement): Promise<ArrayBuffer> {
  const fonts = await chargerPolicesApercu();
  return new ImageResponse(element, { ...TAILLE_APERCU, fonts }).arrayBuffer();
}

let generique: Promise<ArrayBuffer> | null = null;

/**
 * Image générique, dessinée une seule fois par processus puis resservie :
 * une adresse au slug inventé ne coûte donc aucun calcul. Oubliée si le
 * rendu échoue.
 */
export function pngGenerique(): Promise<ArrayBuffer> {
  if (!generique) {
    generique = rendrePng(<ElementApercuGenerique />).catch((erreur: unknown) => {
      generique = null;
      throw erreur;
    });
  }
  return generique;
}

/** Réponse HTTP d'une image PNG déjà dessinée. */
export function reponsePng(png: ArrayBuffer, cacheControl: string): Response {
  return new Response(png, {
    headers: { "Content-Type": TYPE_CONTENU_APERCU, "Cache-Control": cacheControl },
  });
}
