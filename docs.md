● The full resolution order for a content page is:

   1. frontmatter.layout — if the post has layout: photo in its
  frontmatter, photo.vto is used
   2. Collection name — posts in content/posts/ try posts.vto first
   3. page.vto — the universal fallback

  So a post in content/posts/ actually tries posts.vto before falling back
  to page.vto. If you wanted all posts to have a different layout from
  other pages, you'd create templates/posts.vto and it would automatically
  be used — no frontmatter needed.


  page.frontmatter.categories


   listing.pagination.currentPage   // e.g. 2
   listing.pagination.totalPages    // e.g. 5
   listing.pagination.totalItems    // total number of pages/terms across
  all pages
   listing.pagination.pageSize      // items per page
   listing.pagination.prevUrl       // URL of previous listing page, or
  undefined
   listing.pagination.nextUrl       // URL of next listing page, or
  undefined

  prevUrl and nextUrl are undefined on the first/last pages respectively,
  so they double as existence checks:

   {{ if listing.pagination.prevUrl }}
     <a href="{{ listing.pagination.prevUrl }}">← Newer</a>
   {{ /if }}
   {{ if listing.pagination.nextUrl }}
     <a href="{{ listing.pagination.nextUrl }}">Older →</a>
   {{ /if }}