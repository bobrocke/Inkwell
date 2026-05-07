import { consola } from "consola";
import type { HookName, HookPayloads, InkwellPlugin } from "./types.js";

/**
 * Runs registered plugin hooks in series (registration order).
 * Async hooks are awaited before the next plugin's hook runs.
 */
export class PluginEmitter {
  private readonly plugins: InkwellPlugin[];

  constructor(plugins: InkwellPlugin[] = []) {
    this.plugins = plugins;
  }

  async emit<K extends HookName>(
    hook: K,
    payload: HookPayloads[K],
  ): Promise<void> {
    for (const plugin of this.plugins) {
      const fn = plugin.hooks[hook] as
        | ((payload: HookPayloads[K]) => void | Promise<void>)
        | undefined;

      if (!fn) continue;

      try {
        await fn(payload);
      } catch (err) {
        throw new Error(
          `Plugin "${plugin.name}" threw in hook "${hook}": ${(err as Error).message}`,
          { cause: err },
        );
      }
    }
  }
}

/**
 * Create a PluginEmitter from the plugin list in config.
 * Logs registered plugin names at startup.
 */
export function createEmitter(plugins: InkwellPlugin[]): PluginEmitter {
  if (plugins.length > 0) {
    consola.info(`Plugins: ${plugins.map((p) => p.name).join(", ")}`);
  }
  return new PluginEmitter(plugins);
}
