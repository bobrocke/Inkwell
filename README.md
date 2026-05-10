# Inkwell SSG

A batteries-included static site generator for content-heavy sites. TypeScript, ESM, Node 20+.

> Pagination, prev/next navigation, markdown parsing, taxonomies, EXIF, and syntax highlighting out of the box. No plugin hunting for essentials.

## Quick start

```bash
mkdir my-site && cd my-site
inkwell new .
inkwell serve
```

Or scaffold into a named subdirectory:

```bash
inkwell new my-site
cd my-site
inkwell serve
```

## Commands

| Command              | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `inkwell build`      | Build the site into `_published/`                      |
| `inkwell serve`      | Build, serve, and watch for changes (with live reload) |
| `inkwell serve-d`    | Like `serve`, but includes pages with `draft: true`    |
| `inkwell new <name>` | Scaffold a new site                                    |

All commands accept `--cwd <path>` to run from a different directory. `inkwell serve` and `inkwell serve-d` also accept `--port` and `--host`.

## Project layout

```
content/
  blog/           → Files here become the "blog" collection
static/            → Copied verbatim to _published/
templates/
  _partials/       → Partial templates (included via {{ include }})
assets/
  css/             → CSS files processed by lightningcss
_published/        → Build output
inkwell.config.js  → Site configuration
```

## Configuration

```js
// inkwell.config.js
/** @type {import('inkwell-ssg').InkwellConfig} */
export default {
  title: "My Site",
  siteUrl: "https://example.com",
  description: "My site description",

  taxonomies: [
    { name: "tags", pageSize: 10 },
    { name: "categories", pageSize: 10 },
  ],

  collections: [{ name: "blog", pageSize: 10, sort: "date", sortDir: "desc" }],

  rss: {
    enabled: true,
    limit: 20,
  },

  // Default languages: js, ts, python, php, html, erb, go, json, liquid, markdown, ruby, css, vento
  // Add more as needed:
  // shiki: {
  //   langs: ["rust", "bash"],
  // },
};
```

### Taxonomy config

| Field      | Type     | Default    | Description                               |
| ---------- | -------- | ---------- | ----------------------------------------- |
| `name`     | `string` | —          | Frontmatter field, URL slug, display name |
| `pageSize` | `number` | `pageSize` | Items per term listing page               |

A taxonomy named `"tags"` reads the `tags` frontmatter field, generates pages at `/tags/`, `/tags/typescript/`, etc., and auto-capitalizes the display heading.

### Collection config

| Field      | Type                              | Default    | Description                         |
| ---------- | --------------------------------- | ---------- | ----------------------------------- |
| `name`     | `string`                          | —          | Matches the folder under `content/` |
| `pageSize` | `number`                          | `pageSize` | Items per listing page              |
| `sort`     | `"date" \| "title" \| "filename"` | `"date"`   | Sort field                          |
| `sortDir`  | `"asc" \| "desc"`                 | `"desc"`   | Sort direction                      |

A collection named `"blog"` reads all files under `content/blog/`, paginates them at `/blog/`, and assigns prev/next navigation.

## Templates

