"use client";

import { useState } from "react";

export function CopyPageButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const article = document.querySelector("article");
    const text = article?.textContent?.trim();

    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="docs-button inline-flex h-9 items-center gap-2 self-end px-3 text-[12px] text-white/55 transition hover:text-white/88"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? "Copied" : "Copy Page"}
    </button>
  );
}
