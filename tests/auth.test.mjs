import { test } from "node:test";
import assert from "node:assert/strict";

process.env.FIREBASE_PROJECT_ID ||= "test-project";
const { requireRole, webConfig } = await import("../server/auth.mjs");

test("requireRole allows matching roles", () => {
  assert.doesNotThrow(() => requireRole({ role: "admin" }, "admin"));
  assert.doesNotThrow(() => requireRole({ role: "user" }, "user", "admin"));
});

test("requireRole rejects other roles with 403", () => {
  assert.throws(() => requireRole({ role: "user" }, "admin"), (e) => e.status === 403);
});

test("webConfig derives authDomain from the project id", () => {
  delete process.env.FIREBASE_AUTH_DOMAIN;
  assert.equal(webConfig().authDomain, `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`);
});
