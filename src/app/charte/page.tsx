import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import { CaseACocher } from "@/components/formulaires/CaseACocher";
import { ChampTexte } from "@/components/formulaires/ChampTexte";
import { Select } from "@/components/formulaires/Select";
import { Badge } from "@/components/mise-en-page/Badge";
import { Bouton } from "@/components/mise-en-page/Bouton";
import { Carte } from "@/components/mise-en-page/Carte";
import { Conteneur } from "@/components/mise-en-page/Conteneur";
import { TitreSection } from "@/components/mise-en-page/TitreSection";
import {
  PictoBatimentColonnes,
  PictoBatimentCoupole,
  PictoBatimentTour,
  PictoCalendrier,
  PictoEmail,
  PictoEnLigne,
  PictoFanion,
  PictoFermer,
  PictoFiltre,
  PictoFleche,
  PictoHorloge,
  PictoLienExterne,
  PictoLieu,
  PictoMenu,
  PictoPartage,
  PictoPlume,
  PictoRecherche,
  PictoTelechargement,
  PictoTelephone,
  PictoWhatsApp,
  type PictoProps,
} from "@/components/pictos";
import {
  couleursCharte,
  couplesASignaler,
  couplesUtilises,
  rapportDuCouple,
  type CoupleCouleurs,
  type JetonCouleur,
} from "@/lib/charte";
import { categorieOrganisationLabels, typeEvenementLabels } from "@/lib/textes";
import { respecteAA, seuilsAA } from "@/lib/utils/contraste";
import { cx } from "@/lib/utils/classes";

export const metadata: Metadata = {
  title: "Charte graphique",
  description: "Page interne : couleurs, typographie, pictogrammes et composants de Cité Savante.",
  robots: { index: false, follow: false },
};

/* ------------------------------------------------------------------ */
/* Correspondances jeton → classe (écrites en entier pour que Tailwind  */
/* les détecte à la compilation).                                      */
/* ------------------------------------------------------------------ */

const fonds: Record<JetonCouleur, string> = {
  bordeaux: "bg-bordeaux",
  "bordeaux-profond": "bg-bordeaux-profond",
  creme: "bg-creme",
  "creme-soutenu": "bg-creme-soutenu",
  or: "bg-or",
  "or-clair": "bg-or-clair",
  encre: "bg-encre",
};

const textes: Record<JetonCouleur, string> = {
  bordeaux: "text-bordeaux",
  "bordeaux-profond": "text-bordeaux-profond",
  creme: "text-creme",
  "creme-soutenu": "text-creme-soutenu",
  or: "text-or",
  "or-clair": "text-or-clair",
  encre: "text-encre",
};

// Couleurs semi-transparentes employées par les composants.
const textesTransparents: Record<string, string> = {
  "encre/0.7": "text-encre/70",
  "encre/0.6": "text-encre/60",
};

const pastillesClaires: JetonCouleur[] = ["creme", "creme-soutenu", "or-clair"];

const formatRapport = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatSeuil = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

const nomsNature: Record<CoupleCouleurs["nature"], string> = {
  texte: "Texte courant",
  "grand-texte": "Texte de grande taille",
  "non-textuel": "Élément d'interface",
  decoratif: "Décoratif",
};

