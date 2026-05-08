/** @type {import('../../src/types.js').InkwellConfig} */
export default {
  title: "Test Site",
  siteUrl: "https://test.example.com",
  description: "A fixture site for inkwell-ssg tests.",
  taxonomies: [{ name: "tags", pageSize: 10 }],
  collections: [
    {
      name: "posts",
      pageSize: 2,
    },
  ],
  rss: { enabled: true, limit: 10 },
};
