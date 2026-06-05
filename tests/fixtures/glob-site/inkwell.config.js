/** @type {import('../../src/types.js').InkwellConfig} */
export default {
  title: "Glob Site",
  siteUrl: "https://glob.example.com",
  description: "Test fixture for glob-based collections.",
  collections: [
    {
      name: "flora",
      glob: "galleries/flora/**/*.md",
      pageSize: 10,
      sort: "date",
      sortDir: "desc",
    },
    {
      name: "posts",
      pageSize: 10,
    },
  ],
  rss: { enabled: false },
};
