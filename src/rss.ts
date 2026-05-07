import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { Page, ResolvedConfig } from "./types.js";

// ─── XML helpers ──────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(date: Date): string {
  return date.toUTCString();
}

// ─── Feed generation ──────────────────────────────────────────────────────────

function buildItem(page: Page, siteUrl: string): string {
  const link = `${siteUrl}${page.url}`;
  const title = escapeXml(page.title);
  const description = escapeXml(page.excerpt ?? "");
  const pubDate = page.date ? rfc822(page.date) : "";

  return [
    `    <item>`,
    `      <title>${title}</title>`,
    `      <link>${link}</link>`,
    `      <guid isPermaLink="true">${link}</guid>`,
    pubDate ? `      <pubDate>${pubDate}</pubDate>` : "",
    description ? `      <description>${description}</description>` : "",
    `    </item>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildFeed(pages: Page[], config: ResolvedConfig): string {
  const { siteUrl, title, description, rss } = config;
  const feedUrl = `${siteUrl}${rss.path}`;
  const now = rfc822(new Date());

  const dated = pages
    .filter((p) => p.date)
    .sort((a, b) => (b.date!.getTime()) - (a.date!.getTime()))
    .slice(0, rss.limit);

  const items = dated.map((p) => buildItem(p, siteUrl)).join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    `  <channel>`,
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${siteUrl}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    `    <lastBuildDate>${now}</lastBuildDate>`,
    `    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`,
    items,
    `  </channel>`,
    `</rss>`,
  ].join("\n");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate an RSS 2.0 feed from all dated pages and write it to the output
 * directory. Skips generation if `config.rss.enabled` is false.
 *
 * Returns the output path, or undefined if RSS is disabled.
 */
export async function generateRss(
  pages: Page[],
  config: ResolvedConfig,
): Promise<string | undefined> {
  if (!config.rss.enabled) return undefined;

  const outPath = join(config.outputDir, config.rss.path.replace(/^\//, ""));
  const xml = buildFeed(pages, config);

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, xml, "utf-8");

  return outPath;
}
