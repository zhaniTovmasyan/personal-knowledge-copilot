import { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";

type SourceItem = {
  id: number;
  parent_id: number;
  chunk_index: number;
  text_preview: string;
};

type AskResponse = {
  answer: string;
  used_ids: number[];
  context_preview: string;
  sources: SourceItem[];
};

const NO_INFO_TEXT = "I don't have enough information in your knowledge.";

export default function AnswerScreen() {
  const params = useLocalSearchParams<{ payload?: string; q?: string }>();

  const colors = {
    bg: "#0B0F17",
    card: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.10)",
    text: "#FFFFFF",
    subtext: "rgba(255,255,255,0.72)",
    warningBg: "rgba(245,158,11,0.18)",
    warningText: "#FBBF24",
  };

  const data: AskResponse | null = useMemo(() => {
    if (!params.payload || typeof params.payload !== "string") return null;
    try {
      return JSON.parse(params.payload) as AskResponse;
    } catch {
      return null;
    }
  }, [params.payload]);

  const question = typeof params.q === "string" ? params.q : "";
  const isNoInfo = data?.answer?.includes(NO_INFO_TEXT) ?? false;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={[styles.title, { color: colors.text }]}>Answer</Text>

        {question ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.subtext }]}>Question</Text>
            <Text style={[styles.body, { color: colors.text }]}>{question}</Text>
          </View>
        ) : null}

        {!data ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.body, { color: colors.text }]}>
              Could not load the answer payload.
            </Text>
            <Text style={[styles.sub, { color: colors.subtext }]}>
              (This usually means the payload param is missing or not valid JSON.)
            </Text>
          </View>
        ) : (
          <>
            {isNoInfo ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.warningBg, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.body, { color: colors.warningText, fontWeight: "700" }]}>
                  I don’t have enough information in your knowledge.
                </Text>
                <Text style={[styles.sub, { color: colors.subtext }]}>
                  Add more notes, then ask again.
                </Text>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.subtext }]}>Answer</Text>
                <Text style={[styles.body, { color: colors.text }]}>{data.answer}</Text>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>
                Sources used ({data.sources?.length ?? 0})
              </Text>

              {data.sources && data.sources.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {data.sources.map((s) => (
                    <View
                      key={s.id}
                      style={[
                        styles.sourceRow,
                        { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.04)" },
                      ]}
                    >
                      <Text style={[styles.sourceMeta, { color: colors.subtext }]}>
                        Note {s.parent_id}:{s.chunk_index} · chunk id {s.id}
                      </Text>
                      <Text style={[styles.body, { color: colors.text }]}>{s.text_preview}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.sub, { color: colors.subtext }]}>No sources.</Text>
              )}
            </View>

            {/* Optional debug for you during development */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.subtext }]}>Context preview</Text>
              <Text style={[styles.sub, { color: colors.subtext }]}>{data.context_preview || "—"}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  body: { fontSize: 16, lineHeight: 22 },
  sub: { fontSize: 13, lineHeight: 18 },
  sourceRow: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 6 },
  sourceMeta: { fontSize: 12, fontWeight: "600" },
});
