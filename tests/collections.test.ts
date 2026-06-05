import { describe, it, expect } from "vitest";
import type { Page, ResolvedConfig } from "../src/types.js";
import { assignCollections } from "../src/collections.js";

function makePage(src: string, collection?: string): Page {
  return {
    url: `/${src.replace(/\.md$/, "/")}`,
    src,
    title: src,
    html: "",
    frontmatter: {},
    collection,
  };
}

const baseConfig = {
  collections: [],
} as unknown as ResolvedConfig;

describe("assignCollections", () => {
  it("overrides folder-derived collection with glob match", () => {
    const pages = [makePage("galleries/flora/rose.md", "galleries")];
    const config = {
      ...baseConfig,
      collections: [{ name: "flora", glob: "galleries/flora/**/*.md" }],
    };

    assignCollections(pages, config);

    expect(pages[0].collection).toBe("flora");
  });

  it("matches multiple glob patterns to a single collection", () => {
    const pages = [
      makePage("galleries/flora/rose.md"),
      makePage("botany/lily.md"),
      makePage("posts/alpha.md"),
    ];
    const config = {
      ...baseConfig,
      collections: [
        {
          name: "plants",
          glob: ["galleries/flora/**/*.md", "botany/**/*.md"],
        },
      ],
    };

    assignCollections(pages, config);

    expect(pages[0].collection).toBe("plants");
    expect(pages[1].collection).toBe("plants");
    expect(pages[2].collection).toBeUndefined();
  });

  it("leaves page unchanged when no glob matches", () => {
    const pages = [
      makePage("posts/alpha.md", "posts"),
      makePage("posts/beta.md", "posts"),
    ];
    const config = {
      ...baseConfig,
      collections: [{ name: "flora", glob: "galleries/flora/**/*.md" }],
    };

    assignCollections(pages, config);

    expect(pages[0].collection).toBe("posts");
    expect(pages[1].collection).toBe("posts");
  });

  it("first matching collection wins for overlapping globs", () => {
    const pages = [makePage("galleries/flora/rose.md")];
    const config = {
      ...baseConfig,
      collections: [
        { name: "flora", glob: "galleries/flora/**/*.md" },
        { name: "all", glob: "**/*.md" },
      ],
    };

    assignCollections(pages, config);

    expect(pages[0].collection).toBe("flora");
  });

  it("does nothing when no collections have globs", () => {
    const pages = [
      makePage("posts/alpha.md", "posts"),
      makePage("posts/beta.md", "posts"),
    ];
    const config = {
      ...baseConfig,
      collections: [{ name: "posts" }],
    };

    assignCollections(pages, config);

    expect(pages[0].collection).toBe("posts");
    expect(pages[1].collection).toBe("posts");
  });

  it("handles deep nesting in glob patterns", () => {
    const pages = [
      makePage("galleries/landscapes/2024/summer/nice.md"),
    ];
    const config = {
      ...baseConfig,
      collections: [
        { name: "landscapes", glob: "galleries/landscapes/**/*.md" },
      ],
    };

    assignCollections(pages, config);

    expect(pages[0].collection).toBe("landscapes");
  });
});
