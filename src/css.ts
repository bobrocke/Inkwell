import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve, dirname, basename, join } from "node:path";
import fg from "fast-glob";
import { bundle, browserslistToTargets } from "lightningcss";
import type { ResolvedConfig } from "./types.js";

// Modern browsers baseline — covers the last 2 versions of major browsers
const TARGETS = browserslistToTargets([
  "last 2 Chrome versions",
  "last 2 Firefox versions",
  "last 2 Safari versions",
  "last 2 Edge versions",
]);

/**
 * Find CSS entry points in the assets directory.
 * Files prefixed with `_` are treated as partials (included via @import)
 * and are excluded from direct processing.
 */
async function findCssEntries(assetsDir: string): Promise<string[]> {
  const all = await fg("**/*.css", {
    cwd: assetsDir,
    absolute: true,
    dot: false,
  });

  return all.filter((f) => !basename(f).startsWith("_"));
}

/**
 * Process a single CSS entry file through lightningcss.
 * Resolves @import statements, applies vendor prefixes, and minifies.
 * Writes the result to the mirror path under the output directory.
 */
async function processFile(
  filePath: string,
  assetsDir: string,
  outputDir: string,
  minify: boolean,
): Promise<void> {
  const rel = relative(assetsDir, filePath);
  const outPath = join(outputDir, rel);

  let code: Uint8Array;
  try {
    ({ code } = bundle({
      filename: filePath,
      minify,
      targets: TARGETS,
      drafts: { customMedia: true },
    }));
  } catch (err) {
    throw new Error(
      `CSS processing failed for ${rel}: ${(err as Error).message}`,
    );
  }

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, code);
}

/**
 * Process all CSS entry files in the assets directory.
 * Returns the list of output file paths written.
 */
export async function processCss(
  config: ResolvedConfig,
  { minify = true }: { minify?: boolean } = {},
): Promise<string[]> {
  const entries = await findCssEntries(config.assetsDir);
  if (entries.length === 0) return [];

  await Promise.all(
    entries.map((f) =>
      processFile(f, config.assetsDir, config.outputDir, minify),
    ),
  );

  return entries.map((f) => {
    const rel = relative(config.assetsDir, f);
    return join(config.outputDir, rel);
  });
}
