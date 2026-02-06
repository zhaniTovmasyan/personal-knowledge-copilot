import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    bg: isDark ? "#0B0F17" : "#F6F7FB",
    card: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
    text: isDark ? "#FFFFFF" : "#0F172A",
    subtext: isDark ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.70)",
    primary: isDark ? "#60A5FA" : "#2563EB",
    primaryBg: isDark ? "rgba(96,165,250,0.18)" : "rgba(37,99,235,0.12)",
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Copilot</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Answers only from your notes — always with sources.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Start in 10 seconds</Text>
        <Text style={[styles.cardText, { color: colors.subtext }]}>
          Copy text from Notes/Safari → open Copilot → tap <Text style={{ fontWeight: "800", color: colors.text }}>Paste from clipboard</Text> → Save.
        </Text>

        <Pressable
          onPress={() => router.push({ pathname: "/add", params: { highlight: "clipboard" } })}
          style={[styles.secondaryButton, { backgroundColor: colors.primaryBg, borderColor: colors.border }]}
        >
          <Text style={[styles.secondaryText, { color: colors.primary }]}>Open Add Knowledge</Text>
        </Pressable>
      </View>

      <View style={{ gap: 12 }}>
        <Pressable
          onPress={() => router.push("/add")}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.primaryText, { color: "#fff" }]}>Add knowledge</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/ask")}
          style={[styles.outlineButton, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={[styles.outlineText, { color: colors.text }]}>Ask a question</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/history")} style={{ paddingVertical: 6 }}>
          <Text style={{ color: colors.subtext, fontWeight: "700" }}>View history</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/knowledge")}>
          <Text style={{ color: colors.subtext, fontWeight: "700" }}>View knowledge</Text>
        </Pressable>

      </View>

      <View style={[styles.footer, { borderColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.subtext }]}>
          Tip: Keep notes short and focused for best retrieval.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 16 },
  header: { gap: 6 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 20 },

  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardText: { fontSize: 14, lineHeight: 20 },

  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryText: { fontWeight: "800" },

  primaryButton: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  primaryText: { fontSize: 16, fontWeight: "900" },

  outlineButton: { paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  outlineText: { fontSize: 16, fontWeight: "900" },

  footer: { marginTop: "auto", paddingTop: 12, borderTopWidth: 1 },
  footerText: { fontSize: 12, lineHeight: 16 },
});
