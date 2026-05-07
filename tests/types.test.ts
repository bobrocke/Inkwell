import { describe, it, expect } from "vitest";
import { slugify } from "../src/taxonomy.js";
import type { Page, Term, Listing, PaginationInfo } from "../src/types.js";

// ── slugify ───────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases ASCII", () => {
    expect(slugify("TypeScript")).toBe("typescript");
  });

  it("replaces spaces and punctuation with hyphens", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("café")).toBe("cafe");
  });

  it("collapses multiple separators", () => {
    expect(slugify("foo & bar")).toBe("foo-bar");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("  hello  ")).toBe("hello");
  });
});

// ── Type shape tests (compile-time + runtime) ─────────────────────────────────

describe("Page type", () => {
  it("accepts required fields only", () => {
    const page: Page = {
      url: "/posts/hello/",
      src: "posts/hello.md",
      title: "Hello",
      html: "<p>Hello</p>",
      frontmatter: {},
    };
    expect(page.url).toBe("/posts/hello/");
    expect(page.collection).toBeUndefined();
    expect(page.prev).toBeUndefined();
    expect(page.next).toBeUndefined();
  });

  it("accepts all optional fields", () => {
    const other: Page = {
      url: "/posts/world/",
      src: "posts/world.md",
      title: "World",
      html: "",
      frontmatter: { tags: ["a"] },
      collection: "posts",
    };
    const page: Page = {
      url: "/posts/hello/",
      src: "posts/hello.md",
      title: "Hello",
      html: "<p>Hi</p>",
      frontmatter: {},
      collection: "posts",
      date: new Date("2024-01-01"),
      excerpt: "Hi",
      prev: other,
      next: other,
      media: [{ src: "/img/foo.jpg" }],
    };
    expect(page.collection).toBe("posts");
    expect(page.prev?.url).toBe("/posts/world/");
  });
});

describe("Listing type", () => {
  it("has pagination state, not pages", () => {
    const pagination: PaginationInfo = {
      currentPage: 2,
      totalPages: 5,
      totalItems: 50,
      pageSize: 10,
      prevUrl: "/posts/",
      nextUrl: "/posts/page/3/",
    };
    const listing: Listing = {
      url: "/posts/page/2/",
      items: [],
      pagination,
      collection: "posts",
    };
    expect(listing.pagination.currentPage).toBe(2);
    expect(listing.pagination.prevUrl).toBe("/posts/");
    expect(listing.pagination.nextUrl).toBe("/posts/page/3/");
  });
});

describe("Term type", () => {
  it("includes count and taxonomy field", () => {
    const term: Term = {
      name: "TypeScript",
      url: "/tags/typescript/",
      count: 3,
      pages: [],
      taxonomy: "tags",
    };
    expect(term.taxonomy).toBe("tags");
    expect(term.count).toBe(3);
  });
});
