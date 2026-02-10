import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { createCase, loadCases, setCurrentCaseId, getCurrentCaseId, deleteCase, type CaseItem } from "@/src/storage/cases";

export default function CasesScreen() {
  const colors = {
    bg: "#0B0F17",
    card: "rgba(255,255,255,0.06)",
    card2: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
    text: "#FFFFFF",
    subtext: "rgba(255,255,255,0.65)",
    muted: "rgba(255,255,255,0.45)",
    orange: "#F59E0B",
    orangeBg: "rgba(245,158,11,0.16)",
    danger: "#FF6B6B",
  };

  const [items, setItems] = useState<CaseItem[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const canCreate = name.trim().length >= 3;

  async function onCreate() {
    setError(null);
    const cleaned = name.trim();
    if (cleaned.length < 3) {
      setError("Case name should be at least 3 characters.");
      return;
    }

    await createCase(cleaned);
    setName("");
    await refresh();
  }

  async function onSelect(item: CaseItem) {
    await setCurrentCaseId(item.id);
    setCurrentId(item.id);
    router.back(); // return to previous screen
  }

  function confirmDelete(item: CaseItem) {
    Alert.alert(
      "Delete case?",
      `This will remove “${item.name}” from this device. Knowledge stored on the backend will remain, but this case will no longer be selectable here.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCase(item.id);
            await refresh();
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Cases</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Each case is an isolated workspace.
        </Text>
      </View>

      {/* Create case */}
      <View style={[styles.createCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.upperLabel, { color: colors.muted }]}>Create a new case</Text>

        <View style={[styles.inputWrap, { backgroundColor: colors.card2, borderColor: colors.border }]}>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (error) setError(null);
            }}
            placeholder="e.g. Smith v. Johnson"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text }]}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={onCreate}
          />
        </View>

        {error ? <Text style={{ color: colors.danger, fontWeight: "700" }}>{error}</Text> : null}

        <Pressable
          onPress={onCreate}
          disabled={!canCreate}
          style={[
            styles.createBtn,
            {
              backgroundColor: canCreate ? colors.orange : colors.orangeBg,
              opacity: canCreate ? 1 : 0.7,
            },
          ]}
        >
          <Text style={[styles.createBtnText, { color: canCreate ? "#FFFFFF" : colors.orange }]}>
            Create case
          </Text>
        </Pressable>
      </View>

      {/* List */}
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>Your cases</Text>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>No cases yet</Text>
            <Text style={{ color: colors.subtext, marginTop: 4 }}>
              Create your first case to start adding notes and asking questions.
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
                { backgroundColor: colors.card, borderColor: isCurrent ? colors.orange : colors.border },
              ]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.subtext, fontWeight: "700", fontSize: 12 }}>
                  {isCurrent ? "Currently selected" : "Tap to select"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {isCurrent ? (
                  <View style={[styles.badge, { backgroundColor: colors.orangeBg, borderColor: colors.border }]}>
                    <Text style={{ color: colors.orange, fontWeight: "900" }}>Current</Text>
                  </View>
                ) : null}

                <Pressable onPress={() => confirmDelete(item)}>
                  <Text style={{ color: colors.danger, fontWeight: "700" }}>Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 14 },

  header: { gap: 6 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 13 },

  createCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  upperLabel: { fontSize: 12, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase" },

  inputWrap: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  input: { fontSize: 16, fontWeight: "800" },

  createBtn: { borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  createBtnText: { fontWeight: "900", fontSize: 16 },

  sectionTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase" },

  row: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  rowTitle: { fontSize: 16, fontWeight: "900" },

  badge: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },

  empty: { borderWidth: 1, borderRadius: 18, padding: 16 },
});
