import { test } from "node:test";
import assert from "node:assert/strict";
import { createCors } from "../server/cors.mjs";

const fakeRes = () => {
  const headers = {};
  return {
    headers, status: null, ended: false,
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    writeHead(status, h = {}) { this.status = status; for (const [k, v] of Object.entries(h)) headers[k.toLowerCase()] = v; return this; },
    end() { this.ended = true; },
  };
};
const req = (origin, method = "GET") => ({ method, headers: origin ? { origin } : {} });

test("exact origins and preview wildcards are allowed; lookalikes are not", () => {
  const { isAllowed } = createCors("https://vitalis.vercel.app, https://vitalis-*.vercel.app/");
  assert.ok(isAllowed("https://vitalis.vercel.app"));
  assert.ok(isAllowed("https://vitalis-git-main-team.vercel.app"));
  assert.ok(!isAllowed("https://evil.com"));
  assert.ok(!isAllowed("https://vitalis.vercel.app.evil.com"));
  assert.ok(!isAllowed("https://vitalis-x.evil.vercel.app.attacker.io"));
  assert.ok(!isAllowed("http://vitalis.vercel.app"), "scheme must match");
  assert.ok(!isAllowed(undefined));
});

test("values pasted with quotes, spaces, capitals or a key prefix still work", () => {
  for (const value of [
    '"https://Vitalis-psi-lac.vercel.app/"',
    "CORS_ORIGINS=https://vitalis-psi-lac.vercel.app",
    " https://x.example.com ; https://vitalis-psi-lac.vercel.app ",
    "https://x.example.com https://vitalis-psi-lac.vercel.app",
  ]) {
    const cors = createCors(value);
    assert.ok(cors.isAllowed("https://vitalis-psi-lac.vercel.app"), value);
    assert.ok(!cors.isAllowed("https://vitalis-psi-lac.vercel.app.evil.com"), value);
  }
});

test("empty list allows no cross-origin callers", () => {
  assert.ok(!createCors("").isAllowed("https://vitalis.vercel.app"));
});

test("preflight from an allowed origin is answered with 204 and CORS headers", () => {
  const res = fakeRes();
  const done = createCors("https://app.example.com").handle(req("https://app.example.com", "OPTIONS"), res);
  assert.equal(done, true);
  assert.equal(res.status, 204);
  assert.equal(res.headers["access-control-allow-origin"], "https://app.example.com");
  assert.match(res.headers["access-control-allow-headers"], /Authorization/);
  assert.equal(res.headers["access-control-allow-credentials"], undefined, "no cookies/credentials");
});

test("preflight from a disallowed origin is refused; normal requests pass through without CORS headers", () => {
  const cors = createCors("https://app.example.com");
  const pre = fakeRes();
  assert.equal(cors.handle(req("https://evil.com", "OPTIONS"), pre), true);
  assert.equal(pre.status, 403);
  const get = fakeRes();
  assert.equal(cors.handle(req("https://evil.com"), get), false);
  assert.equal(get.headers["access-control-allow-origin"], undefined);
});

test("same-origin requests (no Origin header) are untouched", () => {
  const res = fakeRes();
  assert.equal(createCors("https://app.example.com").handle(req(undefined), res), false);
  assert.deepEqual(res.headers, {});
});
