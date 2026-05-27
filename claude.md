# CLAUDE.md — inkwell-ssg

## Project overview

A batteries-included static site generator for content-heavy sites. TypeScript, ESM, Node 20+. Published as `inkwell-ssg` on npm. Invoked via `npx inkwell-ssg`. Configured with a single `inkwell.config.js`.

> Core philosophy: ship pagination, prev/next navigation, markdown parsing, RSS, taxonomies, EXIF, and syntax highlighting out of the box. No plugin hunting for essentials.

## Tech stack

- Language: TypeScript (compiled to JS for distribution)
- Runtime: Node 20+ (ESM throughout — `"type": "module"`)
- Template engine: Vento (built-in default, overridable via plugins)
- Syntax highlighting: Shiki (build-time, never runtime)
- Markdown parser: remark, remark-frontmatter, and rehype
- CSS pipeline: lightningcss
- EXIF extraction: exifr
- Plugin system: event/hook-based (EventEmitter pattern)

## Dependencies

**Runtime:**
- `chokidar` — file watching (live reload)
- `citty` — CLI argument parsing
- `consola` — logging
- `exifr` — EXIF extraction from images
- `fast-glob` — file discovery
- `jiti` — load config files dynamically
- `lightningcss` — CSS processing
- `remark` + plugins — markdown parsing (gfm, smartypants, definition lists, directives)
- `rehype` plugins — HTML manipulation (autolink headings, slug generation)
- `shiki` — syntax highlighting
- `sirv` — dev server
- `ventojs` — template engine
- `yaml` — YAML parsing (frontmatter)

**Dev:**
- `tsup` — build tool (bundles to ESM, generates .d.ts)
- `tsx` — run TypeScript directly
- `typescript` — type checking
- `vitest` — test runner

## Core data model

These four types are the source of truth. Do not invent new top-level abstractions without discussion.

- **Page** — a single piece of content: URL, rendered HTML, frontmatter, optional media/EXIF
- **Term** — a taxonomy entry: name, URL, count, associated pages
- **Listing** — a paginated view of Pages or Terms with its own URL. Pages never own pagination — Listings do.
- **Site** — global context for templates: pages, collections, terms, listings, config

> Key invariant: a Page can belong to multiple Listings without conflict. Pagination state lives on the Listing, never the Page.

## Build pipeline order

The full build runs in this sequence (see `src/build.ts` for implementation). Do not reorder without discussion.

1. Load config (`inkwell.config.js`)
2. Clear output directory (unless `incremental: true`)
3. Discover content files from source directory
4. Parse markdown → Pages (remark plugins + Shiki syntax highlighting)
5. Extract EXIF data from media files
6. Build taxonomy Terms (group pages by category/tag/author/etc.)
7. Build Listings (pagination groups + prev/next navigation)
8. Assemble Site object (global context for templates)
9. Process CSS (lightningcss minification + optimization)
10. Copy static assets to output
11. Render all templates to HTML (Vento engine)
12. Generate RSS feed (if enabled)
