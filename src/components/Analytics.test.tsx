import { afterEach, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import Analytics, { setAnalyticsEnabled } from "@/components/Analytics";

afterEach(() => {
  setAnalyticsEnabled(true);
});

test("既定では計測タグを出す", () => {
  expect(renderToStaticMarkup(<Analytics />)).toContain("G-XXCZ8KW3CC");
});

test("無効にすると何も出さない", () => {
  setAnalyticsEnabled(false);

  expect(renderToStaticMarkup(<Analytics />)).toBe("");
});
