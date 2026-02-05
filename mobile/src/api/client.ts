const BASE_URL = "http://127.0.0.1:8000";

const DEFAULT_TIMEOUT_MS = 15000;

export type ApiFailureReason =
  | "empty_kb"
  | "no_relevant_chunks"
  | "low_confidence"
  | "conflict"
  | "timeout"
  | "network_error"
  | "http_error"
  | "unknown";

export type ApiFailure = {
  ok: false;
  reason: ApiFailureReason;
  message: string;
  status?: number;
};

export class ApiError extends Error {
  failure: ApiFailure;
  constructor(failure: ApiFailure) {
    super(failure.message);
    this.failure = failure;
  }
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new ApiError({ ok: false, reason: "timeout", message: "Request timed out." });
    }
    throw new ApiError({ ok: false, reason: "network_error", message: "Network error." });
  } finally {
    clearTimeout(id);
  }
}

export async function postJSON<T>(path: string, body: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs
  );

  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {}
    throw new ApiError({
      ok: false,
      reason: "http_error",
      message: `HTTP ${res.status}: ${text || res.statusText}`,
      status: res.status,
    });
  }

  return (await res.json()) as T;
}

export async function getJSON<T>(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetchWithTimeout(url, { method: "GET" }, timeoutMs);

  if (!res.ok) {
    let text = "";
    try { text = await res.text(); } catch {}
    throw new ApiError({
      ok: false,
      reason: "http_error",
      message: `HTTP ${res.status}: ${text || res.statusText}`,
      status: res.status,
    });
  }
  return (await res.json()) as T;
}
