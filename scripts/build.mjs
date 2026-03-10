import { build } from "esbuild";
import { asEsbuildDefines, readEnvironment } from "./env.mjs";

const mode = process.env.MFE_BUILD_MODE || process.env.NODE_ENV || "production";
const env = readEnvironment(mode);

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "browser",
  target: "es2020",
  format: "iife",
  globalName: "ExampleMfeBundle",
  outfile: "dist/example-mfe.js",
  sourcemap: true,
  minify: mode === "production",
  define: asEsbuildDefines(env),
});
