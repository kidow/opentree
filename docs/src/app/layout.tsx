import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { CopyPageButton } from "@/components/copy-page-button";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "opentree",
    template: "%s | opentree",
  },
  description: "CLI-first link-in-bio static site generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider>
          <Header />
          <main className="relative">
            <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-[1160px] grid-cols-1 gap-10 px-4 pb-24 pt-8 md:grid-cols-[192px_minmax(0,1fr)] md:gap-16 md:px-8 md:pt-12 lg:px-10 xl:grid-cols-[208px_minmax(0,672px)]">
              <Sidebar />
              <div className="min-w-0">
                <div className="mb-8 flex justify-end">
                  <CopyPageButton />
                </div>
                <article className="prose max-w-[672px]">{children}</article>
              </div>
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
