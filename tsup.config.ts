import { defineConfig } from "tsup";

export default defineConfig({
  format: ["esm"],
  target: "node16",
  sourcemap: false,
  clean: true,
  dts: false,
  entry: ["src/index.ts"],
  outDir: "dist",
  platform: "node",
  splitting: false,
  // This preserves .js extensions in imports
  esbuildOptions(options) {
    options.outExtension = { ".js": ".js" };
    options.resolveExtensions = [".ts", ".js", ".json"];
  },
});
