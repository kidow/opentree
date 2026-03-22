import { codeToHtml } from "shiki";

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export async function CodeBlock({ code, lang = "bash" }: CodeBlockProps) {
  const html = await codeToHtml(code, {
    lang,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  });

  return (
    <div
      className="overflow-x-auto rounded-lg border border-border text-sm [&_pre]:overflow-x-auto [&_pre]:p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
