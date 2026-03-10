import Link from "next/link";
import { DocsSidebar } from "@/components/docs/sidebar";
import { TableOfContents } from "@/components/docs/table-of-contents";
import {
  getCompiledDocPage,
  getDocsNavigation,
  getDocsPageContext,
  getDocsStaticParams
} from "@/lib/docs";
import { useMDXComponents } from "@/mdx-components";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  const currentSlug = params.slug ?? [];
  const page = await getCompiledDocPage(currentSlug);

  if (!page) {
    notFound();
  }

  const [navigation, context] = await Promise.all([
    getDocsNavigation(),
    getDocsPageContext(currentSlug)
  ]);
  const MDX = page.Content;

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_260px]">
      <DocsSidebar currentPath={context.current.href} sections={navigation.sections} />

      <article className="overflow-hidden rounded-[32px] border border-[var(--ot-border)] bg-[var(--ot-panel-strong)] shadow-[var(--ot-shadow)] backdrop-blur-xl">
        <div className="grid gap-5 border-b border-[var(--ot-border)] px-6 py-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:px-8 lg:py-8">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ot-muted)]">
              {context.current.sectionTitle}
            </p>
            <h1 className="ot-display mt-3 text-[clamp(2.5rem,4vw,4.8rem)] leading-[0.92] text-[var(--ot-ink)]">
              {page.title}
            </h1>
            {page.description ? (
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ot-muted)] lg:text-lg">
                {page.description}
              </p>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-[var(--ot-border)] bg-white/60 p-5">
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[var(--ot-muted)]">
              Current route
            </p>
            <p className="ot-mono mt-3 text-sm leading-6 text-[var(--ot-ink)]">
              {context.current.href}
            </p>
            <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--ot-muted)]">
              <p>Rendered from the repo MDX source with a custom layout frame and section rails.</p>
              {context.previous ? (
                <Link
                  className="block font-semibold text-[var(--ot-ink)] transition hover:text-[var(--ot-accent)]"
                  href={context.previous.href}
                >
                  Previous: {context.previous.title}
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-6 py-8 lg:px-8">
          <div className="ot-prose">
            <MDX components={useMDXComponents({})} />
          </div>
        </div>

        <div className="grid gap-4 border-t border-[var(--ot-border)] px-6 py-6 md:grid-cols-2 lg:px-8">
          {context.previous ? (
            <Link
              className="rounded-[24px] border border-[var(--ot-border)] bg-white/60 px-5 py-5 transition hover:border-[var(--ot-accent)] hover:text-[var(--ot-accent)]"
              href={context.previous.href}
            >
              <span className="block text-[0.72rem] uppercase tracking-[0.22em] text-[var(--ot-muted)]">
                Previous
              </span>
              <strong className="mt-2 block text-lg text-[var(--ot-ink)]">
                {context.previous.title}
              </strong>
            </Link>
          ) : (
            <div className="hidden md:block" />
          )}

          {context.next ? (
            <Link
              className="rounded-[24px] border border-[var(--ot-border)] bg-white/60 px-5 py-5 transition hover:border-[var(--ot-accent)] hover:text-[var(--ot-accent)]"
              href={context.next.href}
            >
              <span className="block text-[0.72rem] uppercase tracking-[0.22em] text-[var(--ot-muted)]">
                Next
              </span>
              <strong className="mt-2 block text-lg text-[var(--ot-ink)]">{context.next.title}</strong>
            </Link>
          ) : null}
        </div>
      </article>

      <TableOfContents items={page.toc} />
    </div>
  );
}

export async function generateStaticParams() {
  return getDocsStaticParams();
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const page = await getCompiledDocPage(params.slug ?? []);

  if (!page) {
    return {};
  }

  return {
    title: page.title,
    description: page.description
  };
}
