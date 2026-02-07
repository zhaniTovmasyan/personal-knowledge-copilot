import { postJSON, getJSON } from "./client";
import { withCase } from "./withCase";

export type ListKnowledgeItem = { id: number; text_preview: string; chars: number };
export type ListKnowledgeResponse = { items: ListKnowledgeItem[] };
export type AddKnowledgeResponse = { id: number; chars: number };

export async function addKnowledge(text: string): Promise<AddKnowledgeResponse> {
  const url = await withCase("/knowledge");
  return postJSON<AddKnowledgeResponse>(url, { text });
}

export async function listKnowledge(): Promise<ListKnowledgeResponse> {
  const url = await withCase("/knowledge");
  return getJSON<ListKnowledgeResponse>(url);
}
