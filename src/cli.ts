#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import path from "node:path";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
) as { version: string };

consola.options.formatOptions = { ...consola.options.formatOptions, date: false };
// ── install ────────────────────────────────────────────────────────────────────

const installCmd = defineCommand({
  meta: {
    name: "install",
    description: "Install site dependencies (runs npm install)",
  },
  args: {
    cwd: {
      type: "string",
      description: "Project root directory (default: cwd)",
    },
  },
  async run({ args }) {
    const cwd = path.resolve(args.cwd ?? process.cwd());
    consola.start("Installing dependencies…");
    try {
      execSync("npm install", { cwd, stdio: "inherit" });
    } catch {
      process.exit(1);
    }
  },
});

// ── build ──────────────────────────────────────────────────────────────────────

const buildCmd = defineCommand({
  meta: {
    name: "build",
    description: "Build the site to the output directory",
  },
  args: {
    cwd: {
      type: "string",
      description: "Project root directory (default: cwd)",
    },
  },
  async run({ args }) {
    const { build } = await import("./build.js");
    try {
      await build({ cwd: args.cwd ?? process.cwd() });
    } catch (err) {
      consola.error((err as Error).message);
      process.exit(1);
    }
  },
});

// ── serve ──────────────────────────────────────────────────────────────────────

const serveCmd = defineCommand({
  meta: {
    name: "serve",
    description: "Start the development server with file watching",
  },
  args: {
    port: {
      type: "string",
      description: "Port to listen on (default: 3000)",
    },
    host: {
      type: "string",
      description: "Hostname to bind (default: localhost)",
    },
    cwd: {
      type: "string",
      description: "Project root directory (default: cwd)",
    },
  },
  async run({ args }) {
    const { dev } = await import("./dev.js");
    const port = args.port ? parseInt(args.port, 10) : 3000;
    try {
      await dev({ cwd: args.cwd ?? process.cwd(), port, host: args.host });
    } catch (err) {
      consola.error((err as Error).message);
      process.exit(1);
    }
  },
});

// ── serve-d ────────────────────────────────────────────────────────────────────

const serveDraftCmd = defineCommand({
  meta: {
    name: "serve-d",
    description: "Start the development server, including draft pages",
  },
  args: {
    port: {
      type: "string",
      description: "Port to listen on (default: 3000)",
    },
    host: {
      type: "string",
      description: "Hostname to bind (default: localhost)",
    },
    cwd: {
      type: "string",
      description: "Project root directory (default: cwd)",
    },
  },
  async run({ args }) {
    const { dev } = await import("./dev.js");
    const port = args.port ? parseInt(args.port, 10) : 3000;
    try {
      await dev({ cwd: args.cwd ?? process.cwd(), port, host: args.host, includeDrafts: true });
    } catch (err) {
      consola.error((err as Error).message);
      process.exit(1);
    }
  },
});

// ── new ────────────────────────────────────────────────────────────────────────

const newCmd = defineCommand({
  meta: {
    name: "new",
    description: "Scaffold a new inkwell-ssg site",
  },
  args: {
    name: {
      type: "positional",
      description: "Site name / target directory (default: current directory)",
      required: false,
    },
  },
  async run({ args }) {
    const { scaffold } = await import("./scaffold.js");
    const dest = args.name ?? ".";
    const resolved = path.resolve(process.cwd(), dest);
    const targetDir = dest !== "." && resolved === process.cwd()
      ? process.cwd()
      : resolved;
    const siteName = path.basename(targetDir);
    consola.start(`Creating new site in ${targetDir} …`);
    try {
      await scaffold(siteName, targetDir);
    } catch (err) {
      consola.error((err as Error).message);
      process.exit(1);
    }
    consola.start("Installing dependencies…");
    try {
      execSync("npm install", { cwd: targetDir, stdio: "inherit" });
    } catch {
      consola.warn("Dependency install failed — run `inkwell install` manually.");
      process.exit(1);
    }
    const nextStep =
      dest === "." ? `inkwell serve` : `cd ${dest}\n  inkwell serve`;
    consola.success(`Ready! Start your dev server:\n\n  ${nextStep}\n`);
  },
});

// ── version ────────────────────────────────────────────────────────────────────

const versionCmd = defineCommand({
  meta: {
    name: "version",
    description: "Print the inkwell version",
  },
  async run() {
    consola.info(`inkwell v${pkg.version}`);
  },
});

// ── root command ───────────────────────────────────────────────────────────────

const main = defineCommand({
  meta: {
    name: "inkwell",
    description: "A batteries-included static site generator",
    version: pkg.version,
  },
  subCommands: {
    install: installCmd,
    build: buildCmd,
    serve: serveCmd,
    "serve-d": serveDraftCmd,
    new: newCmd,
    version: versionCmd,
  },
});

runMain(main);
