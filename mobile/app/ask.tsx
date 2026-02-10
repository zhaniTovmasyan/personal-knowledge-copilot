import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ask } from "@/src/api/ask";
import { ApiError } from "@/src/api/client";
import { addToHistory } from "@/src/storage/history";
import { listKnowledge } from "@/src/api/knowledge";

export default function AskScreen() {
  const params = useLocalSearchParams<{ hint?: string }>();

  const [question, setQuestion] = useState(typeof params.hint === "string" ? params.hint : "");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKnowledge, setHasKnowledge] = useState<boolean | null>(null);
  const [checkingKnowledge, setCheckingKnowledge] = useState(false);

  const colors = {
    bg: "#0B0F17",
    card: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.10)",
    text: "#FFFFFF",
    subtext: "rgba(255,255,255,0.72)",
    placeholder: "rgba(255,255,255,0.45)",
    primary: "#60A5FA",
    danger: "#FF6B6B",
  };

  const canAsk = question.trim().length > 0 && !isAsking && hasKnowledge === true;

  useEffect(() => {
    async function check() {
      setCheckingKnowledge(true);
      try {
        const res = await listKnowledge();
        setHasKnowledge(res.items.length > 0);
      } catch {
        setHasKnowledge(false);
      } finally {
        setCheckingKnowledge(false);
      }
    }

    check();
  }, []);

  async function onAsk() {
    setError(null);
    const cleaned = question.trim();
    if (!cleaned) return;
    if (!hasKnowledge) {
      setError("Add some notes to this case before asking questions.");
      return;
    }

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

      {hasKnowledge === false && !checkingKnowledge && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: "rgba(245,158,11,0.10)",
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.subtext }]}>This case is empty</Text>
          <Text style={{ color: colors.text, marginBottom: 8 }}>
            Paste from clipboard or add case notes before asking questions, so answers can be grounded in your facts.
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
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
      )}

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
            backgroundColor: canAsk ? colors.primary : "rgba(255,255,255,0.10)",
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
    backgroundColor: "rgba(255,255,255,0.04)",
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
