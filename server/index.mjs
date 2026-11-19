import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import {
  MODEL_CONFIG,
  SYSTEM_INSTRUCTIONS,
} from "../constants.ts";
import {
  authenticate,
  requireRole,
  listUsers,
  setUserRole,
  webConfig,
} from "./auth.mjs";
import * as db from "./db.mjs";
import { POSTURE_PROMPT, postureFindingsSchema, sanitizeFindings } from "./posture.mjs";
import { createCors } from "./cors.mjs";
import { AI_TIMEOUT_MS, callAi } from "./aiErrors.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cors = createCors();

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is missing. Configure .env or the container environment."
  );
}

const ai = new GoogleGenAI({ apiKey });
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";

// Normalize the directory path, including its trailing separator.
const dist = path.resolve(
  fileURLToPath(new URL("../dist/", import.meta.url))
);

const maxBodySize = 12 * 1024 * 1024;

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });

  res.end(JSON.stringify(data));
}

async function readJson(req) {
  if (!req.headers["content-type"]?.startsWith("application/json")) {
    throw Object.assign(
      new Error("Content-Type must be application/json."),
      { status: 415 }
    );
  }

  let size = 0;
  const chunks = [];

  for await (const chunk of req) {
    size += chunk.length;

    if (size > maxBodySize) {
      throw Object.assign(new Error("Upload is too large."), {
        status: 413,
      });
    }

    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid JSON request."), {
      status: 400,
    });
  }
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    metrics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.STRING },
          status: {
            type: Type.STRING,
            enum: ["normal", "warning", "critical", "neutral"],
          },
          description: { type: Type.STRING },
        },
        required: ["label", "value", "status"],
      },
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    disclaimer: { type: Type.STRING },
    postureFindings: postureFindingsSchema,
  },
  required: ["summary", "metrics", "recommendations", "disclaimer"],
};

const ANALYSIS_TYPES = ["BODY_POSE", "MEDICAL_REPORT", "MEDICINE", "GENERAL_CHAT"];

async function analyze(user, body) {
  if (!ANALYSIS_TYPES.includes(body.type)) {
    throw Object.assign(new Error("Invalid analysis type."), {
      status: 400,
    });
  }

  const images = Array.isArray(body.images)
    ? body.images
    : body.images
      ? [body.images]
      : [];

  if (images.length > 6) {
    throw Object.assign(new Error("Maximum 6 images allowed."), {
      status: 400,
    });
  }

  const imageParts = images.map((image) => {
    const match =
      typeof image === "string" &&
      image.match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/
      );

    if (!match) {
      throw Object.assign(new Error("Invalid image format."), {
        status: 400,
      });
    }

    return {
      inlineData: {
        mimeType: match[1],
        data: match[2],
      },
    };
  });

  const response = await callAi(() => ai.models.generateContent({
    model: MODEL_CONFIG.VISION_MODEL,
    contents: {
      parts: [
        {
          text:
            `${SYSTEM_INSTRUCTIONS.HEALTH_AGENT}\n\n` +
            `Task: Perform a ${body.type} analysis. ` +
            `${POSTURE_PROMPT}\n` +
            String(body.text || "").slice(0, 20000),
        },
        ...imageParts,
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
      // Low thinking keeps image analysis well under a minute.
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      httpOptions: { timeout: AI_TIMEOUT_MS },
    },
  }));

  const result = await callAi(async () => JSON.parse(response.text));

  const { postureFindings, ...rest } = result;
  return db.insertAnalysis(user.uid, {
    ...rest,
    // The browser picks the id, so it can fetch the result later if the
    // connection drops while the AI is still working.
    id: UUID.test(String(body.requestId)) ? String(body.requestId) : randomUUID(),
    type: body.type,
    rawOutput: response.text,
    details: body.type === "BODY_POSE" ? { posture: sanitizeFindings(postureFindings) } : {},
  });
}

// The health context and conversation come from the database, not the
// browser, so the coach always sees this user's real, saved history.
async function buildHealthContext(uid) {
  const analyses = await db.listAnalyses(uid, 50);
  if (analyses.length === 0) return "No prior health analyses performed.";
  return analyses
    .map((a) => `- ${a.type} (${a.timestamp.slice(0, 10)}): ${a.summary}`)
    .join("\n");
}

