import { postJSON } from "./client";

export type AddKnowledgeResponse = { id: number; chars: number };

export async function addKnowledge(text: string): Promise<AddKnowledgeResponse> {
  return postJSON<AddKnowledgeResponse>("/knowledge", { text });
}
