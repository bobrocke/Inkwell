import http from "node:http";
import path from "node:path";
import { consola } from "consola";
import sirv from "sirv";
import chokidar from "chokidar";
import { loadConfig } from "./config.js";
import { build } from "./build.js";
import type { ResolvedConfig } from "./types.js";

export interface DevOptions {
  /** Project root directory. Defaults to process.cwd(). */
  cwd?: string;
  /** Port for the local HTTP server. Defaults to 3000. */
  port?: number;
  /** Hostname to bind. Defaults to "localhost". */
  host?: string;
}

/**
 * Start the inkwell development server:
 *  - Runs an initial build
 *  - Serves the output directory via sirv (dev mode — no caching)
 *  - Watches content, templates, assets, and static directories via chokidar
 *  - Rebuilds incrementally on any change (debounced 50 ms)
 */
export async function dev(options: DevOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const port = options.port ?? 3000;
  const host = options.host ?? "localhost";

  // ── Initial build ──────────────────────────────────────────────────────────
  consola.info("Starting inkwell dev server…");
  const result = await build({ cwd });
  const config: ResolvedConfig = result.config;

  // ── HTTP server (sirv in dev mode — always reads from disk) ────────────────
  const serve = sirv(config.outputDir, { dev: true, single: "404.html" });

  const server = http.createServer((req, res) => {
    serve(req, res, () => {
      res.statusCode = 404;
      res.end("Not found");
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => resolve());
    server.once("error", reject);
  });

  consola.success(`Dev server running at http://${host}:${port}`);

  // ── File watcher ───────────────────────────────────────────────────────────
  const watchDirs = [
    config.contentDir,
    config.templatesDir,
    config.assetsDir,
    config.staticDir,
  ].filter(Boolean);

  consola.info(`Watching: ${watchDirs.map((d) => path.relative(cwd, d)).join(", ")}`);

  const watcher = chokidar.watch(watchDirs, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../, // hidden files
  });

  let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
  let rebuilding = false;

  const scheduleRebuild = (eventType: string, filePath: string) => {
    const rel = path.relative(cwd, filePath);
    consola.info(`Changed: ${rel} (${eventType})`);

    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(async () => {
      if (rebuilding) return;
      rebuilding = true;
      try {
        await build({ cwd, incremental: true });
      } catch (err) {
        consola.error("Rebuild failed:", (err as Error).message);
      } finally {
        rebuilding = false;
      }
    }, 50);
  };

  watcher.on("add", (p) => scheduleRebuild("add", p));
  watcher.on("change", (p) => scheduleRebuild("change", p));
  watcher.on("unlink", (p) => scheduleRebuild("unlink", p));
  watcher.on("error", (err) => consola.error("Watcher error:", err));

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async () => {
    consola.info("Shutting down…");
    if (rebuildTimer) clearTimeout(rebuildTimer);
    await watcher.close();
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep the process alive
  await new Promise<void>(() => {});
}
