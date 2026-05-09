import { readFile } from "node:fs/promises";
import { relative, basename, dirname, join } from "node:path";
import { unified, type Processor } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkDefinitionList from "remark-definition-list";
import remarkSmartypants from "@silvenon/remark-smartypants";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import { parse as parseYaml } from "yaml";
import { visit } from "unist-util-visit";
import { createHighlighter, type LanguageRegistration } from "shiki";
import ventoGrammar from "../grammars/vento.tmLanguage.json";
import type { Node } from "unist";
import type { Element, Root } from "hast";
import type { Page, ResolvedConfig } from "../types.js";

// ─── Rehype plugin: syntax highlighting ──────────────────────────────────────

function makeRehypeShiki(highlighter: Awaited<ReturnType<typeof createHighlighter>>) {
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

// ─── Shiki setup ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProcessor = Processor<any, any, any, any, any>;

let _processorPromise: Promise<AnyProcessor> | null = null;

async function buildProcessor(langs: string[]): Promise<AnyProcessor> {
  const highlighter = await createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: [...langs, ventoGrammar as unknown as LanguageRegistration],
  });
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkGfm)
    .use(remarkDefinitionList)
    .use(remarkDirective)
    .use(remarkSmartypants, { dashes: 'oldschool' })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(makeRehypeShiki(highlighter))
    .use(rehypeStringify, { allowDangerousHtml: true });
}

function getProcessor(langs: string[]): Promise<AnyProcessor> {
  if (!_processorPromise) {
    _processorPromise = buildProcessor(langs);
  }
  return _processorPromise;
}

/** Reset the processor singleton (e.g. after a config change in dev mode). */
export function resetProcessor(): void {
  _processorPromise = null;
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
async function parseFileInternal(
  filePath: string,
  raw: string,
  processor: AnyProcessor,
  config: ResolvedConfig,
): Promise<Page> {
  const mdast = processor.parse(raw);
  const frontmatter = extractFrontmatter(mdast);
  const vfile = await processor.run(mdast);
  const html = String(processor.stringify(vfile as Root));

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
 * Parse a single markdown file into a Page.
 */
export async function parseFile(
  filePath: string,
  config: ResolvedConfig,
): Promise<Page> {
  const [raw, processor] = await Promise.all([
    readFile(filePath, "utf-8"),
    getProcessor(config.shiki.langs),
  ]);
  return parseFileInternal(filePath, raw, processor, config);
}

/**
 * Parse all discovered content files into Pages.
 */
export async function parseContent(
  filePaths: string[],
  config: ResolvedConfig,
): Promise<Page[]> {
  const [contents, processor] = await Promise.all([
    Promise.all(filePaths.map((f) => readFile(f, "utf-8"))),
    getProcessor(config.shiki.langs),
  ]);

  return Promise.all(
    filePaths.map((filePath, i) =>
      parseFileInternal(filePath, contents[i], processor, config),
    ),
  );
}