async function coach(user, body) {
  if (
    typeof body.message !== "string" ||
    !body.message.trim() ||
    body.message.length > 10000
  ) {
    throw Object.assign(new Error("Enter a valid message."), {
      status: 400,
    });
  }

  const [healthContext, previous] = await Promise.all([
    buildHealthContext(user.uid),
    db.listCoachMessages(user.uid, 20),
  ]);

  const response = await callAi(() => ai.models.generateContent({
    model: MODEL_CONFIG.TEXT_MODEL,
    contents: [
      ...previous.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: body.message }] },
    ],
    config: {
      systemInstruction:
        `${SYSTEM_INSTRUCTIONS.HEALTH_AGENT}\n\n` +
        `USER HEALTH CONTEXT:\n` +
        healthContext.slice(0, 50000),
      httpOptions: { timeout: AI_TIMEOUT_MS },
    },
  }));

  const text = response.text || "";
  if (text) await db.insertCoachExchange(user.uid, body.message, text);
  return { text };
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function serveFrontend(req, res, pathname) {
  let filename = path.resolve(dist, "." + pathname);

  // Allow the dist directory itself and files inside it.
  // Block paths that escape into parent or sibling directories.
  const relative = path.relative(dist, filename);

  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    return sendJson(res, 403, { error: "Forbidden." });
  }

  if (pathname === "/") {
    filename = path.join(dist, "index.html");
  }

  let data;

  try {
    data = await readFile(filename);
  } catch {
    if (path.extname(pathname)) {
      return sendJson(res, 404, { error: "File not found." });
    }

    filename = path.join(dist, "index.html");

    try {
      data = await readFile(filename);
    } catch {
      return sendJson(res, 404, {
        error: "Frontend build missing. Run npm run build.",
      });
    }
  }

  res.writeHead(200, {
    "Content-Type":
      mimeTypes[path.extname(filename)] || "application/octet-stream",
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });

  res.end(req.method === "HEAD" ? undefined : data);
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname
    );

    // Frontend on another domain (Vercel) → CORS for the API only.
    if (pathname.startsWith("/api/") && cors.handle(req, res)) return;

    if (pathname === "/api/health" && req.method === "GET") {
      try {
        await db.ping();
        return sendJson(res, 200, { status: "ok", database: "ok" });
      } catch {
        return sendJson(res, 503, { status: "error", database: "unreachable" });
      }
    }

    // Public: the browser needs this to start Firebase before anyone signs in.
    if (pathname === "/api/auth-config" && req.method === "GET") {
      return sendJson(res, 200, webConfig());
    }

    if (pathname.startsWith("/api/")) {
      // Everything below requires a valid Firebase ID token.
      const user = await authenticate(req);
      await db.upsertUser(user);

      if (pathname === "/api/me" && req.method === "GET") {
        return sendJson(res, 200, user);
      }

      if (pathname === "/api/history" && req.method === "GET") {
        return sendJson(res, 200, { history: await db.listAnalyses(user.uid) });
      }

      const historyItem = pathname.match(
        /^\/api\/history\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
      );
      if (historyItem && req.method === "GET") {
        const item = await db.getAnalysis(user.uid, historyItem[1]);
        return item
          ? sendJson(res, 200, item)
          : sendJson(res, 404, { error: "Analysis not found." });
      }

      if (historyItem && req.method === "DELETE") {
        const deleted = await db.deleteAnalysis(user.uid, historyItem[1]);
        return deleted
          ? sendJson(res, 200, { deleted: true })
          : sendJson(res, 404, { error: "Analysis not found." });
      }

      if (pathname === "/api/coach/messages" && req.method === "GET") {
        return sendJson(res, 200, { messages: await db.listCoachMessages(user.uid) });
      }

      if (pathname === "/api/coach/messages" && req.method === "DELETE") {
        await db.clearCoachMessages(user.uid);
        return sendJson(res, 200, { cleared: true });
      }

      if (pathname === "/api/admin/users" && req.method === "GET") {
        requireRole(user, "admin");
        const [users, counts] = await Promise.all([listUsers(), db.analysisCounts()]);
        return sendJson(res, 200, {
          users: users.map((u) => ({ ...u, analyses: counts.get(u.uid) || 0 })),
        });
      }

      if (req.method !== "POST") {
        return sendJson(res, 405, { error: "Method not allowed." });
      }

      const body = await readJson(req);

      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return sendJson(res, 400, { error: "Invalid request body." });
      }

      if (pathname === "/api/analyze") {
        return sendJson(res, 200, await analyze(user, body));
      }

      if (pathname === "/api/coach") {
        return sendJson(res, 200, await coach(user, body));
      }

      if (pathname === "/api/admin/set-role") {
        requireRole(user, "admin");
        const updated = await setUserRole(user, body);
        await db.setRole(updated.uid, updated.role);
        return sendJson(res, 200, updated);
      }

      return sendJson(res, 404, { error: "API route not found." });
    }

    if (!["GET", "HEAD"].includes(req.method)) {
      return sendJson(res, 405, { error: "Method not allowed." });
    }

    await serveFrontend(req, res, pathname);
  } catch (error) {
    const status = error.status || 502;
    if (!error.status) console.error(error);

    sendJson(res, status, {
      // Errors we raised on purpose carry a status and a safe message.
      error: error.status
        ? error.message
        : "AI request failed. Check the server API key, model access and quota.",
    });
  }
});

server.requestTimeout = 120000;
server.headersTimeout = 15000;

// Apply database migrations before accepting traffic.
await db.migrate();

server.listen(port, host, () => {
  console.log(`Application server: http://${host}:${port}`);
  // Origins are public URLs, so logging them is safe and helps debug CORS.
  console.log(
    cors.origins.length
      ? `CORS allowed origins: ${cors.origins.join(", ")}`
      : "CORS: no CORS_ORIGINS set, so only same-origin browsers can call the API"
  );
});

// Graceful shutdown for container platforms (they send SIGTERM on redeploy).
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server.close(() => db.pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
