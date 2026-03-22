import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/docs/site-footer";
import { SiteHeader } from "@/components/docs/site-header";
import "./app.css";

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
      <body className="min-h-screen bg-[var(--ot-canvas)] text-[var(--ot-ink)] antialiased">
        <div className="mx-auto min-h-screen max-w-[1600px] px-4 pb-8 pt-6 lg:px-6">
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
