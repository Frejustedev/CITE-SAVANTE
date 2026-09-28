import type { Metadata } from "next";
import localFont from "next/font/local";
import { EnTete } from "@/components/mise-en-page/EnTete";
import { LienEvitement } from "@/components/mise-en-page/LienEvitement";
import { PiedDePage } from "@/components/mise-en-page/PiedDePage";
import { site } from "@/config/site";
import "./globals.css";

// Titres : Fraunces (graisses 500 et 700). Charte, section 4.2.
const fraunces = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/fraunces/files/fraunces-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/fraunces/files/fraunces-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-titre",
  display: "swap",
});

// Texte courant : EB Garamond (400, 500, italique 400). Charte, section 4.2.
const ebGaramond = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/eb-garamond/files/eb-garamond-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-texte",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    template: `%s — ${site.nom}`,
    default: `${site.nom} — ${site.slogan}`,
  },
  description:
    "Cité Savante réunit les sociétés savantes, les congrès et les événements scientifiques du Bénin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${ebGaramond.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <LienEvitement />
        <EnTete />
        {/* Seul <main> du site : les pages ne doivent pas en rendre un second. */}
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <PiedDePage />
      </body>
    </html>
  );
}
