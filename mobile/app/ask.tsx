import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ask } from "@/src/api/ask";
import { ApiError } from "@/src/api/client";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { addToHistory } from "@/src/storage/history";

export default function AskScreen() {
  const params = useLocalSearchParams<{ hint?: string }>();

  const [question, setQuestion] = useState(typeof params.hint === "string" ? params.hint : "");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    danger: "#FF6B6B",
  };

  const canAsk = question.trim().length > 0 && !isAsking;

  async function onAsk() {
    setError(null);
    const cleaned = question.trim();
    if (!cleaned) return;

    setIsAsking(true);
    try {
      const res = await ask(cleaned);
      await addToHistory(cleaned, res);

      // Pass response to Answer screen (MVP approach)
      router.push({
        pathname: "/answer",
        params: { payload: JSON.stringify(res), q: cleaned },
      });
    } catch (e: any) {
      if (e instanceof ApiError) setError(e.failure.message);
      else setError("Something went wrong.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Ask</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Ask a question. The answer will be based only on your saved knowledge.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.subtext }]}>Your question</Text>

        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="e.g. Why did we choose FastAPI?"
          placeholderTextColor={colors.placeholder}
          multiline
          style={[styles.input, { color: colors.text }]}
          selectionColor={colors.primary}
        />
      </View>

      {error ? (
        <View style={[styles.banner, { borderColor: colors.danger, backgroundColor: "rgba(255,107,107,0.10)" }]}>
          <Text style={[styles.bannerText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        disabled={!canAsk}
        onPress={onAsk}
        style={[
          styles.primaryButton,
          {
            backgroundColor: canAsk ? colors.primary : isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
            borderColor: canAsk ? "transparent" : colors.border,
          },
        ]}
      >
        {isAsking ? <ActivityIndicator color={canAsk ? "#fff" : colors.text} /> : null}
        <Text style={[styles.primaryButtonText, { color: canAsk ? "#fff" : colors.text }]}>
          {isAsking ? "Asking…" : "Ask"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  header: { gap: 6 },
  title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  input: {
    minHeight: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    textAlignVertical: "top",
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  banner: { borderWidth: 1, borderRadius: 14, padding: 12 },
  bannerText: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
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
  primaryButtonText: { fontWeight: "800", fontSize: 16 },
});
