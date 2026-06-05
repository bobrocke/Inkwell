import fg from "fast-glob";
import picomatch from "picomatch";
import path from "node:path";
import type { Page, ResolvedConfig } from "../types.js";

/**
 * Find all markdown files under the configured content directory.
 * Returns absolute paths, sorted for deterministic ordering.
 */
export async function discoverContent(
  config: ResolvedConfig,
): Promise<string[]> {
  const files = await fg("**/*.{md,mdx}", {
    cwd: config.contentDir,
    absolute: true,
    dot: false,
    followSymbolicLinks: false,
  });

  return files.sort();
}

/**
 * Discover media files (images, etc.) from collection `media` glob patterns.
 *
 * Each collection config may specify `media` glob(s) relative to staticDir.
 * Matching files are turned into lightweight Page objects suitable for
 * iteration in templates via `site.collections[name]`.
 *
 * Pages created here have:
 *   - url:    root-relative path to the file (e.g. "/galleries/fauna/orangutan.jpg")
 *   - src:    path relative to staticDir (e.g. "galleries/fauna/orangutan.jpg")
 *   - title:  filename without extension, underscores → spaces
 *   - html:   "" (no markdown content)
 *   - frontmatter: {}
 *   - collection: pre-set to the collection name
 */
export async function discoverMediaFiles(config: ResolvedConfig): Promise<Page[]> {
  const collections = config.collections.filter((c) => c.media);
  if (collections.length === 0) return [];

  // Build a map of pattern → collection name, then glob all at once.
  const patternMap = new Map<string, string>();
  for (const col of collections) {
    const patterns = Array.isArray(col.media!) ? col.media! : [col.media!];
    for (const p of patterns) {
      patternMap.set(p, col.name);
    }
  }

  const patterns = [...patternMap.keys()];
  const files = await fg(patterns, {
    cwd: config.staticDir,
    absolute: false,
    dot: false,
    followSymbolicLinks: false,
  });

  const pages: Page[] = [];
  const seenUrls = new Set<string>();

  for (const relativePath of files) {
    const ext = path.extname(relativePath);
    const basename = path.basename(relativePath, ext);
    const title = basename.replace(/_/g, " ");
    const url = "/" + relativePath;

    // Determine which collection this file belongs to.
    let collection: string | undefined;
    for (const [pattern, name] of patternMap) {
      if (picomatch(pattern)(relativePath)) {
        collection = name;
        break;
      }
    }
    if (!collection) continue;

    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    pages.push({
      url,
      src: relativePath,
      title,
      html: "",
      frontmatter: {},
      collection,
      isMedia: true,
    } as Page);
  }

  return pages;
}
