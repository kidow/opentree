import Link from "next/link";
import { getDocsNavigation } from "@/lib/docs";
import { shellHighlights, workflowSteps } from "@/lib/layout.shared";

const commandPreview = [
  "npm install -g opentree",
  "opentree doctor",
  "opentree init --name \"Kidow\" --bio \"CLI-first profile\"",
  "opentree link add --title \"Docs\" --url \"https://example.com/docs\"",
  "opentree build",
  "opentree dev"
].join("\n");

const configPreview = `{
  "schemaVersion": 1,
  "profile": {
    "name": "Kidow",
    "bio": "CLI-first profile",
    "avatarUrl": ""
  },
  "links": [
    {
      "title": "Docs",
      "url": "https://example.com/docs"
    }
  ],
  "template": "terminal",
  "analytics": {
    "clickTracking": "local"
  }
}`;

export default async function HomePage() {
  const navigation = await getDocsNavigation();
  const featuredRoutes = navigation.sections.flatMap((section) => section.pages.slice(0, 1));

  return (
    <main className="mt-6 space-y-6 pb-4">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="overflow-hidden rounded-[32px] border border-[var(--ot-border)] bg-[var(--ot-panel-strong)] p-6 shadow-[var(--ot-shadow)] backdrop-blur-xl lg:p-8">
          <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ot-muted)]">
            Custom docs shell
          </p>
          <h1 className="ot-display mt-4 max-w-4xl text-[clamp(3rem,7vw,6rem)] leading-[0.92] text-[var(--ot-ink)]">
            Documentation that feels like a control panel, not a theme preset.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--ot-muted)] lg:text-lg">
            opentree keeps the repo-authored MDX content, then replaces heavyweight documentation
            chrome with a custom Next.js App Router and Tailwind CSS surface inspired by the tighter
            control-panel feel of agentation&apos;s example app.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-[var(--ot-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
              href="/docs/getting-started/installation"
            >
              Install CLI
            </Link>
            <Link
              className="rounded-full border border-[var(--ot-border)] bg-white/60 px-5 py-3 text-sm font-semibold text-[var(--ot-ink)] transition hover:border-[var(--ot-accent)] hover:text-[var(--ot-accent)]"
              href="/docs"
            >
              Open docs index
            </Link>
            <a
              className="rounded-full border border-[var(--ot-border)] bg-white/60 px-5 py-3 text-sm font-semibold text-[var(--ot-ink)] transition hover:border-[var(--ot-accent)] hover:text-[var(--ot-accent)]"
              href="https://github.com/kidow/opentree"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {shellHighlights.map((item) => (
              <article
                className="rounded-[24px] border border-[var(--ot-border)] bg-white/55 p-5"
                key={item.title}
              >
                <h2 className="text-lg font-semibold text-[var(--ot-ink)]">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--ot-muted)]">{item.description}</p>
              </article>
            ))}
          </div>
        </article>

        <div className="grid gap-6">
          <article className="rounded-[32px] border border-[var(--ot-border)] bg-[#171b20] p-6 text-[#eef4f1] shadow-[var(--ot-shadow)]">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[0.72rem] uppercase tracking-[0.24em] text-white/55">Install CLI</p>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-white/55">
                operator log
              </span>
            </div>
            <pre className="mt-5 overflow-x-auto text-[0.92rem] leading-8">
              <code>{commandPreview}</code>
            </pre>
          </article>

          <article className="rounded-[32px] border border-[var(--ot-border)] bg-[var(--ot-panel)] p-6 shadow-[var(--ot-shadow)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[var(--ot-muted)]">
                  Section map
                </p>
                <h2 className="ot-display mt-3 text-[2.2rem] leading-none text-[var(--ot-ink)]">
                  Every guide stays in the repo. Only the surface changed.
                </h2>
              </div>
              <span className="rounded-full border border-[var(--ot-border)] bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ot-muted)]">
                {navigation.flat.length} routes
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {navigation.sections.map((section) => (
                <article
                  className="rounded-[24px] border border-[var(--ot-border)] bg-white/60 p-5"
                  key={section.slug}
                >
                  <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[var(--ot-muted)]">
                    {section.title}
                  </p>
                  <div className="mt-4 space-y-3">
                    {section.pages.slice(0, 3).map((page) => (
                      <Link
                        className="block text-sm font-semibold leading-6 text-[var(--ot-ink)] transition hover:text-[var(--ot-accent)]"
                        href={page.href}
                        key={page.href}
                      >
                        {page.title}
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[32px] border border-[var(--ot-border)] bg-[var(--ot-panel)] p-6 shadow-[var(--ot-shadow)] backdrop-blur-xl">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[var(--ot-muted)]">
            Why custom
          </p>
          <h2 className="ot-display mt-3 text-[clamp(2.2rem,4vw,3.5rem)] leading-[0.95] text-[var(--ot-ink)]">
            The workflow stays explicit even after removing the preset-heavy docs frame.
          </h2>
          <ul className="mt-6 space-y-4 text-sm leading-7 text-[var(--ot-muted)]">
            <li>Single config contract with deterministic CLI edits and JSON schema guidance.</li>
            <li>Static output that still deploys outside a custom runtime or dashboard backend.</li>
            <li>Built-in doctor, preview, deploy, and release guidance inside the same repo.</li>
            <li>Machine-readable JSON output paths for CI, automation, and scripting.</li>
          </ul>
        </article>

        <article className="rounded-[32px] border border-[var(--ot-border)] bg-[var(--ot-panel-strong)] p-6 shadow-[var(--ot-shadow)] backdrop-blur-xl">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[var(--ot-muted)]">
            Workflow line
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {workflowSteps.map((item) => (
              <article
                className="rounded-[24px] border border-[var(--ot-border)] bg-white/60 p-5"
                key={item.step}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ot-accent-soft)] text-sm font-bold text-[var(--ot-accent)]">
                  {item.step}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-[var(--ot-ink)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--ot-muted)]">{item.description}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[32px] border border-[var(--ot-border)] bg-[var(--ot-panel-strong)] p-6 shadow-[var(--ot-shadow)] backdrop-blur-xl">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[var(--ot-muted)]">
            Config preview
          </p>
          <pre className="mt-5 overflow-x-auto rounded-[24px] border border-white/10 bg-[#171b20] p-5 text-[0.9rem] leading-8 text-[#eef4f1] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <code>{configPreview}</code>
          </pre>
        </article>

        <article className="rounded-[32px] border border-[var(--ot-border)] bg-[var(--ot-panel)] p-6 shadow-[var(--ot-shadow)] backdrop-blur-xl">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[var(--ot-muted)]">
            Direct routes
          </p>
          <div className="mt-5 space-y-4">
            {featuredRoutes.map((page) => (
              <Link
                className="block rounded-[24px] border border-[var(--ot-border)] bg-white/60 px-5 py-4 transition hover:border-[var(--ot-accent)] hover:text-[var(--ot-accent)]"
                href={page.href}
                key={page.href}
              >
                <span className="block text-[0.72rem] uppercase tracking-[0.22em] text-[var(--ot-muted)]">
                  {page.sectionTitle}
                </span>
                <strong className="mt-2 block text-lg text-[var(--ot-ink)]">{page.title}</strong>
                <span className="mt-2 block text-sm leading-6 text-[var(--ot-muted)]">
                  {page.description}
                </span>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
