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
| `inkwell new <name>` | Scaffold a new site                                    |

All commands accept `--cwd <path>` to run from a different directory. `inkwell serve` also accepts `--port` and `--host`.

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
| `page`    | `page.vto`    | The current page                                        |
| `listing` | `listing.vto` | Paginated list of pages or terms                        |
| `site`    | All templates | Global context (pages, collections, taxonomies, config) |

### Template resolution

| File                           | Used for                                |
| ------------------------------ | --------------------------------------- |
| `templates/page.vto`           | All content pages                       |
| `templates/listing.vto`        | Collection and taxonomy term listings   |
| `templates/taxonomy-index.vto` | Taxonomy index pages (e.g. `/tags/`)    |
| `templates/tags-index.vto`     | Index page for the `tags` taxonomy only |

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
