import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFile, fileToUrl } from "../src/content/parse.js";
import { loadConfig } from "../src/config.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/simple-site",
);

describe("fileToUrl", () => {
  const contentDir = "/project/content";

  it("converts a nested file to a clean URL", () => {
    expect(fileToUrl("/project/content/posts/hello.md", contentDir)).toBe(
      "/posts/hello/",
    );
  });

  it("converts index.md to root URL", () => {
    expect(fileToUrl("/project/content/index.md", contentDir)).toBe("/");
  });

  it("converts a top-level non-index file", () => {
    expect(fileToUrl("/project/content/about.md", contentDir)).toBe("/about/");
  });
});

describe("parseFile", () => {
  it("parses frontmatter title and date", async () => {
    const config = await loadConfig(FIXTURE);
    const file = path.join(FIXTURE, "content/posts/alpha.md");
    const page = await parseFile(file, config);

    expect(page.title).toBe("Alpha Post");
    expect(page.date).toBeInstanceOf(Date);
    expect(page.frontmatter.tags).toEqual(["typescript", "node"]);
  });

  it("derives URL from file path", async () => {
    const config = await loadConfig(FIXTURE);
    const file = path.join(FIXTURE, "content/posts/alpha.md");
    const page = await parseFile(file, config);

    expect(page.url).toBe("/posts/alpha/");
  });

  it("sets collection from top-level directory", async () => {
    const config = await loadConfig(FIXTURE);
    const file = path.join(FIXTURE, "content/posts/alpha.md");
    const page = await parseFile(file, config);

    expect(page.collection).toBe("posts");
  });

  it("renders markdown to HTML", async () => {
    const config = await loadConfig(FIXTURE);
    const file = path.join(FIXTURE, "content/posts/alpha.md");
    const page = await parseFile(file, config);

    expect(page.html).toContain("Alpha content.");
  });

  it("sets no collection for root-level pages", async () => {
    const config = await loadConfig(FIXTURE);
    const file = path.join(FIXTURE, "content/index.md");
    const page = await parseFile(file, config);

    expect(page.url).toBe("/");
    expect(page.collection).toBeUndefined();
  });
});
