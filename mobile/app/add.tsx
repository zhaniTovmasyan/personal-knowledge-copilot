import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { addKnowledge } from "@/src/api/knowledge";
import { ApiError } from "@/src/api/client";
import { getCurrentCase, type CaseItem } from "@/src/storage/cases";
import { colors } from "@/src/theme/colors";

export default function AddScreen() {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const params = useLocalSearchParams<{ highlight?: string }>();
  const [dismissHint, setDismissHint] = useState(false);
  const showClipboardHint = params.highlight === "clipboard" && !dismissHint;

  const [currentCase, setCurrentCase] = useState<CaseItem | null>(null);

  const refresh = useCallback(async () => {
    const c = await getCurrentCase();
    setCurrentCase(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const hasCase = Boolean(currentCase);



  const canSave = hasCase && text.trim().length > 0 && !isSaving;

  function requireCaseOrGo() {
    if (!hasCase) {
      setError("Please choose a case first.");
      router.push("/cases");
      return false;
    }
    return true;
  }

  async function onPasteFromClipboard() {
    if (!requireCaseOrGo()) return;

    setError(null);
    setSavedId(null);

    setIsPasting(true);
    try {
      const clip = await Clipboard.getStringAsync();
      const cleaned = (clip || "").trim();

      if (!cleaned) {
        setError("Clipboard is empty.");
        return;
      }

      setText(cleaned);
      setDismissHint(true);
    } catch {
      setError("Could not read clipboard.");
    } finally {
      setIsPasting(false);
    }
  }

  async function onSave() {
    if (!requireCaseOrGo()) return;

    setError(null);
    setSavedId(null);

    const cleaned = text.trim();
    if (!cleaned) return;

    setIsSaving(true);
    try {
      const res = await addKnowledge(cleaned);
      setSavedId(res.id);
      setText("");
    } catch (e: any) {
      if (e instanceof ApiError) setError(e.failure.message);
      else setError("Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Current case bar */}
      <View style={[styles.caseBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.caseBarLabel, { color: colors.subtext }]}>Current case</Text>

        <View style={styles.caseBarRow}>
          <Text style={[styles.caseBarName, { color: colors.text }]} numberOfLines={1}>
            {currentCase?.name ?? "No case selected"}
          </Text>

          <Pressable onPress={() => router.push("/cases")} style={styles.caseBarBtn}>
            <Text style={{ color: colors.orange, fontWeight: "800" }}>
              {hasCase ? "Switch" : "Choose"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Add knowledge</Text>

        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Paste from clipboard or type case notes. Saved notes are scoped to the current case.
        </Text>

        {/* Clipboard hint */}
        {showClipboardHint ? (
          <View
            style={{
              padding: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.orange,
              backgroundColor: colors.orangeSoft,
            }}
          >
            <Text style={{ color: colors.orange, fontWeight: "800" }}>
              👋 Tip: Copy text anywhere and paste it here instantly
            </Text>
          </View>
        ) : null}

        {/* Clipboard button */}
        <Pressable
          onPress={onPasteFromClipboard}
          disabled={isPasting || !hasCase}
          style={[
            styles.clipboardButton,
            {
              opacity: isPasting || !hasCase ? 0.55 : 1,
              backgroundColor: colors.orangeSoft,
              borderColor: colors.border,
            },
          ]}
        >
          {isPasting ? <ActivityIndicator color={colors.orange} /> : null}
          <Text style={[styles.clipboardButtonText, { color: colors.orange }]}>
            {!hasCase ? "Choose a case to paste" : isPasting ? "Pasting…" : "Paste from clipboard"}
          </Text>
        </Pressable>
      </View>

      {/* Note card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.subtext }]}>Your note</Text>

        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (showClipboardHint) setDismissHint(true);
          }}
          placeholder="Paste your note…"
          placeholderTextColor={colors.placeholder}
          multiline
          style={[styles.input, { color: colors.text }]}
          selectionColor={colors.orange}
          editable={hasCase}
        />

        <Text style={[styles.helper, { color: colors.subtext }]}>
          Tip: longer notes are chunked automatically for better retrieval.
        </Text>
      </View>

      {/* Error */}
      {error ? (
        <View style={[styles.banner, { borderColor: colors.danger, backgroundColor: "rgba(255,107,107,0.10)" }]}>
          <Text style={[styles.bannerText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {/* Saved banner */}
      {savedId ? (
        <View style={[styles.banner, { borderColor: colors.border, backgroundColor: colors.success }]}>
          <Text style={[styles.bannerText, { color: colors.text }]}>Saved ✅ (id: {savedId})</Text>

          <Pressable
            onPress={() => router.push({ pathname: "/ask", params: { hint: "Ask about the note I just added" } })}
            style={[styles.secondaryButton, { backgroundColor: colors.orangeSoft, borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.orange }]}>Ask about this</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Save button */}
      <Pressable
        disabled={!canSave}
        onPress={onSave}
        style={[
          styles.primaryButton,
          {
            backgroundColor: canSave ? colors.orange : "rgba(255,255,255,0.08)",
            borderColor: canSave ? "transparent" : colors.border,
            opacity: canSave ? 1 : 0.6,
          },
        ]}
      >
        {isSaving ? <ActivityIndicator color={canSave ? "#FFFFFF" : colors.text} /> : null}
        <Text style={[styles.primaryButtonText, { color: canSave ? "#FFFFFF" : colors.text }]}>
          {isSaving ? "Saving…" : "Save"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },

  caseBar: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 6 },
  caseBarLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  caseBarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  caseBarName: { flex: 1, fontSize: 16, fontWeight: "900" },
  caseBarBtn: { paddingVertical: 6, paddingHorizontal: 10 },

  header: { gap: 10 },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.2 },
  subtitle: { fontSize: 14, lineHeight: 20 },

  clipboardButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    alignSelf: "flex-start",
  },
  clipboardButtonText: { fontWeight: "800" },

  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8 },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  input: {
    minHeight: 190,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    textAlignVertical: "top",
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  helper: { fontSize: 12, lineHeight: 16 },

  banner: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  bannerText: { fontSize: 14, lineHeight: 20, fontWeight: "700" },

  secondaryButton: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  secondaryButtonText: { fontWeight: "900" },

  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: { fontWeight: "900", fontSize: 16 },
});
