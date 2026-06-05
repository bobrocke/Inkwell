/** @type {import('../../src/types.js').InkwellConfig} */
export default {
  title: "Media Test",
  siteUrl: "https://example.com",
  collections: [
    {
      name: "fauna",
      media: "galleries/fauna/**/*.{jpg,png}",
    },
    {
      name: "flora",
      media: ["galleries/flora/**/*.jpg", "galleries/flora/**/*.png"],
    },
  ],
};
