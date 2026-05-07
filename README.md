# Inkwell SSG

A batteries-included static site generator for content-heavy sites. TypeScript, ESM, Node 20+.

> Pagination, prev/next navigation, markdown parsing, taxonomies, EXIF, and syntax highlighting out of the box. No plugin hunting for essentials.

## Quick start

```bash
npx inkwell-ssg new my-site
cd my-site
npm install
npx inkwell-ssg dev
```

## Commands

| Command | Description |
|---|---|
| `inkwell build` | Build the site into `published/` |
| `inkwell dev` | Build, serve, and watch for changes (with live reload) |
| `inkwell new <name>` | Scaffold a new site |

All commands accept `--cwd <path>` to run from a different directory. `inkwell dev` also accepts `--port` and `--host`.

## Project layout

```
content/           → Markdown source files
static/            → Copied verbatim to published/
templates/         → Vento templates
assets/
  css/             → CSS files (processed by lightningcss)
published/         → Build output
inkwell.config.js  → Site configuration
```

## Configuration

```js
// inkwell.config.js
export default {
  site: {
    title: "My Site",
    url: "https://example.com",
    description: "My site description",
  },
  collections: [
    {
      name: "posts",
      pattern: "posts/**/*.md",
      sort: "date",
      sortDir: "desc",
      pageSize: 10,
    },
  ],
  taxonomies: [{ name: "tags", field: "tags" }],
  rss: {
    enabled: true,
    title: "My Site Feed",
    feedPath: "/rss.xml",
  },
};
```

## Templates

Templates use [Vento](https://vento.js.org/). Each template receives a `page`, `site`, and (for listings) a `listing` variable.

```html
<!-- templates/page.vto -->
<!doctype html>
<html>
  <head><title>{{ page.title }} — {{ site.config.site.title }}</title></head>
  <body>
    {{ page.html }}
  </body>
</html>
```

## Plugins

Plugins hook into the build pipeline via named hooks:

```js
// inkwell.config.js
export default {
  // ...
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

| Hook | Payload |
|---|---|
| `beforeBuild` | `{ config }` |
| `afterDiscover` | `{ files, config }` |
| `afterParse` | `{ pages, config }` |
| `afterTaxonomy` | `{ pages, taxonomies, config }` |
| `beforeRender` | `{ site }` |
| `afterRender` | `{ site }` |
| `afterBuild` | `{ site, duration }` |

## Programmatic API

```ts
import { build, dev, loadConfig } from "inkwell-ssg";

const config = await loadConfig("/path/to/project");
const result = await build(config);
console.log(`Built ${result.site.pages.length} pages in ${result.duration}ms`);
```

## Requirements

- Node.js 20+
