import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { consola } from "consola";

// ── Scaffold file templates ────────────────────────────────────────────────────

const CONFIG_TEMPLATE = (name: string) => `/** @type {import('inkwell-ssg').InkwellConfig} */
export default {
  title: "${name}",
  siteUrl: "https://example.com",
  description: "A site built with inkwell-ssg.",

  taxonomies: [
    { field: "tags", name: "Tags", urlPrefix: "/tags/" },
  ],

  collections: [
    {
      name: "posts",
      pattern: "posts/**",
      pageSize: 10,
    },
  ],

  rss: {
    enabled: true,
    limit: 20,
  },
};
`;

const LAYOUT_TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ page.frontmatter.title ?? site.config.title }}</title>
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
      <p>Built with <a href="https://github.com/bobrocke/Inkwell">inkwell-ssg</a></p>
    </footer>
  </body>
</html>
`;

const PAGE_TEMPLATE = `{{ await include("_layout.vto", { content: page.html }) }}
`;

const LISTING_TEMPLATE = `{{ await include("_layout.vto", { content: "" }) }}
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Posts — {{ site.config.title }}</title>
    <link rel="stylesheet" href="/css/style.css" />
  </head>
  <body>
    <header>
      <a href="/">{{ site.config.title }}</a>
    </header>
    <main>
      <h1>Posts</h1>
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
    </main>
  </body>
</html>
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
title: "Hello, World!"
date: "${new Date().toISOString().slice(0, 10)}"
tags: [hello, inkwell]
---

# Hello, World!

Welcome to your new **inkwell-ssg** site. Edit this post in \`content/posts/hello-world.md\`
or run \`inkwell dev\` to start the development server.
`;

const INDEX_PAGE = `---
title: "Home"
---

# Welcome

This is the home page. Check out the [posts](/posts/) to get started.
`;

const GITIGNORE = `node_modules/
dist/
published/
`;

// ── Main scaffold function ─────────────────────────────────────────────────────

export async function scaffold(name: string, targetDir: string): Promise<void> {
  if (existsSync(targetDir)) {
    throw new Error(`Directory already exists: ${targetDir}`);
  }

  const dirs = [
    targetDir,
    path.join(targetDir, "content", "posts"),
    path.join(targetDir, "templates"),
    path.join(targetDir, "assets", "css"),
    path.join(targetDir, "static"),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  const files: Array<[string, string]> = [
    ["inkwell.config.js", CONFIG_TEMPLATE(name)],
    ["templates/_layout.vto", LAYOUT_TEMPLATE],
    ["templates/page.vto", PAGE_TEMPLATE],
    ["templates/listing.vto", LISTING_TEMPLATE],
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
      dev: "inkwell dev",
    },
    devDependencies: {
      "inkwell-ssg": "latest",
    },
  };
  await writeFile(
    path.join(targetDir, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
    "utf8",
  );
}
