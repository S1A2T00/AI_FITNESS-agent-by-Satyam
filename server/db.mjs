// PostgreSQL access: connection pool, schema migrations and the queries the
// API needs. Every query that touches user data is scoped by the caller's
// Firebase uid, so one user can never read or delete another user's rows.
import pg from "pg";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is missing. Example: postgres://user:password@host:5432/vitalis"
  );
}

// DATABASE_SSL: unset = whatever the URL says (e.g. ?sslmode=require),
// "true" = TLS with certificate verification, "no-verify" = TLS without
// verification (some managed hosts use self-signed certs), "false" = off.
function sslOption() {
  const mode = (process.env.DATABASE_SSL || "").trim().toLowerCase();
  if (mode === "true") return { rejectUnauthorized: true };
  if (mode === "no-verify") return { rejectUnauthorized: false };
  if (mode === "false") return false;
  return undefined;
}

const ssl = sslOption();
export const pool = new pg.Pool({
  connectionString,
  ...(ssl === undefined ? {} : { ssl }),
  max: Number(process.env.DATABASE_POOL_SIZE || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  // An idle client died (e.g. DB restart). The pool replaces it; just log.
  console.error("Postgres pool error:", err.message);
});

// Append-only list. Never edit a migration that has shipped; add a new one.
const migrations = [
  {
    version: 1,
    name: "initial schema",
    sql: `
      CREATE TABLE users (
        uid           TEXT PRIMARY KEY,
        email         TEXT,
        display_name  TEXT,
        role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE analyses (
        id               UUID PRIMARY KEY,
        user_uid         TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        type             TEXT NOT NULL,
        summary          TEXT NOT NULL,
        metrics          JSONB NOT NULL DEFAULT '[]',
        recommendations  JSONB NOT NULL DEFAULT '[]',
        disclaimer       TEXT NOT NULL DEFAULT '',
        raw_output       TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX analyses_user_created_idx ON analyses (user_uid, created_at DESC);

      CREATE TABLE coach_messages (
        id          BIGSERIAL PRIMARY KEY,
        user_uid    TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
        role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content     TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX coach_messages_user_idx ON coach_messages (user_uid, id);
    `,
  },
];

export async function migrate() {
  const client = await pool.connect();
  try {
    // Advisory lock so several app instances starting together don't race.
    await client.query("SELECT pg_advisory_lock(727274001)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query("SELECT version FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.version));

    for (const m of migrations) {
      if (applied.has(m.version)) continue;
      await client.query("BEGIN");
      try {
        await client.query(m.sql);
        await client.query(
          "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
          [m.version, m.name]
        );
        await client.query("COMMIT");
        console.log(`Applied migration ${m.version}: ${m.name}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(727274001)").catch(() => {});
    client.release();
  }
}

export async function ping() {
  await pool.query("SELECT 1");
}

// ---------- users ----------

export async function upsertUser({ uid, email, displayName, role }) {
  await pool.query(
    `INSERT INTO users (uid, email, display_name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (uid) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = COALESCE(EXCLUDED.display_name, users.display_name),
       role = EXCLUDED.role,
       last_seen_at = now()`,
    [uid, email, displayName, role]
  );
}

export async function setRole(uid, role) {
  await pool.query("UPDATE users SET role = $2 WHERE uid = $1", [uid, role]);
}

export async function analysisCounts() {
  const { rows } = await pool.query(
    "SELECT user_uid, count(*)::int AS n FROM analyses GROUP BY user_uid"
  );
  return new Map(rows.map((r) => [r.user_uid, r.n]));
}

// ---------- analyses ----------

function toAnalysis(row) {
  return {
    id: row.id,
    type: row.type,
    summary: row.summary,
    metrics: row.metrics,
    recommendations: row.recommendations,
    disclaimer: row.disclaimer,
    rawOutput: row.raw_output ?? undefined,
    timestamp: row.created_at.toISOString(),
  };
}

export async function insertAnalysis(uid, a) {
  const { rows } = await pool.query(
    `INSERT INTO analyses (id, user_uid, type, summary, metrics, recommendations, disclaimer, raw_output)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      a.id,
      uid,
      a.type,
      String(a.summary ?? ""),
      JSON.stringify(Array.isArray(a.metrics) ? a.metrics : []),
      JSON.stringify(Array.isArray(a.recommendations) ? a.recommendations : []),
      String(a.disclaimer ?? ""),
      a.rawOutput ?? null,
    ]
  );
  return toAnalysis(rows[0]);
}

export async function listAnalyses(uid, limit = 500) {
  const { rows } = await pool.query(
    "SELECT * FROM analyses WHERE user_uid = $1 ORDER BY created_at DESC LIMIT $2",
    [uid, limit]
  );
  return rows.map(toAnalysis);
}

export async function deleteAnalysis(uid, id) {
  const { rowCount } = await pool.query(
    "DELETE FROM analyses WHERE id = $1 AND user_uid = $2",
    [id, uid]
  );
  return rowCount > 0;
}

// ---------- coach chat ----------

export async function listCoachMessages(uid, limit = 200) {
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT id, role, content, created_at FROM coach_messages
       WHERE user_uid = $1 ORDER BY id DESC LIMIT $2
     ) t ORDER BY id ASC`,
    [uid, limit]
  );
  return rows.map((r) => ({
    id: String(r.id),
    role: r.role,
    content: r.content,
    timestamp: r.created_at.toISOString(),
  }));
}

export async function insertCoachExchange(uid, userText, assistantText) {
  await pool.query(
    `INSERT INTO coach_messages (user_uid, role, content)
     VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
    [uid, userText, assistantText]
  );
}

export async function clearCoachMessages(uid) {
  await pool.query("DELETE FROM coach_messages WHERE user_uid = $1", [uid]);
}
