import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { type ComponentPropsWithoutRef } from "react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function createHeading(level: 1 | 2 | 3 | 4) {
  const Tag = `h${level}` as const;
  return function Heading(props: ComponentPropsWithoutRef<typeof Tag>) {
    const text =
      typeof props.children === "string" ? props.children : String(props.children);
    const id = props.id ?? slugify(text);
    return <Tag {...props} id={id} />;
  };
}

function SmartLink(props: ComponentPropsWithoutRef<"a">) {
  const { href, children, ...rest } = props;
  if (!href) return <a {...props} />;

  if (href.startsWith("/")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }

  if (href.startsWith("#")) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: createHeading(1),
    h2: createHeading(2),
    h3: createHeading(3),
    h4: createHeading(4),
    a: SmartLink as MDXComponents["a"],
    pre: async (props: ComponentPropsWithoutRef<"pre">) => {
      const codeEl = props.children as React.ReactElement<{
        className?: string;
        children?: string;
      }>;
      const className = codeEl?.props?.className ?? "";
      const lang = className.replace(/language-/, "") || "bash";
      const code = (codeEl?.props?.children ?? "").trim();
      return <CodeBlock code={code} lang={lang} />;
    },
  };
}
