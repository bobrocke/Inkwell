// ─── Media & EXIF ────────────────────────────────────────────────────────────

export interface ExifData {
  make?: string;
  model?: string;
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  dateTimeOriginal?: Date;
  gps?: { lat: number; lon: number };
  [key: string]: unknown;
}

export interface MediaFile {
  src: string;
  alt?: string;
  exif?: ExifData;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// A single piece of content. Prev/next refer to adjacent pages within the
// page's primary collection ordering — not pagination (which lives on Listing).

export interface Page {
  /** Root-relative URL, e.g. /posts/hello-world/ */
  url: string;
  /** Source file path relative to the content directory */
  src: string;
  title: string;
  date?: Date;
  /** Fully rendered HTML body */
  html: string;
  /** First paragraph or explicit `excerpt` frontmatter field */
  excerpt?: string;
  /** All raw frontmatter key/value pairs */
  frontmatter: Record<string, unknown>;
  /** Name of the collection this page belongs to, if any */
  collection?: string;
  /** Previous page in collection order */
  prev?: Page;
  /** Next page in collection order */
  next?: Page;
  /** EXIF-enriched media files referenced in frontmatter */
  media?: MediaFile[];
}

// ─── Term ─────────────────────────────────────────────────────────────────────
// A single taxonomy entry (e.g. the tag "typescript").

export interface Term {
  /** Display name, e.g. "TypeScript" */
  name: string;
  /** Root-relative URL, e.g. /tags/typescript/ */
  url: string;
  /** Number of pages that carry this term */
  count: number;
  /** All pages that carry this term */
  pages: Page[];
  /** The taxonomy field this term belongs to, e.g. "tags" */
  taxonomy: string;
}

// ─── Listing ──────────────────────────────────────────────────────────────────
// A paginated view of Pages or Terms. Pagination state lives here, never on Page.

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  /** URL of the previous listing page, if one exists */
  prevUrl?: string;
  /** URL of the next listing page, if one exists */
  nextUrl?: string;
}

export interface Listing {
  /** Root-relative URL for this listing page, e.g. /posts/page/2/ */
  url: string;
  /** The slice of items (Pages or Terms) shown on this listing page */
  items: (Page | Term)[];
  pagination: PaginationInfo;
  /** Optional display title, e.g. "Posts tagged typescript — page 2" */
  title?: string;
  /** Set when this listing is a taxonomy term archive */
  term?: Term;
  /** Set when this listing belongs to a named collection */
  collection?: string;
}

// ─── Site ─────────────────────────────────────────────────────────────────────
// Global template context passed into every render call.

export interface Site {
  /** All pages across all collections */
  pages: Page[];
  /** Pages grouped by collection name */
  collections: Record<string, Page[]>;
  /** Terms grouped by taxonomy name, then by term name */
  taxonomies: Record<string, Record<string, Term>>;
  /** All listing pages (index + paginated archives) */
  listings: Listing[];
  config: ResolvedConfig;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface TaxonomyConfig {
  /** Frontmatter field name, e.g. "tags" */
  field: string;
  /** Human-readable name, e.g. "Tags" */
  name?: string;
  /** URL prefix for term archives, e.g. "/tags/" */
  urlPrefix?: string;
}

export interface CollectionConfig {
  /** Glob pattern relative to contentDir, e.g. "posts/**" */
  pattern: string;
  /** Collection name used as key in Site.collections */
  name: string;
  sort?: "date" | "title" | "filename";
  sortDir?: "asc" | "desc";
  /** Items per listing page; overrides top-level pageSize */
  pageSize?: number;
}

export interface RssConfig {
  enabled: boolean;
  /** Output path, default "/rss.xml" */
  path: string;
  /** Max items in the feed, default 20 */
  limit: number;
}

export interface InkwellConfig {
  /** Canonical site URL, e.g. "https://example.com" (no trailing slash) */
  siteUrl: string;
  title: string;
  description?: string;
  contentDir?: string;
  outputDir?: string;
  staticDir?: string;
  templatesDir?: string;
  /** CSS/JS source assets processed before output, default "assets" */
  assetsDir?: string;
  /** Default items per listing page, default 10 */
  pageSize?: number;
  taxonomies?: TaxonomyConfig[];
  collections?: CollectionConfig[];
  rss?: Partial<RssConfig>;
  plugins?: InkwellPlugin[];
}

export interface ResolvedConfig {
  siteUrl: string;
  title: string;
  description: string;
  contentDir: string;
  outputDir: string;
  staticDir: string;
  templatesDir: string;
  assetsDir: string;
  pageSize: number;
  taxonomies: TaxonomyConfig[];
  collections: CollectionConfig[];
  rss: RssConfig;
  plugins: InkwellPlugin[];
}

// ─── Plugin system ────────────────────────────────────────────────────────────

export type HookName =
  | "beforeBuild"
  | "afterDiscover"
  | "afterParse"
  | "afterTaxonomy"
  | "beforeRender"
  | "afterRender"
  | "afterBuild";

export interface HookPayloads {
  beforeBuild: { config: ResolvedConfig };
  afterDiscover: { files: string[]; config: ResolvedConfig };
  afterParse: { pages: Page[]; config: ResolvedConfig };
  afterTaxonomy: {
    pages: Page[];
    taxonomies: Record<string, Record<string, Term>>;
    config: ResolvedConfig;
  };
  beforeRender: { site: Site };
  afterRender: { site: Site };
  afterBuild: { site: Site; duration: number };
}

export interface InkwellPlugin {
  name: string;
  hooks: {
    [K in HookName]?: (payload: HookPayloads[K]) => void | Promise<void>;
  };
}
