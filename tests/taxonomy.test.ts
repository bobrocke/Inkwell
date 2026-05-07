import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";
import { parseContent } from "../src/content/parse.js";
import { discoverContent } from "../src/content/discover.js";
import { buildTaxonomies, slugify } from "../src/taxonomy.js";
import { buildListings } from "../src/listings.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/simple-site",
);

async function loadFixture() {
  const config = await loadConfig(FIXTURE);
  const files = await discoverContent(config);
  const pages = await parseContent(files, config);
  return { config, pages };
}

// ── Taxonomy ──────────────────────────────────────────────────────────────────

describe("buildTaxonomies", () => {
  it("groups pages by tag", async () => {
    const { config, pages } = await loadFixture();
    const taxonomies = buildTaxonomies(pages, config);

    // alpha + beta have "typescript"
    expect(taxonomies.tags?.["typescript"]).toBeDefined();
    expect(taxonomies.tags["typescript"].count).toBe(2);
    expect(taxonomies.tags["typescript"].taxonomy).toBe("tags");
    expect(taxonomies.tags["typescript"].url).toBe("/tags/typescript/");
  });

  it("slugifies term names", async () => {
    const { config, pages } = await loadFixture();
    const taxonomies = buildTaxonomies(pages, config);

    expect(taxonomies.tags?.["node"]).toBeDefined();
    expect(slugify("Node.js")).toBe("node-js"); // dots become hyphens
  });

  it("only produces terms for configured taxonomies", async () => {
    const { config, pages } = await loadFixture();
    const taxonomies = buildTaxonomies(pages, config);

    expect(Object.keys(taxonomies)).toEqual(["tags"]);
  });

  it("assigns pages to terms", async () => {
    const { config, pages } = await loadFixture();
    const taxonomies = buildTaxonomies(pages, config);

    const tsPages = taxonomies.tags["typescript"].pages;
    const urls = tsPages.map((p) => p.url);
    expect(urls).toContain("/posts/alpha/");
    expect(urls).toContain("/posts/beta/");
  });
});

// ── Listings & pagination ─────────────────────────────────────────────────────

describe("buildListings", () => {
  it("paginates the posts collection (pageSize=2, 3 posts → 2 pages)", async () => {
    const { config, pages } = await loadFixture();
    const taxonomies = buildTaxonomies(pages, config);
    const { listings } = buildListings(pages, taxonomies, config);

    const postListings = listings.filter((l) => l.collection === "posts");
    expect(postListings).toHaveLength(2);
    expect(postListings[0].url).toBe("/posts/");
    expect(postListings[1].url).toBe("/posts/page/2/");
  });

  it("first listing page has no prevUrl", async () => {
    const { config, pages } = await loadFixture();
    const taxonomies = buildTaxonomies(pages, config);
    const { listings } = buildListings(pages, taxonomies, config);

    const first = listings.find((l) => l.url === "/posts/");
    expect(first?.pagination.prevUrl).toBeUndefined();
    expect(first?.pagination.nextUrl).toBe("/posts/page/2/");
  });

  it("second listing page links back to first", async () => {
    const { config, pages } = await loadFixture();
    const taxonomies = buildTaxonomies(pages, config);
    const { listings } = buildListings(pages, taxonomies, config);

    const second = listings.find((l) => l.url === "/posts/page/2/");
    expect(second?.pagination.prevUrl).toBe("/posts/");
    expect(second?.pagination.nextUrl).toBeUndefined();
  });

  it("assigns prev/next pointers to pages within a collection", async () => {
    const { config, pages } = await loadFixture();
    const taxonomies = buildTaxonomies(pages, config);
    const { pages: navPages } = buildListings(pages, taxonomies, config);

    // Posts are sorted newest-first; alpha (2024-03-01) is first
    const alpha = navPages.find((p) => p.url === "/posts/alpha/");
    const beta = navPages.find((p) => p.url === "/posts/beta/");
    const gamma = navPages.find((p) => p.url === "/posts/gamma/");

    // alpha is newest → no "next" (newer), prev = beta
    expect(alpha?.next).toBeUndefined();
    expect(alpha?.prev?.url).toBe("/posts/beta/");

    // gamma is oldest → no "prev" (older), next = beta
    expect(gamma?.prev).toBeUndefined();
    expect(gamma?.next?.url).toBe("/posts/beta/");

    expect(beta?.next?.url).toBe("/posts/alpha/");
    expect(beta?.prev?.url).toBe("/posts/gamma/");
  });

  it("creates taxonomy term listings", async () => {
    const { config, pages } = await loadFixture();
    const taxonomies = buildTaxonomies(pages, config);
    const { listings } = buildListings(pages, taxonomies, config);

    const tsListing = listings.find((l) => l.url === "/tags/typescript/");
    expect(tsListing).toBeDefined();
    expect(tsListing?.term?.name).toBe("typescript");
  });

  it("pagination totalItems matches page count", async () => {
    const { config, pages } = await loadFixture();
    const taxonomies = buildTaxonomies(pages, config);
    const { listings } = buildListings(pages, taxonomies, config);

    const first = listings.find((l) => l.url === "/posts/");
    expect(first?.pagination.totalItems).toBe(3);
    expect(first?.pagination.totalPages).toBe(2);
    expect(first?.pagination.pageSize).toBe(2);
  });
});
