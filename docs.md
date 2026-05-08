● The full resolution order for a content page is:

   1. frontmatter.layout — if the post has layout: photo in its
  frontmatter, photo.vto is used
   2. Collection name — posts in content/posts/ try posts.vto first
   3. page.vto — the universal fallback

  So a post in content/posts/ actually tries posts.vto before falling back
  to page.vto. If you wanted all posts to have a different layout from
  other pages, you'd create templates/posts.vto and it would automatically
  be used — no frontmatter needed.