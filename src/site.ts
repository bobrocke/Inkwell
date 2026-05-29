import type { Page, Term, Listing, Site, ResolvedConfig } from "./types.js";

/**
 * Assemble the global Site object from all pipeline outputs.
 *
 * Site is the context object passed into every template render call.
 * It provides access to all pages, collections, taxonomy terms, and
 * listings so templates can build navigation, related-content widgets, etc.
 */
export function assembleSite(
  pages: Page[],
  taxonomies: Record<string, Record<string, Term>>,
  listings: Listing[],
  config: ResolvedConfig,
  mode: "development" | "production" = "production",
): Site {
  return {
    pages,
    collections: groupByCollection(pages),
    taxonomies,
    listings,
    config,
    mode,
  };
}

/**
 * Group pages by their collection name.
 * Pages without a collection are omitted from this map
 * (they're still accessible via site.pages).
 */
function groupByCollection(pages: Page[]): Record<string, Page[]> {
  const collections: Record<string, Page[]> = {};

  for (const page of pages) {
    if (!page.collection) continue;
    const existing = collections[page.collection] ?? [];
    existing.push(page);
    collections[page.collection] = existing;
  }

  return collections;
}
