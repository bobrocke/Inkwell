import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  dts: true,
  sourcemap: true,
  external: [
    "chokidar",
    "citty",
    "consola",
    "exifr",
    "fast-glob",
    "jiti",
    "lightningcss",
    "picomatch",
    "rehype-stringify",
    "remark",
    "remark-frontmatter",
    "remark-parse",
    "remark-rehype",
    "shiki",
    "sirv",
    "ventojs",
  ],
});
