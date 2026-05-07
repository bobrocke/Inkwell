/** @type {import('../../src/types.js').InkwellConfig} */
export default {
  title: "Test Site",
  siteUrl: "https://test.example.com",
  description: "A fixture site for inkwell-ssg tests.",
  taxonomies: [{ field: "tags", name: "Tags", urlPrefix: "/tags/" }],
  collections: [
    {
      name: "posts",
      pattern: "posts/**",
      pageSize: 2,
    },
  ],
  rss: { enabled: true, limit: 10 },
};
