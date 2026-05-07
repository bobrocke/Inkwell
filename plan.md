# inkwell-ssg Implementation Plan

## Problem & Approach

Build a batteries-included SSG from a blank slate. The project has no source code yet — only `package.json` (CommonJS, needs updating), `agents.md` (the spec), and a stub `README.md`.

The approach is to build incrementally in phases, starting with project scaffolding and core types, then each pipeline stage, and finishing with the CLI, dev server, plugin system, and tests.

## Directory Convention (User-confirmed)

```
content/          → markdown source files
static/           → copied as-is to published/
templates/        → Vento templates
published/        → build output
inkwell.config.js → user config
```

## Build Pipeline Order (to add to agents.md)

1. Load config (`inkwell.config.js` via jiti)
2. Discover content files (fast-glob)
3. Parse markdown → Pages (remark + rehype + Shiki)
4. Extract EXIF from media referenced in frontmatter (exifr)
5. Build taxonomy Terms from frontmatter fields
6. Build Listings (paginate Pages/Terms, assign prev/next)
7. Assemble Site object
8. Process CSS (lightningcss)
9. Copy static assets (static/ → published/)
10. Render templates → HTML (Vento)
11. Generate RSS feed
12. Write all output to published/

---

## Todos

### Phase 0 — Project Bootstrap
- `bootstrap-pkg`       Update package.json: name=inkwell-ssg, type=module, bin, exports, scripts (build/dev/test)
- `bootstrap-deps`      Install all runtime + dev dependencies
- `bootstrap-tsconfig`  Create tsconfig.json for ESM + strict mode
- `bootstrap-tsup`      Create tsup.config.ts (bundle to dist/, preserve ESM)
- `bootstrap-vitest`    Create vitest.config.ts
- `bootstrap-gitignore` Update .gitignore (node_modules, dist, published)

### Phase 1 — Core Types
- `types-core`          src/types.ts: Page, Term, Listing, Site, InkwellConfig interfaces

### Phase 2 — Config Loader
- `config-loader`       src/config.ts: load inkwell.config.js via jiti, merge with defaults

### Phase 3 — Content Pipeline
- `content-discover`    src/content/discover.ts: fast-glob discovery of content/ dir
- `content-parse`       src/content/parse.ts: remark + remark-frontmatter + remark-rehype + rehype-stringify, Shiki for syntax highlighting
- `content-exif`        src/content/exif.ts: exifr extraction for images referenced in frontmatter

### Phase 4 — Taxonomy & Listings
- `taxonomy-terms`      src/taxonomy.ts: build Term objects from frontmatter fields (tags, categories, etc.)
- `listings-paginate`   src/listings.ts: paginate Pages/Terms into Listing objects; assign prev/next to Pages

### Phase 5 — Site Assembly
- `site-assembly`       src/site.ts: compose final Site object (pages, collections, terms, listings, config)

### Phase 6 — CSS Pipeline
- `css-pipeline`        src/css.ts: lightningcss processing of template CSS files

### Phase 7 — Asset Copying
- `assets-copy`         src/assets.ts: recursively copy static/ → published/

### Phase 8 — RSS Generation
- `rss-gen`             src/rss.ts: generate /rss.xml from pages (configurable feed metadata)

### Phase 9 — Template Rendering
- `render-vento`        src/render/vento.ts: Vento engine setup; render Pages, Listings, Terms to HTML files

### Phase 10 — Build Orchestrator
- `build-orchestrator`  src/build.ts: run pipeline steps 1–12 in order with consola logging

### Phase 11 — Plugin System
- `plugins-core`        src/plugins.ts: EventEmitter-based hook system (beforeBuild, afterParse, beforeRender, afterBuild, etc.)

### Phase 12 — Dev Server
- `dev-server`          src/dev.ts: sirv static server + chokidar watcher; trigger incremental rebuilds on change

### Phase 13 — CLI
- `cli-build`           src/cli.ts (citty): `inkwell build` command
- `cli-dev`             src/cli.ts (citty): `inkwell dev` command
- `cli-new`             src/cli.ts + src/scaffold.ts: `inkwell new <name>` scaffolds a starter site

### Phase 14 — Tests
- `tests-types`         Unit tests for type guards / data model helpers
- `tests-content`       Unit tests for markdown parsing, frontmatter extraction, EXIF
- `tests-taxonomy`      Unit tests for taxonomy and listing/pagination logic
- `tests-build`         Integration test: full build of a fixture site

### Phase 15 — Distribution
- `dist-setup`          Verify tsup output, bin permissions, package.json exports field; update README

---

## Key Decisions & Notes

- **ESM throughout**: `"type": "module"` in package.json; all source is `.ts` compiled to `.js`
- **Vento** is the default template engine, but plugin hooks allow overriding the render step
- **Shiki** runs at build time only — never shipped to the browser
- **Pagination lives on Listing, never Page** — key invariant from agents.md
- **jiti** used to load user's `inkwell.config.js` (supports TS/ESM configs transparently)
- **consola** for all CLI output (never raw `console.log`)
- **RSS** is built-in; sitemap deferred to a later milestone
