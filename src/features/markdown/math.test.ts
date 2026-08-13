import { expect, test } from "bun:test";

import { hasMath } from "@/features/markdown/math";
import { mdToHast } from "@/features/markdown/pipeline";

test("数式があれば true", async () => {
  expect(hasMath(await mdToHast("$x = 1$"))).toBe(true);
  expect(hasMath(await mdToHast("$$\n\\frac{1}{2}\n$$"))).toBe(true);
});

test("数式が無ければ false", async () => {
  // ドル記号があるだけでは数式にならない
  expect(hasMath(await mdToHast("100 $ の買い物"))).toBe(false);
  expect(hasMath(await mdToHast("# 見出し\n\n本文"))).toBe(false);
});
