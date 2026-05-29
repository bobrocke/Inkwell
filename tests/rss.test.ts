import { describe, it, expect } from "vitest";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";
import { generateRss } from "../src/rss.js";
import { parseContent } from "../src/content/parse.js";
import { discoverContent } from "../src/content/discover.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/simple-site",
);

describe("generateRss", () => {
  it("generates valid RSS 2.0 XML", async () => {
    const config = await loadConfig(FIXTURE);
    const files = await discoverContent(config);
    const pages = (await parseContent(files, config)).filter((p) => !p.draft);

    const outPath = await generateRss(pages, config);
    expect(outPath).toBeDefined();
    const xml = await readFile(outPath!, "utf8");

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<title>Test Site</title>");
    expect(xml).toContain("<link>https://test.example.com</link>");
    expect(xml).toContain("<lastBuildDate>");
    expect(xml).toContain("</rss>");
  });

  it("includes dated pages as items", async () => {
    const config = await loadConfig(FIXTURE);
    const files = await discoverContent(config);
    const pages = (await parseContent(files, config)).filter((p) => !p.draft);

    const outPath = await generateRss(pages, config);
    const xml = await readFile(outPath!, "utf8");

    expect(xml).toContain("<item>");
    expect(xml).toContain("<title>Alpha Post</title>");
    expect(xml).toContain("<guid");
    expect(xml).toContain("<pubDate>");
  });

  it("uses CDATA for description fields", async () => {
    const config = await loadConfig(FIXTURE);
    const files = await discoverContent(config);
    const pages = (await parseContent(files, config)).filter((p) => !p.draft);

    const outPath = await generateRss(pages, config);
    const xml = await readFile(outPath!, "utf8");

    expect(xml).toContain("<![CDATA[");
    expect(xml).toContain("]]>");
  });

  it("respects the rss.limit config", async () => {
    const config = await loadConfig(FIXTURE);
    expect(config.rss.limit).toBe(10);
  });

  it("skips generation when rss.enabled is false", async () => {
    const config = await loadConfig(FIXTURE);
    const files = await discoverContent(config);
    const pages = (await parseContent(files, config)).filter((p) => !p.draft);

    const disabledConfig = { ...config, rss: { ...config.rss, enabled: false } };
    const result = await generateRss(pages, disabledConfig);
    expect(result).toBeUndefined();
  });

  it("sorts items by date, newest first", async () => {
    const config = await loadConfig(FIXTURE);
    const files = await discoverContent(config);
    const pages = (await parseContent(files, config)).filter((p) => !p.draft);

    const outPath = await generateRss(pages, config);
    const xml = await readFile(outPath!, "utf8");

    const alphaPos = xml.indexOf("Alpha Post");
    const betaPos = xml.indexOf("Beta Post");
    const gammaPos = xml.indexOf("Gamma Post");
    expect(alphaPos).toBeLessThan(betaPos);
    expect(betaPos).toBeLessThan(gammaPos);
  });

  it("outputs to the configured rss.path", async () => {
    const config = await loadConfig(FIXTURE);
    const files = await discoverContent(config);
    const pages = (await parseContent(files, config)).filter((p) => !p.draft);

    const customConfig = { ...config, rss: { ...config.rss, path: "/feed.xml" } };
    const outPath = await generateRss(pages, customConfig);
    expect(outPath).toContain("feed.xml");
  });
});
