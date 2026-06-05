import picomatch from "picomatch";
import type { Page, ResolvedConfig } from "./types.js";

/**
 * Assign pages to named collections based on glob patterns.
 *
 * Runs after parsing — for each page, the first CollectionConfig whose
 * `glob` matches the page's `src` wins and overrides the folder-derived
 * collection name. Pages that don't match any glob retain their default.
 */
export function assignCollections(pages: Page[], config: ResolvedConfig): void {
  const matchers = config.collections
    .filter((c) => c.glob)
    .map((c) => ({
      name: c.name,
      match: picomatch(
        Array.isArray(c.glob) ? c.glob : [c.glob!],
      ),
    }));

  if (matchers.length === 0) return;

  for (const page of pages) {
    for (const { name, match } of matchers) {
      if (match(page.src)) {
        page.collection = name;
        break;
      }
    }
  }
}
