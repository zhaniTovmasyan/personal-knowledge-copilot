import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { router } from "expo-router";
import { listKnowledge, type ListKnowledgeItem } from "@/src/api/knowledge";

export default function KnowledgeScreen() {
  const [items, setItems] = useState<ListKnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const colors = {
    bg: "#0B0F17",
    card: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.10)",
    text: "#FFFFFF",
    subtext: "rgba(255,255,255,0.72)",
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
          <Text style={[styles.emptyTitle, { color: colors.text }]}>This case is empty</Text>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            Paste from clipboard or add case notes to start.
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={() => router.push({ pathname: "/add", params: { highlight: "clipboard" } })}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "rgba(245,158,11,0.18)",
              }}
            >
              <Text style={{ color: "#F59E0B", fontWeight: "800" }}>Paste from clipboard</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/add")}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "800" }}>Add case notes</Text>
            </Pressable>
          </View>
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
