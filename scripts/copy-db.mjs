// Copy all app data from one Postgres to another (e.g. local Docker → Neon).
//
//   node --env-file=.env scripts/copy-db.mjs            # dry run: counts only
//   node --env-file=.env scripts/copy-db.mjs --apply    # copy
//
// Source: DATABASE_URL. Target: NEON_DATABASE_URL (a separate variable on
// purpose, so the target can never be the source by accident).
// Safe to re-run: rows that already exist (same id/uid) are skipped.
import pg from "pg";

const SOURCE = process.env.DATABASE_URL?.trim();
const TARGET = process.env.NEON_DATABASE_URL?.trim();
const apply = process.argv.includes("--apply");

const host = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return "(invalid URL)";
  }
};

if (!SOURCE || !TARGET) {
  console.error("Set DATABASE_URL (source) and NEON_DATABASE_URL (target) in .env");
  process.exit(1);
}
if (host(SOURCE) === host(TARGET) && new URL(SOURCE).pathname === new URL(TARGET).pathname) {
  console.error("Source and target are the same database. Refusing.");
  process.exit(1);
}
if (/-pooler\./.test(host(TARGET))) {
  console.error("NEON_DATABASE_URL uses the pooled host (-pooler). Use the direct connection string.");
  process.exit(1);
}

const source = new pg.Client({ connectionString: SOURCE });
const target = new pg.Client({
  connectionString: TARGET,
  // Neon requires TLS; keep certificate verification on.
  ssl: /localhost|127\.0\.0\.1/.test(host(TARGET)) ? undefined : { rejectUnauthorized: true },
});

const count = async (c, t) => Number((await c.query(`SELECT count(*) FROM ${t}`)).rows[0].count);
const TABLES = ["users", "analyses", "coach_messages"];

try {
  await source.connect();
  await target.connect();
  console.log(`source: ${host(SOURCE)}\ntarget: ${host(TARGET)}\n`);

  // Create/upgrade the schema on the target with the app's own migrations.
  process.env.DATABASE_URL = TARGET;
  if (!/localhost|127\.0\.0\.1/.test(host(TARGET))) process.env.DATABASE_SSL = "true";
  const db = await import("../server/db.mjs");
  await db.migrate();
  await db.pool.end();

  const before = {};
  for (const t of TABLES) before[t] = { source: await count(source, t), target: await count(target, t) };
  console.table(before);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to copy.");
    process.exit(0);
  }

  await target.query("BEGIN");

  const users = (await source.query("SELECT * FROM users ORDER BY created_at")).rows;
  for (const u of users) {
    await target.query(
      `INSERT INTO users (uid, email, display_name, role, created_at, last_seen_at)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (uid) DO NOTHING`,
      [u.uid, u.email, u.display_name, u.role, u.created_at, u.last_seen_at]
    );
  }

  const analyses = (await source.query("SELECT * FROM analyses ORDER BY created_at")).rows;
  for (const a of analyses) {
    await target.query(
      `INSERT INTO analyses (id, user_uid, type, summary, metrics, recommendations, disclaimer, raw_output, details, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [a.id, a.user_uid, a.type, a.summary, JSON.stringify(a.metrics), JSON.stringify(a.recommendations),
        a.disclaimer, a.raw_output, JSON.stringify(a.details ?? {}), a.created_at]
    );
  }

  // Chat ids are serial: skip messages already copied (same user, role, text, time).
  const msgs = (await source.query("SELECT * FROM coach_messages ORDER BY id")).rows;
  for (const m of msgs) {
    await target.query(
      `INSERT INTO coach_messages (user_uid, role, content, created_at)
       SELECT $1,$2,$3,$4
       WHERE NOT EXISTS (SELECT 1 FROM coach_messages WHERE user_uid=$1 AND role=$2 AND content=$3 AND created_at=$4)`,
      [m.user_uid, m.role, m.content, m.created_at]
    );
  }

  await target.query("COMMIT");

  const after = {};
  for (const t of TABLES) after[t] = { source: await count(source, t), target: await count(target, t) };
  console.table(after);
  const ok = TABLES.every((t) => after[t].target >= after[t].source);
  console.log(ok ? "\n✔ Copy complete." : "\n✖ Target has fewer rows than source — check the output above.");
  process.exitCode = ok ? 0 : 1;
} catch (err) {
  await target.query("ROLLBACK").catch(() => {});
  console.error("Copy failed, nothing was committed:", err.message);
  process.exitCode = 1;
} finally {
  await source.end().catch(() => {});
  await target.end().catch(() => {});
}
