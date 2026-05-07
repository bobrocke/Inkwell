import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import vento from "ventojs";
import type { Page, Listing, Site, ResolvedConfig } from "../types.js";

// ─── Engine setup ─────────────────────────────────────────────────────────────

function createEngine(templatesDir: string) {
  return vento({ includes: templatesDir });
}

// ─── Template resolution ──────────────────────────────────────────────────────
//
// Template lookup order for a Page:
//   1. frontmatter.layout            (e.g. "post" → post.vto)
//   2. collection name               (e.g. "posts" → posts.vto)
//   3. "page"                        (page.vto)
//
// Template lookup order for a Listing:
//   1. "{collection}-listing"        (e.g. posts-listing.vto)
//   2. "{taxonomy}-listing"          (e.g. tags-listing.vto)
//   3. "listing"                     (listing.vto)

function resolvePageTemplate(page: Page): string {
  const layout = page.frontmatter.layout;
  if (typeof layout === "string" && layout) return `${layout}.vto`;
  if (page.collection) return `${page.collection}.vto`;
  return "page.vto";
}

function resolveListingTemplate(listing: Listing): string {
  if (listing.collection) return `${listing.collection}-listing.vto`;
  if (listing.term) return `${listing.term.taxonomy}-listing.vto`;
  return "listing.vto";
}

// ─── Output path ──────────────────────────────────────────────────────────────
//
// /posts/hello-world/  → published/posts/hello-world/index.html
// /                    → published/index.html

function urlToOutputPath(url: string, outputDir: string): string {
  if (url === "/") return join(outputDir, "index.html");
  return join(outputDir, url.replace(/^\//, ""), "index.html");
}

// ─── Render helpers ───────────────────────────────────────────────────────────

type Engine = ReturnType<typeof createEngine>;

async function renderTemplate(
  engine: Engine,
  templateName: string,
  data: Record<string, unknown>,
  fallbacks: string[],
): Promise<string> {
  const candidates = [templateName, ...fallbacks];

  for (const name of candidates) {
    try {
      const result = await engine.run(name, data);
      return result.content;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") continue; // template not found, try next
      throw new Error(`Template error in "${name}": ${(err as Error).message}`);
    }
  }

  throw new Error(
    `No template found. Tried: ${candidates.join(", ")}`,
  );
}

async function write(path: string, html: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, html, "utf-8");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Render all pages, listings, and taxonomy term archives to HTML files.
 * Each URL maps to an index.html in the output directory for clean URLs.
 *
 * Templates are resolved in priority order — specific → generic fallback.
 * The full Site object is available in every template as `site`.
 */
export async function renderAll(
  site: Site,
  config: ResolvedConfig,
): Promise<void> {
  const engine = createEngine(config.templatesDir);

  await Promise.all([
    renderPages(engine, site, config),
    renderListings(engine, site, config),
  ]);
}

async function renderPages(
  engine: Engine,
  site: Site,
  config: ResolvedConfig,
): Promise<void> {
  await Promise.all(
    site.pages.map(async (page) => {
      const templateName = resolvePageTemplate(page);
      const html = await renderTemplate(engine, templateName, { page, site }, [
        "page.vto",
      ]);
      const outPath = urlToOutputPath(page.url, config.outputDir);
      await write(outPath, html);
    }),
  );
}

async function renderListings(
  engine: Engine,
  site: Site,
  config: ResolvedConfig,
): Promise<void> {
  await Promise.all(
    site.listings.map(async (listing) => {
      const templateName = resolveListingTemplate(listing);
      const html = await renderTemplate(
        engine,
        templateName,
        { listing, site },
        ["listing.vto"],
      );
      const outPath = urlToOutputPath(listing.url, config.outputDir);
      await write(outPath, html);
    }),
  );
}
