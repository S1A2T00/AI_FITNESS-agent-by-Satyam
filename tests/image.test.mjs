import { test } from "node:test";
import assert from "node:assert/strict";
import { fitWithin, MAX_EDGE } from "../lib/image.ts";

test("large photos shrink to the max edge, keeping the aspect ratio", () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: MAX_EDGE, height: 1200 });
  assert.deepEqual(fitWithin(3000, 4000), { width: 1200, height: MAX_EDGE });
});

test("small photos are never enlarged", () => {
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
});
