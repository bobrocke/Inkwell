import type {
  Page,
  Term,
  Listing,
  PaginationInfo,
  ResolvedConfig,
} from "./types.js";

// ─── Sorting ──────────────────────────────────────────────────────────────────

type SortKey = "date" | "title" | "filename";
type SortDir = "asc" | "desc";

function sortPages(pages: Page[], by: SortKey = "date", dir: SortDir = "desc"): Page[] {
  const sorted = [...pages].sort((a, b) => {
    let cmp = 0;
    switch (by) {
      case "date": {
        const ta = a.date?.getTime() ?? 0;
        const tb = b.date?.getTime() ?? 0;
        cmp = ta - tb;
        break;
      }
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "filename":
        cmp = a.src.localeCompare(b.src);
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

// ─── Pagination helpers ───────────────────────────────────────────────────────

function paginate<T>(
  items: T[],
  pageSize: number,
  baseUrl: string,
): Array<{ items: T[]; pagination: PaginationInfo }> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages: Array<{ items: T[]; pagination: PaginationInfo }> = [];

  for (let i = 0; i < totalPages; i++) {
    const currentPage = i + 1;
    const slice = items.slice(i * pageSize, (i + 1) * pageSize);

    const prevUrl =
      currentPage > 1
        ? currentPage === 2
          ? baseUrl
          : `${baseUrl}page/${currentPage - 1}/`
        : undefined;

    const nextUrl =
      currentPage < totalPages
        ? `${baseUrl}page/${currentPage + 1}/`
        : undefined;

    pages.push({
      items: slice,
      pagination: {
        currentPage,
        totalPages,
        totalItems: total,
        pageSize,
        prevUrl,
        nextUrl,
      },
    });
  }

  return pages;
}

function pageUrl(baseUrl: string, pageNum: number): string {
  return pageNum === 1 ? baseUrl : `${baseUrl}page/${pageNum}/`;
}

// ─── Prev/next navigation on Pages ───────────────────────────────────────────

/**
 * Assign prev/next pointers to pages within a collection.
 * Assumes pages are already sorted (index 0 = newest/first).
 * prev → older (higher index), next → newer (lower index).
 */
function assignNavigation(pages: Page[]): Page[] {
  return pages.map((page, i) => ({
    ...page,
    prev: pages[i + 1],   // older / earlier
    next: pages[i - 1],   // newer / later
  }));
}

// ─── Collection listings ──────────────────────────────────────────────────────

function buildCollectionListings(
  pages: Page[],
  config: ResolvedConfig,
): { pages: Page[]; listings: Listing[] } {
  // Group pages by collection
  const groups = new Map<string, Page[]>();
  const ungrouped: Page[] = [];

  for (const page of pages) {
    if (page.collection) {
      const existing = groups.get(page.collection) ?? [];
      existing.push(page);
      groups.set(page.collection, existing);
    } else {
      ungrouped.push(page);
    }
  }

  const allListings: Listing[] = [];
  const updatedPages: Page[] = [];

  for (const [collectionName, collPages] of groups) {
    // Find optional config for this collection
    const colConfig = config.collections.find(
      (c) => c.name.toLowerCase() === collectionName.toLowerCase(),
    );
    const name = colConfig?.name ?? collectionName;
    const title = colConfig
      ? name
      : name.charAt(0).toUpperCase() + name.slice(1);
    const pageSize = colConfig?.pageSize ?? config.pageSize;
    const sortBy = colConfig?.sort ?? "date";
    const sortDir = colConfig?.sortDir ?? "desc";

    const sorted = sortPages(collPages, sortBy, sortDir);
    const withNav = assignNavigation(sorted);
    updatedPages.push(...withNav);

    const baseUrl = `/${collectionName}/`;
    const paginatedGroups = paginate(withNav, pageSize, baseUrl);

    paginatedGroups.forEach(({ items, pagination }, i) => {
      allListings.push({
        url: pageUrl(baseUrl, i + 1),
        pages: items,
        pagination,
        title,
        collection: collectionName,
      });
    });
  }

  // Ungrouped pages pass through without nav
  updatedPages.push(...ungrouped);

  return { pages: updatedPages, listings: allListings };
}

// ─── Taxonomy term listings ───────────────────────────────────────────────────

function buildTermListings(
  taxonomies: Record<string, Record<string, Term>>,
  config: ResolvedConfig,
): Listing[] {
  const listings: Listing[] = [];

  for (const [field, termMap] of Object.entries(taxonomies)) {
    const taxConfig = config.taxonomies.find((t) => t.name === field);
    const pageSize = taxConfig?.pageSize ?? config.pageSize;
    const urlPrefix = `/${field}/`;
    const taxTitle = field.charAt(0).toUpperCase() + field.slice(1);

    // Taxonomy index listing — one page listing all terms
    const allTerms = Object.values(termMap).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    listings.push({
      url: urlPrefix,
      pages: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: allTerms.length,
        pageSize: allTerms.length,
      },
      title: taxTitle,
      terms: allTerms,
      taxonomyIndex: field,
    });

    // Per-term listings
    for (const term of Object.values(termMap)) {
      const sorted = sortPages(term.pages, "date", "desc");
      const paginatedGroups = paginate(sorted, pageSize, term.url);

      paginatedGroups.forEach(({ items, pagination }, i) => {
        listings.push({
          url: pageUrl(term.url, i + 1),
          pages: items,
          pagination,
          title: `${taxTitle}: ${term.name}`,
          term,
        });
      });
    }
  }

  return listings;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ListingResult {
  /** Pages with prev/next navigation assigned */
  pages: Page[];
  listings: Listing[];
}

/**
 * Build all Listing objects and assign prev/next navigation to Pages.
 *
 * Creates:
 * - One paginated listing per collection (e.g. /posts/, /posts/page/2/)
 * - One paginated listing per taxonomy term (e.g. /tags/typescript/)
 *
 * Pagination state lives on Listing, never on Page.
 */
export function buildListings(
  pages: Page[],
  taxonomies: Record<string, Record<string, Term>>,
  config: ResolvedConfig,
): ListingResult {
  const { pages: pagesWithNav, listings: collectionListings } =
    buildCollectionListings(pages, config);

  const termListings = buildTermListings(taxonomies, config);

  return {
    pages: pagesWithNav,
    listings: [...collectionListings, ...termListings],
  };
}
