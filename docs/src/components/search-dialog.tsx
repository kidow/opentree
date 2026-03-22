"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { searchDocs } from "@/lib/search-index.mjs";

function isSearchShortcut(event: KeyboardEvent) {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
}

export function SearchDialog() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => searchDocs(deferredQuery), [deferredQuery]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isSearchShortcut(event)) {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery, open]);

  function closeDialog() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function selectResult(index: number) {
    const result = results[index];

    if (!result) {
      return;
    }

    closeDialog();
    router.push(result.href);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectResult(activeIndex);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="docs-button docs-chrome-muted inline-flex h-9 w-9 items-center justify-center rounded-lg transition md:w-auto md:gap-2 md:px-3 md:text-[12px]"
        aria-label="Search docs"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="hidden md:inline">Search docs</span>
        <span className="docs-kbd hidden rounded px-1.5 py-0.5 text-[10px] leading-none md:inline-flex">
          ⌘ K
        </span>
      </button>

      {open ? (
        <div
          className="docs-search-overlay"
          onClick={closeDialog}
          role="presentation"
        >
          <div
            className="docs-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="docs-search-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="docs-search-input-shell">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search docs..."
                className="docs-search-input"
              />
              <span className="docs-kbd rounded px-1.5 py-0.5 text-[10px] leading-none">
                esc
              </span>
            </div>

            <div className="docs-search-meta">
              <p id="docs-search-title" className="docs-search-heading">
                {query.trim() ? "Results" : "Docs Index"}
              </p>
              <span>{results.length} sections</span>
            </div>

            {results.length > 0 ? (
              <ul className="docs-search-results">
                {results.map((result, index) => (
                  <li key={result.href}>
                    <button
                      type="button"
                      onClick={() => selectResult(index)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "docs-search-result",
                        index === activeIndex && "is-active"
                      )}
                    >
                      <div className="docs-search-result-topline">
                        <span className="docs-search-result-title">{result.title}</span>
                        <span className="docs-search-result-section">{result.section}</span>
                      </div>
                      <p className="docs-search-result-copy">{result.excerpt}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="docs-search-empty">
                <p className="docs-search-heading">No matching sections</p>
                <p>Try terms like install, json, deploy, templates, or vercel.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
