# Inkwell SSG

A batteries-included static site generator for content-heavy sites. TypeScript, ESM, Node 20+.

> Pagination, prev/next navigation, markdown parsing, taxonomies, EXIF, and syntax highlighting out of the box. No plugin hunting for essentials.

## Quick start

```bash
mkdir myblog && cd myblog
npm init -y && npm pkg set type=module
npm install inkwell-ssg
npx inkwell new
npx inkwell serve
```

## Commands

| Command              | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `inkwell build`      | Build the site into `_published/`                      |
| `inkwell serve`      | Build, serve, and watch for changes (with live reload) |
| `inkwell serve-d`    | Like `serve`, but includes pages with `draft: true`    |
| `inkwell new <name>` | Scaffold a new site                                    |
| `inkwell install`    | Install site dependencies (runs `npm install`)         |
| `inkwell version`    | Display the current Inkwell version                    |

All commands accept `--cwd <path>` to run from a different directory. `inkwell serve` and `inkwell serve-d` also accept `--port` and `--host`.

## Project layout

```
content/
  posts/          → Files here become the "posts" collection, for example
static/            → Copied verbatim to _published/
templates/
  partials/       → Partial templates (included via {{ include }})
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
  language: "en-US",
  description: "My site description",

  taxonomies: [
    { name: "tags", pageSize: 10 },
    { name: "categories", pageSize: 10 },
  ],

  collections: [{ name: "posts", pageSize: 10, sort: "date", sortDir: "desc" }],

  rss: {
    enabled: true,
    limit: 20,
    path: "/rss.xml",
  },

  // Default languages: javascript, typescript, python, php, html, erb, go, json, liquid, markdown, ruby, css, vento
  // Add more as needed:
  // shiki: {
  //   langs: ["rust", "bash"],
  //   lightTheme: "github-light",
  //   darkTheme: "github-dark",
  // },
};
```

`language` sets the site's locale for formatting and i18n behavior. Use `ll-RR` format (for example, `en-US`).

### Taxonomy config

| Field           | Type     | Default    | Description                                              |
| --------------- | -------- | ---------- | -------------------------------------------------------- |
| `name`          | `string` | —          | Frontmatter field, URL slug, display name                |
| `pageSize`      | `number` | `pageSize` | Items per term listing page (e.g. posts per tag page)    |
| `indexPageSize` | `number` | `pageSize` | Terms per taxonomy index page (e.g. tags on `/tags/`)    |
| `titleString`   | `string` | `"{term}"` | Title format for per-term listing pages. Use `{term}` for the term name and `{taxonomy}` for the singular taxonomy name. |

A taxonomy named `"tags"` reads the `tags` frontmatter field, generates pages at `/tags/`, `/tags/typescript/`, etc., and auto-capitalizes the display heading. Per-term listing titles are automatically singularized — `"categories"` becomes `"Category"`, `"tags"` becomes `"Tag"` — for use in `titleString`.

By default, per-term pages use just the term name as the title (e.g. "Photography"). Use `titleString` to customize:

```js
taxonomies: [
  // Default: "Photography"
  { name: "categories", pageSize: 4, indexPageSize: 8 },

  // Custom: "Posts tagged swift"
  { name: "tags", pageSize: 4, titleString: "Posts tagged {term}" },

  // With taxonomy name: "Category: Photography"
  { name: "categories", titleString: "{taxonomy}: {term}" },
]
```

Use `indexPageSize` when you want the taxonomy index (the list of all terms) to show more items per page than the individual term listings. For example, showing 8 categories on `/categories/` while paginating each category's posts at 4 per page:

```js
taxonomies: [
  { name: "categories", pageSize: 4, indexPageSize: 8 },
]
```

### Collection config

| Field      | Type                              | Default    | Description                         |
| ---------- | --------------------------------- | ---------- | ----------------------------------- |
| `name`     | `string`                          | —          | Collection name and listing URL slug |
| `glob`     | `string \| string[]`              | —          | Glob pattern(s) for page selection  |
| `pageSize` | `number`                          | `pageSize` | Items per listing page              |
| `sort`     | `"date" \| "title" \| "filename"` | `"date"`   | Sort field                          |
| `sortDir`  | `"asc" \| "desc"`                 | `"desc"`   | Sort direction                      |
| `url`      | `string`                          | `/{name}/` | Base URL for the collection listing |

**Without `glob`:** a collection named `"posts"` reads all files under `content/posts/`, paginates them at `/posts/`, and assigns prev/next navigation. Set `url: "/"` to serve the listing as the home page.

**With `glob`:** the collection name is decoupled from the folder structure. Patterns are relative to the content directory:

```js
collections: [
  // Pages in content/galleries/flora/ become a "flora" collection
  { name: "flora", glob: "galleries/flora/**/*.md" },

  // A collection spanning multiple directories
  { name: "essays", glob: ["blog/**/*.md", "notes/**/*.md"] },

  // Exclude drafts from a collection
  { name: "published", glob: ["posts/**/*.md", "!posts/drafts/**"] },

  // Use the default folder-based convention (no glob)
  { name: "blog", pageSize: 10 },
],
```

When a page matches a `glob`, the collection assignment overrides the automatic folder-derived name. The first matching collection wins — order collections with more specific globs before broader ones. Prev/next navigation and pagination work identically regardless of how the collection membership was determined.

## Templates

