import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files (including the pgvector extension) loaded at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Migrations and the guideline corpus are read from disk at runtime.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*", "./content/**/*"],
  },
};

export default nextConfig;
