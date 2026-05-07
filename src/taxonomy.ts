import type { Page, Term, ResolvedConfig, TaxonomyConfig } from "./types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toStringArray(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value))
    return value.filter((v): v is string => typeof v === "string");
  return [];
}

/**
 * Convert a term name to a URL-safe slug.
 * e.g. "TypeScript & Node" → "typescript-node"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Build taxonomies ─────────────────────────────────────────────────────────

/**
 * Build a taxonomy map from all pages.
 *
 * Returns a nested record:
 *   Record<taxonomyField, Record<termSlug, Term>>
 *
 * Example:
 *   { tags: { typescript: { name: "TypeScript", url: "/tags/typescript/", ... } } }
 */
export function buildTaxonomies(
  pages: Page[],
  config: ResolvedConfig,
): Record<string, Record<string, Term>> {
  const result: Record<string, Record<string, Term>> = {};

  for (const taxConfig of config.taxonomies) {
    result[taxConfig.name] = buildTaxonomy(pages, taxConfig);
  }

  return result;
}

function buildTaxonomy(
  pages: Page[],
  taxConfig: TaxonomyConfig,
): Record<string, Term> {
  const { name: field } = taxConfig;
  const prefix = `/${field}/`;
  const termMap: Record<string, Term> = {};

  for (const page of pages) {
    const names = toStringArray(page.frontmatter[field]);

    for (const name of names) {
      const slug = slugify(name);
      if (!termMap[slug]) {
        termMap[slug] = {
          name,
          url: `${prefix}${slug}/`,
          count: 0,
          pages: [],
          taxonomy: field,
        };
      }
      termMap[slug].count++;
      termMap[slug].pages.push(page);
    }
  }

  return termMap;
}
