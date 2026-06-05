declare module "picomatch" {
  interface PicomatchOptions {
    dot?: boolean;
    nocase?: boolean;
    nobrace?: boolean;
    noglobstar?: boolean;
    noext?: boolean;
    nullglob?: boolean;
    strictSlashes?: boolean;
  }
  function picomatch(pattern: string | string[], options?: PicomatchOptions): (str: string) => boolean;
  export default picomatch;
}

declare module "@silvenon/remark-smartypants" {
  import type { Plugin } from "unified";
  interface SmartypantsOptions {
    quotes?: boolean;
    ellipses?: boolean;
    backticks?: boolean | "all";
    dashes?: boolean | "oldschool" | "inverted";
  }
  const remarkSmartypants: Plugin<[SmartypantsOptions?]>;
  export default remarkSmartypants;
}
