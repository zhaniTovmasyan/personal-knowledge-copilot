import { postJSON } from "./client";

export type SourceItem = {
  id: number;
  parent_id: number;
  chunk_index: number;
  text_preview: string;
};

export type AskResponse = {
  answer: string;
  used_ids: number[];
  context_preview: string;
  sources: SourceItem[];
};

export async function ask(question: string): Promise<AskResponse> {
  return postJSON<AskResponse>("/ask", { question });
}
