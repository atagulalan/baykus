// esbuild via JS API: immune to the pnpm bin-shim issue where the postinstall
// binary swap leaves a stale node-based shim for the `esbuild` CLI.
import { build } from "esbuild";

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outdir: "dist",
});
