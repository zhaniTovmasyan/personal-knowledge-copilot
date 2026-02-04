import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { addKnowledge } from "@/src/api/knowledge";
import { ApiError } from "@/src/api/client";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Clipboard from "expo-clipboard";

export default function AddScreen() {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    bg: isDark ? "#0B0F17" : "#F6F7FB",
    card: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
    text: isDark ? "#FFFFFF" : "#0F172A",
    subtext: isDark ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.70)",
    placeholder: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.35)",
    primary: isDark ? "#60A5FA" : "#2563EB",
    primaryBg: isDark ? "rgba(96,165,250,0.18)" : "rgba(37,99,235,0.12)",
    danger: "#FF6B6B",
    success: isDark ? "rgba(34,197,94,0.20)" : "rgba(34,197,94,0.12)",
  };

  const canSave = text.trim().length > 0 && !isSaving;

  async function onPasteFromClipboard() {
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
    } catch {
      setError("Could not read clipboard.");
    } finally {
      setIsPasting(false);
    }
  }

  async function onSave() {
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Add knowledge</Text>

        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Paste a note or text. The copilot will answer only from what you save here.
        </Text>

        <Pressable
          onPress={onPasteFromClipboard}
          disabled={isPasting}
          style={[
            styles.clipboardButton,
            { backgroundColor: colors.primaryBg, borderColor: colors.border, opacity: isPasting ? 0.7 : 1 },
          ]}
        >
          {isPasting ? <ActivityIndicator color={colors.primary} /> : null}
          <Text style={[styles.clipboardButtonText, { color: colors.primary }]}>
            {isPasting ? "Pasting…" : "Paste from clipboard"}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.subtext }]}>Your note</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Paste your note…"
          placeholderTextColor={colors.placeholder}
          multiline
          style={[styles.input, { color: colors.text }]}
          selectionColor={colors.primary}
        />
        <Text style={[styles.helper, { color: colors.subtext }]}>
          Tip: longer notes are chunked automatically for better retrieval.
        </Text>
      </View>

      {error ? (
        <View style={[styles.banner, { borderColor: colors.danger, backgroundColor: "rgba(255,107,107,0.10)" }]}>
          <Text style={[styles.bannerText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {savedId ? (
        <View style={[styles.banner, { borderColor: colors.border, backgroundColor: colors.success }]}>
          <Text style={[styles.bannerText, { color: colors.text }]}>Saved ✅ (id: {savedId})</Text>

          <Pressable
            onPress={() => router.push({ pathname: "/ask", params: { hint: "Ask about the note I just added" } })}
            style={[styles.secondaryButton, { backgroundColor: colors.primaryBg, borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Ask about this</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        disabled={!canSave}
        onPress={onSave}
        style={[
          styles.primaryButton,
          {
            backgroundColor: canSave ? colors.primary : isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
            borderColor: canSave ? "transparent" : colors.border,
          },
        ]}
      >
        {isSaving ? <ActivityIndicator color={canSave ? "#fff" : colors.text} /> : null}
        <Text style={[styles.primaryButtonText, { color: canSave ? "#fff" : colors.text }]}>
          {isSaving ? "Saving…" : "Save"}
        </Text>
      </Pressable>
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
    gap: 10,
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
  clipboardButtonText: {
    fontWeight: "700",
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 190,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    textAlignVertical: "top",
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  helper: {
    fontSize: 12,
    lineHeight: 16,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "700",
  },
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
  primaryButtonText: {
    fontWeight: "800",
    fontSize: 16,
  },
});
