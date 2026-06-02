Deno, Bun, and Node?

# Asset Pipeline

Maybe just to:
- bundle, minify, and create an optional .map for CSS and SASS/SCSS
- bundle and minify JS

  Yes, an asset pipeline makes a lot of sense for inkwell-ssg. Here's the analysis:
  
  ## Current State — The Gap
  The codebase already has the seeds of an asset pipeline but it's half-built:
  | Location | What happens |
  |---|---|
  | `assetsDir/` (default `assets/`) | CSS only — LightningCSS processes `.css`, resolves `@import`, minifies. `_`-prefixed files are partials. |
  | `staticDir/` (default `static/`) | Copy verbatim — zero processing. |
  | Images in frontmatter | EXIF extraction only — metadata read, no optimization. |
  | JavaScript | Nothing — no bundling, minification, or transpilation. |

  This means users must pre-process images, bundle JS, and handle cache-busting entirely outside inkwell. For a tool that markets "batteries-included", this is the single biggest missing feature for production sites.
  
  ## What an Asset Pipeline Should Do
  Core processors:
  1. Images — Resize, optimize, convert to WebP/AVIF, generate srcset attributes. Use sharp (native, fast, standard in SSG land). Output responsive image data into the Page/Site model so templates can render <picture> elements natively.
  2. JavaScript — Bundle + minify client-side JS via esbuild. Currently a total void.
  3. SVG optimization — SVGO-like minification for inline/raster SVG.
  4. Asset fingerprinting — Content-hash filenames for cache busting, exposed as a template helper.
  5. Font subsetting — (Optional) Optimize webfont delivery.

  ## How It Fits Architecturally
  The existing assetsDir concept is the natural home:
  assets/

  | Directory | Processor | Status |
  |---|---|---|
  | `css/` | LightningCSS | existing, becomes one processor |
  | `js/` | esbuild | new |
  | `img/` | sharp | new |
  | `svg/` | SVGO | new |
  | `fonts/` | copy/subset | new |
  | `static/` | copy verbatim | unchanged |

  The pipeline would slot into build.ts around step 9-10, parallel to the existing CSS step. A processAssets(config) function would fan out to type-specific processors, each producing output files + metadata fed into the Site model.

  The plugin hook system (src/plugins.ts) could gain beforeAssets / afterAssets hooks for extensibility, but the processors themselves should be built-in — consistent with the "no plugin hunting" philosophy.

  Config sketch:
  ```
  assets: {
    images: {
      formats: ['webp', 'avif'],
      sizes: [400, 800, 1200],
      quality: 80,
    },
    js: { minify: true },
    css: { minify: true },  // existing
  }
  ```

  ## Verdict
  The existing assetsDir / staticDir / CSS-only processing model is the most obvious half-built feature in the codebase. An asset pipeline is the natural completion — it moves inkwell from "you need external scripts for production images/JS" to truly zero-config for content-heavy sites. It's the highest-impact feature you could add.
