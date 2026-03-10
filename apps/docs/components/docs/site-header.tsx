import Link from "next/link";
import { docsSite, siteLinks } from "@/lib/layout.shared";

export function SiteHeader() {
  return (
    <header className="rounded-[30px] border border-[var(--ot-border)] bg-[var(--ot-panel)] px-5 py-5 shadow-[var(--ot-shadow)] backdrop-blur-xl lg:px-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex max-w-3xl flex-col gap-2">
          <span className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ot-muted)]">
            {docsSite.eyebrow}
          </span>
          <span className="ot-display text-[clamp(2rem,3vw,3rem)] leading-none text-[var(--ot-ink)]">
            {docsSite.title}
          </span>
          <span className="max-w-2xl text-sm leading-6 text-[var(--ot-muted)] lg:text-base">
            {docsSite.description}
          </span>
        </Link>

        <nav className="flex flex-wrap gap-2 lg:max-w-xl lg:justify-end">
          {siteLinks.map((link) =>
            link.external ? (
              <a
                className="rounded-full border border-[var(--ot-border)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--ot-ink)] transition hover:border-[var(--ot-accent)] hover:text-[var(--ot-accent)]"
                href={link.href}
                key={link.label}
                rel="noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ) : (
              <Link
                className="rounded-full border border-[var(--ot-border)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--ot-ink)] transition hover:border-[var(--ot-accent)] hover:text-[var(--ot-accent)]"
                href={link.href}
                key={link.label}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
