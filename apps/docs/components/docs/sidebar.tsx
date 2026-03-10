import Link from "next/link";
import type { DocSection } from "@/lib/docs";

type DocsSidebarProps = {
  currentPath: string;
  sections: DocSection[];
};

const commandPreview = [
  "npm install -g opentree",
  "opentree init",
  "opentree dev"
].join("\n");

function getLinkClass(isActive: boolean) {
  return isActive
    ? "border-[var(--ot-accent)] bg-[var(--ot-accent-soft)] text-[var(--ot-accent)]"
    : "border-transparent text-[var(--ot-muted)] hover:border-[var(--ot-border)] hover:bg-white/60 hover:text-[var(--ot-ink)]";
}

export function DocsSidebar({ currentPath, sections }: DocsSidebarProps) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
      <div className="rounded-[28px] border border-[var(--ot-border)] bg-[var(--ot-panel-strong)] p-5 shadow-[var(--ot-shadow)] backdrop-blur-xl">
        <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[var(--ot-muted)]">
          Section map
        </p>
        <h2 className="ot-display mt-3 text-[2rem] leading-none text-[var(--ot-ink)]">
          Operator handbook
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ot-muted)]">
          The layout stays lightweight, but the navigation still follows the real opentree workflow.
        </p>

        <pre className="mt-5 overflow-x-auto rounded-[20px] border border-white/10 bg-[#171b20] p-4 text-[0.86rem] leading-7 text-[#eef4f1] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
          <code>{commandPreview}</code>
        </pre>
      </div>

      <nav className="rounded-[28px] border border-[var(--ot-border)] bg-[var(--ot-panel)] p-3 shadow-[var(--ot-shadow)] backdrop-blur-xl">
        <div className="space-y-5">
          <div>
            <Link
              aria-current={currentPath === "/docs" ? "page" : undefined}
              className={`block rounded-[18px] border px-4 py-3 text-sm font-semibold transition ${getLinkClass(
                currentPath === "/docs"
              )}`}
              href="/docs"
            >
              Overview
            </Link>
          </div>

          {sections.map((section) => (
            <div key={section.slug}>
              <p className="px-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--ot-muted)]">
                {section.title}
              </p>
              <div className="mt-2 space-y-1">
                {section.pages.map((page) => {
                  const isActive = currentPath === page.href;

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`block rounded-[18px] border px-4 py-3 text-sm transition ${getLinkClass(
                        isActive
                      )}`}
                      href={page.href}
                      key={page.href}
                    >
                      <span className="block font-semibold">{page.title}</span>
                      {page.description ? (
                        <span className="mt-1 block text-xs leading-5 opacity-80">
                          {page.description}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