Templates live in `templates/` and use the `.vto` ([Vento](https://vento.js.org/)) extension. Put shared markup in `templates/partials/` and include it with `{{ include "partials/nav.vto" }}`.

Each template receives:

| Variable  | Available in      | Description                                             |
| --------- | ----------------- | ------------------------------------------------------- |
| `page`    | Page templates    | The current page                                        |
| `listing` | Listing templates | Paginated list of pages or terms                        |
| `site`    | All templates     | Global context (pages, collections, taxonomies, config, mode) |

### Production / development mode

Every template can inspect `site.mode` to conditionally include or exclude content depending on the build command:

| `site.mode` value | Set by                              |
| ----------------- | ----------------------------------- |
| `"production"`    | `inkwell build`                     |
| `"development"`   | `inkwell serve` / `inkwell serve-d` |

This is useful for analytics snippets, debugging overlays, `robots` meta tags, or any content that should differ between development and production:

```vento
{{ if site.mode == "production" }}
  <script defer src="https://cdn.example.com/analytics.js"></script>
  <meta name="robots" content="index, follow">
{{ /if }}

{{ if site.mode == "development" }}
  <link rel="stylesheet" href="/assets/css/debug-grid.css">
  <meta name="robots" content="noindex, nofollow">
{{ /if }}
```

`site.mode` is set automatically by the CLI — you don't need to configure anything. It's a build-time option, not a config file field.

### Page variables

| Variable                   | Description                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `page.url`                 | Root-relative URL, e.g. `/posts/hello-world/`                                         |
| `page.src`                 | Source file path relative to `contentDir`                                             |
| `page.title`               | From frontmatter, falls back to filename                                              |
| `page.date`                | `Date` object from frontmatter                                                        |
| `page.lastmod`             | `Date` object from frontmatter `lastmod` field (optional)                             |
| `page.draft`               | `true` if the page is a draft; omitted from `build` and `serve`                      |
| `page.html`                | Rendered HTML body                                                                    |
| `page.excerpt`             | First paragraph, plain text                                                           |
| `page.collection`          | Collection name, e.g. `"blog"`                                                        |
| `page.prev` / `page.next`  | Adjacent pages in collection order                                                    |
| `page.media`               | Media files from frontmatter (EXIF populated via `enrichWithExif`)                   |
| `page.frontmatter.*`       | All raw frontmatter fields (e.g. `page.frontmatter.author`, `page.frontmatter.hero`) |

### Template resolution

Inkwell uses **convention over configuration** for templates: creating a file with the right name is enough to activate it — no config key required. Generic fallbacks ensure the site always renders, while specific templates let you customize any page type independently.

#### Content pages

For a regular content page, Inkwell checks in this order:

1. `{layout}.vto` — if the page's frontmatter has a `layout` key (e.g. `layout: post` → `post.vto`)
2. `{collection}.vto` — if the page belongs to a collection (e.g. collection `"blog"` → `blog.vto`)
3. `page.vto` — fallback for all other pages

#### Listing pages

Collection listings, taxonomy term archives, and taxonomy index pages each follow their own resolution chain, all falling back to `listing.vto`:

| Page type | Resolution order |
| --- | --- |
| Collection listing (e.g. `/blog/`) | `blog-listing.vto` → `listing.vto` |
| Taxonomy term archive (e.g. `/tags/javascript/`) | `tags-listing.vto` → `listing.vto` |
| Taxonomy index (e.g. `/tags/`) | `tags-index.vto` → `taxonomy-index.vto` → `listing.vto` |

Because the naming convention is the configuration, you can customize any listing type by simply creating the right file. For example, adding `blog-listing.vto` gives the blog listing its own design without touching any config — and makes the home page's template immediately discoverable in the project.


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

## EXIF

EXIF extraction is **opt-in** — no image is read unless you call the function. Two APIs are available:

### Template helper

The `exif()` helper is available in all templates. Pass a file path (paths starting with `/` are resolved relative to the static directory):

```html
<!-- All EXIF data -->
{{ set data = await exif("/photos/shoot-001.jpg") }}
Camera: {{ data.Make }} {{ data.Model }}
ISO: {{ data.ISO }}

<!-- Specific fields only -->
{{ set info = await exif("/photos/shoot-001.jpg", "Make", "Model", "ISO") }}
{{ info.Make }} {{ info.Model }}

<!-- Single field -->
{{ (await exif("/photos/shoot-001.jpg", "ImageDescription")).ImageDescription }}
```

Returns a flat `Record<string, unknown>` of key/value pairs. Returns an empty object `{}` if the file has no EXIF data or cannot be read.

### Programmatic API

```ts
import { readExif } from "inkwell-ssg";

// All EXIF data
const data = await readExif("/absolute/path/to/image.jpg");
console.log(data.Make, data.Model);

// Specific fields only
const { Make, ISO } = await readExif("/path/to/image.jpg", ["Make", "ISO"]);
```

`enrichWithExif` and `enrichAllWithExif` are still available to populate `page.media` with typed `ExifData` (useful in plugins or `afterParse` hooks):

```js
// inkwell.config.js plugin example
plugins: [{
  name: "auto-exif",
  hooks: {
    afterParse: async ({ pages, config }) => {
      const { enrichAllWithExif } = await import("inkwell-ssg");
      const enriched = await enrichAllWithExif(pages, config);
      pages.length = 0;
      pages.push(...enriched);
    },
  },
}],
```

## Syntax highlighting

Inkwell uses [Shiki](https://shiki.style/) for build-time syntax highlighting. javascript, typescript, python, php, html, erb, go, json, liquid, markdown, ruby, css, and vento are highlighted 'out of the box.'

To add languages beyond the defaults, set `shiki.langs` in your config — user-specified languages are **merged** with the defaults, not replaced:

```js
shiki: {
  langs: ["rust", "bash", "elixir"],
  lightTheme: "github-light",    // default
  darkTheme: "github-dark",      // default
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

### Linking between posts

Use root-relative links to the generated page URL:

```md
[WordPress Reconsidered](/blog/2023-10-23-wordpress-reconsidered/)
```

In general, `content/{collection}/{slug}.md` becomes `/{collection}/{slug}/`.

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
