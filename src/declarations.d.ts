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
