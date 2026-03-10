import Link from "next/link";
import { slugifyHeading } from "@/lib/docs";
import type { MDXComponents } from "mdx/types";
import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";

function flattenText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(flattenText).join(" ");
  }

  if (isValidElement<{ children?: ReactNode }>(value)) {
    return flattenText(value.props.children as ReactNode);
  }

  return "";
}

function SmartLink({ href = "", ...props }: ComponentPropsWithoutRef<"a">) {
  if (typeof href !== "string") {
    return <a href={href} {...props} />;
  }

  if (href.startsWith("/")) {
    return <Link href={href} {...props} />;
  }

  if (href.startsWith("#")) {
    return <a href={href} {...props} />;
  }

  return <a href={href} rel="noreferrer" target="_blank" {...props} />;
}

function createHeading<TagName extends "h2" | "h3" | "h4">(tagName: TagName) {
  return function Heading({
    children,
    id,
    ...props
  }: ComponentPropsWithoutRef<TagName>) {
    const resolvedId = id ?? slugifyHeading(flattenText(children));

    if (tagName === "h2") {
      return (
        <h2 id={resolvedId} {...props}>
          {children}
        </h2>
      );
    }

    if (tagName === "h3") {
      return (
        <h3 id={resolvedId} {...props}>
          {children}
        </h3>
      );
    }

    return (
      <h4 id={resolvedId} {...props}>
        {children}
      </h4>
    );
  };
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: SmartLink,
    h2: createHeading("h2"),
    h3: createHeading("h3"),
    h4: createHeading("h4"),
    ...components
  };
}
