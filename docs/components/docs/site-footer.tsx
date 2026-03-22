import Link from "next/link";
import { docsSite } from "@/lib/layout.shared";

export function SiteFooter() {
  return (
    <footer className="mt-6 rounded-[28px] border border-[var(--ot-border)] bg-[var(--ot-panel)] px-5 py-5 shadow-[var(--ot-shadow)] backdrop-blur-xl lg:px-7">
      <div className="flex flex-col gap-4 text-sm leading-6 text-[var(--ot-muted)] lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-2xl">
          {docsSite.title} keeps the existing MDX corpus and replaces preset-heavy chrome with a
          direct Next.js + Tailwind surface tailored to the CLI workflow.
        </p>

        <div className="flex flex-wrap gap-4 text-[var(--ot-ink)]">
          <Link className="font-semibold transition hover:text-[var(--ot-accent)]" href="/docs">
            Docs index
          </Link>
          <a
            className="font-semibold transition hover:text-[var(--ot-accent)]"
            href={docsSite.repositoryUrl}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
