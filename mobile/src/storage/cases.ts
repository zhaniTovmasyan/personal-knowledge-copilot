import AsyncStorage from "@react-native-async-storage/async-storage";

const CASES_KEY = "cases_v1";
const CURRENT_KEY = "current_case_id_v1";

export type CaseItem = {
  id: number;
  name: string;
  createdAt: number;
};

export async function loadCases(): Promise<CaseItem[]> {
  const raw = await AsyncStorage.getItem(CASES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CaseItem[];
  } catch {
    return [];
  }
}

export async function saveCases(items: CaseItem[]) {
  await AsyncStorage.setItem(CASES_KEY, JSON.stringify(items));
}

export async function createCase(name: string): Promise<CaseItem> {
  const cases = await loadCases();
  const id = Date.now();
  const item: CaseItem = { id, name, createdAt: Date.now() };
  const next = [item, ...cases];
  await saveCases(next);
  await setCurrentCaseId(item.id);
  return item;
}

export async function getCurrentCaseId(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(CURRENT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function setCurrentCaseId(caseId: number) {
  await AsyncStorage.setItem(CURRENT_KEY, String(caseId));
}
