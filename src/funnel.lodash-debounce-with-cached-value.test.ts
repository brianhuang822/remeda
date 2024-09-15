/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */

import { sleep } from "../test/sleep";
import { constant } from "./constant";
import { funnel } from "./funnel";
import { identity } from "./identity";

function debounceWithCachedValue<F extends (...args: any) => any>(
  func: F,
  wait = 0,
  {
    leading = false,
    trailing = true,
    maxWait,
  }: {
    readonly leading?: boolean;
    readonly trailing?: boolean;
    readonly maxWait?: number;
  } = {},
) {
  let cachedValue: ReturnType<F> | undefined;

  const debouncer = funnel(
    (_, ...args: Parameters<F>) => args,
    (args) => {
      cachedValue = func(...args) as ReturnType<F>;
    },
    {
      burstCoolDownMs: wait,
      ...(maxWait !== undefined && { maxBurstDurationMs: maxWait }),
      invokedAt: trailing ? (leading ? "both" : "end") : "start",
    },
  );

  return {
    call: (...args: Parameters<F>): ReturnType<F> | undefined => {
      debouncer.call(...args);
      return cachedValue;
    },

    flush: () => {
      debouncer.flush();
      return cachedValue;
    },

    cancel: debouncer.cancel,

    get cachedValue() {
      return cachedValue;
    },

    get isIdle() {
      return debouncer.isIdle;
    },
  };
}

describe("Main functionality", () => {
  it("should debounce a function", async () => {
    const debouncer = debounceWithCachedValue(identity(), 32);

    expect([
      debouncer.call("a"),
      debouncer.call("b"),
      debouncer.call("c"),
    ]).toEqual([undefined, undefined, undefined]);

    await sleep(128);

    expect([
      debouncer.call("d"),
      debouncer.call("e"),
      debouncer.call("f"),
    ]).toEqual(["c", "c", "c"]);
  });

  it("subsequent debounced calls return the last `func` result", async () => {
    const debouncer = debounceWithCachedValue(identity(), 32);
    debouncer.call("a");

    await sleep(64);
    expect(debouncer.call("b")).toBe("a");

    await sleep(128);
    expect(debouncer.call("c")).toBe("b");
  });

  it("subsequent leading debounced calls return the last `func` result", async () => {
    const debouncer = debounceWithCachedValue(identity(), 32, {
      leading: true,
      trailing: false,
    });

    expect([debouncer.call("a"), debouncer.call("b")]).toEqual(["a", "a"]);

    await sleep(64);
    expect([debouncer.call("c"), debouncer.call("d")]).toEqual(["c", "c"]);
  });
});

describe("Additional functionality", () => {
  it("can cancel before the timer starts", async () => {
    const debouncer = debounceWithCachedValue(identity(), 32);
    expect(() => {
      debouncer.cancel();
    }).not.toThrow();

    expect(debouncer.call("hello")).toBeUndefined();
    await sleep(32);

    expect(debouncer.call("world")).toBe("hello");
  });

  it("can cancel the timer", async () => {
    const debouncer = debounceWithCachedValue(constant("Hello, World!"), 32);

    expect(debouncer.call()).toBeUndefined();

    await sleep(1);
    expect(debouncer.call()).toBeUndefined();
    debouncer.cancel();

    await sleep(32);
    expect(debouncer.call()).toBeUndefined();

    await sleep(32);
    expect(debouncer.call()).toBe("Hello, World!");
  });

  it("can cancel after the timer ends", async () => {
    const debouncer = debounceWithCachedValue(identity(), 32);
    expect(debouncer.call("hello")).toBeUndefined();
    await sleep(32);

    expect(debouncer.call("world")).toBe("hello");
    expect(() => {
      debouncer.cancel();
    }).not.toThrow();
  });

  it("can return a cached value", () => {
    const debouncer = debounceWithCachedValue(identity(), 32, {
      leading: true,
      trailing: false,
    });
    expect(debouncer.cachedValue).toBeUndefined();
    expect(debouncer.call("hello")).toBe("hello");
    expect(debouncer.cachedValue).toBe("hello");
  });

  it("can check for inflight timers (leading)", async () => {
    const debouncer = debounceWithCachedValue(identity(), 32, {
      leading: true,
      trailing: false,
    });
    expect(debouncer.isIdle).toBe(true);

    expect(debouncer.call("hello")).toBe("hello");
    expect(debouncer.isIdle).toBe(false);

    await sleep(1);
    expect(debouncer.isIdle).toBe(false);

    await sleep(32);
    expect(debouncer.isIdle).toBe(true);
  });

  it("can flush before a cool-down", async () => {
    const debouncer = debounceWithCachedValue(identity(), 32);
    expect(debouncer.flush()).toBeUndefined();

    expect(debouncer.call("hello")).toBeUndefined();
    await sleep(32);

    expect(debouncer.call("world")).toBe("hello");
  });

  it("can flush during a cool-down", async () => {
    const debouncer = debounceWithCachedValue(identity(), 32);
    expect(debouncer.call("hello")).toBeUndefined();

    await sleep(1);
    expect(debouncer.call("world")).toBeUndefined();

    await sleep(1);
    expect(debouncer.flush()).toBe("world");
  });

  it("can flush after a cool-down", async () => {
    const debouncer = debounceWithCachedValue(identity(), 32);
    expect(debouncer.call("hello")).toBeUndefined();

    await sleep(32);
    expect(debouncer.flush()).toBe("hello");
  });
});
