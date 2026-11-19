// Integration tests for server/db.mjs. Needs a real PostgreSQL in DATABASE_URL
// (CI starts one as a service container; locally: `docker compose up -d db`).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const skip = !process.env.DATABASE_URL && "DATABASE_URL not set";
const run = randomUUID().slice(0, 8);
const alice = `test-alice-${run}`;
const bob = `test-bob-${run}`;
let db;

before(async () => {
  if (skip) return;
  db = await import("../server/db.mjs");
  await db.migrate();
  await db.upsertUser({ uid: alice, email: "a@example.test", displayName: "Alice", role: "user" });
  await db.upsertUser({ uid: bob, email: "b@example.test", displayName: null, role: "user" });
});

after(async () => {
  if (skip) return;
  await db.pool.query("DELETE FROM users WHERE uid = ANY($1)", [[alice, bob]]);
  await db.pool.end();
});

test("migrations are idempotent", { skip }, async () => {
  await db.migrate();
  const { rows } = await db.pool.query("SELECT version FROM schema_migrations ORDER BY version");
  assert.ok(rows.length >= 1);
});

test("upsert keeps an existing display name and updates role", { skip }, async () => {
  await db.upsertUser({ uid: alice, email: "a@example.test", displayName: null, role: "admin" });
  const { rows: [row] } = await db.pool.query("SELECT * FROM users WHERE uid = $1", [alice]);
  assert.equal(row.display_name, "Alice");
  assert.equal(row.role, "admin");
});

test("analyses are stored and isolated per user", { skip }, async () => {
  const id = randomUUID();
  const saved = await db.insertAnalysis(alice, {
    id,
    type: "MEDICAL_REPORT",
    summary: "LDL slightly high.",
    metrics: [{ label: "LDL", value: "140", status: "warning" }],
    recommendations: ["More fiber"],
    disclaimer: "Not a doctor.",
  });
  assert.equal(saved.id, id);
  assert.equal(saved.metrics[0].label, "LDL");
  assert.ok(!Number.isNaN(Date.parse(saved.timestamp)));

  assert.equal((await db.listAnalyses(alice)).length, 1);
  assert.equal((await db.listAnalyses(bob)).length, 0, "other users cannot read it");
  assert.equal(await db.deleteAnalysis(bob, id), false, "other users cannot delete it");
  assert.equal(await db.deleteAnalysis(alice, id), true);
  assert.equal((await db.listAnalyses(alice)).length, 0);
});

test("posture findings are stored in details and returned", { skip }, async () => {
  const id = randomUUID();
  const posture = [{ issue: "forward_head", severity: "moderate", side: "none", note: "" }];
  const saved = await db.insertAnalysis(alice, {
    id, type: "BODY_POSE", summary: "s", metrics: [], recommendations: [], disclaimer: "", details: { posture },
  });
  assert.deepEqual(saved.posture, posture);
  const [listed] = await db.listAnalyses(alice);
  assert.deepEqual(listed.posture, posture);
  await db.deleteAnalysis(alice, id);

  const other = await db.insertAnalysis(alice, { id: randomUUID(), type: "MEDICINE", summary: "s" });
  assert.equal(other.posture, undefined, "non-posture analyses carry no posture field");
  await db.deleteAnalysis(alice, other.id);
});

test("coach messages keep order, limit to newest, and clear", { skip }, async () => {
  await db.insertCoachExchange(alice, "q1", "a1");
  await db.insertCoachExchange(alice, "q2", "a2");
  assert.deepEqual((await db.listCoachMessages(alice)).map((m) => m.content), ["q1", "a1", "q2", "a2"]);
  assert.deepEqual((await db.listCoachMessages(alice, 2)).map((m) => m.content), ["q2", "a2"]);
  assert.equal((await db.listCoachMessages(bob)).length, 0);
  await db.clearCoachMessages(alice);
  assert.equal((await db.listCoachMessages(alice)).length, 0);
});

test("role column rejects unknown roles", { skip }, async () => {
  await assert.rejects(db.setRole(alice, "superuser"));
});
