# Here's how to develop an npm package locally:

1. Set Up Your Package
   ```bash
   mkdir my-package && cd my-package
   npm init -y
   ```
   Edit package.json to set the name, version, main (entry point), and optionally exports.
2. Write Your Package Code
   ```js
   // index.js
   export function hello(name) {
     return `Hello, ${name}!`;
   }
   ```
3. Link the Package Locally
   From your package directory, run:

   ```bash
   npm link
   ```

   This creates a global symlink to your package. Then, in the project that will consume it:

   ```bash
   npm link my-package
   ```

   Now you can import it as if it were installed from npm:

   ```js
   import { hello } from "my-package";
   ```

4. Alternatives to npm link
   Using a local path in package.json (simpler, no global symlink):
   ```json
   {
     "dependencies": {
       "my-package": "file:../my-package"
     }
   }
   ```

Then run `npm install` in the consuming project.

Using `npm pack` (simulates a real install):

```bash
# In your package directory
npm pack
# Produces: my-package-1.0.0.tgz
```

```bash
# In the consuming project

npm install ../my-package/my-package-1.0.0.tgz
```

5. Watch for Changes
   To avoid manually relinking after every edit, add a build watcher:

   ```json
   // package.json
   "scripts": {
   "build": "tsc",
   "dev": "tsc --watch"
   }
   ```

6. Test Your Package
   Add tests using a framework like Vitest or Jest:

   ```bash
   npm install -D vitest
   json"scripts": {
   "test": "vitest"
   }
   ```

## Quick Comparison

`npm link`: Active dev, frequent changes
`file: path`: Simple projects, team sharing
`npm pack`: Testing the exact publish artifact

`npm link` is the most common workflow for active development since changes to your package are reflected immediately (if no build step is needed). Use `file:` for simpler setups or monorepos.
