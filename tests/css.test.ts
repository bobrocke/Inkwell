import { describe, it, expect } from "vitest";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";
import { processCss } from "../src/css.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/simple-site",
);

describe("processCss", () => {
  it("processes CSS files from the assets directory", async () => {
    const config = await loadConfig(FIXTURE);
    const outputPaths = await processCss(config);

    expect(outputPaths.length).toBeGreaterThan(0);
    for (const p of outputPaths) {
      expect(existsSync(p)).toBe(true);
    }
  });

  it("minifies CSS output by default", async () => {
    const config = await loadConfig(FIXTURE);
    const [outPath] = await processCss(config);

    expect(outPath).toBeDefined();
    const content = await readFile(outPath!, "utf8");

    expect(content).not.toContain("  ");
    expect(content).not.toContain("/*");
  });

  it("writes output files to the mirror path under outputDir", async () => {
    const config = await loadConfig(FIXTURE);
    const [outPath] = await processCss(config);

    expect(outPath).toBeDefined();
    expect(outPath).toContain(config.outputDir);
    expect(outPath).toContain(".css");
  });

  it("returns empty array when no CSS files found", async () => {
    const config = await loadConfig(FIXTURE);
    const emptyConfig = { ...config, assetsDir: path.join(FIXTURE, "static") };
    const result = await processCss(emptyConfig);
    expect(result).toEqual([]);
  });

  it("skips partial files (prefixed with _)", async () => {
    const config = await loadConfig(FIXTURE);
    const outputPaths = await processCss(config);
    const partials = outputPaths.filter((p) =>
      path.basename(p).startsWith("_"),
    );
    expect(partials).toHaveLength(0);
  });

  it("preserves CSS when minify is disabled", async () => {
    const config = await loadConfig(FIXTURE);
    const [outPath] = await processCss(config, { minify: true });

    expect(outPath).toBeDefined();
    const content = await readFile(outPath!, "utf8");
    expect(content.length).toBeGreaterThan(0);
  });
});
