import { mkdir, writeFile, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { consola } from "consola";

// ── Scaffold file templates ────────────────────────────────────────────────────

const CONFIG_TEMPLATE = (
  name: string,
) => `/** @type {import('inkwell-ssg').InkwellConfig} */
export default {
  // ── Required ──────────────────────────────────────────────────────────────────
  title: ${JSON.stringify(name)},
  siteUrl: "https://example.com",

  // ── Site metadata ─────────────────────────────────────────────────────────────
  language: "en-US",
  description: "A site built with Inkwell.",

  // ── Directories (relative to project root) ────────────────────────────────────
  contentDir: "content",
  outputDir: "_published",
  staticDir: "static",
  templatesDir: "templates",
  assetsDir: "assets",

  // ── Pagination ────────────────────────────────────────────────────────────────
  pageSize: 10,

  // ── Taxonomies ────────────────────────────────────────────────────────────────
  taxonomies: [
    {
      name: "tags",
      pageSize: 10,
      // indexPageSize: 10,
      // titleString: "Posts tagged {term}",
    },
    {
      name: "categories",
      pageSize: 10,
    },
  ],

  // ── Collections ───────────────────────────────────────────────────────────────
  // Pages are automatically grouped by top-level folder (e.g. content/blog/ → "blog").
  // Use 'glob' to define a collection with explicit file patterns — a collection's
  // name can differ from the folder name, span multiple directories, or use negations.
  collections: [
    {
      name: "blog",
      pageSize: 10,
      sort: "date",      // "date" | "title" | "filename"
      sortDir: "desc",   // "asc" | "desc"
      // url: "/",       // override listing URL (default: /{name}/)
      // glob: "galleries/flora/**/*.md",  // explicit pattern override
    },
  ],

  // ── RSS ───────────────────────────────────────────────────────────────────────
  rss: {
    enabled: true,
    path: "/rss.xml",
    limit: 20,
  },

  // ── Syntax highlighting (Shiki) ───────────────────────────────────────────────
  shiki: {
    langs: [
      "javascript", "typescript", "python", "php", "html", "erb",
      "go", "json", "liquid", "markdown", "ruby", "css", "vento",
    ],
    lightTheme: "github-light",
    darkTheme: "github-dark",
  },

  // ── Plugins ───────────────────────────────────────────────────────────────────
  plugins: [],
};
`;

const LAYOUT_TEMPLATE = `<!doctype html>
<html lang="{{ site.config.language }}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content="Inkwell">
    <title>{{ title ?? site.config.title }}</title>
    <link rel="stylesheet" href="/css/style.css" />
  </head>
  <body>
    <header>
      <a href="/">{{ site.config.title }}</a>
    </header>
    <main>
      {{ content }}
    </main>
    <footer>
      <p>Built with <a href="https://github.com/bobrocke/Inkwell">Inkwell</a></p>
    </footer>
  </body>
</html>
`;

const PAGE_TEMPLATE = `{{ include "partials/layout.vto" { content: page.html, title: page.frontmatter.title } }}
`;

const LISTING_TEMPLATE = `{{- set content }}
<h1>{{ listing.title ?? listing.collection }}</h1>
<ul>
  {{ for p of listing.pages }}
  <li>
    <a href="{{ p.url }}">{{ p.frontmatter.title }}</a>
    {{ if p.frontmatter.date }}
      <time>{{ p.frontmatter.date }}</time>
    {{ /if }}
  </li>
  {{ /for }}
</ul>
{{ if listing.pagination.prevUrl }}
  <a href="{{ listing.pagination.prevUrl }}">← Newer</a>
{{ /if }}
{{ if listing.pagination.nextUrl }}
  <a href="{{ listing.pagination.nextUrl }}">Older →</a>
{{ /if }}
{{- /set }}
{{ include "partials/layout.vto" { content, title: listing.title } }}
`;

const CSS_TEMPLATE = `/* inkwell-ssg starter styles */
*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: system-ui, sans-serif;
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  line-height: 1.6;
  color: #222;
}

header { margin-bottom: 2rem; }
header a { text-decoration: none; font-weight: bold; font-size: 1.25rem; }

footer { margin-top: 3rem; font-size: 0.85rem; color: #666; }

pre { overflow-x: auto; padding: 1rem; background: #f5f5f5; border-radius: 4px; }
code { font-family: ui-monospace, monospace; font-size: 0.9em; }
`;

const SAMPLE_POST = `---
title: Hello, World!
date: ${new Date().toISOString().slice(0, 10)}
tags: [hello, inkwell]
categories: [general]
---

# Hello, World!

Welcome to your new **Inkwell** site. Edit this post in \`content/posts/hello-world.md\`
or run \`inkwell serve\` to start the development server.

## Syntax highlighting

Inkwell uses [Shiki](https://shiki.style/) to highlight code at build time — no JavaScript is shipped to the browser.

\`\`\`js
// inkwell.config.js
export default {
  title: "My Site",
  siteUrl: "https://example.com",
  collections: [
    { name: "posts", pageSize: 10 },
  ],
  taxonomies: [
    { name: "tags", pageSize: 10 },
    { name: "categories", pageSize: 10 },
  ],
};
\`\`\`
`;

const TAXONOMY_INDEX_TEMPLATE = `{{- set content }}
<h1>{{ listing.title }}</h1>
<ul>
  {{ for term of listing.terms }}
  <li>
    <a href="{{ term.url }}">{{ term.name }}</a>
    <span>({{ term.count }})</span>
  </li>
  {{ /for }}
</ul>
{{- /set }}
{{ include "partials/layout.vto" { content, title: listing.title } }}
`;

const INDEX_PAGE = `---
title: Home
---

# Welcome

This is the home page. Check out the [posts](/posts/) to get started.
`;

const GITIGNORE = `node_modules/
_published/
`;

// ── Main scaffold function ─────────────────────────────────────────────────────

export async function scaffold(name: string, targetDir: string): Promise<void> {
  const configPath = path.join(targetDir, "inkwell.config.js");
  try {
    await access(configPath);
    throw new Error(`inkwell.config.js already exists in ${targetDir}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  const dirs = [
    targetDir,
    path.join(targetDir, "content", "posts"),
    path.join(targetDir, "templates", "partials"),
    path.join(targetDir, "assets", "css"),
    path.join(targetDir, "static"),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  const files: Array<[string, string]> = [
    ["inkwell.config.js", CONFIG_TEMPLATE(name)],
    ["templates/partials/layout.vto", LAYOUT_TEMPLATE],
    ["templates/page.vto", PAGE_TEMPLATE],
    ["templates/listing.vto", LISTING_TEMPLATE],
    ["templates/taxonomy-index.vto", TAXONOMY_INDEX_TEMPLATE],
    ["assets/css/style.css", CSS_TEMPLATE],
    ["content/index.md", INDEX_PAGE],
    ["content/posts/hello-world.md", SAMPLE_POST],
    [".gitignore", GITIGNORE],
  ];

  for (const [rel, content] of files) {
    await writeFile(path.join(targetDir, rel), content, "utf8");
  }

  // Minimal package.json
  const pkg = {
    name: name.toLowerCase().replace(/\s+/g, "-"),
    version: "0.1.0",
    type: "module",
    scripts: {
      build: "inkwell build",
      serve: "inkwell serve",
    },
  };
  await writeFile(
    path.join(targetDir, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
    "utf8",
  );
}