const pictogrammes: Array<{ nom: string; Composant: ComponentType<Pick<PictoProps, "taille">> }> = [
  { nom: "PictoCalendrier", Composant: PictoCalendrier },
  { nom: "PictoLieu", Composant: PictoLieu },
  { nom: "PictoEnLigne", Composant: PictoEnLigne },
  { nom: "PictoLienExterne", Composant: PictoLienExterne },
  { nom: "PictoHorloge", Composant: PictoHorloge },
  { nom: "PictoPartage", Composant: PictoPartage },
  { nom: "PictoWhatsApp", Composant: PictoWhatsApp },
  { nom: "PictoTelechargement", Composant: PictoTelechargement },
  { nom: "PictoRecherche", Composant: PictoRecherche },
  { nom: "PictoFiltre", Composant: PictoFiltre },
  { nom: "PictoFanion", Composant: PictoFanion },
  { nom: "PictoBatimentColonnes", Composant: PictoBatimentColonnes },
  { nom: "PictoBatimentTour", Composant: PictoBatimentTour },
  { nom: "PictoBatimentCoupole", Composant: PictoBatimentCoupole },
  { nom: "PictoPlume", Composant: PictoPlume },
  { nom: "PictoEmail", Composant: PictoEmail },
  { nom: "PictoTelephone", Composant: PictoTelephone },
  { nom: "PictoFleche", Composant: PictoFleche },
  { nom: "PictoMenu", Composant: PictoMenu },
  { nom: "PictoFermer", Composant: PictoFermer },
];

const echelle = [
  { classe: "text-3xl", taille: 48, usage: "Titre de page (ordinateur)", titre: true },
  {
    classe: "text-2xl",
    taille: 36,
    usage: "Titre de page (mobile), titre de section",
    titre: true,
  },
  { classe: "text-xl", taille: 28, usage: "Titre de section (mobile), logotype", titre: true },
  { classe: "text-lg", taille: 22, usage: "Intertitre, titre de carte", titre: true },
  { classe: "text-base", taille: 18, usage: "Texte courant (17 px sur mobile)", titre: false },
  { classe: "text-sm", taille: 16, usage: "Aides, mentions, pied de page", titre: false },
  { classe: "text-xs", taille: 14, usage: "Légendes, références", titre: false },
] as const;

const sommaire = [
  { id: "couleurs", libelle: "Couleurs" },
  { id: "contrastes", libelle: "Contrastes" },
  { id: "typographie", libelle: "Typographie" },
  { id: "pictogrammes", libelle: "Pictogrammes" },
  { id: "composants", libelle: "Composants" },
  { id: "formulaires", libelle: "Formulaires" },
];

/* ------------------------------------------------------------------ */
/* Petits éléments de présentation propres à cette page               */
/* ------------------------------------------------------------------ */

