import { createJiti } from "jiti";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { InkwellConfig, ResolvedConfig, RssConfig } from "./types.js";

const DEFAULT_RSS: RssConfig = {
  enabled: true,
  path: "/rss.xml",
  limit: 20,
};

const DEFAULTS = {
  description: "",
  contentDir: "content",
  outputDir: "_published",
  staticDir: "static",
  templatesDir: "templates",
  assetsDir: "assets",
  pageSize: 10,
  taxonomies: [],
  collections: [],
  rss: DEFAULT_RSS,
  plugins: [],
} satisfies Omit<ResolvedConfig, "siteUrl" | "title">;

/**
 * Load and resolve inkwell.config.js (or .ts) from the given project root.
 * Merges user-provided values with sensible defaults.
 */
export async function loadConfig(
  cwd: string = process.cwd(),
): Promise<ResolvedConfig> {
  const configPath = resolve(cwd, "inkwell.config.js");
  const userConfig = await readConfigFile(configPath);

  if (!userConfig.siteUrl) {
    throw new Error(
      `inkwell.config.js is missing required field: siteUrl`,
    );
  }
  if (!userConfig.title) {
    throw new Error(
      `inkwell.config.js is missing required field: title`,
    );
  }

  return {
    siteUrl: normalizeUrl(userConfig.siteUrl),
    title: userConfig.title,
    description: userConfig.description ?? DEFAULTS.description,
    contentDir: resolve(cwd, userConfig.contentDir ?? DEFAULTS.contentDir),
    outputDir: resolve(cwd, userConfig.outputDir ?? DEFAULTS.outputDir),
    staticDir: resolve(cwd, userConfig.staticDir ?? DEFAULTS.staticDir),
    templatesDir: resolve(cwd, userConfig.templatesDir ?? DEFAULTS.templatesDir),
    assetsDir: resolve(cwd, userConfig.assetsDir ?? DEFAULTS.assetsDir),
    pageSize: userConfig.pageSize ?? DEFAULTS.pageSize,
    taxonomies: userConfig.taxonomies ?? DEFAULTS.taxonomies,
    collections: userConfig.collections ?? DEFAULTS.collections,
    rss: { ...DEFAULT_RSS, ...userConfig.rss },
    plugins: userConfig.plugins ?? DEFAULTS.plugins,
  };
}

async function readConfigFile(
  configPath: string,
): Promise<Partial<InkwellConfig>> {
  const jiti = createJiti(pathToFileURL(configPath).href);

  let mod: unknown;
  try {
    mod = await jiti.import(configPath, { default: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND") {
      return {};
    }
    throw new Error(
      `Failed to load inkwell.config.js: ${(err as Error).message}`,
    );
  }

  if (mod && typeof mod === "object") {
    // Handle both `export default {}` and `module.exports = {}`
    const cfg = ("default" in mod ? mod.default : mod) as Partial<InkwellConfig>;
    return cfg ?? {};
  }

  return {};
}

/** Strip trailing slash from siteUrl */
function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}
