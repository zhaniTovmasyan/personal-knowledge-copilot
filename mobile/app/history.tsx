import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { loadHistory, clearHistory, type HistoryItem } from "@/src/storage/history";
import { useColorScheme } from "@/hooks/use-color-scheme";

function formatTime(ts: number) {
  const d = new Date(ts);
  // simple readable format
  return d.toLocaleString();
}

export default function HistoryScreen() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    bg: isDark ? "#0B0F17" : "#F6F7FB",
    card: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
    text: isDark ? "#FFFFFF" : "#0F172A",
    subtext: isDark ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.70)",
    primary: isDark ? "#60A5FA" : "#2563EB",
    danger: "#FF6B6B",
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadHistory();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload every time the screen is opened (so it updates after each ask)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  function openItem(item: HistoryItem) {
    router.push({
      pathname: "/answer",
      params: {
        payload: JSON.stringify(item.response),
        q: item.question,
      },
    });
  }

  async function onClear() {
    Alert.alert(
      "Clear history?",
      "This will remove all saved questions and answers from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearHistory();
            setItems([]);
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={{ gap: 6 }}>
          <Text style={[styles.title, { color: colors.text }]}>History</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Your past questions and grounded answers.
          </Text>
        </View>

        <Pressable onPress={onClear} disabled={items.length === 0}>
          <Text style={{ color: items.length ? colors.danger : colors.subtext, fontWeight: "700" }}>
            Clear
          </Text>
        </Pressable>
      </View>

      {items.length === 0 && !loading ? (
        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No history yet</Text>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            Ask a question and it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          refreshing={loading}
          onRefresh={refresh}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const answerPreview = (item.response.answer || "").replace(/\s+/g, " ").slice(0, 90);
            const sourcesCount = item.response.sources?.length ?? 0;

            return (
              <Pressable
                onPress={() => openItem(item)}
                style={[
                  styles.row,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.question, { color: colors.text }]} numberOfLines={2}>
                  {item.question}
                </Text>

                <Text style={[styles.answerPreview, { color: colors.subtext }]} numberOfLines={2}>
                  {answerPreview}
                  {answerPreview.length >= 90 ? "…" : ""}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={[styles.meta, { color: colors.subtext }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                  <Text style={[styles.meta, { color: colors.subtext }]}>
                    Sources: {sourcesCount}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  question: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  answerPreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  meta: {
    fontSize: 12,
    fontWeight: "600",
  },
});
