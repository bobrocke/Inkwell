## The full template resolution order for a content page is:

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

## Page Variables

page.url              // root-relative URL, e.g. "/posts/hello-world/"
page.src              // source file path relative to contentDir
page.title            // page title (from frontmatter or filename)
page.date             // Date object, or undefined
page.html             // fully rendered HTML body
page.excerpt          // first paragraph or frontmatter `excerpt` field
page.frontmatter      // all raw frontmatter key/value pairs
page.collection       // collection name, e.g. "posts", or undefined
page.prev             // previous Page in collection order (older), or undefined
page.next             // next Page in collection order (newer), or undefined
page.media            // array of EXIF-enriched media files from frontmatter

Frontmatter fields like categories and tags are accessed via
page.frontmatter.categories, page.frontmatter.tags, etc.


## Listing Variables

   listing.url                        // root-relative URL, e.g. "/posts/page/2/"
   listing.pages                      // array of Page objects on this listing page
   listing.pagination                 // PaginationInfo (see below)
   listing.title                      // display title, e.g. "Posts" or "Tags: typescript"
   listing.collection                 // collection name if a collection listing, or undefined
   listing.term                       // Term object if a taxonomy term listing, or undefined
   listing.terms                      // array of Terms if a taxonomy index listing, or undefined
   listing.taxonomyIndex              // taxonomy field name if an index listing, or undefined

   ### listing.pagination:

   listing.pagination.currentPage     // e.g. 2
   listing.pagination.totalPages      // e.g. 5
   listing.pagination.totalItems      // total items across all pages
   listing.pagination.pageSize        // items per page
   listing.pagination.prevUrl         // URL of prev page, or undefined
   listing.pagination.nextUrl         // URL of next page, or undefined

   ### listing.term (on taxonomy term listings):

   listing.term.name                  // e.g. "TypeScript"
   listing.term.url                   // e.g. "/tags/typescript/"
   listing.term.count                 // number of pages with this term
   listing.term.taxonomy              // e.g. "tags"