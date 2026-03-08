import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider";
import "./app.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display"
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans"
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.opentree.run"),
  title: {
    default: "opentree docs",
    template: "%s | opentree docs"
  },
  description:
    "Guides and references for the opentree CLI-first link-in-bio generator.",
  openGraph: {
    title: "opentree docs",
    description:
      "Follow install, init, edit, build, and deploy workflows for opentree without reverse-engineering the README.",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} min-h-screen antialiased`}
      >
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
