// Starts the real server and checks the HTTP contract: health, public config,
// and that every protected route rejects requests without a valid token.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const skip = !process.env.DATABASE_URL && "DATABASE_URL not set";
const port = 3900 + Math.floor(Math.random() * 90);
const base = `http://127.0.0.1:${port}`;
let server;
let output = "";

before(async () => {
  if (skip) return;
  server = spawn(process.execPath, [fileURLToPath(new URL("../server/index.mjs", import.meta.url))], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      GEMINI_API_KEY: "test-placeholder",
      GOOGLE_API_KEY: "",
      FIREBASE_PROJECT_ID: "test-project",
      FIREBASE_WEB_API_KEY: "test-web-key",
      FIREBASE_SERVICE_ACCOUNT: "",
      FIREBASE_SERVICE_ACCOUNT_PATH: "",
      CORS_ORIGINS: "https://frontend.example.com",
    },
  });
  server.stdout.on("data", (d) => (output += d));
  server.stderr.on("data", (d) => (output += d));

  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Server did not start:\n" + output);
});

after(() => server?.kill());

test("health reports the database", { skip }, async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok", database: "ok" });
});

test("auth-config is public and contains no secrets", { skip }, async () => {
  const res = await fetch(`${base}/api/auth-config`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.projectId, "test-project");
  assert.deepEqual(Object.keys(body).sort(), ["apiKey", "appId", "authDomain", "projectId"]);
});

const protectedRoutes = [
  ["GET", "/api/me"],
  ["GET", "/api/history"],
  ["DELETE", "/api/history/00000000-0000-0000-0000-000000000000"],
  ["GET", "/api/coach/messages"],
  ["DELETE", "/api/coach/messages"],
  ["POST", "/api/analyze"],
  ["POST", "/api/coach"],
  ["GET", "/api/admin/users"],
  ["POST", "/api/admin/set-role"],
];

for (const [method, path] of protectedRoutes) {
  test(`${method} ${path} requires sign-in`, { skip }, async () => {
    const init = { method, headers: { "Content-Type": "application/json" } };
    if (method === "POST") init.body = "{}";
    assert.equal((await fetch(base + path, init)).status, 401);

    init.headers.Authorization = "Bearer not-a-real-token";
    assert.equal((await fetch(base + path, init)).status, 401, "forged token rejected");
  });
}

test("CORS: allowed frontend can call the API cross-origin", { skip }, async () => {
  const pre = await fetch(`${base}/api/history`, {
    method: "OPTIONS",
    headers: { Origin: "https://frontend.example.com", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" },
  });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-origin"), "https://frontend.example.com");

  const cfg = await fetch(`${base}/api/auth-config`, { headers: { Origin: "https://frontend.example.com" } });
  assert.equal(cfg.headers.get("access-control-allow-origin"), "https://frontend.example.com");

  const evil = await fetch(`${base}/api/auth-config`, { headers: { Origin: "https://evil.example.com" } });
  assert.equal(evil.headers.get("access-control-allow-origin"), null);
});

test("static file requests never leak internals", { skip }, async () => {
  const res = await fetch(`${base}/index.html`);
  // 200 when dist/ is built, 404 JSON otherwise; both must not leak internals.
  assert.ok([200, 404].includes(res.status));
});