function Section({
  id,
  titre,
  intro,
  children,
}: {
  id: string;
  titre: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-6 pt-14 md:pt-20">
      <TitreSection id={id}>{titre}</TitreSection>
      {intro ? <p className="mt-4 max-w-[68ch]">{intro}</p> : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function SousTitre({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-4 font-titre text-lg leading-tight font-medium text-bordeaux-profond">
      {children}
    </h3>
  );
}

function Legende({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-snug text-encre italic">{children}</p>;
}

function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono text-xs text-encre">{children}</code>;
}

function Echantillon({ couple }: { couple: CoupleCouleurs }) {
  const cle = `${couple.premierPlan}/${couple.opacite ?? 1}`;
  const classeTexte = textesTransparents[cle] ?? textes[couple.premierPlan];
  const classeFond = fonds[couple.fond];

  if (couple.nature === "texte" || couple.nature === "grand-texte") {
    return (
      <span
        aria-hidden="true"
        className={cx(
          "flex size-14 shrink-0 items-center justify-center border border-encre/20",
          classeFond,
          classeTexte,
          couple.nature === "grand-texte"
            ? "font-titre text-xl font-bold"
            : "font-texte text-lg font-medium",
        )}
      >
        Aa
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex size-14 shrink-0 items-center justify-center border border-encre/20",
        classeFond,
        classeTexte,
      )}
    >
      {couple.nature === "non-textuel" ? (
        <span className="block size-7 rounded-[4px] border-2 border-current" />
      ) : (
        <span className="block h-px w-9 bg-current" />
      )}
    </span>
  );
}

function LigneContraste({ couple }: { couple: CoupleCouleurs }) {
  const rapport = rapportDuCouple(couple);
  const seuil = seuilsAA[couple.nature];
  const conforme = respecteAA(rapport, couple.nature);
  const premierPlan =
    couple.opacite && couple.opacite < 1
      ? `${couple.premierPlan} à ${Math.round(couple.opacite * 100)} %`
      : couple.premierPlan;

  return (
    <li className="flex gap-4 border-b border-or/50 py-4">
      <Echantillon couple={couple} />
      <div className="min-w-0 flex-1">
        <p className="leading-snug font-medium">
          <Code>{premierPlan}</Code> sur <Code>{couple.fond}</Code>
        </p>
        <p className="text-sm leading-snug">{couple.usage}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium tabular-nums">
            {formatRapport.format(rapport)}&nbsp;:&nbsp;1
          </span>
          <span className="italic">{nomsNature[couple.nature]}</span>
          {seuil === null ? (
            <span>aucun seuil</span>
          ) : conforme ? (
            <span>conforme AA (seuil {formatSeuil.format(seuil)}&nbsp;:&nbsp;1)</span>
          ) : (
            <Badge variante="urgent">
              Non conforme AA (seuil {formatSeuil.format(seuil)}&nbsp;:&nbsp;1)
            </Badge>
          )}
        </p>
      </div>
    </li>
  );
}

function Demonstration({ legende, children }: { legende: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      <Legende>{legende}</Legende>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function PageCharte() {
  const typesEvenement = Object.entries(typeEvenementLabels);
  const categories = Object.entries(categorieOrganisationLabels).map(([valeur, libelle]) => ({
    valeur,
    libelle,
  }));

  return (
    <Conteneur className="pt-10 pb-20 md:pt-14 md:pb-28">
      <p className="inline-block border border-bordeaux px-3 py-1 text-sm font-medium text-bordeaux">
        Page interne — à supprimer en phase 7
      </p>
      <h1 className="mt-6 font-titre text-2xl leading-tight font-medium tracking-[-0.01em] text-bordeaux-profond md:text-3xl">
        Charte graphique
      </h1>
      <p className="mt-4 max-w-[68ch]">
        Cette page rassemble les couleurs, la typographie, les pictogrammes et les composants de
        base de Cité Savante, avec leurs états. Elle sert de référence pendant le développement et
        n’est pas indexée par les moteurs de recherche.
      </p>

      <nav aria-label="Sommaire de la charte" className="mt-8">
        <ol className="flex flex-wrap gap-x-6 gap-y-1">
          {sommaire.map((entree, index) => (
            <li key={entree.id}>
              <a href={`#${entree.id}`} className="inline-flex min-h-10 items-center gap-2">
                <span className="font-titre text-sm text-or" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {entree.libelle}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Couleurs ---------------------------------------------------- */}
      <Section
        id="couleurs"
        titre="Couleurs"
        intro="Sept jetons, et aucun autre : la palette par défaut de Tailwind est supprimée. Aucun bleu, nulle part. Les classes s’écrivent avec le nom du jeton (bg-bordeaux, text-encre, border-or…)."
      >
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {couleursCharte.map((couleur) => (
            <li key={couleur.jeton} className="flex flex-col">
              <span
                aria-hidden="true"
                className={cx(
                  "block h-24 border-t border-or",
                  fonds[couleur.jeton],
                  pastillesClaires.includes(couleur.jeton) &&
                    "border-x border-b border-x-encre/20 border-b-encre/20",
                )}
              />
              <p className="mt-3 font-titre text-lg leading-tight font-medium text-bordeaux-profond">
                {couleur.jeton}
              </p>
              <p className="font-mono text-xs tabular-nums">{couleur.valeur}</p>
              <p className="mt-1 text-sm leading-snug">{couleur.usage}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Contrastes -------------------------------------------------- */}
      <Section
        id="contrastes"
        titre="Contrastes"
        intro={
          <>
            Rapports calculés selon les WCAG 2.1 pour chaque couple réellement employé par les
            composants. Seuils AA : 4,5&nbsp;:&nbsp;1 pour le texte courant, 3&nbsp;:&nbsp;1 pour le
            texte de grande taille et les éléments d’interface (bordures de champ, contour de
            focus). Les couleurs semi-transparentes sont mesurées après composition sur leur fond.
          </>
        }
      >
        <SousTitre>Couples utilisés</SousTitre>
        <ul className="grid border-t border-or/50 md:grid-cols-2 md:gap-x-10">
          {couplesUtilises.map((couple) => (
            <LigneContraste
              key={`${couple.premierPlan}-${couple.opacite}-${couple.fond}-${couple.nature}`}
              couple={couple}
            />
          ))}
        </ul>

        <div className="mt-12">
          <SousTitre>Points à valider par le porteur du projet</SousTitre>
          <p className="max-w-[68ch]">
            Le contour de focus or de 2 px imposé par la charte n’atteint pas 3&nbsp;:&nbsp;1 sur
            les fonds crème ; de même, le texte or de grande taille sur crème autorisé par la
            section 4.1 des spécifications reste sous le seuil. Ces couples ne doivent pas être
            étendus à d’autres usages en attendant une décision.
          </p>
          <ul className="mt-4 grid border-t border-or/50 md:grid-cols-2 md:gap-x-10">
            {couplesASignaler.map((couple) => (
              <LigneContraste
                key={`${couple.premierPlan}-${couple.fond}-${couple.nature}`}
                couple={couple}
              />
            ))}
          </ul>
        </div>
      </Section>

      {/* Typographie ------------------------------------------------- */}
      <Section
        id="typographie"
        titre="Typographie"
        intro="Fraunces pour les titres, EB Garamond pour les textes, auto-hébergées (sous-ensemble latin). Texte courant : 17 px sur mobile, 18 px à partir de 768 px, interligne 1,55."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Carte>
            <p className="petites-capitales text-sm font-medium text-bordeaux">Titres</p>
            <p className="mt-2 font-titre text-2xl leading-tight font-medium text-bordeaux-profond">
              Fraunces 500
            </p>
            <p className="font-titre text-2xl leading-tight font-bold text-bordeaux-profond">
              Fraunces 700
            </p>
            <p className="mt-3 font-titre text-lg leading-snug font-medium">
              Sociétés, congrès et événements scientifiques du Bénin
            </p>
          </Carte>
          <Carte>
            <p className="petites-capitales text-sm font-medium text-bordeaux">Textes</p>
            <p className="mt-2 text-xl leading-tight">EB Garamond 400</p>
            <p className="text-xl leading-tight font-medium">EB Garamond 500</p>
            <p className="text-xl leading-tight italic">EB Garamond italique 400</p>
            <p className="mt-3">
              Cité Savante réunit les sociétés savantes, les congrès et les événements scientifiques
              du Bénin.
            </p>
          </Carte>
        </div>

        <div className="mt-10">
          <SousTitre>Échelle</SousTitre>
          <ul className="border-t border-or/50">
            {echelle.map((niveau) => (
              <li
                key={niveau.classe}
                className="flex flex-col gap-1 border-b border-or/50 py-4 md:flex-row md:items-baseline md:gap-8"
              >
                <p className="shrink-0 text-sm md:w-56">
                  <Code>{niveau.classe}</Code>
                  <span className="tabular-nums"> · {niveau.taille} px</span>
                  <span className="block italic">{niveau.usage}</span>
                </p>
                <p
                  className={cx(
                    niveau.classe,
                    "min-w-0 leading-tight break-words",
                    niveau.titre && "font-titre font-medium text-bordeaux-profond",
                  )}
                >
                  {niveau.titre
                    ? "Congrès et journées scientifiques"
                    : "Sociétés savantes, congrès et échéances"}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div>
            <SousTitre>Petites capitales</SousTitre>
            <p className="petites-capitales text-base font-medium text-bordeaux">
              Congrès · Journées · Colloque
            </p>
            <Legende>
              Classe <Code>petites-capitales</Code> : badges, navigation, intitulés courts.
            </Legende>
          </div>
          <div>
            <SousTitre>Chiffres tabulaires</SousTitre>
            <p className="text-lg tabular-nums">12 mars 2027 · 08 h 30 · 14 jours</p>
            <Legende>
              Classe <Code>tabular-nums</Code> : dates, horaires et comptes à rebours.
            </Legende>
          </div>
        </div>
      </Section>

      {/* Pictogrammes ------------------------------------------------ */}
      <Section
        id="pictogrammes"
        titre="Pictogrammes"
        intro="Dessinés à la main en SVG (src/components/pictos), grille de 24 × 24, trait de 1,5, extrémités arrondies, couleur du texte environnant. Chaque pictogramme est présenté à 16, 24 et 48 px."
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {pictogrammes.map(({ nom, Composant }) => (
            <li key={nom}>
              <Carte className="h-full">
                <p className="font-mono text-xs break-all">{nom}</p>
                <div className="mt-4 flex items-end gap-4 text-bordeaux sm:gap-5">
                  {[16, 24, 48].map((taille) => (
                    <div key={taille} className="flex flex-col items-center gap-1.5">
                      <Composant taille={taille} />
                      <span className="text-xs text-encre tabular-nums">{taille}</span>
                    </div>
                  ))}
                </div>
              </Carte>
            </li>
          ))}
          <li>
            <Carte className="h-full">
              <p className="font-mono text-xs">PictoFleche · direction</p>
              <div className="mt-4 flex flex-wrap items-end gap-4 text-bordeaux">
                {(["droite", "bas", "gauche", "haut"] as const).map((direction) => (
                  <div key={direction} className="flex flex-col items-center gap-1.5">
                    <PictoFleche direction={direction} taille={24} />
                    <span className="text-xs text-encre">{direction}</span>
                  </div>
                ))}
              </div>
            </Carte>
          </li>
        </ul>
      </Section>

      {/* Composants -------------------------------------------------- */}
      <Section
        id="composants"
        titre="Composants"
        intro="Les états « focus » sont reproduits ici de façon statique ; dans l’interface, ils n’apparaissent qu’à la navigation au clavier. Les titres de cette page utilisent le composant TitreSection."
      >
        <div className="grid gap-12">
          <div>
            <SousTitre>Boutons</SousTitre>
            <div className="grid gap-6">
              <Demonstration legende="Principal : plein bordeaux, texte crème ; survol bordeaux profond.">
                <Bouton>Annoncer un événement</Bouton>
                <Bouton className="anneau-focus">Focus</Bouton>
                <Bouton disabled>Désactivé</Bouton>
              </Demonstration>
              <Demonstration legende="Secondaire : contour bordeaux ; survol fond crème soutenu.">
                <Bouton variante="secondaire">Voir l’agenda</Bouton>
                <Bouton variante="secondaire" className="anneau-focus">
                  Focus
                </Bouton>
                <Bouton variante="secondaire" disabled>
                  Désactivé
                </Bouton>
              </Demonstration>
              <Demonstration legende="Avec href, le bouton devient un lien (composant Link de Next) ; un pictogramme peut l’accompagner.">
                <Bouton href="#composants">
                  Lien en forme de bouton
                  <PictoFleche taille={18} />
                </Bouton>
                <Bouton href="#composants" variante="secondaire">
                  <PictoTelechargement taille={18} />
                  Ajouter à mon agenda
                </Bouton>
              </Demonstration>
            </div>
          </div>

          <div>
            <SousTitre>Liens</SousTitre>
            <Demonstration legende="Bordeaux et soulignés ; survol bordeaux profond ; focus : contour or de 2 px.">
              <a href="#composants">Lien dans le texte courant</a>
              <a href="#composants" className="anneau-focus">
                Lien avec le focus
              </a>
            </Demonstration>
          </div>

          <div>
            <SousTitre>Badges</SousTitre>
            <Demonstration legende="Types d’événement : texte bordeaux sur or clair, petites capitales.">
              {typesEvenement.map(([valeur, libelle]) => (
                <Badge key={valeur}>{libelle}</Badge>
              ))}
            </Demonstration>
            <div className="mt-6">
              <Demonstration legende="Variante « urgent » pour les échéances proches : le texte dit toujours pourquoi.">
                <Badge variante="urgent">Clôture dans 3 jours</Badge>
              </Demonstration>
            </div>
          </div>

          <div>
            <SousTitre>Carte</SousTitre>
            <div className="grid gap-6 md:grid-cols-2">
              <Carte as="article">
                <Badge>{typeEvenementLabels.congres}</Badge>
                <h4 className="mt-3 font-titre text-lg leading-snug font-medium text-bordeaux-profond">
                  Intitulé de l’événement
                </h4>
                <ul className="mt-3 flex flex-col gap-1.5 text-base">
                  <li className="flex items-center gap-2">
                    <PictoCalendrier taille={18} className="shrink-0 text-bordeaux" />
                    <span className="tabular-nums">Du 12 au 14 mars 2027</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <PictoLieu taille={18} className="shrink-0 text-bordeaux" />
                    Ville, lieu
                  </li>
                </ul>
                <p className="mt-4">
                  <a href="#composants">Voir la fiche</a>
                </p>
              </Carte>
              <div>
                <p>
                  Fond crème soutenu, filet or de 1 px en haut, angles droits, aucune ombre portée.
                </p>
                <Legende>Contenu de démonstration, sans valeur réelle.</Legende>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Formulaires ------------------------------------------------- */}
      <Section
        id="formulaires"
        titre="Formulaires"
        intro="Chaque champ a un libellé visible relié par for/id. L’aide et le message d’erreur sont reliés au champ par aria-describedby ; en erreur, le champ porte aria-invalid et le message commence par « Erreur : »."
      >
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          <ChampTexte
            libelle="Nom de l’organisation"
            name="demo-nom"
            aide="Nom complet, sans abréviation."
            required
          />
          <ChampTexte
            libelle="Adresse e-mail"
            name="demo-email"
            type="email"
            autoComplete="off"
            defaultValue="adresse-invalide"
            erreur="Saisissez une adresse e-mail valide, par exemple nom@domaine.bj."
            required
          />
          <div className="[&_input]:anneau-focus">
            <ChampTexte
              libelle="Champ avec le focus"
              name="demo-focus"
              placeholder="Texte indicatif"
            />
          </div>
          <ChampTexte
            libelle="Champ désactivé"
            name="demo-desactive"
            defaultValue="Non modifiable"
            disabled
          />
          <ChampTexte
            multiligne
            libelle="Présentation"
            name="demo-presentation"
            aide="Quelques phrases sur la mission de l’organisation."
            className="md:col-span-2"
          />
          <Select
            libelle="Catégorie"
            name="demo-categorie"
            options={categories}
            optionVide="Choisir une catégorie"
          />
          <Select
            libelle="Catégorie (en erreur)"
            name="demo-categorie-erreur"
            options={categories}
            optionVide="Choisir une catégorie"
            erreur="Choisissez une catégorie."
            required
          />
          <div className="flex flex-col gap-5">
            <CaseACocher libelle="Événement gratuit" name="demo-gratuit" />
            <CaseACocher
              libelle="Inscription obligatoire"
              name="demo-inscription"
              aide="Case cochée."
              defaultChecked
            />
            <div className="[&_input]:anneau-focus">
              <CaseACocher libelle="Case avec le focus" name="demo-case-focus" />
            </div>
          </div>
          <CaseACocher
            libelle="J’accepte que ces informations soient publiées sur Cité Savante"
            name="demo-accord"
            erreur="Cochez cette case pour continuer."
            required
            className="md:self-start"
          />
        </div>
      </Section>
    </Conteneur>
  );
}