Templates use [Vento](https://vento.js.org/). Put shared markup in `templates/_partials/` and include it with `{{ include "_partials/layout.vto" { ... } }}`.

Each template receives:

| Variable  | Available in  | Description                                             |
| --------- | ------------- | ------------------------------------------------------- |
| `page`    | page templates | The current page                                       |
| `listing` | listing templates | Paginated list of pages or terms                  |
| `site`    | All templates | Global context (pages, collections, taxonomies, config) |

### Page variables

| Variable | Description |
|---|---|
| `page.url` | Root-relative URL, e.g. `/posts/hello-world/` |
| `page.src` | Source file path relative to `contentDir` |
| `page.title` | From frontmatter, falls back to filename |
| `page.date` | `Date` object from frontmatter |
| `page.lastmod` | `Date` object from frontmatter `lastmod` field (optional) |
| `page.draft` | `true` if the page is a draft; omitted from `build` and `serve` |
| `page.html` | Rendered HTML body |
| `page.excerpt` | First paragraph, plain text |
| `page.collection` | Collection name, e.g. `"posts"` |
| `page.prev` / `page.next` | Adjacent pages in collection order |
| `page.media` | EXIF-enriched media files from frontmatter |
| `page.frontmatter.*` | All raw frontmatter fields — use this for arbitrary metadata (e.g. `page.frontmatter.author`, `page.frontmatter.hero`) |

### Template resolution

| File                           | Used for                                |
| ------------------------------ | --------------------------------------- |
| `templates/page.vto`           | All content pages                       |
| `templates/listing.vto`        | Collection and taxonomy term listings   |
| `templates/taxonomy-index.vto` | Taxonomy index pages (e.g. `/tags/`)    |
| `templates/tags-index.vto`     | Index page for the `tags` taxonomy only |

## Templates

Templates live in the `templates/` directory and use the `.vto` (Vento) extension.

### How a page finds its template

For a regular content page or blog post, Inkwell resolves the template in this order:

1. **`layout` front matter** — if the post's front matter includes a `layout` key, that template is used (e.g. `layout: post` → `templates/post.vto`).
2. **Collection name** — if the post belongs to a collection (e.g. `posts`), Inkwell looks for `templates/posts.vto`.
3. **Fallback** — `templates/page.vto`.

To explicitly set the template for a post, add `layout` to its front matter:

```markdown
---
title: My Post
date: 2024-01-01
layout: post
---
```

Listing pages (collection indexes, taxonomy pages) follow a similar but separate resolution order, falling back to `listing.vto`.


### Listing template variables

```html
<!-- templates/listing.vto -->
<h1>{{ listing.title }}</h1>
{{ for p of listing.pages }}
<a href="{{ p.url }}">{{ p.title }}</a>
{{ /for }} {{ if listing.pagination.prevUrl }}
<a href="{{ listing.pagination.prevUrl }}">← Newer</a>
{{ /if }} {{ if listing.pagination.nextUrl }}
<a href="{{ listing.pagination.nextUrl }}">Older →</a>
{{ /if }}
```

### Taxonomy index template variables

```html
<!-- templates/taxonomy-index.vto -->
<h1>{{ listing.title }}</h1>
{{ for term of listing.terms }}
<a href="{{ term.url }}">{{ term.name }} ({{ term.count }})</a>
{{ /for }}
```

## Syntax highlighting

Inkwell uses [Shiki](https://shiki.style/) for build-time syntax highlighting. javascript, typescript, python, php, html, erb, go, json, liquid, markdown, ruby, css, and vento are highlighted 'out of the box.'

To add languages beyond the defaults, set `shiki.langs` in your config — user-specified languages are **merged** with the defaults, not replaced:

```js
shiki: {
  langs: ["rust", "bash", "elixir"],
},
```

## Markdown features

Inkwell supports an extended markdown syntax out of the box:

| Feature | Syntax |
|---|---|
| GFM tables | `\| col \| col \|` |
| GFM task lists | `- [x] done` |
| GFM strikethrough | `~~text~~` |
| GFM footnotes | `[^1]` / `[^1]: note` |
| Definition lists | `Term\n: Definition` |
| Directives | `:::note` … `:::` |
| Smart quotes | `"hello"` → `"hello"` |
| Em / en dashes | `---` / `--` |
| Heading anchors | Auto-generated `id` + self-link on every heading |

### Directives

Directives let you create custom containers in markdown:

```md
:::note
This is a note.
:::
```

The directive syntax is parsed but rendering is controlled by your templates/CSS — add a rehype plugin via the Inkwell plugin API to transform directive nodes into the HTML structure you want.

### Math (not built-in)

Math rendering is not included by default. If you need it, add `remark-math` and `rehype-katex` via a plugin:

```js
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default {
  plugins: [{ name: "math", hooks: { /* add to unified pipeline */ } }],
};
```

## Plugins

Plugins hook into the build pipeline via named hooks:

```js
export default {
  plugins: [
    {
      name: "my-plugin",
      hooks: {
        afterParse: ({ pages }) => {
          // mutate or inspect pages after markdown parsing
        },
        afterBuild: ({ site, duration }) => {
          console.log(`Built ${site.pages.length} pages in ${duration}ms`);
        },
      },
    },
  ],
};
```

### Available hooks

| Hook            | Payload                         |
| --------------- | ------------------------------- |
| `beforeBuild`   | `{ config }`                    |
| `afterDiscover` | `{ files, config }`             |
| `afterParse`    | `{ pages, config }`             |
| `afterTaxonomy` | `{ pages, taxonomies, config }` |
| `beforeRender`  | `{ site }`                      |
| `afterRender`   | `{ site }`                      |
| `afterBuild`    | `{ site, duration }`            |

## Programmatic API

```ts
import { build, dev } from "inkwell-ssg";

const result = await build({ cwd: "/path/to/project" });
console.log(`Built ${result.site.pages.length} pages in ${result.duration}ms`);
```

## Requirements

- Node.js 20+
