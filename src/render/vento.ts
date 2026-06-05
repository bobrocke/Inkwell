import { mkdir, writeFile, access } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import vento from "ventojs";
import { slugify } from "../taxonomy.js";
import type { Page, Listing, Site, ResolvedConfig } from "../types.js";

// ─── Engine setup ─────────────────────────────────────────────────────────────

let _engine: ReturnType<typeof vento> | null = null;
let _engineTemplatesDir: string | null = null;

function getEngine(templatesDir: string) {
  if (!_engine || _engineTemplatesDir !== templatesDir) {
    _engine = vento({ includes: templatesDir });
    _engineTemplatesDir = templatesDir;
  }
  return _engine;
}

/** Reset the Vento engine singleton (e.g. after a config change in dev mode). */
export function resetEngine(): void {
  _engine = null;
  _engineTemplatesDir = null;
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
//   3. "{taxonomy}-index"            (e.g. tags-index.vto, taxonomy index only)
//   4. "taxonomy-index"              (taxonomy-index.vto, taxonomy index only)
//   5. "listing"                     (listing.vto)

function resolvePageTemplate(page: Page): string {
  const layout = page.frontmatter.layout;
  if (typeof layout === "string" && layout) return `${layout}.vto`;
  if (page.collection) return `${page.collection}.vto`;
  return "page.vto";
}

function resolveListingTemplate(listing: Listing): [string, string[]] {
  if (listing.collection)
    return [`${listing.collection}-listing.vto`, ["listing.vto"]];
  if (listing.term)
    return [`${listing.term.taxonomy}-listing.vto`, ["listing.vto"]];
  if (listing.taxonomyIndex)
    return [
      `${listing.taxonomyIndex}-index.vto`,
      ["taxonomy-index.vto", "listing.vto"],
    ];
  return ["listing.vto", []];
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

type Engine = ReturnType<typeof vento>;

async function templateExists(templatesDir: string, name: string): Promise<boolean> {
  try {
    await access(join(templatesDir, name));
    return true;
  } catch {
    return false;
  }
}

async function resolveTemplate(
  templatesDir: string,
  preferred: string,
  fallbacks: string[],
): Promise<string> {
  for (const name of [preferred, ...fallbacks]) {
    if (await templateExists(templatesDir, name)) return name;
  }
  throw new Error(`No template found. Tried: ${[preferred, ...fallbacks].join(", ")}`);
}

async function renderTemplate(
  engine: Engine,
  templatesDir: string,
  templateName: string,
  data: Record<string, unknown>,
  fallbacks: string[],
): Promise<string> {
  const resolved = await resolveTemplate(templatesDir, templateName, fallbacks);
  try {
    const result = await engine.run(resolved, data);
    return result.content;
  } catch (err) {
    throw new Error(`Template error in "${resolved}": ${(err as Error).message}`);
  }
}

const _createdDirs = new Set<string>();

async function write(path: string, html: string): Promise<void> {
  const dir = dirname(path);
  if (!_createdDirs.has(dir)) {
    await mkdir(dir, { recursive: true });
    _createdDirs.add(dir);
  }
  await writeFile(path, html, "utf-8");
}

// ─── Template helpers ─────────────────────────────────────────────────────────

/**
 * Build template helper functions scoped to the current site.
 * These are injected into every template render call.
 */
function buildHelpers(site: Site) {
  return {
    /** Return the URL for a taxonomy term, e.g. termUrl("tags", "typescript") */
    termUrl: (taxonomy: string, termName: string): string | undefined =>
      site.taxonomies[taxonomy]?.[slugify(termName)]?.url,

    /**
     * Read EXIF data from an image file.
     * Paths starting with "/" are resolved relative to the static directory.
     * When called without field names, returns all EXIF key/value pairs.
     * When called with field names, returns only those specific keys.
     */
    exif: async (filePath: string, ...fields: string[]): Promise<Record<string, unknown>> => {
      const { readExif } = await import("../content/exif.js");
      const resolved = filePath.startsWith("/")
        ? resolve(site.config.staticDir, filePath.slice(1))
        : filePath;
      return readExif(resolved, fields.length > 0 ? fields : undefined);
    },
  };
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
  const engine = getEngine(config.templatesDir);
  _createdDirs.clear();

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
  const helpers = buildHelpers(site);
  await Promise.all(
    site.pages
      .filter((p) => !p.isMedia)
      .map(async (page) => {
        const templateName = resolvePageTemplate(page);
        const html = await renderTemplate(engine, config.templatesDir, templateName, { page, site, ...helpers }, [
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
  const helpers = buildHelpers(site);
  await Promise.all(
    site.listings.map(async (listing) => {
      const [templateName, fallbacks] = resolveListingTemplate(listing);
      const html = await renderTemplate(
        engine,
        config.templatesDir,
        templateName,
        { listing, site, ...helpers },
        fallbacks,
      );
      const outPath = urlToOutputPath(listing.url, config.outputDir);
      await write(outPath, html);
    }),
  );
}
