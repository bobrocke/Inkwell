import { copyFile, mkdir } from "node:fs/promises";
import { relative, join, dirname } from "node:path";
import fg from "fast-glob";
import type { ResolvedConfig } from "./types.js";

/**
 * Copy all files from static/ to published/, preserving directory structure.
 * Files in static/ are never processed — they are copied verbatim.
 * Returns the list of destination paths written.
 */
export async function copyStaticAssets(
  config: ResolvedConfig,
): Promise<string[]> {
  const files = await fg("**/*", {
    cwd: config.staticDir,
    absolute: true,
    dot: true,
    onlyFiles: true,
  });

  if (files.length === 0) return [];

  // Create all unique output directories first, then copy files
  const filePairs = files.map((src) => ({
    src,
    dest: join(config.outputDir, relative(config.staticDir, src)),
  }));
  const dirs = new Set(filePairs.map(({ dest }) => dirname(dest)));
  await Promise.all([...dirs].map((dir) => mkdir(dir, { recursive: true })));

  await Promise.all(filePairs.map(({ src, dest }) => copyFile(src, dest)));

  return filePairs.map(({ dest }) => dest);
}
