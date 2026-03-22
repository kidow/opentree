import type { ReactNode } from "react";

type TocItem = {
  depth: number;
  title: ReactNode;
  url: string;
};

type TableOfContentsProps = {
  items: TocItem[];
};

export function TableOfContents({ items }: TableOfContentsProps) {
  const filteredItems = items.filter((item) => item.depth <= 3);

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <aside className="hidden xl:block xl:sticky xl:top-6 xl:self-start">
      <div className="rounded-[28px] border border-[var(--ot-border)] bg-[var(--ot-panel)] p-5 shadow-[var(--ot-shadow)] backdrop-blur-xl">
        <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[var(--ot-muted)]">
          On this page
        </p>
        <ul className="mt-4 space-y-2">
          {filteredItems.map((item) => (
            <li key={item.url}>
              <a
                className={`block rounded-2xl px-3 py-2 text-sm leading-6 text-[var(--ot-muted)] transition hover:bg-white/60 hover:text-[var(--ot-ink)] ${
                  item.depth > 2 ? "ml-4" : ""
                }`}
                href={item.url}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
