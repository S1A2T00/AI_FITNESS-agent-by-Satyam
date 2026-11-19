import type { AnalysisType, AnalysisResult, ChatMessage } from "../types";
import { getIdToken } from "./firebase";

export async function apiFetch<T>(
  endpoint: string,
  init: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const send = async (forceRefresh: boolean) => {
    const token = await getIdToken(forceRefresh);
    return fetch(endpoint, {
      method: init.method || (init.body === undefined ? "GET" : "POST"),
      headers: {
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  };

  let response = await send(false);
  // A role change on the server invalidates the old token; retry once fresh.
  if (response.status === 401) {
    response = await send(true).catch(() => response);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data as T;
}

export async function performAnalysis(
  type: AnalysisType,
  images?: string | string[],
  text?: string
): Promise<AnalysisResult> {
  const result = await apiFetch<AnalysisResult>("/api/analyze", {
    body: { type, images, text },
  });

  return {
    ...result,
    timestamp: new Date(result.timestamp),
  };
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
