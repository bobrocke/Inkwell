import { resolve, dirname } from "node:path";
import exifr from "exifr";
import type { Page, MediaFile, ExifData, ResolvedConfig } from "../types.js";

/**
 * Frontmatter fields inspected for media references.
 * Values may be a single path string or an array of path strings.
 */
const MEDIA_FIELDS = ["image", "images", "cover", "media", "photo", "photos"];

function toArray(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

/**
 * Resolve a media reference from frontmatter to an absolute filesystem path.
 * Supports paths relative to the source file or absolute paths within the
 * static directory.
 */
function resolveMediaPath(
  ref: string,
  page: Page,
  config: ResolvedConfig,
): string {
  if (ref.startsWith("/")) {
    return resolve(config.staticDir, ref.slice(1));
  }
  return resolve(dirname(resolve(config.contentDir, page.src)), ref);
}

/**
 * Read EXIF data from an image file. Returns undefined if the file is not
 * an image or EXIF cannot be extracted.
 */
async function readExif(filePath: string): Promise<ExifData | undefined> {
  try {
    const raw = await exifr.parse(filePath, {
      tiff: true,
      exif: true,
      gps: true,
    });
    if (!raw) return undefined;

    const data: ExifData = {};
    if (raw.Make) data.make = String(raw.Make);
    if (raw.Model) data.model = String(raw.Model);
    if (raw.ExposureTime != null) data.exposureTime = Number(raw.ExposureTime);
    if (raw.FNumber != null) data.fNumber = Number(raw.FNumber);
    if (raw.ISO != null) data.iso = Number(raw.ISO);
    if (raw.FocalLength != null) data.focalLength = Number(raw.FocalLength);
    if (raw.DateTimeOriginal) data.dateTimeOriginal = new Date(raw.DateTimeOriginal as string);
    if (raw.latitude != null && raw.longitude != null) {
      data.gps = { lat: Number(raw.latitude), lon: Number(raw.longitude) };
    }

    // Carry through any other fields for template access
    for (const [k, v] of Object.entries(raw)) {
      if (!(k in data)) data[k] = v;
    }

    return Object.keys(data).length > 0 ? data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Enrich a Page with EXIF data extracted from any media files referenced in
 * its frontmatter. Returns the same Page object with `media` populated.
 */
export async function enrichWithExif(
  page: Page,
  config: ResolvedConfig,
): Promise<Page> {
  const mediaFiles: MediaFile[] = [];

  for (const field of MEDIA_FIELDS) {
    const refs = toArray(page.frontmatter[field]);
    for (const ref of refs) {
      const filePath = resolveMediaPath(ref, page, config);
      const exif = await readExif(filePath);
      mediaFiles.push({ src: ref, exif });
    }
  }

  return { ...page, media: mediaFiles };
}

/**
 * Enrich all pages with EXIF data in parallel.
 */
export async function enrichAllWithExif(
  pages: Page[],
  config: ResolvedConfig,
): Promise<Page[]> {
  return Promise.all(pages.map((p) => enrichWithExif(p, config)));
}
