/* eslint-disable @typescript-eslint/no-unused-vars -- We just want to build types, we don't care about using the params... */
/* eslint-disable vitest/valid-expect -- This rule isn't very good with annotated expect clauses :( */

import { doNothing } from "./doNothing";
import { funnel } from "./funnel";

describe("'call' method args", () => {
  test("no args", () => {
    const foo = funnel(doNothing(), {
      reducer: (_: "test" | undefined) => "test" as const,
      invokedAt: "start",
    });
    expectTypeOf(foo.call).parameters.toEqualTypeOf<[]>();
  });

  test("non-optional args", () => {
    const foo = funnel(doNothing(), {
      // @ts-expect-error [ts(6133)] -- We want to use explicit names, not prefixed with _
      reducer: (_: "test" | undefined, a: string, b: number, c: boolean) =>
        "test" as const,

      invokedAt: "start",
    });
    expectTypeOf(foo.call).parameters.toEqualTypeOf<
      [a: string, b: number, c: boolean]
    >();
  });

  test("optional args", () => {
    const foo = funnel(doNothing(), {
      // @ts-expect-error [ts(6133)] -- We want to use explicit names, not prefixed with _
      reducer: (_: "test" | undefined, a?: string) => "test" as const,
      invokedAt: "start",
    });
    expectTypeOf(foo.call).parameters.toEqualTypeOf<[a?: string | undefined]>();
  });

  test("rest args", () => {
    const foo = funnel(doNothing(), {
      reducer:
        // @ts-expect-error [ts(6133)] -- We want to use explicit names, not prefixed with _
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- rest params can't be readonly, it breaks typing :(
        (_: "test" | undefined, ...as: Array<string>) => "test" as const,

      invokedAt: "start",
    });
    expectTypeOf(foo.call).parameters.toEqualTypeOf<Array<string>>();
  });
});

describe("derive the reducer accumulator type from the executor param", () => {
  test("simple types", () => {
    funnel(
      (_: number) => {
        // do nothing
      },
      {
        reducer: (reduced) => {
          expectTypeOf(reduced).toEqualTypeOf<number | undefined>();
          return reduced!;
        },
        invokedAt: "start",
      },
    );
  });

  test("arrays", () => {
    funnel(
      (_: ReadonlyArray<number>) => {
        // do nothing,
      },
      {
        reducer: (reduced) => {
          expectTypeOf(reduced).toEqualTypeOf<
            ReadonlyArray<number> | undefined
          >();
          return reduced!;
        },
        invokedAt: "start",
      },
    );
  });

  test("objects", () => {
    funnel(
      (_: { readonly a: number }) => {
        // do nothing
      },
      {
        reducer: (reduced) => {
          expectTypeOf(reduced).toEqualTypeOf<
            { readonly a: number } | undefined
          >();
          return reduced!;
        },
        invokedAt: "start",
      },
    );
  });
});
