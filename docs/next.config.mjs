import createMDX from "@next/mdx";
import { fileURLToPath } from "node:url";

const withMDX = createMDX();
const rootDir = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  reactStrictMode: true,
  turbopack: {
    root: rootDir,
  },
};

export default withMDX(nextConfig);
