// esbuild via JS API: immune to the pnpm bin-shim issue where the postinstall
// binary swap leaves a stale node-based shim for the `esbuild` CLI.
import { readFileSync } from "node:fs";
import { build } from "esbuild";

/**
 * @baykus/* workspace packages are pure TypeScript with no compiled JS output
 * (their package.json "exports" point straight at src/index.ts) — dev relies
 * on tsx's loader, and Node's own type-stripping only works because pnpm's
 * workspace symlinks resolve OUTSIDE node_modules (Node explicitly refuses
 * to strip types for anything physically under node_modules). So they must
 * be BUNDLED here rather than left external, unlike every real npm
 * dependency, which already ships real JS (and, for native addons like
 * better-sqlite3, can't be bundled at all). This list is computed from every
 * workspace package's own package.json rather than hardcoded, so a new
 * dependency anywhere in the chain is automatically kept external.
 */
const WORKSPACE_PACKAGES = [
  "../../packages/core",
  "../../packages/provider-sdk",
  "../../packages/provider-tmdb",
  "../../packages/provider-tvmaze",
  "../../packages/provider-imdb",
  "../../packages/provider-serializd",
  "../../packages/importer-tvtime",
];

function realNpmDependencies() {
  const names = new Set();
  for (const dir of ["./", ...WORKSPACE_PACKAGES]) {
    const pkg = JSON.parse(readFileSync(new URL(`${dir}/package.json`, import.meta.url)));
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      if (!name.startsWith("@baykus/")) names.add(name);
    }
  }
  return [...names];
}

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  external: realNpmDependencies(),
  outdir: "dist",
});
