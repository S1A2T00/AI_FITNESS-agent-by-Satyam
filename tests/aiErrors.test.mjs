import { test } from "node:test";
import assert from "node:assert/strict";
import { toAiError, callAi } from "../server/aiErrors.mjs";

test("quota errors become a clear 429 without Google's raw text", () => {
  const raw = Object.assign(new Error('{"error":{"code":429,"message":"Quota exceeded for project 123"}}'), { status: 429 });
  const err = toAiError(raw);
  assert.equal(err.status, 429);
  assert.match(err.message, /usage limit/);
  assert.doesNotMatch(err.message, /project 123/);
});

test("overload and timeouts become 503", () => {
  for (const raw of [
    Object.assign(new Error("UNAVAILABLE"), { status: 503 }),
    Object.assign(new Error("x"), { name: "AbortError" }),
    new Error("Request timed out"),
  ]) {
    assert.equal(toAiError(raw).status, 503, raw.message);
  }
});

test("other failures become a generic 502", () => {
  assert.equal(toAiError(Object.assign(new Error("bad key"), { status: 400 })).status, 502);
  assert.equal(toAiError(new SyntaxError("Unexpected token")).status, 502);
  assert.equal(toAiError(new Error("???")).status, 502);
});

test("callAi passes results through and converts failures", async () => {
  assert.equal(await callAi(async () => 42), 42);
  const original = console.error;
  console.error = () => {};
  try {
    await assert.rejects(
      callAi(async () => { throw Object.assign(new Error("quota"), { status: 429 }); }),
      (e) => e.status === 429
    );
  } finally {
    console.error = original;
  }
});
