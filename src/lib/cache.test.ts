import { describe, expect, it } from "vitest";
import { TtlCache } from "./cache";

function clock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

function counter<T>(value: T) {
  let calls = 0;
  return {
    load: async () => {
      calls++;
      return value;
    },
    calls: () => calls,
  };
}

describe("TtlCache", () => {
  it("gjenbruker svaret til levetiden er ute", async () => {
    const time = clock();
    const cache = new TtlCache(120_000, time.now);
    const loader = counter("svar");

    expect(await cache.get("a", loader.load)).toBe("svar");
    time.advance(119_999);
    expect(await cache.get("a", loader.load)).toBe("svar");
    expect(loader.calls()).toBe(1);

    time.advance(1);
    await cache.get("a", loader.load);
    expect(loader.calls()).toBe(2);
  });

  it("holder nøklene adskilt", async () => {
    const cache = new TtlCache(120_000, clock().now);
    const loader = counter("svar");

    await cache.get("a", loader.load);
    await cache.get("b", loader.load);
    expect(loader.calls()).toBe(2);
  });

  it("henter på nytt etter clear", async () => {
    const cache = new TtlCache(120_000, clock().now);
    const loader = counter("svar");

    await cache.get("a", loader.load);
    cache.clear();
    await cache.get("a", loader.load);
    expect(loader.calls()).toBe(2);
  });

  it("deler én henting mellom samtidige kall", async () => {
    const cache = new TtlCache(120_000, clock().now);
    const loader = counter("svar");

    await Promise.all([cache.get("a", loader.load), cache.get("a", loader.load)]);
    expect(loader.calls()).toBe(1);
  });

  it("husker ikke feil", async () => {
    const cache = new TtlCache(120_000, clock().now);
    let calls = 0;
    const failing = async () => {
      calls++;
      throw new Error("GitHub er nede");
    };

    await expect(cache.get("a", failing)).rejects.toThrow("GitHub er nede");
    await expect(cache.get("a", failing)).rejects.toThrow("GitHub er nede");
    expect(calls).toBe(2);
  });
});
