import { postJSON } from "./client";

export type Source = {
  id: number;
  preview: string;
  score?: number;
};

export type AskResponse =
  | {
      ok: true;
      answer: string;
      used_ids: number[];
      context_preview: string;
      sources?: Source[];
      confidence?: "high" | "medium" | "low";
    }
  | {
      ok: false;
      reason: "empty_kb" | "no_relevant_chunks" | "low_confidence" | "conflict";
      message: string;
      nearest?: Source[];
    };

export async function ask(question: string): Promise<AskResponse> {
  return postJSON<AskResponse>("/ask", { question });
}
