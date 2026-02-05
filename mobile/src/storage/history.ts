import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AskResponse } from "@/src/api/ask";

const KEY = "history_v1";

export type HistoryItem = {
  id: string;
  question: string;
  response: AskResponse;
  createdAt: number;
};

export async function loadHistory(): Promise<HistoryItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [];
  }
}

export async function addToHistory(question: string, response: AskResponse) {
  const current = await loadHistory();
  const item: HistoryItem = {
    id: `${Date.now()}`,
    question,
    response,
    createdAt: Date.now(),
  };
  const next = [item, ...current].slice(0, 200);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return item;
}

export async function clearHistory() {
  await AsyncStorage.removeItem(KEY);
}
