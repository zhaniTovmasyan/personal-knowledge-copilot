import { postJSON, getJSON } from "./client";

export type ListKnowledgeItem = { id: number; text_preview: string; chars: number };
export type ListKnowledgeResponse = { items: ListKnowledgeItem[] };
export type AddKnowledgeResponse = { id: number; chars: number };

export async function addKnowledge(text: string): Promise<AddKnowledgeResponse> {
  return postJSON<AddKnowledgeResponse>("/knowledge", { text });
}

export async function listKnowledge(): Promise<ListKnowledgeResponse> {
  return getJSON<ListKnowledgeResponse>("/knowledge");
}