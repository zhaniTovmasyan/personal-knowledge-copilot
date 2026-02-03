// History storage utility
// Note: Install @react-native-async-storage/async-storage for persistent storage
// npm install @react-native-async-storage/async-storage

const STORAGE_KEY = '@knowledge_copilot_history';

export interface HistoryItem {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  usedIds: number[];
}

// In-memory fallback storage
let memoryStorage: { [key: string]: string } = {};

async function getStorage() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  } catch {
    return null;
  }
}

export async function saveHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>) {
  const historyItem: HistoryItem = {
    ...item,
    id: Date.now().toString(),
    timestamp: Date.now(),
  };

  try {
    const storage = await getStorage();
    let existing: HistoryItem[] = [];

    if (storage) {
      const stored = await storage.getItem(STORAGE_KEY);
      if (stored) {
        existing = JSON.parse(stored);
      }
      existing.unshift(historyItem);
      // Keep only last 100 items
      if (existing.length > 100) {
        existing = existing.slice(0, 100);
      }
      await storage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } else {
      // Fallback to memory storage
      const stored = memoryStorage[STORAGE_KEY];
      if (stored) {
        existing = JSON.parse(stored);
      }
      existing.unshift(historyItem);
      if (existing.length > 100) {
        existing = existing.slice(0, 100);
      }
      memoryStorage[STORAGE_KEY] = JSON.stringify(existing);
    }
  } catch (error) {
    console.error('Failed to save history item:', error);
  }
}

export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const storage = await getStorage();
    let stored: string | null = null;

    if (storage) {
      stored = await storage.getItem(STORAGE_KEY);
    } else {
      stored = memoryStorage[STORAGE_KEY] || null;
    }

    if (stored) {
      const items: HistoryItem[] = JSON.parse(stored);
      return items.sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

export async function clearHistory() {
  try {
    const storage = await getStorage();
    if (storage) {
      await storage.removeItem(STORAGE_KEY);
    } else {
      delete memoryStorage[STORAGE_KEY];
    }
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}
