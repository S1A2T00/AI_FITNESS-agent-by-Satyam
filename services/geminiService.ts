import type { AnalysisType, AnalysisResult } from "../types";

async function postJSON<T>(
  endpoint: string,
  payload: unknown
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error || `Request failed: ${response.status}`
    );
  }

  return data as T;
}

export async function performAnalysis(
  type: AnalysisType,
  images?: string | string[],
  text?: string
): Promise<AnalysisResult> {
  const result = await postJSON<AnalysisResult>(
    "/api/analyze",
    { type, images, text }
  );

  return {
    ...result,
    timestamp: new Date(result.timestamp),
  };
}

export async function chatWithCoach(
  message: string,
  history: {
    role: "user" | "assistant";
    content: string;
  }[],
  healthContext: string
) {
  const result = await postJSON<{ text: string }>(
    "/api/coach",
    { message, history, healthContext }
  );

  return result.text;
}