import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { build } from "../src/build.js";
import { loadConfig } from "../src/config.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/simple-site",
);

async function cleanup() {
  const config = await loadConfig(FIXTURE);
  await rm(config.outputDir, { recursive: true, force: true });
}

afterEach(cleanup);

describe("build (integration)", () => {
  it("returns a site with all pages", async () => {
    const { site } = await build({ cwd: FIXTURE });

    const urls = site.pages.map((p) => p.url);
    expect(urls).toContain("/");
    expect(urls).toContain("/posts/alpha/");
    expect(urls).toContain("/posts/beta/");
    expect(urls).toContain("/posts/gamma/");
  });

  it("emits index.html for each page", async () => {
    const config = await loadConfig(FIXTURE);
    await build({ cwd: FIXTURE });

    expect(existsSync(path.join(config.outputDir, "index.html"))).toBe(true);
    expect(existsSync(path.join(config.outputDir, "posts/alpha/index.html"))).toBe(true);
    expect(existsSync(path.join(config.outputDir, "posts/beta/index.html"))).toBe(true);
    expect(existsSync(path.join(config.outputDir, "posts/gamma/index.html"))).toBe(true);
  });

  it("emits paginated listing pages", async () => {
    const config = await loadConfig(FIXTURE);
    await build({ cwd: FIXTURE });

    expect(existsSync(path.join(config.outputDir, "posts/index.html"))).toBe(true);
    expect(existsSync(path.join(config.outputDir, "posts/page/2/index.html"))).toBe(true);
  });

  it("emits taxonomy term listing", async () => {
    const config = await loadConfig(FIXTURE);
    await build({ cwd: FIXTURE });

    expect(existsSync(path.join(config.outputDir, "tags/typescript/index.html"))).toBe(true);
    expect(existsSync(path.join(config.outputDir, "tags/node/index.html"))).toBe(true);
  });

  it("copies static files verbatim", async () => {
    const config = await loadConfig(FIXTURE);
    await build({ cwd: FIXTURE });

    const txt = path.join(config.outputDir, "hello.txt");
    expect(existsSync(txt)).toBe(true);
    expect(await readFile(txt, "utf8")).toContain("hello from static");
  });

  it("processes CSS into output", async () => {
    const config = await loadConfig(FIXTURE);
    await build({ cwd: FIXTURE });

    const css = path.join(config.outputDir, "css/style.css");
    expect(existsSync(css)).toBe(true);
    const content = await readFile(css, "utf8");
    expect(content).toContain("sans-serif");
  });

  it("generates RSS feed when enabled", async () => {
    const config = await loadConfig(FIXTURE);
    await build({ cwd: FIXTURE });

    const rss = path.join(config.outputDir, "rss.xml");
    expect(existsSync(rss)).toBe(true);
    const xml = await readFile(rss, "utf8");
    expect(xml).toContain("<rss");
    expect(xml).toContain("Alpha Post");
  });

  it("returns duration in result", async () => {
    const { duration } = await build({ cwd: FIXTURE });
    expect(typeof duration).toBe("number");
    expect(duration).toBeGreaterThan(0);
  });

  it("builds site object with taxonomies", async () => {
    const { site } = await build({ cwd: FIXTURE });
    expect(site.taxonomies.tags).toBeDefined();
    expect(site.taxonomies.tags["typescript"]).toBeDefined();
    expect(site.taxonomies.tags["typescript"].count).toBe(2);
  });

  it("incremental build skips rm and succeeds", async () => {
    await build({ cwd: FIXTURE });
    // Second build should succeed without clearing output
    const { site } = await build({ cwd: FIXTURE, incremental: true });
    expect(site.pages.length).toBeGreaterThan(0);
  });
});
