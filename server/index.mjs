import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { GoogleGenAI, Type } from "@google/genai";
import {
  MODEL_CONFIG,
  SYSTEM_INSTRUCTIONS,
} from "../constants.ts";

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is missing. Configure .env.local or the container environment."
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
  },
  required: ["summary", "metrics", "recommendations", "disclaimer"],
};

async function analyze(body) {
  if (
    typeof body.type !== "string" ||
    !body.type.trim() ||
    body.type.length > 100
  ) {
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

  const response = await ai.models.generateContent({
    model: MODEL_CONFIG.VISION_MODEL,
    contents: {
      parts: [
        {
          text:
            `${SYSTEM_INSTRUCTIONS.HEALTH_AGENT}\n\n` +
            `Task: Perform a ${body.type} analysis. ` +
            String(body.text || "").slice(0, 20000),
        },
        ...imageParts,
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  const result = JSON.parse(response.text);

  return {
    ...result,
    id: randomUUID(),
    type: body.type,
    timestamp: new Date().toISOString(),
    rawOutput: response.text,
  };
}

async function coach(body) {
  if (
    typeof body.message !== "string" ||
    !body.message.trim() ||
    body.message.length > 10000
  ) {
    throw Object.assign(new Error("Enter a valid message."), {
      status: 400,
    });
  }

  const response = await ai.models.generateContent({
    model: MODEL_CONFIG.TEXT_MODEL,
    contents: body.message,
    config: {
      systemInstruction:
        `${SYSTEM_INSTRUCTIONS.HEALTH_AGENT}\n\n` +
        `USER HEALTH CONTEXT:\n` +
        String(body.healthContext || "").slice(0, 50000),
    },
  });

  return { text: response.text || "" };
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

    if (pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, { status: "ok" });
    }

    if (pathname.startsWith("/api/")) {
      if (req.method !== "POST") {
        return sendJson(res, 405, { error: "Method not allowed." });
      }

      const body = await readJson(req);

      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return sendJson(res, 400, { error: "Invalid request body." });
      }

      if (pathname === "/api/analyze") {
        return sendJson(res, 200, await analyze(body));
      }

      if (pathname === "/api/coach") {
        return sendJson(res, 200, await coach(body));
      }

      return sendJson(res, 404, { error: "API route not found." });
    }

    if (!["GET", "HEAD"].includes(req.method)) {
      return sendJson(res, 405, { error: "Method not allowed." });
    }

    await serveFrontend(req, res, pathname);
  } catch (error) {
    const status = error.status || 502;

    sendJson(res, status, {
      error:
        status >= 500
          ? "AI request failed. Check the server API key, model access and quota."
          : error.message,
    });
  }
});

server.requestTimeout = 120000;
server.headersTimeout = 15000;

server.listen(port, host, () => {
  console.log(`Application server: http://${host}:${port}`);
});