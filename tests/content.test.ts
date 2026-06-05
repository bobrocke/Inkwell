import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFile, fileToUrl } from "../src/content/parse.js";
import { discoverMediaFiles } from "../src/content/discover.js";
import { loadConfig } from "../src/config.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/simple-site",
);

const MEDIA_FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/media-site",
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

  it("parses draft: true from frontmatter", async () => {
    const config = await loadConfig(FIXTURE);
    const file = path.join(FIXTURE, "content/posts/draft-post.md");
    const page = await parseFile(file, config);

    expect(page.draft).toBe(true);
  });

  it("leaves draft undefined when not set", async () => {
    const config = await loadConfig(FIXTURE);
    const file = path.join(FIXTURE, "content/posts/alpha.md");
    const page = await parseFile(file, config);

    expect(page.draft).toBeUndefined();
  });
});

describe("discoverMediaFiles", () => {
  it("returns empty array when no collections have media globs", async () => {
    const config = await loadConfig(FIXTURE); // simple-site has no media config
    const pages = await discoverMediaFiles(config);
    expect(pages).toEqual([]);
  });

  it("discovers image files matching single media glob", async () => {
    const config = await loadConfig(MEDIA_FIXTURE);
    const pages = await discoverMediaFiles(config);

    const faunaPages = pages.filter((p) => p.collection === "fauna");
    expect(faunaPages).toHaveLength(2);

    const urls = faunaPages.map((p) => p.url).sort();
    expect(urls).toEqual([
      "/galleries/fauna/Orangutan.jpg",
      "/galleries/fauna/Sea_Lions.jpg",
    ]);
  });

  it("sets url as root-relative path to the static file", async () => {
    const config = await loadConfig(MEDIA_FIXTURE);
    const pages = await discoverMediaFiles(config);

    for (const page of pages) {
      expect(page.url).toMatch(/^\/galleries\//);
      expect(page.url).toMatch(/\.(jpg|png)$/);
    }
  });

  it("sets title from filename with underscores replaced", async () => {
    const config = await loadConfig(MEDIA_FIXTURE);
    const pages = await discoverMediaFiles(config);

    const seaLions = pages.find((p) => p.url.includes("Sea_Lions"));
    expect(seaLions).toBeDefined();
    expect(seaLions!.title).toBe("Sea Lions");
  });

  it("sets html to empty string", async () => {
    const config = await loadConfig(MEDIA_FIXTURE);
    const pages = await discoverMediaFiles(config);

    for (const page of pages) {
      expect(page.html).toBe("");
    }
  });

  it("sets frontmatter to empty object", async () => {
    const config = await loadConfig(MEDIA_FIXTURE);
    const pages = await discoverMediaFiles(config);

    for (const page of pages) {
      expect(page.frontmatter).toEqual({});
    }
  });

  it("handles multiple media patterns per collection", async () => {
    const config = await loadConfig(MEDIA_FIXTURE);
    const pages = await discoverMediaFiles(config);

    const floraPages = pages.filter((p) => p.collection === "flora");
    expect(floraPages).toHaveLength(2);

    const extensions = floraPages.map((p) => path.extname(p.url)).sort();
    expect(extensions).toEqual([".jpg", ".png"]);
  });

  it("returns empty for non-matching media glob", async () => {
    const config = {
      ...(await loadConfig(MEDIA_FIXTURE)),
      collections: [
        { name: "empty", media: "nonexistent/**/*.jpg" },
      ],
    };
    const pages = await discoverMediaFiles(config);
    expect(pages.filter((p) => p.collection === "empty")).toHaveLength(0);
  });

  it("deduplicates identical file paths", async () => {
    const config = {
      ...(await loadConfig(MEDIA_FIXTURE)),
      collections: [
        {
          name: "fauna",
          media: [
            "galleries/fauna/**/*.jpg",
            "galleries/fauna/Orangutan.jpg",
          ],
        },
      ],
    };
    const pages = await discoverMediaFiles(config);
    const orangutans = pages.filter((p) => p.url.includes("Orangutan"));
    expect(orangutans).toHaveLength(1);
  });
});
