import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { createCase, loadCases, setCurrentCaseId, type CaseItem, getCurrentCaseId } from "@/src/storage/cases";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function CasesScreen() {
  const [items, setItems] = useState<CaseItem[]>([]);
  const [name, setName] = useState("");
  const [currentId, setCurrentId] = useState<number | null>(null);

  const isDark = useColorScheme() === "dark";
  const colors = {
    bg: isDark ? "#0B0F17" : "#F6F7FB",
    card: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
    text: isDark ? "#FFFFFF" : "#0F172A",
    subtext: isDark ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.70)",
    primary: isDark ? "#60A5FA" : "#2563EB",
    primaryBg: isDark ? "rgba(96,165,250,0.18)" : "rgba(37,99,235,0.12)",
  };

  const refresh = useCallback(async () => {
    const [cases, cur] = await Promise.all([loadCases(), getCurrentCaseId()]);
    setItems(cases);
    setCurrentId(cur);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function onCreate() {
    const cleaned = name.trim();
    if (!cleaned) return;
    await createCase(cleaned);
    setName("");
    await refresh();
    router.replace("/"); // go back home after create
  }

  async function onSelect(item: CaseItem) {
    await setCurrentCaseId(item.id);
    setCurrentId(item.id);
    router.replace("/"); // go back home after select
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Cases</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Each case is an isolated knowledge space.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.subtext }]}>New case</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Smith v. Johnson"
          placeholderTextColor={isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.35)"}
          style={[styles.input, { color: colors.text }]}
        />
        <Pressable
          onPress={onCreate}
          disabled={!name.trim()}
          style={[
            styles.button,
            { backgroundColor: name.trim() ? colors.primary : colors.primaryBg, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: name.trim() ? "#fff" : colors.primary, fontWeight: "800" }}>
            Create case
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>No cases yet</Text>
            <Text style={{ color: colors.subtext }}>
              Create a case to start adding confidential notes.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCurrent = item.id === currentId;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={[
                styles.row,
                {
                  backgroundColor: colors.card,
                  borderColor: isCurrent ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ color: isCurrent ? colors.primary : colors.subtext, fontWeight: "700" }}>
                {isCurrent ? "Current" : "Tap to open"}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  header: { gap: 6 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderColor: "transparent",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.02)",
    fontSize: 16,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  empty: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6, marginTop: 8 },
  row: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 10, gap: 6 },
  rowTitle: { fontSize: 16, fontWeight: "800" },
});
