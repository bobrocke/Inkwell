import { describe, it, expect, vi } from "vitest";
import { PluginEmitter, createEmitter } from "../src/plugins.js";
import type { InkwellPlugin } from "../src/types.js";

describe("PluginEmitter", () => {
  it("calls registered hooks in series", async () => {
    const calls: string[] = [];
    const plugin: InkwellPlugin = {
      name: "test-plugin",
      hooks: {
        beforeBuild({ config }) {
          calls.push(`beforeBuild:${config.title}`);
        },
        afterParse({ pages }) {
          calls.push(`afterParse:${pages.length}`);
        },
      },
    };

    const emitter = new PluginEmitter([plugin]);
    await emitter.emit("beforeBuild", {
      config: { title: "Test", siteUrl: "https://example.com" } as any,
    });
    await emitter.emit("afterParse", { pages: [{}, {}] as any, config: {} as any });

    expect(calls).toEqual(["beforeBuild:Test", "afterParse:2"]);
  });

  it("runs multiple plugins in registration order", async () => {
    const order: string[] = [];
    const a: InkwellPlugin = {
      name: "a",
      hooks: { beforeBuild() { order.push("a"); } },
    };
    const b: InkwellPlugin = {
      name: "b",
      hooks: { beforeBuild() { order.push("b"); } },
    };
    const c: InkwellPlugin = {
      name: "c",
      hooks: { beforeBuild() { order.push("c"); } },
    };

    const emitter = new PluginEmitter([a, b, c]);
    await emitter.emit("beforeBuild", { config: {} as any });

    expect(order).toEqual(["a", "b", "c"]);
  });

  it("skips plugins that do not register the hook", async () => {
    const calls: string[] = [];
    const a: InkwellPlugin = {
      name: "a",
      hooks: { beforeBuild() { calls.push("a"); } },
    };
    const b: InkwellPlugin = {
      name: "b",
      hooks: {}, // no beforeBuild
    };

    const emitter = new PluginEmitter([a, b]);
    await emitter.emit("beforeBuild", { config: {} as any });

    expect(calls).toEqual(["a"]);
  });

  it("wraps plugin errors with plugin name and hook", async () => {
    const plugin: InkwellPlugin = {
      name: "bad-plugin",
      hooks: {
        beforeBuild() {
          throw new Error("boom");
        },
      },
    };

    const emitter = new PluginEmitter([plugin]);
    await expect(
      emitter.emit("beforeBuild", { config: {} as any }),
    ).rejects.toThrow('Plugin "bad-plugin" threw in hook "beforeBuild"');
  });

  it("supports async hooks", async () => {
    const results: number[] = [];
    const plugin: InkwellPlugin = {
      name: "async-plugin",
      hooks: {
        afterBuild({ duration }) {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              results.push(duration);
              resolve();
            }, 10);
          });
        },
      },
    };

    const emitter = new PluginEmitter([plugin]);
    await emitter.emit("afterBuild", { site: {} as any, duration: 42 });

    expect(results).toEqual([42]);
  });

  it("handles empty plugin list gracefully", async () => {
    const emitter = new PluginEmitter([]);
    await expect(
      emitter.emit("beforeBuild", { config: {} as any }),
    ).resolves.toBeUndefined();
  });

  it("emits to all registered hooks", async () => {
    const calls: string[] = [];
    const plugin: InkwellPlugin = {
      name: "multi",
      hooks: {
        beforeBuild: () => { calls.push("beforeBuild"); },
        afterDiscover: () => { calls.push("afterDiscover"); },
        afterParse: () => { calls.push("afterParse"); },
        afterTaxonomy: () => { calls.push("afterTaxonomy"); },
        beforeRender: () => { calls.push("beforeRender"); },
        afterRender: () => { calls.push("afterRender"); },
        afterBuild: () => { calls.push("afterBuild"); },
      },
    };

    const emitter = new PluginEmitter([plugin]);
    await emitter.emit("beforeBuild", { config: {} as any });
    await emitter.emit("afterDiscover", { files: [], config: {} as any });
    await emitter.emit("afterParse", { pages: [], config: {} as any });
    await emitter.emit("afterTaxonomy", { pages: [], taxonomies: {}, config: {} as any });
    await emitter.emit("beforeRender", { site: {} as any });
    await emitter.emit("afterRender", { site: {} as any });
    await emitter.emit("afterBuild", { site: {} as any, duration: 0 });

    expect(calls).toEqual([
      "beforeBuild",
      "afterDiscover",
      "afterParse",
      "afterTaxonomy",
      "beforeRender",
      "afterRender",
      "afterBuild",
    ]);
  });
});

describe("createEmitter", () => {
  it("returns a PluginEmitter instance", () => {
    const emitter = createEmitter([]);
    expect(emitter).toBeInstanceOf(PluginEmitter);
  });

  it("accepts plugins array", () => {
    const plugin: InkwellPlugin = { name: "test", hooks: {} };
    const emitter = createEmitter([plugin]);
    expect(emitter).toBeInstanceOf(PluginEmitter);
  });
});
