// Turns a failed Gemini call into an error the user can act on.
// Google's raw error text (quota ids, project details) is never forwarded.

// Upper bound for one Gemini call, so a request can't hang indefinitely.
export const AI_TIMEOUT_MS = 100_000;

const statusError = (status, message) => Object.assign(new Error(message), { status });

export function toAiError(err) {
  const status = Number(err?.status);
  const text = String(err?.message || "");

  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(text)) {
    return statusError(
      429,
      "The AI usage limit for this API key has been reached. Try again later, or switch the server to a paid Gemini key."
    );
  }
  if (
    [408, 500, 502, 503, 504].includes(status) ||
    err?.name === "AbortError" ||
    err?.name === "TimeoutError" ||
    /timed? ?out|aborted|overloaded|UNAVAILABLE/i.test(text)
  ) {
    return statusError(503, "The AI service is busy or slow right now. Please try again in a minute.");
  }
  if (status === 400 || status === 403) {
    return statusError(502, "The AI request was rejected. Check the server's Gemini API key and model access.");
  }
  if (err instanceof SyntaxError) {
    return statusError(502, "The AI returned an unreadable answer. Please try again.");
  }
  return statusError(502, "AI request failed. Check the server API key, model access and quota.");
}

// Runs a Gemini call and converts any failure into a clear, safe error.
export async function callAi(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("Gemini call failed:", err?.status ?? "", err?.message ?? err);
    throw toAiError(err);
  }
}
