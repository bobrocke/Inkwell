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
  /** Last modified date from frontmatter `lastmod` field */
  lastmod?: Date;
  /** When true, this page is a draft and excluded from production builds */
  draft?: boolean;
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
  /** The slice of Pages shown on this listing page */
  pages: Page[];
  pagination: PaginationInfo;
  /** Optional display title, e.g. "Posts tagged typescript — page 2" */
  title?: string;
  /** Set when this listing is a taxonomy term archive */
  term?: Term;
  /** Set when this listing belongs to a named collection */
  collection?: string;
  /** Set on taxonomy index listings — all terms for this taxonomy */
  terms?: Term[];
  /** Set on taxonomy index listings — the taxonomy field name, e.g. "tags" */
  taxonomyIndex?: string;
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

export interface ShikiConfig {
  /** Languages to load for syntax highlighting. Defaults to a curated common set. */
  langs?: string[];
  /** Shiki theme for light mode. Defaults to "github-light". */
  lightTheme?: string;
  /** Shiki theme for dark mode. Defaults to "github-dark". */
  darkTheme?: string;
}

export interface TaxonomyConfig {
  /** Frontmatter field name, URL slug, and basis for display name, e.g. "tags" → /tags/ */
  name: string;
  /** Items per term listing page; overrides top-level pageSize */
  pageSize?: number;
}

export interface CollectionConfig {
  /** Collection name — matches the top-level folder under contentDir (e.g. "posts" → content/posts/) */
  name: string;
  sort?: "date" | "title" | "filename";
  sortDir?: "asc" | "desc";
  /** Items per listing page; overrides top-level pageSize */
  pageSize?: number;
  /** Override the base URL for this collection's listing. Defaults to /{name}/. Use "/" for the home page. */
  url?: string;
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
  /** Site locale for display/i18n, in language-region format (e.g. "en-US") */
  language?: string;
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
  shiki?: ShikiConfig;
}

export interface ResolvedConfig {
  siteUrl: string;
  title: string;
  language: string;
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
  shiki: Required<ShikiConfig>;
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
