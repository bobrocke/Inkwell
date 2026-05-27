import { rm, mkdir } from "node:fs/promises";
import { consola } from "consola";
import { loadConfig } from "./config.js";
import { discoverContent } from "./content/discover.js";
import { parseContent } from "./content/parse.js";

import { buildTaxonomies } from "./taxonomy.js";
import { buildListings } from "./listings.js";
import { assembleSite } from "./site.js";
import { processCss } from "./css.js";
import { copyStaticAssets } from "./assets.js";
import { renderAll } from "./render/vento.js";
import { generateRss } from "./rss.js";
import { createEmitter } from "./plugins.js";
import type { ResolvedConfig, Site } from "./types.js";

export interface BuildOptions {
  /** Project root directory. Defaults to process.cwd(). */
  cwd?: string;
  /** Skip clearing the output directory before building. */
  incremental?: boolean;
  /** Include pages marked `draft: true` in the build. Defaults to false. */
  includeDrafts?: boolean;
}

export interface BuildResult {
  site: Site;
  config: ResolvedConfig;
  duration: number;
}

/**
 * Run the full inkwell build pipeline:
 *
 *  1. Load config
 *  2. Clear output directory
 *  3. Discover content files
 *  4. Parse markdown → Pages (remark + Shiki)
 *  5. Filter drafts
 *  6. Build taxonomy Terms
 *  6. Build Listings (pagination + prev/next)
 *  7. Assemble Site object
 *  8. Process CSS (lightningcss)
 *  9. Copy static assets
 * 10. Render templates → HTML (Vento)
 * 11. Generate RSS feed
 */
export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  const start = Date.now();
  const cwd = options.cwd ?? process.cwd();
  const includeDrafts = options.includeDrafts ?? false;

  // ── 1. Config ───────────────────────────────────────────────────────────────
  consola.start("Loading config…");
  const config = await loadConfig(cwd);
  consola.info(`Building "${config.title}" → ${config.outputDir}`);

  const emitter = createEmitter(config.plugins);
  await emitter.emit("beforeBuild", { config });

  // ── 2. Clear output ─────────────────────────────────────────────────────────
  if (!options.incremental) {
    await rm(config.outputDir, { recursive: true, force: true });
  }
  await mkdir(config.outputDir, { recursive: true });

  // ── 3. Discover ─────────────────────────────────────────────────────────────
  consola.start("Discovering content…");
  const files = await discoverContent(config);
  consola.info(`Found ${files.length} content file(s)`);
  await emitter.emit("afterDiscover", { files, config });

  // ── 4. Parse ────────────────────────────────────────────────────────────────
  consola.start("Parsing markdown…");
  const rawPages = await parseContent(files, config);

  // ── 5. Filter drafts ────────────────────────────────────────────────────────
  const pages = includeDrafts ? rawPages : rawPages.filter((p) => !p.draft);
  if (!includeDrafts) {
    const draftCount = rawPages.length - pages.length;
    if (draftCount > 0) consola.info(`Skipping ${draftCount} draft page(s)`);
  }
  await emitter.emit("afterParse", { pages, config });

  // ── 5. Taxonomy ─────────────────────────────────────────────────────────────
  consola.start("Building taxonomies…");
  const taxonomies = buildTaxonomies(pages, config);
  const termCount = Object.values(taxonomies).reduce(
    (n, terms) => n + Object.keys(terms).length,
    0,
  );
  if (termCount > 0) consola.info(`Built ${termCount} taxonomy term(s)`);
  await emitter.emit("afterTaxonomy", { pages, taxonomies, config });

  // ── 6. Listings ─────────────────────────────────────────────────────────────
  consola.start("Building listings…");
  const { pages: navPages, listings } = buildListings(pages, taxonomies, config);
  consola.info(`Built ${listings.length} listing page(s)`);

  // ── 7. Site ─────────────────────────────────────────────────────────────────
  const site = assembleSite(navPages, taxonomies, listings, config);

  // ── 8–11. Output (parallelisable) ───────────────────────────────────────────
  consola.start("Processing CSS, assets, templates & RSS…");
  await emitter.emit("beforeRender", { site });
  await Promise.all([
    processCss(config),
    copyStaticAssets(config),
    renderAll(site, config),
    generateRss(navPages, config),
  ]);
  await emitter.emit("afterRender", { site });

  const duration = Date.now() - start;
  consola.success(`Built ${navPages.length} page(s) in ${duration}ms`);
  await emitter.emit("afterBuild", { site, duration });

  return { site, config, duration };
}
