import fg from "fast-glob";
import type { ResolvedConfig } from "../types.js";

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
