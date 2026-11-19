import type { AnalysisType, AnalysisResult, ChatMessage } from "../types";
import { getIdToken } from "./firebase";
import { apiUrl } from "./apiBase";

/** An error the API answered with (status set), as opposed to a dropped connection. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function apiFetch<T>(
  endpoint: string,
  init: { method?: "GET" | "POST" | "DELETE"; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const send = async (forceRefresh: boolean) => {
    const token = await getIdToken(forceRefresh);
    return fetch(apiUrl(endpoint), {
      method: init.method || (init.body === undefined ? "GET" : "POST"),
      headers: {
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.timeoutMs ? AbortSignal.timeout(init.timeoutMs) : undefined,
    });
  };

  let response = await send(false);
  // A role change on the server invalidates the old token; retry once fresh.
  if (response.status === 401) {
    response = await send(true).catch(() => response);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.error || `Request failed: ${response.status}`, response.status);
  }

  return data as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const withDate = (a: AnalysisResult): AnalysisResult => ({ ...a, timestamp: new Date(a.timestamp) });

// How long to wait on the upload connection, and how long to keep looking
// for the saved result afterwards. The server gives Gemini at most 100 s.
const ANALYZE_WAIT_MS = 75_000;
const RECOVER_FOR_MS = 120_000;
const RECOVER_EVERY_MS = 4_000;

/**
 * Runs an analysis. If the connection stalls or drops (mobile networks,
 * proxies), the server usually still finishes and saves the result, so we
 * look it up by the id we chose instead of spinning forever.
 */
export async function performAnalysis(
  type: AnalysisType,
  images?: string | string[],
  text?: string
): Promise<AnalysisResult> {
  const requestId = crypto.randomUUID();

  try {
    const result = await apiFetch<AnalysisResult>("/api/analyze", {
      body: { type, images, text, requestId },
      timeoutMs: ANALYZE_WAIT_MS,
    });
    return withDate(result);
  } catch (err) {
    // The server answered with an error: nothing was saved, show it.
    // (504 comes from a proxy timing out while the server may still finish.)
    if (err instanceof ApiError && err.status !== 504) throw err;
  }

  const deadline = Date.now() + RECOVER_FOR_MS;
  while (Date.now() < deadline) {
    try {
      return withDate(await apiFetch<AnalysisResult>(`/api/history/${requestId}`, { timeoutMs: 15_000 }));
    } catch (err) {
      // 404 = not saved yet; network errors = try again shortly.
      if (err instanceof ApiError && err.status !== 404) throw err;
    }
    await sleep(RECOVER_EVERY_MS);
  }

  throw new Error(
    "The analysis is taking too long. If it finishes, it will appear in History. Please try again."
  );
}

// The server builds the health context and conversation history from the
// database, so only the new message is sent.
export async function chatWithCoach(message: string) {
  const result = await apiFetch<{ text: string }>("/api/coach", {
    body: { message },
  });

  return result.text;
}

export async function fetchHistory(): Promise<AnalysisResult[]> {
  const { history } = await apiFetch<{ history: AnalysisResult[] }>("/api/history");
  return history.map((item) => ({ ...item, timestamp: new Date(item.timestamp) }));
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await apiFetch(`/api/history/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchCoachMessages(): Promise<ChatMessage[]> {
  const { messages } = await apiFetch<{ messages: ChatMessage[] }>("/api/coach/messages");
  return messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
}

export async function clearCoachMessages(): Promise<void> {
  await apiFetch("/api/coach/messages", { method: "DELETE" });
}
