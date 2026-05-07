import { readFile } from "node:fs/promises";
import { relative, basename, dirname, join } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { parse as parseYaml } from "yaml";
import { visit } from "unist-util-visit";
import { createHighlighter, type Highlighter } from "shiki";
import type { Node } from "unist";
import type { Element, Root } from "hast";
import type { Page, ResolvedConfig } from "../types.js";

// ─── Shiki singleton ──────────────────────────────────────────────────────────

let _highlighter: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!_highlighter) {
    _highlighter = await createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["typescript", "javascript", "bash", "json", "css", "html", "markdown", "yaml", "python", "rust", "go"],
    });
  }
  return _highlighter;
}

// ─── Rehype plugin: syntax highlighting ──────────────────────────────────────

function makeRehypeShiki(highlighter: Highlighter) {
  // Returns a unified plugin (a function that returns the transformer)
  return function rehypeShikiPlugin() {
    return function (tree: Root) {
      const tasks: Array<() => void> = [];

      visit(tree, "element", (node: Node) => {
        const el = node as Element;
        if (el.tagName !== "pre") return;

        const codeEl = el.children.find(
          (c): c is Element => (c as Element).tagName === "code",
        );
        if (!codeEl) return;

        const lang = (codeEl.properties?.className as string[] | undefined)
          ?.find((c) => c.startsWith("language-"))
          ?.slice("language-".length) ?? "text";

        const text = codeEl.children
          .map((c) => ("value" in c ? (c as { value: string }).value : ""))
          .join("");

        tasks.push(() => {
          const hast = highlighter.codeToHast(text, {
            lang,
            themes: { light: "github-light", dark: "github-dark" },
          });
          Object.assign(el, hast.children[0]);
        });
      });

      for (const task of tasks) task();
    };
  };
}

// ─── Frontmatter extraction ───────────────────────────────────────────────────

interface FrontmatterNode extends Node {
  type: "yaml";
  value: string;
}

function extractFrontmatter(tree: Node): Record<string, unknown> {
  let data: Record<string, unknown> = {};
  visit(tree, "yaml", (node: Node) => {
    const yamlNode = node as FrontmatterNode;
    try {
      const parsed = parseYaml(yamlNode.value);
      if (parsed && typeof parsed === "object") {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      // malformed frontmatter — leave empty
    }
  });
  return data;
}

// ─── URL generation ───────────────────────────────────────────────────────────

/**
 * Convert an absolute content file path to a root-relative URL.
 *
 * content/index.md              → /
 * content/posts/index.md        → /posts/
 * content/posts/hello-world.md  → /posts/hello-world/
 */
export function fileToUrl(filePath: string, contentDir: string): string {
  const rel = relative(contentDir, filePath);
  const dir = dirname(rel);
  const base = basename(rel).replace(/\.mdx?$/, "");

  if (base === "index") {
    return dir === "." ? "/" : `/${dir}/`;
  }

  const segments = dir === "." ? [base] : [dir, base];
  return `/${segments.join("/")}/`;
}

// ─── Excerpt extraction ───────────────────────────────────────────────────────

function extractExcerpt(html: string): string {
  const match = html.match(/<p>([\s\S]*?)<\/p>/);
  if (!match) return "";
  return match[1].replace(/<[^>]+>/g, "").trim();
}

// ─── Main parse function ──────────────────────────────────────────────────────

/**
 * Parse a markdown file into a Page object.
 * Frontmatter is extracted and the remaining content is rendered to HTML
 * with syntax highlighting applied at build time via Shiki.
 */
export async function parseFile(
  filePath: string,
  config: ResolvedConfig,
): Promise<Page> {
  const highlighter = await getHighlighter();
  const raw = await readFile(filePath, "utf-8");

  // Two-pass: first extract frontmatter from the AST, then render HTML
  const parser = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]);

  const mdast = parser.parse(raw);
  const frontmatter = extractFrontmatter(mdast);

  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(makeRehypeShiki(highlighter))
    .use(rehypeStringify, { allowDangerousHtml: true });

  const vfile = await processor.process(raw);
  const html = String(vfile);

  const url = fileToUrl(filePath, config.contentDir);
  const title = String(frontmatter.title ?? basename(filePath, ".md"));
  const rawDate = frontmatter.date;
  const date = rawDate ? new Date(rawDate as string) : undefined;
  const excerpt = String(frontmatter.excerpt ?? extractExcerpt(html));

  // Derive collection name from top-level directory inside contentDir
  const rel = relative(config.contentDir, filePath);
  const topDir = rel.includes("/") ? rel.split("/")[0] : undefined;

  return {
    url,
    src: rel,
    title,
    date,
    html,
    excerpt,
    frontmatter,
    collection: topDir,
    media: [],
  };
}

/**
 * Parse all discovered content files into Pages.
 */
export async function parseContent(
  filePaths: string[],
  config: ResolvedConfig,
): Promise<Page[]> {
  return Promise.all(filePaths.map((f) => parseFile(f, config)));
}
