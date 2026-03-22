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
            <button
              type="button"
              className="docs-ai-button fixed bottom-5 right-4 z-40 hidden items-center gap-2 rounded-xl px-4 py-3 text-[13px] font-medium text-foreground shadow-[0_12px_24px_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 md:inline-flex"
            >
              Ask AI
              <span className="rounded border border-black/8 bg-black/5 px-1.5 py-0.5 text-[10px] leading-none text-black/50">
                ⌘ I
              </span>
            </button>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
