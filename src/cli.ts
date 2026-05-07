#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import path from "node:path";

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

// ── dev ────────────────────────────────────────────────────────────────────────

const devCmd = defineCommand({
  meta: {
    name: "dev",
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

// ── new ────────────────────────────────────────────────────────────────────────

const newCmd = defineCommand({
  meta: {
    name: "new",
    description: "Scaffold a new inkwell-ssg site",
  },
  args: {
    name: {
      type: "positional",
      description: "Site name / target directory",
      required: true,
    },
  },
  async run({ args }) {
    const { scaffold } = await import("./scaffold.js");
    const targetDir = path.resolve(process.cwd(), args.name);
    consola.start(`Creating new site in ${targetDir} …`);
    try {
      await scaffold(args.name, targetDir);
    } catch (err) {
      consola.error((err as Error).message);
      process.exit(1);
    }
    consola.success(`Site created! Next steps:\n\n  cd ${args.name}\n  npm install\n  npm run dev\n`);
  },
});

// ── root command ───────────────────────────────────────────────────────────────

const main = defineCommand({
  meta: {
    name: "inkwell",
    description: "A batteries-included static site generator",
    version: "0.1.0",
  },
  subCommands: {
    build: buildCmd,
    dev: devCmd,
    new: newCmd,
  },
});

runMain(main);
