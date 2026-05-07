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

  await Promise.all(
    files.map(async (src) => {
      const rel = relative(config.staticDir, src);
      const dest = join(config.outputDir, rel);
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(src, dest);
    }),
  );

  return files.map((src) => join(config.outputDir, relative(config.staticDir, src)));
}
