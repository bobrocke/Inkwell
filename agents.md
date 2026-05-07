# AGENTS.md — inkwell-ssg

## Project overview

A batteries-included static site generator for content-heavy sites. TypeScript, ESM, Node 20+. Published as `inkwell-ssg` on npm. Invoked via `npx inkwell-ssg`. Configured with a single `inkwell.config.js`.

> Core philosophy: ship pagination, prev/next navigation, markdown parsing, taxonomies, EXIF, and syntax highlighting out of the box. No plugin hunting for essentials.

## Tech stack

- Language: TypeScript (compiled to JS for distribution)
- Runtime: Node 20+ (ESM throughout — `"type": "module"`)
- Template engine: Vento (built-in default, overridable via plugins)
- Syntax highlighting: Shiki (build-time, never runtime)
- Markdown parser: remark, remark-frontmatter, and rehype
- CSS pipeline: lightningcss
- EXIF extraction: exifr
- Plugin system: event/hook-based (EventEmitter pattern)

## Packages

- fast-glob
- exifr
- chokidar
- lightningcss
- sirv
- citty
- consola
- jiti
- tsup
- tsx
- vitest

## Core data model

These four types are the source of truth. Do not invent new top-level abstractions without discussion.

- **Page** — a single piece of content: URL, rendered HTML, frontmatter, optional media/EXIF
- **Term** — a taxonomy entry: name, URL, count, associated pages
- **Listing** — a paginated view of Pages or Terms with its own URL. Pages never own pagination — Listings do.
- **Site** — global context for templates: pages, collections, terms, listings, config

> Key invariant: a Page can belong to multiple Listings without conflict. Pagination state lives on the Listing, never the Page.

## Build pipeline order

Steps run in this sequence. Do not reorder without updating this file.

## Misc

Keep responses concise and to the point.
