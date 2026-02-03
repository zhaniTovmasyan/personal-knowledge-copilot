const BASE_URL = "http://192.168.1.67:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

export type AddKnowledgeResponse = { id: number; chars: number };

export async function addKnowledge(text: string): Promise<AddKnowledgeResponse> {
  return request<AddKnowledgeResponse>("/knowledge", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export type AskResponse = {
  answer: string;
  used_ids: number[];
  context_preview: string;
};

export async function ask(question: string): Promise<AskResponse> {
  return request<AskResponse>("/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
