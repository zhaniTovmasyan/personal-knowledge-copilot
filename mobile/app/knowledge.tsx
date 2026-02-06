import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { listKnowledge, type ListKnowledgeItem } from "@/src/api/knowledge";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function KnowledgeScreen() {
  const [items, setItems] = useState<ListKnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    bg: isDark ? "#0B0F17" : "#F6F7FB",
    card: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
    text: isDark ? "#FFFFFF" : "#0F172A",
    subtext: isDark ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.70)",
  };

  async function load() {
    setLoading(true);
    try {
      const res = await listKnowledge();
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Knowledge</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Everything your copilot can use to answer questions.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : items.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No knowledge yet</Text>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            Add your first note to start building your copilot.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.preview, { color: colors.text }]} numberOfLines={3}>
                {item.text_preview}
              </Text>
              <Text style={[styles.meta, { color: colors.subtext }]}>
                {item.chars} characters
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  header: { gap: 6 },
  title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2 },
  subtitle: { fontSize: 14, lineHeight: 20 },

  empty: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 14, lineHeight: 20 },

  row: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 6, marginBottom: 10 },
  preview: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  meta: { fontSize: 12, fontWeight: "600" },
});
