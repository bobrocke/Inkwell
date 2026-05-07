import http from "node:http";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { consola } from "consola";
import sirv from "sirv";
import chokidar from "chokidar";
import fg from "fast-glob";
import { loadConfig } from "./config.js";
import { build } from "./build.js";
import { resetProcessor } from "./content/parse.js";
import type { ResolvedConfig } from "./types.js";

export interface DevOptions {
  /** Project root directory. Defaults to process.cwd(). */
  cwd?: string;
  /** Port for the local HTTP server. Defaults to 3000. */
  port?: number;
  /** Hostname to bind. Defaults to "localhost". */
  host?: string;
}

const RELOAD_EVENTS_PATH = "/__inkwell/events";
const RELOAD_SCRIPT_PATH = "/__inkwell/reload.js";

/** Tiny browser script: connect to SSE and reload on event. */
const RELOAD_CLIENT = `new EventSource('${RELOAD_EVENTS_PATH}').addEventListener('reload',()=>location.reload());`;

const RELOAD_SNIPPET = `<script src="${RELOAD_SCRIPT_PATH}"></script>`;

/** Inject the reload snippet before </body> in every HTML file under outputDir. */
async function injectReloadSnippet(outputDir: string): Promise<void> {
  const files = await fg("**/*.html", { cwd: outputDir, absolute: true });
  await Promise.all(
    files.map(async (file) => {
      const html = await readFile(file, "utf8");
      if (html.includes(RELOAD_SCRIPT_PATH)) return; // already injected
      const injected = html.replace("</body>", `${RELOAD_SNIPPET}\n</body>`);
      await writeFile(file, injected, "utf8");
    }),
  );
}

/**
 * Start the inkwell development server:
 *  - Runs an initial build and injects live-reload into all HTML
 *  - Serves the output directory via sirv (dev mode — no caching)
 *  - Serves a tiny SSE endpoint (/__inkwell/events) and reload script
 *  - Watches content, templates, assets, and static directories via chokidar
 *  - Rebuilds on change, then broadcasts a reload event to connected browsers
 */
export async function dev(options: DevOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const port = options.port ?? 3000;
  const host = options.host ?? "localhost";

  consola.info("Starting inkwell dev server…");

  // ── Initial build ──────────────────────────────────────────────────────────
  const result = await build({ cwd });
  const config: ResolvedConfig = result.config;
  await injectReloadSnippet(config.outputDir);

  // ── SSE client registry ────────────────────────────────────────────────────
  const clients = new Set<http.ServerResponse>();

  function broadcastReload() {
    for (const res of clients) {
      res.write("event: reload\ndata: {}\n\n");
    }
  }

  // ── HTTP server ────────────────────────────────────────────────────────────
  const serve = sirv(config.outputDir, { dev: true, single: "404.html" });

  const server = http.createServer((req, res) => {
    const url = req.url ?? "/";

    // SSE endpoint
    if (url === RELOAD_EVENTS_PATH) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write(":\n\n"); // initial heartbeat comment
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    // Reload client script
    if (url === RELOAD_SCRIPT_PATH) {
      res.writeHead(200, { "Content-Type": "application/javascript", "Cache-Control": "no-store" });
      res.end(RELOAD_CLIENT);
      return;
    }

    // Static files
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
  const configFile = path.resolve(cwd, "inkwell.config.js");
  const configFileTs = path.resolve(cwd, "inkwell.config.ts");

  const watchDirs = [
    config.contentDir,
    config.templatesDir,
    config.assetsDir,
    config.staticDir,
  ].filter(Boolean);

  consola.info(`Watching: ${watchDirs.map((d) => path.relative(cwd, d)).join(", ")}, inkwell.config.js`);

  const watcher = chokidar.watch([...watchDirs, configFile, configFileTs], {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../,
  });

  let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
  let rebuilding = false;

  const scheduleRebuild = (eventType: string, filePath: string, isConfig = false) => {
    consola.info(`Changed: ${path.relative(cwd, filePath)} (${eventType})`);
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(async () => {
      if (rebuilding) return;
      rebuilding = true;
      try {
        if (isConfig) resetProcessor();
        await build({ cwd, incremental: !isConfig });
        await injectReloadSnippet(config.outputDir);
        broadcastReload();
      } catch (err) {
        consola.error("Rebuild failed:", (err as Error).message);
      } finally {
        rebuilding = false;
      }
    }, 50);
  };

  const isConfigFile = (p: string) => p === configFile || p === configFileTs;

  watcher.on("add", (p) => scheduleRebuild("add", p, isConfigFile(p)));
  watcher.on("change", (p) => scheduleRebuild("change", p, isConfigFile(p)));
  watcher.on("unlink", (p) => scheduleRebuild("unlink", p, isConfigFile(p)));
  watcher.on("error", (err) => consola.error("Watcher error:", err));

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async () => {
    consola.info("Shutting down…");
    if (rebuildTimer) clearTimeout(rebuildTimer);
    for (const res of clients) res.end();
    await watcher.close();
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await new Promise<void>(() => {});
}

