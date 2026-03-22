import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
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
          <div className="flex">
            <Sidebar />
            <article className="min-w-0 flex-1 px-6 py-8 md:px-12 lg:px-16">
              <div className="prose mx-auto max-w-2xl">{children}</div>
            </article>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
